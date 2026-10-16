<?php

namespace Database\Seeders;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Enums\FeedbackRating;
use App\Enums\Role;
use App\Models\Accommodation;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\FeedbackService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Sample accommodation feedback (plan PHASE_5 Q8): Bayanihan Contact Center gets 4 responses, so
 * its trust score shows; OpenDoor Demo Corp. gets 2, so the demo job seeker's ratings for Office
 * Clerk make its score appear live at the third. The six sample job seekers exist only for this
 * and can't log in (random passwords). Runs once, only when both demo companies exist.
 */
class DemoFeedbackSeeder extends Seeder
{
    public const SAMPLE_EMAIL = 'sample%d@opendoor.test';

    public function run(FeedbackService $feedback): void
    {
        $demoCorp = Employer::firstWhere('name', DemoEmployerSeeder::COMPANY_NAME);
        $contactCenter = Employer::firstWhere('name', DemoEmployerSeeder::CONTACT_CENTER_NAME);
        if (! $demoCorp || ! $contactCenter || User::where('email', sprintf(self::SAMPLE_EMAIL, 1))->exists()) {
            return;
        }

        // Sample number, employer, job, days past the feedback delay since the hire (so the form is
        // open whatever FEEDBACK_DELAY_DAYS says), and the answers that aren't Delivered.
        $hires = [
            [1, $demoCorp, 'Office Clerk', 30, []],
            [2, $demoCorp, 'Office Clerk', 20, ['Accessible restroom' => FeedbackRating::Partial]],
            [3, $contactCenter, 'Customer Support Associate', 60, ['Adjustable workstation' => FeedbackRating::Partial]],
            [4, $contactCenter, 'Customer Support Associate', 45, [
                'Adjustable workstation' => FeedbackRating::NotDelivered,
                'Job coach or onboarding buddy' => FeedbackRating::NotUsed,
            ]],
            [5, $contactCenter, 'Customer Support Associate', 30, [
                'Accessible restroom' => FeedbackRating::NotUsed,
                'Adjustable workstation' => FeedbackRating::Partial,
            ]],
            [6, $contactCenter, 'Chat Support Specialist', 10, [
                'Sign language interpreter' => FeedbackRating::Partial,
                'Screen-reader-compatible work tools' => FeedbackRating::NotUsed,
            ]],
        ];

        // All or nothing: a half-seeded run would be skipped for good by the guard above.
        DB::transaction(function () use ($hires, $feedback) {
            foreach ($hires as [$number, $employer, $title, $daysPastDelay, $answers]) {
                $job = JobPosting::withTrashed()->with('accommodations')->where('employer_id', $employer->id)->firstWhere('title', $title);
                if (! $job || $job->accommodations->isEmpty()) {
                    $this->command?->warn("  Demo job \"{$title}\" not found or lists no accommodations; its sample feedback was skipped.");

                    continue;
                }

                $application = $this->hire($this->sampleSeeker($number), $job, config('opendoor.feedback.delay_days') + $daysPastDelay);
                $ratings = $application->hiredAccommodations
                    ->mapWithKeys(fn (Accommodation $item) => [$item->id => $answers[$item->name] ?? FeedbackRating::Delivered])
                    ->all();
                $feedback->submit($application, $ratings, null);
            }
        });

        $this->command?->line('  Sample feedback created for '.DemoEmployerSeeder::CONTACT_CENTER_NAME.' and '.DemoEmployerSeeder::COMPANY_NAME);
    }

    private function sampleSeeker(int $number): User
    {
        $user = User::create([
            'email' => sprintf(self::SAMPLE_EMAIL, $number),
            'name' => "Sample Hire {$number}",
            'password' => Str::random(40),
            'role' => Role::Candidate,
            'consented_at' => now(),
        ]);
        $user->markEmailAsVerified();
        $user->candidateProfile()->create(['headline' => 'Sample job seeker for the OpenDoor demo']);

        return $user;
    }

    /**
     * A Hired application $daysAgo days ago, with the job's accommodations copied as at the hire.
     */
    private function hire(User $seeker, JobPosting $job, int $daysAgo): Application
    {
        $hiredOn = CarbonImmutable::parse(JobPosting::today())->subDays($daysAgo);
        $application = new Application;
        $application->forceFill([
            'job_posting_id' => $job->id,
            'user_id' => $seeker->id,
            'status' => ApplicationStatus::Hired,
            'created_at' => $hiredOn->subDays(10),
            'reviewed_at' => $hiredOn->subDays(5),
            'hired_at' => $hiredOn->toDateString(),
            'hire_confirmed_by' => ApplicationActor::Employer,
            'decided_by' => $job->employer->members()->value('user_id'),
            'updated_at' => $hiredOn,
        ])->save();
        $application->hiredAccommodations()->sync(
            $job->accommodations->mapWithKeys(fn (Accommodation $item) => [$item->id => ['note' => $item->pivot->note]])->all(),
        );

        return $application->load('hiredAccommodations');
    }
}
