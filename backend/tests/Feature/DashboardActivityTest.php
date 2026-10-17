<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

/** The dashboard charts' weekly activity (UI_FEEDBACK_WAVE_B_PLAN B3). */
class DashboardActivityTest extends TestCase
{
    use BuildsApplications;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Friday, October 16, 2026, noon in Manila: this week starts Monday, October 12.
        Carbon::setTestNow(Carbon::parse('2026-10-16 12:00', 'Asia/Manila'));
    }

    public function test_employers_get_eight_manila_weeks_of_applications_and_only_their_postings(): void
    {
        $team = $this->hiringCompany();
        $at = fn (string $manila) => Carbon::parse($manila, 'Asia/Manila')->utc();
        // Sunday 11:30 p.m. in Manila is still last week, although it is Sunday afternoon in UTC.
        Application::factory()->create(['job_posting_id' => $team['itJob']->id, 'created_at' => $at('2026-10-11 23:30')]);
        Application::factory()->create(['job_posting_id' => $team['itJob']->id, 'created_at' => $at('2026-10-12 00:10')]);
        Application::factory()->reviewed()->create(['job_posting_id' => $team['hrJob']->id, 'created_at' => $at('2026-10-15 09:00')]);
        Application::factory()->create(['job_posting_id' => $team['itJob']->id, 'created_at' => $at('2026-08-01 09:00')]); // too old
        Application::factory()->create(['created_at' => $at('2026-10-14 09:00')]); // another employer

        $owner = $this->actingAs($team['owner'], 'web')->getJson('/api/employer/dashboard/activity')->assertOk();
        $this->assertSame(['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'], $owner->json('data.weeks'));
        $this->assertSame([0, 0, 0, 0, 0, 0, 1, 2], $owner->json('data.applications_by_week'));
        $this->assertSame(['Junior Web Developer', 'HR Assistant'], $owner->json('data.applicants_by_posting.*.title'));
        $owner->assertJsonPath('data.applicants_by_posting.1.counts.reviewed', 1);

        // An HR officer sees only their own department's postings.
        $hr = $this->actingAs($team['hr'], 'web')->getJson('/api/employer/dashboard/activity')->assertOk();
        $this->assertSame([0, 0, 0, 0, 0, 0, 0, 1], $hr->json('data.applications_by_week'));
        $this->assertSame(['HR Assistant'], $hr->json('data.applicants_by_posting.*.title'));
    }

    public function test_employers_filter_the_charts_by_weeks_job_and_status(): void
    {
        $team = $this->hiringCompany();
        $at = fn (string $manila) => Carbon::parse($manila, 'Asia/Manila')->utc();
        Application::factory()->create(['job_posting_id' => $team['itJob']->id, 'created_at' => $at('2026-10-13 09:00')]);
        Application::factory()->reviewed()->create(['job_posting_id' => $team['hrJob']->id, 'created_at' => $at('2026-10-14 09:00')]);
        Application::factory()->hired()->create(['job_posting_id' => $team['hrJob']->id, 'created_at' => $at('2026-08-04 09:00')]); // 11 weeks ago
        $closed = JobPosting::factory()->closed()->in($team['it'])->create(['title' => 'Data Encoder']);
        JobPosting::factory()->in($team['it'])->create(['title' => 'Draft Job']);
        $api = $this->actingAs($team['owner'], 'web');

        // Twelve weeks reach back to the hire; the job list offers open and closed postings only.
        $twelve = $api->getJson('/api/employer/dashboard/activity?weeks=12')->assertOk();
        $this->assertCount(12, $twelve->json('data.weeks'));
        $this->assertSame(3, array_sum($twelve->json('data.applications_by_week')));
        $this->assertSame(['Data Encoder', 'HR Assistant', 'Junior Web Developer'], $twelve->json('data.jobs.*.title'));
        $this->assertSame([false, true, true], $twelve->json('data.jobs.*.open'));
        $this->assertSame(2, array_sum($api->getJson('/api/employer/dashboard/activity?weeks=4')->json('data.applications_by_week')));

        // One job: both charts show only it.
        $job = $api->getJson("/api/employer/dashboard/activity?job={$team['hrJob']->id}")->assertOk();
        $this->assertSame(1, array_sum($job->json('data.applications_by_week')));
        $this->assertSame(['HR Assistant'], $job->json('data.applicants_by_posting.*.title'));
        // A closed job still has its weekly numbers, but no bar among the open jobs.
        $this->assertSame([], $api->getJson("/api/employer/dashboard/activity?job={$closed->id}")->json('data.applicants_by_posting'));

        // Statuses: weekly counts and bars hold only applications in those statuses.
        $reviewed = $api->getJson('/api/employer/dashboard/activity?statuses[]=reviewed&statuses[]=hired&weeks=12')->assertOk();
        $this->assertSame(2, array_sum($reviewed->json('data.applications_by_week')));
        $this->assertSame('HR Assistant', $reviewed->json('data.applicants_by_posting.0.title'));
        $reviewed->assertJsonPath('data.applicants_by_posting.0.counts.reviewed', 1)
            ->assertJsonPath('data.applicants_by_posting.1.counts.pending', 0);
    }

    public function test_employer_chart_filters_are_validated(): void
    {
        $team = $this->hiringCompany();
        $otherJob = JobPosting::factory()->open()->create();

        $this->actingAs($team['owner'], 'web')
            ->getJson("/api/employer/dashboard/activity?weeks=5&job={$otherJob->id}&statuses[]=withdrawn")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['weeks', 'job', 'statuses.0']);
        // An HR officer can't pick another department's job.
        $this->actingAs($team['hr'], 'web')
            ->getJson("/api/employer/dashboard/activity?job={$team['itJob']->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['job' => 'Choose one of your job postings.']);
    }

    public function test_admins_get_accounts_postings_applications_hires_and_verification(): void
    {
        $admin = User::factory()->admin()->create();
        Application::factory()->hired()->create(['hired_at' => '2026-10-13']);
        JobPosting::query()->update(['approved_at' => now()->subYear()]);
        JobPosting::factory()->open()->create(['approved_at' => now()->subDay()]);
        Employer::factory()->create(['verification_status' => 'pending']);
        Employer::factory()->create(['verification_status' => 'verified']);
        // The accounts the factories made joined long ago; only these two are new.
        User::query()->update(['created_at' => now()->subYear()]);
        User::factory()->create(['created_at' => now()->subDays(2)]);
        User::factory()->employer()->create(['created_at' => now()->subWeeks(1)]);

        $response = $this->actingAs($admin, 'web')->getJson('/api/admin/dashboard/activity')->assertOk();
        $this->assertSame(1, $response->json('data.job_seekers_by_week.7'));
        $this->assertSame(1, $response->json('data.employers_by_week.6'));
        $this->assertSame(1, $response->json('data.hires_by_week.7'));
        $this->assertSame(1, array_sum($response->json('data.postings_approved_by_week')));
        $response->assertJsonPath('data.verification.waiting', 1)->assertJsonPath('data.verification.verified', Employer::where('type', 'company')->where('verification_status', 'verified')->count());
    }

    public function test_each_dashboard_is_for_its_own_role(): void
    {
        $this->actingAs(User::factory()->create(), 'web')->getJson('/api/admin/dashboard/activity')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'web')->getJson('/api/employer/dashboard/activity')->assertForbidden();
    }
}
