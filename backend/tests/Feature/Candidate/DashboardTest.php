<?php

namespace Tests\Feature\Candidate;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_job_seeker_is_asked_for_everything(): void
    {
        $this->actingAs(User::factory()->create(), 'web')->getJson('/api/candidate/dashboard')->assertOk()
            ->assertJsonPath('data.needs_count', 0)
            ->assertJsonPath('data.top_matches', [])
            ->assertJsonPath('data.missing_sections', ['headline', 'location', 'contact_number', 'education', 'skills', 'needs']);
    }

    public function test_counts_applications_by_filter(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web')->getJson('/api/candidate/dashboard')
            ->assertJsonPath('data.applications', ['all' => 0, 'waiting' => 0, 'hired' => 0, 'closed' => 0]);

        Application::factory()->create(['user_id' => $seeker->id]);
        foreach (['reviewed', 'hired', 'rejected', 'withdrawn'] as $state) {
            Application::factory()->{$state}()->create(['user_id' => $seeker->id]);
        }
        Application::factory()->hired()->create();

        $this->getJson('/api/candidate/dashboard')
            ->assertJsonPath('data.applications', ['all' => 5, 'waiting' => 2, 'hired' => 1, 'closed' => 2]);
    }

    public function test_shows_the_three_most_recently_changed_applications_and_the_profile_card(): void
    {
        $seeker = User::factory()->create();
        $old = Application::factory()->create(['user_id' => $seeker->id, 'updated_at' => now()->subDays(9)]);
        $changed = Application::factory()->reviewed()->create(['user_id' => $seeker->id, 'updated_at' => now()->subDay()]);
        $newest = Application::factory()->create(['user_id' => $seeker->id, 'updated_at' => now()]);
        $third = Application::factory()->create(['user_id' => $seeker->id, 'updated_at' => now()->subDays(3)]);
        Application::factory()->create(); // someone else's

        $response = $this->actingAs($seeker, 'web')->getJson('/api/candidate/dashboard')->assertOk();
        $this->assertSame([$newest->id, $changed->id, $third->id], $response->json('data.recent_applications.*.id'));
        $this->assertNotContains($old->id, $response->json('data.recent_applications.*.id'));
        $response->assertJsonPath('data.recent_applications.1.status', 'reviewed')
            ->assertJsonPath('data.recent_applications.0.updated_at', $newest->updated_at->toIso8601String())
            ->assertJsonPath('data.profile', ['headline' => null, 'city' => null, 'province' => null, 'has_resume' => false, 'has_photo' => false, 'photo_version' => null]);
    }

    public function test_a_complete_profile_misses_nothing(): void
    {
        $seeker = User::factory()->create();
        $seeker->needs()->attach(Accommodation::factory()->count(2)->create()->pluck('id'));
        $this->actingAs($seeker, 'web')->putJson('/api/candidate/profile', [
            'name' => 'Ana', 'headline' => 'Encoder', 'city' => 'Quezon City', 'province' => 'Metro Manila',
            'contact_number' => '0917 123 4567', 'skills' => 'Excel',
            'educations' => [['level' => 'college', 'school' => 'TUP', 'year_finished' => 2022]],
        ])->assertOk();

        $this->getJson('/api/candidate/dashboard')->assertJsonPath('data.missing_sections', [])->assertJsonPath('data.needs_count', 2);
    }

    public function test_a_city_without_a_province_is_not_a_location(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web')->putJson('/api/candidate/profile', ['name' => 'Ana', 'city' => 'Quezon City']);

        $this->assertContains('location', $this->getJson('/api/candidate/dashboard')->json('data.missing_sections'));
    }

    public function test_shows_the_three_best_matches(): void
    {
        [$a, $b] = Accommodation::factory()->count(2)->create();
        $seeker = User::factory()->create();
        $seeker->needs()->attach([$a->id, $b->id]);
        foreach (['One need' => [$a], 'Both needs' => [$a, $b], 'Other one' => [$b], 'Third one' => [$a], 'Nothing' => []] as $title => $provides) {
            JobPosting::factory()->open()->create(['title' => $title])->accommodations()->attach(array_map(fn ($item) => $item->id, $provides));
        }

        $top = $this->actingAs($seeker, 'web')->getJson('/api/candidate/dashboard')->json('data.top_matches');

        $this->assertCount(3, $top);
        $this->assertSame('Both needs', $top[0]['title']);
        $this->assertSame(2, $top[0]['match']['needs_met']);
        $this->assertNotContains('Nothing', array_column($top, 'title'));
    }

    public function test_matches_exclude_all_previously_applied_jobs_before_limiting_results(): void
    {
        $need = Accommodation::factory()->create();
        $seeker = User::factory()->create();
        $seeker->needs()->attach($need);
        $available = JobPosting::factory()->open()->count(3)->create();
        foreach ($available as $job) {
            $job->accommodations()->attach($need);
        }
        foreach (['pending', 'reviewed', 'rejected', 'withdrawn', 'hired'] as $status) {
            $job = JobPosting::factory()->open()->create();
            $job->accommodations()->attach($need);
            Application::factory()->create(['user_id' => $seeker->id, 'job_posting_id' => $job->id, 'status' => $status]);
        }
        Application::factory()->create(['job_posting_id' => $available[0]->id]);

        $top = $this->actingAs($seeker, 'web')->getJson('/api/candidate/dashboard')->assertOk()->json('data.top_matches');
        $this->assertEqualsCanonicalizing($available->pluck('id')->all(), array_column($top, 'id'));
    }

    public function test_only_job_seekers_have_a_dashboard(): void
    {
        $this->actingAs(User::factory()->employer()->create(), 'web')->getJson('/api/candidate/dashboard')->assertForbidden();
    }
}
