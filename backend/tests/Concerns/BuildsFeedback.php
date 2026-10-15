<?php

namespace Tests\Concerns;

use App\Enums\FeedbackRating;
use App\Models\Accommodation;
use App\Models\Application;
use App\Models\Feedback;
use App\Models\JobPosting;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Hires with the hire copy of the job's accommodations, and feedback written directly. Uses BuildsApplications.
 */
trait BuildsFeedback
{
    use BuildsApplications;

    /**
     * A Hired application to $job, hired $daysAgo days ago (Philippine time), with the job's
     * accommodations copied as at the hire.
     */
    protected function hireFor(JobPosting $job, int $daysAgo = 31, ?User $seeker = null): Application
    {
        $application = Application::factory()->hired()->create([
            'job_posting_id' => $job->id,
            'user_id' => ($seeker ?? User::factory()->create())->id,
            'hired_at' => CarbonImmutable::parse(JobPosting::today())->subDays($daysAgo)->toDateString(),
        ]);
        $application->hiredAccommodations()->sync(
            $job->accommodations->mapWithKeys(fn (Accommodation $item) => [$item->id => ['note' => $item->pivot->note]])->all(),
        );

        return $application;
    }

    /**
     * Feedback on $application, written directly (no checks, no recalculation).
     *
     * @param  array<int, string>  $ratings  accommodation id => rating value
     */
    protected function feedbackOn(Application $application, array $ratings, bool $hidden = false): Feedback
    {
        $feedback = new Feedback(['comment' => null]);
        $feedback->forceFill(['application_id' => $application->id, 'is_hidden' => $hidden])->save();
        foreach ($ratings as $accommodationId => $rating) {
            $feedback->items()->create(['accommodation_id' => $accommodationId, 'rating' => FeedbackRating::from($rating)]);
        }

        return $feedback;
    }
}
