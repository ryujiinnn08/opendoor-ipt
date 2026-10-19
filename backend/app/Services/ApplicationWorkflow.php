<?php

namespace App\Services;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Enums\PostingStatus;
use App\Enums\Role;
use App\Models\Accommodation;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use App\Notifications\ApplicationStatusChanged;
use App\Notifications\NewApplicant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;

/**
 * The only writer of applications and their status (plan PHASE_4 §2, Appendix C.1).
 */
class ApplicationWorkflow
{
    public const NOT_TAKING = "This job isn't taking applications.";

    public const ALREADY_APPLIED = 'You have already applied for this job. Please wait for confirmation.';

    public const STALE = 'This application changed while you were looking at it. Reload to see its status.';

    /**
     * A new Pending application to an open job (the same rule as the public job pages),
     * once per job seeker per job, ever.
     */
    public function apply(User $seeker, int $jobId, ?string $coverNote, ?string $interviewRequest): Application
    {
        abort_unless($seeker->role === Role::Candidate && $seeker->is_active, 403);
        try {
            return DB::transaction(function () use ($seeker, $jobId, $coverNote, $interviewRequest) {
                $job = JobPosting::query()->lockForUpdate()->find($jobId);
                if (! $job) {
                    abort(response()->json(['message' => self::NOT_TAKING], 404));
                }
                $this->refuseIfApplied($seeker, $job);
                if ($job->displayStatus() !== PostingStatus::Open) {
                    abort(response()->json(['message' => self::NOT_TAKING], 404));
                }
                $capacity = $job->capacity();
                if ($capacity['remaining_slots'] === 0) {
                    abort(response()->json(['message' => 'All hiring slots for this job are filled.'], 409));
                }
                if ($job->application_limit !== null && $capacity['application_count'] >= $job->application_limit) {
                    abort(response()->json(['message' => 'This job has reached its application limit.'], 409));
                }
                $application = new Application(['cover_note' => $coverNote, 'interview_request' => $interviewRequest]);
                $application->forceFill(['job_posting_id' => $job->id, 'user_id' => $seeker->id])->save();
                $application->setRelation('jobPosting', $job)->setRelation('candidate', $seeker);
                HiringAudit::record($job, $seeker, 'application_submitted', null, 'pending', $application);
                DB::afterCommit(fn () => Notification::send($job->managers(), new NewApplicant($application)));

                return $application;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            // Read after rollback, so a failed insert cannot leave an aborted transaction.
            $existing = Application::where('job_posting_id', $jobId)->where('user_id', $seeker->id)->value('id');
            if ($existing !== null) {
                abort(response()->json(['message' => self::ALREADY_APPLIED, 'application_id' => $existing], 409));
            }
            throw $exception;
        }
    }

    /**
     * The employer opened the applicant (F6.5): Pending becomes Reviewed, once. Any other status,
     * including one the job seeker just withdrew, is left as it is; opening never fails.
     */
    public function markReviewed(Application $application, User $by): Application
    {
        return DB::transaction(function () use ($application, $by) {
            $job = JobPosting::withTrashed()->lockForUpdate()->findOrFail($application->job_posting_id);
            $current = Application::query()->lockForUpdate()->findOrFail($application->id);
            $current->setRelation('jobPosting', $job);
            Gate::forUser($by)->authorize('actAsEmployer', $current);
            if ($job->trashed()) {
                return $current;
            }
            if ($current->status === ApplicationStatus::Pending) {
                $current->forceFill(['status' => ApplicationStatus::Reviewed, 'reviewed_at' => now()])->save();
                HiringAudit::record($job, $by, 'status_changed', 'pending', 'reviewed', $current);
                $this->notifyOtherParty($current, ApplicationActor::Employer);
            }

            return $current;
        });
    }

    /**
     * Moves the application to $next if Table 1 allows it for $actor. $expected is the status the
     * person saw; if it changed meanwhile (another tab, the other party), nothing is overwritten.
     */
    public function changeStatus(Application $application, ApplicationStatus $next, ApplicationActor $actor, ApplicationStatus $expected, User $by): Application
    {
        return DB::transaction(function () use ($application, $next, $actor, $expected, $by) {
            abort_unless($actor === ApplicationActor::Employer && $by->role === Role::Employer && $by->is_active, 403);
            $job = JobPosting::query()->lockForUpdate()->findOrFail($application->job_posting_id);
            $current = Application::query()->lockForUpdate()->findOrFail($application->id);
            $current->setRelation('jobPosting', $job);
            Gate::forUser($by)->authorize('actAsEmployer', $current);

            if ($current->status !== $expected) {
                abort(response()->json(['message' => self::STALE], 409));
            }
            if (! $current->status->canTransitionTo($next, $actor)) {
                $message = "This application can't be changed to {$next->label()}.";
                abort(response()->json(['message' => $message], 422));
            }

            $hired = $job->applications()->where('status', ApplicationStatus::Hired)->count();
            if ($next === ApplicationStatus::Hired && $hired >= $job->hiring_slots) {
                abort(response()->json(['message' => 'All hiring slots for this job are filled.'], 409));
            }
            $previous = $current->status->value;
            $current->status = $next;
            match ($next) {
                ApplicationStatus::Reviewed => $current->reviewed_at = now(),
                ApplicationStatus::Withdrawn => $current->withdrawn_at = now(),
                ApplicationStatus::Rejected => $current->forceFill(['rejected_at' => now(), 'decided_by' => $by->id]),
                ApplicationStatus::Hired => $current->forceFill([
                    'hired_at' => JobPosting::today(),
                    'hire_confirmed_by' => $actor,
                    'decided_by' => $by->id,
                ]),
                ApplicationStatus::Pending => null,
            };
            $current->save();

            if ($next === ApplicationStatus::Hired) {
                $this->copyAdvertisedAccommodations($current);
                if ($hired + 1 >= $job->hiring_slots) {
                    $before = $job->status->value;
                    $job->forceFill(['status' => PostingStatus::Closed, 'closure_reason' => 'slots_filled'])->save();
                    HiringAudit::record($job, $by, 'slots_filled', $before, 'closed');
                }
            }
            HiringAudit::record($job, $by, 'status_changed', $previous, $next->value, $current);
            $this->notifyOtherParty($current, $actor);

            return $current;
        });
    }

    /**
     * Every status change tells the other party (M6), once the change is committed: the job seeker
     * when the employer acted, the posting's managers when the job seeker did.
     */
    private function notifyOtherParty(Application $application, ApplicationActor $actor): void
    {
        DB::afterCommit(function () use ($application, $actor) {
            $recipients = $actor === ApplicationActor::Employer ? $application->candidate : $application->jobPosting->managers();
            Notification::send($recipients, new ApplicationStatusChanged($application, $actor));
        });
    }

    /**
     * The accommodations the job advertises at the moment of hire, with their notes: the ones
     * the hired job seeker rates in Phase 5, whatever the posting says later (M4 rule).
     */
    private function copyAdvertisedAccommodations(Application $application): void
    {
        $application->hiredAccommodations()->sync(
            $application->jobPosting->accommodations->mapWithKeys(fn (Accommodation $item) => [$item->id => ['note' => $item->pivot->note]])->all(),
        );
    }

    private function refuseIfApplied(User $seeker, JobPosting $job): void
    {
        $existing = Application::query()->where('job_posting_id', $job->id)->where('user_id', $seeker->id)->value('id');

        if ($existing !== null) {
            abort(response()->json(['message' => self::ALREADY_APPLIED, 'application_id' => $existing], 409));
        }
    }
}
