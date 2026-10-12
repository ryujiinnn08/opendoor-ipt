<?php

namespace Database\Seeders;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Models\Accommodation;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * Applications to the demo company's jobs (plan PHASE_4 §9): one per status, including a hire
 * 31 days ago so Phase 5's feedback form is open during the demo, and a waiting applicant in
 * the HR officer's department. Written directly because the dates are in the past. Runs only
 * for a demo job seeker with no applications yet, so it never changes what a person did.
 */
class DemoApplicationSeeder extends Seeder
{
    public function run(): void
    {
        $company = User::firstWhere('email', UserSeeder::DEMO_EMPLOYER_EMAIL)?->membership?->employer;
        if (! $company) {
            return;
        }

        $this->applyFor($company, UserSeeder::DEMO_CANDIDATE_EMAIL, [
            ['Junior Web Developer', ApplicationStatus::Pending, 1, [], [
                'cover_note' => "I build accessible spreadsheets and simple web forms, and I'd like to grow into web development.",
            ]],
            ['Graphic Designer', ApplicationStatus::Reviewed, 4, ['reviewed_at' => 2]],
            ['HR Assistant', ApplicationStatus::Rejected, 9, ['reviewed_at' => 8, 'rejected_at' => 6]],
            ['Office Clerk', ApplicationStatus::Hired, 45, ['reviewed_at' => 40, 'hired_at' => 31]],
        ]);

        $this->applyFor($company, UserSeeder::DEMO_CANDIDATE2_EMAIL, [
            ['HR Assistant', ApplicationStatus::Pending, 0, [], [
                'interview_request' => 'A sign language interpreter for the interview, please. I can also do a chat-based interview.',
            ]],
            ['Junior Web Developer', ApplicationStatus::Withdrawn, 6, ['withdrawn_at' => 3]],
        ]);
    }

    /**
     * Each entry: job title, status, days since applying, days since each later step, and the texts.
     *
     * @param  list<array{0: string, 1: ApplicationStatus, 2: int, 3: array<string, int>, 4?: array<string, string>}>  $applications
     */
    private function applyFor(Employer $company, string $email, array $applications): void
    {
        $seeker = User::firstWhere('email', $email);
        if (! $seeker || $seeker->applications()->exists()) {
            return;
        }

        foreach ($applications as $details) {
            [$title, $status, $appliedDaysAgo, $steps] = $details;
            $job = JobPosting::query()->where('employer_id', $company->id)->firstWhere('title', $title);
            if (! $job) {
                $this->command?->warn("  Demo job \"{$title}\" not found; its demo application was skipped.");

                continue;
            }

            $application = new Application($details[4] ?? []);
            $application->forceFill([
                'job_posting_id' => $job->id,
                'user_id' => $seeker->id,
                'status' => $status,
                'created_at' => now()->subDays($appliedDaysAgo),
                'updated_at' => now()->subDays(min([$appliedDaysAgo, ...array_values($steps)])),
            ]);
            foreach ($steps as $column => $daysAgo) {
                $application->{$column} = $column === 'hired_at'
                    ? CarbonImmutable::parse(JobPosting::today())->subDays($daysAgo)->toDateString()
                    : now()->subDays($daysAgo);
            }
            if ($status === ApplicationStatus::Hired) {
                $application->forceFill(['hire_confirmed_by' => ApplicationActor::Employer, 'decided_by' => $company->members()->value('user_id')]);
            } elseif ($status === ApplicationStatus::Rejected) {
                $application->decided_by = $company->members()->value('user_id');
            }
            $application->save();

            if ($status === ApplicationStatus::Hired) {
                $application->hiredAccommodations()->sync(
                    $job->accommodations->mapWithKeys(fn (Accommodation $item) => [$item->id => ['note' => $item->pivot->note]])->all(),
                );
            }
        }

        $this->command?->line("  Demo applications created for {$email}");
    }
}
