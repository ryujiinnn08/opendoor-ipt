<?php

namespace App\Services;

use App\Enums\PostingStatus;
use App\Models\JobPosting;
use App\Models\User;
use App\Notifications\PostingDecided;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use LogicException;

/**
 * Saving job postings and changing their status (plan PHASE_2 §4.4, decisions 24–28 and 34).
 * The status, employer, department and author are only ever set here.
 */
class JobPostingWorkflow
{
    /**
     * @param  array<string, mixed>  $fields  Validated posting fields.
     * @param  list<array{id: int, note: ?string}>|null  $accommodations  Null when not sent.
     */
    public function create(User $author, array $fields, ?array $accommodations, bool $submit): JobPosting
    {
        return DB::transaction(function () use ($author, $fields, $accommodations, $submit) {
            $posting = new JobPosting;
            $posting->fill($fields)->forceFill([
                'employer_id' => $author->membership->employer_id,
                'department_id' => $this->departmentFor($author, $fields['department_id'] ?? null),
                'created_by' => $author->id,
                'status' => PostingStatus::Draft,
            ]);

            if ($submit) {
                $this->moveTo($posting, PostingStatus::Pending);
            }

            $posting->save();
            $this->syncAccommodations($posting, $accommodations ?? []);
            HiringAudit::record($posting, $author, 'posting_created', null, $posting->status->value, details: $this->capacityFields($posting));

            return $posting;
        });
    }

    /**
     * Saving a draft or rejected posting keeps its status unless it is submitted; a waiting
     * posting stays waiting; an open or closed one goes back for approval (decisions 6, 24, 26).
     *
     * @param  array<string, mixed>  $fields  Validated posting fields.
     * @param  list<array{id: int, note: ?string}>|null  $accommodations  Null when not sent.
     */
    public function update(JobPosting $posting, User $editor, array $fields, ?array $accommodations, bool $submit): JobPosting
    {
        return DB::transaction(function () use ($posting, $editor, $fields, $accommodations, $submit) {
            // Re-read under a lock: if an admin decided after this request loaded the posting,
            // the save must see the new status (an approved posting goes back for review).
            $posting = JobPosting::whereKey($posting->id)->lockForUpdate()->firstOrFail();

            Gate::forUser($editor)->authorize('manage', $posting);
            $before = $posting->status->value;
            $previousCapacity = $this->capacityFields($posting);
            $posting->fill($fields)->forceFill([
                'department_id' => $this->departmentFor($editor, $fields['department_id'] ?? $posting->department_id),
            ]);

            $capacity = $posting->capacity();
            if ($posting->hiring_slots < $capacity['hired_count']) {
                throw ValidationException::withMessages(['hiring_slots' => 'Hiring slots cannot be fewer than the number already hired.']);
            }
            if ($posting->application_limit !== null && $posting->application_limit < $capacity['application_count']) {
                throw ValidationException::withMessages(['application_limit' => 'The application limit cannot be fewer than the applications already received.']);
            }

            $next = match ($posting->status) {
                PostingStatus::Draft, PostingStatus::Rejected => $submit ? PostingStatus::Pending : $posting->status,
                PostingStatus::Pending, PostingStatus::Open, PostingStatus::Closed => PostingStatus::Pending,
            };

            if ($capacity['remaining_slots'] === 0) {
                $posting->forceFill(['status' => PostingStatus::Closed, 'closure_reason' => 'slots_filled']);
            } elseif ($next !== $posting->status) {
                $this->moveTo($posting, $next);
            }

            $posting->save();

            if ($accommodations !== null) {
                $this->syncAccommodations($posting, $accommodations);
            }

            HiringAudit::record($posting, $editor, 'posting_updated', $before, $posting->status->value,
                details: ['previous_capacity' => $previousCapacity, 'capacity' => $this->capacityFields($posting)]);

            return $posting;
        });
    }

    public function close(JobPosting $posting): JobPosting
    {
        return $this->changeLocked($posting, function (JobPosting $posting) {
            if ($posting->displayStatus() !== PostingStatus::Open) {
                throw ValidationException::withMessages(['action' => 'Only open postings can be closed.']);
            }

            $this->moveTo($posting, PostingStatus::Closed);
            $posting->closure_reason = 'employer_closed';
            $posting->save();
        });
    }

    /**
     * Reopening needs a new closing date but no approval (decision 7). A posting that closed
     * automatically is still stored as open, so only its date changes.
     */
    public function reopen(JobPosting $posting, string $closesOn): JobPosting
    {
        return $this->changeLocked($posting, function (JobPosting $posting) use ($closesOn) {
            if ($posting->displayStatus() !== PostingStatus::Closed) {
                throw ValidationException::withMessages(['action' => 'Only closed postings can be reopened.']);
            }

            $this->requireAvailableCapacity($posting);
            $posting->closure_reason = null;
            if ($posting->status !== PostingStatus::Open) {
                $this->moveTo($posting, PostingStatus::Open);
            }

            $posting->closes_on = $closesOn;
            $posting->save();
        });
    }

    /**
     * Changing only the date keeps an open posting open, with no new approval (decision 25).
     */
    public function changeClosingDate(JobPosting $posting, string $closesOn): JobPosting
    {
        return $this->changeLocked($posting, function (JobPosting $posting) use ($closesOn) {
            if ($posting->displayStatus() !== PostingStatus::Open) {
                throw ValidationException::withMessages([
                    'action' => 'Only open postings can have their closing date changed. Reopen a closed posting instead.',
                ]);
            }

            $posting->closes_on = $closesOn;
            $posting->save();
        });
    }

    /**
     * Runs an employer's change on the locked row, so a posting OpenDoor removed meanwhile (or
     * another change) is seen first (Phase 6 review): a removed posting answers 404.
     *
     * @param  callable(JobPosting): void  $change
     */
    private function changeLocked(JobPosting $posting, callable $change): JobPosting
    {
        return DB::transaction(function () use ($posting, $change) {
            $locked = JobPosting::whereKey($posting->id)->lockForUpdate()->first() ?? abort(404);
            Gate::authorize('manage', $locked);
            $before = $locked->status->value;
            $previousDate = $locked->closes_on?->toDateString();
            $change($locked);
            HiringAudit::record($locked, auth()->user(), 'posting_status_changed', $before, $locked->status->value,
                details: ['previous_closes_on' => $previousDate, 'closes_on' => $locked->closes_on?->toDateString(), 'closure_reason' => $locked->closure_reason]);

            return $locked;
        });
    }

    /**
     * An admin approves or rejects the version of a waiting posting they reviewed. The row is
     * locked, and a posting changed since the admin loaded it is refused, so nothing goes live
     * unseen (decision 24 lets employers keep editing while it waits).
     */
    public function decide(JobPosting $posting, string $decision, ?string $reason, string $reviewedUpdatedAt): JobPosting
    {
        return DB::transaction(function () use ($posting, $decision, $reason, $reviewedUpdatedAt) {
            $posting = JobPosting::whereKey($posting->id)->lockForUpdate()->firstOrFail();

            if ($posting->status !== PostingStatus::Pending) {
                throw ValidationException::withMessages(['decision' => 'This posting is not waiting for approval.']);
            }

            if ($posting->updated_at?->toIso8601String() !== $reviewedUpdatedAt) {
                abort(409, 'This posting changed while you were reviewing it. Reload the page to see the latest version.');
            }

            if ($decision === 'approve') {
                $this->requireAvailableCapacity($posting);
                $posting->closure_reason = null;
                $this->moveTo($posting, PostingStatus::Open);
                $posting->forceFill(['approved_at' => now(), 'rejection_reason' => null])->save();
            } else {
                $this->moveTo($posting, PostingStatus::Rejected);
                $posting->forceFill(['rejection_reason' => $reason])->save();
            }

            HiringAudit::record($posting, auth()->user(), 'posting_'.$decision, 'pending', $posting->status->value,
                details: ['reason' => $reason]);

            // The department's managers hear the result (M9, Phase 6B). Its creator is one of them
            // while they still manage it; someone who left or moved hears nothing (review CR-01).
            DB::afterCommit(fn () => Notification::send($posting->managers(), new PostingDecided($posting)));

            return $posting;
        });
    }

    /**
     * What the employer can do with the posting now (decision 34). Editing and deleting are
     * always possible; the rest depends on the status people see.
     *
     * @return list<string>
     */
    public function actionsFor(JobPosting $posting): array
    {
        // Removed by OpenDoor or deleted: no edit, reopen or delete (Phase 6A, Q7).
        if ($posting->trashed()) {
            return [];
        }

        return match ($posting->displayStatus()) {
            PostingStatus::Open => ['edit', 'close', 'change_closing_date', 'delete'],
            PostingStatus::Closed => $posting->capacity()['remaining_slots'] > 0 && ($posting->application_limit === null || $posting->capacity()['application_count'] < $posting->application_limit) ? ['edit', 'reopen', 'delete'] : ['edit', 'delete'],
            default => ['edit', 'delete'],
        };
    }

    /**
     * Individual employers have no departments; HR officers always post in their own; company
     * owners choose (decisions 22 and 28).
     */
    private function departmentFor(User $user, mixed $requested): ?int
    {
        $member = $user->membership;

        if (! $member->employer->isCompany()) {
            return null;
        }

        return $member->isOwner() ? (int) $requested : $member->department_id;
    }

    private function capacityFields(JobPosting $posting): array
    {
        return ['hiring_slots' => $posting->hiring_slots, 'application_limit' => $posting->application_limit];
    }

    private function requireAvailableCapacity(JobPosting $posting): void
    {
        $capacity = $posting->capacity();
        if ($capacity['remaining_slots'] === 0) {
            throw ValidationException::withMessages(['hiring_slots' => 'All hiring slots are filled. Increase hiring slots before reopening.']);
        }
        if ($posting->application_limit !== null && $capacity['application_count'] >= $posting->application_limit) {
            throw ValidationException::withMessages(['application_limit' => 'The application limit has been reached. Increase it before reopening.']);
        }
    }

    private function moveTo(JobPosting $posting, PostingStatus $next): void
    {
        if (! $posting->status->canTransitionTo($next)) {
            throw new LogicException("A {$posting->status->value} posting can't become {$next->value}.");
        }

        $posting->status = $next;
        if ($next !== PostingStatus::Closed) {
            $posting->closure_reason = null;
        }

        if ($next === PostingStatus::Pending) {
            $posting->forceFill(['submitted_at' => now(), 'rejection_reason' => null]);
        }
    }

    /**
     * @param  list<array{id: int, note: ?string}>  $accommodations
     */
    private function syncAccommodations(JobPosting $posting, array $accommodations): void
    {
        $posting->accommodations()->sync(
            collect($accommodations)->mapWithKeys(fn (array $item) => [$item['id'] => ['note' => $item['note']]])->all(),
        );
    }
}
