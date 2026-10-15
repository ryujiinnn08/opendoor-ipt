<?php

namespace Tests\Feature\Admin;

use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

/**
 * What's waiting, then OpenDoor in numbers (plan PHASE_6 §4.3, F8.3).
 */
class DashboardTest extends TestCase
{
    use BuildsApplications;
    use RefreshDatabase;

    public function test_it_counts_people_jobs_applications_and_hires(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->admin()->suspended()->create();
        User::factory()->count(2)->create();
        User::factory()->suspended()->create();
        $company = $this->hiringCompany(); // owner and HR officer, two open jobs
        $this->individualEmployer();
        $this->applicantTo($company['itJob']); // a third and fourth job seeker
        $this->applicantTo($company['itJob'], 'hired');
        JobPosting::factory()->in($company['it'])->pending()->create();
        JobPosting::factory()->in($company['it'])->closed()->create();
        $company['company']->forceFill(['trust_score' => 90])->save();

        $this->actingAs($admin, 'web')->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.postings_waiting_for_approval', 1)
            ->assertJsonPath('data.job_seekers', 5)
            ->assertJsonPath('data.employer_accounts', 3)
            ->assertJsonPath('data.companies', Employer::where('type', 'company')->count())
            ->assertJsonPath('data.individual_employers', 1)
            ->assertJsonPath('data.administrators', 2)
            ->assertJsonPath('data.suspended_accounts', 2)
            ->assertJsonPath('data.open_jobs', 2)
            ->assertJsonPath('data.applications', 2)
            ->assertJsonPath('data.hires', 1)
            ->assertJsonPath('data.employers_with_trust_score', 1);
    }
}
