<?php

namespace App\Services;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Models\Accommodation;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * The only writer of applications and their status (plan PHASE_4 §2, Appendix C.1).
 */
class ApplicationWorkflow
{
    public const NOT_TAKING = "This job isn't taking applications.";

    public const ALREADY_APPLIED = "You've already applied for this job.";

    public const STALE = 'This application changed while you were looking at it. Reload to see its status.';

    public const ASK_EMPLOYER_FIRST = 'If you were hired, ask the employer to open your application on OpenDoor first.';

    /**
     * A new Pending application to an open job (the same rule as the public job pages),
     * once per job seeker per job, ever.
     */
    public function apply(User $seeker, int $jobId, ?string $coverNote, ?string $interviewRequest): Application
    {
        $job = JobPosting::publiclyVisible()->find($jobId);
        if (! $job) {
            abort(response()->json(['message' => self::NOT_TAKING], 404));
        }

        $this->refuseIfApplied($seeker, $job);

        $application = new Application(['cover_note' => $coverNote, 'interview_request' => $interviewRequest]);
        $application->forceFill(['job_posting_id' => $job->id, 'user_id' => $seeker->id]);

        try {
            $application->save();
        } catch (UniqueConstraintViolationException) {
            // Two requests at once: the unique index caught the second one.
            $this->refuseIfApplied($seeker, $job);
            throw new \LogicException('The unique index refused an application that does not exist.');
        }

        return $application;
    }

    /**
     * Moves the application to $next if Table 1 allows it for $actor. $expected is the status the
     * person saw; if it changed meanwhile (another tab, the other party), nothing is overwritten.
     */
    public function changeStatus(Application $application, ApplicationStatus $next, ApplicationActor $actor, ApplicationStatus $expected, User $by): Application
    {
        return DB::transaction(function () use ($application, $next, $actor, $expected, $by) {
            $current = Application::query()->lockForUpdate()->findOrFail($application->id);

            if ($current->status !== $expected) {
                abort(response()->json(['message' => self::STALE], 409));
            }
            if (! $current->status->canTransitionTo($next, $actor)) {
                $message = $next === ApplicationStatus::Hired && $actor === ApplicationActor::Candidate && $current->status === ApplicationStatus::Pending
                    ? self::ASK_EMPLOYER_FIRST
                    : "This application can't be changed to {$next->label()}.";
                abort(response()->json(['message' => $message], 422));
            }

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
            }

            return $current;
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
