<?php

namespace Tests\Feature\Candidate;

use App\Models\Accommodation;
use App\Models\JobPosting;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Needs, profile, résumé and disability type never reach anyone but their job seeker (plan PHASE_3 §6.2, §8).
 */
class PrivacyTest extends TestCase
{
    use RefreshDatabase;

    private const ROUTES = [
        ['get', '/api/candidate/profile'], ['put', '/api/candidate/profile'],
        ['get', '/api/candidate/accommodations'], ['put', '/api/candidate/accommodations'],
        ['get', '/api/candidate/resume'], ['post', '/api/candidate/resume'], ['delete', '/api/candidate/resume'],
        ['get', '/api/candidate/dashboard'],
    ];

    public function test_no_other_role_can_reach_candidate_data(): void
    {
        foreach (self::ROUTES as [$method, $uri]) {
            $this->json($method, $uri)->assertUnauthorized();
        }
        foreach ([User::factory()->employer()->create(), User::factory()->admin()->create()] as $other) {
            $this->actingAs($other, 'web');
            foreach (self::ROUTES as [$method, $uri]) {
                $this->json($method, $uri, ['name' => 'X'])->assertForbidden();
            }
        }
    }

    public function test_another_job_seeker_only_ever_reads_their_own_profile(): void
    {
        $ana = User::factory()->create();
        $this->actingAs($ana, 'web')->putJson('/api/candidate/profile', ['name' => 'Ana', 'headline' => 'Ana private headline', 'disability_type' => 'visual']);

        $body = $this->actingAs(User::factory()->create(), 'web')->getJson('/api/candidate/profile')->assertOk()->getContent();

        $this->assertStringNotContainsString('Ana private headline', $body);
        $this->assertStringNotContainsString('visual', $body);
    }

    public function test_public_job_data_never_carries_a_job_seekers_needs(): void
    {
        $need = Accommodation::factory()->create(['name' => 'Very specific need']);
        $seeker = User::factory()->create();
        $seeker->needs()->attach($need->id);
        $this->actingAs($seeker, 'web')->putJson('/api/candidate/profile', ['name' => 'Ana', 'disability_type' => 'psychosocial']);
        $job = JobPosting::factory()->open()->create();

        foreach ([User::factory()->employer()->create(), User::factory()->admin()->create()] as $other) {
            $this->actingAs($other, 'web');
            foreach (['/api/job-postings?match=1&sort=match', "/api/job-postings/{$job->id}"] as $uri) {
                $body = $this->getJson($uri)->assertOk()->getContent();
                $this->assertStringNotContainsString('"match"', $body);
                $this->assertStringNotContainsString('Very specific need', $body);
                $this->assertStringNotContainsString('psychosocial', $body);
            }
        }
    }

    public function test_applications_stay_with_their_job_seeker(): void
    {
        $this->seed(DatabaseSeeder::class);
        $owner = User::firstWhere('email', UserSeeder::DEMO_CANDIDATE_EMAIL);
        $application = $owner->applications()->whereNotNull('cover_note')->firstOrFail();
        $others = [
            User::firstWhere('email', UserSeeder::DEMO_CANDIDATE2_EMAIL),
            // Another company's owner (Demo Corp.'s own owner and HR see their applicants in 4B).
            User::firstWhere('email', UserSeeder::DEMO_EMPLOYER2_EMAIL),
            User::firstWhere('email', UserSeeder::LOCAL_ADMIN_EMAIL),
        ];

        foreach ($others as $other) {
            $this->flushSession();
            $this->actingAs($other, 'web');
            $this->getJson("/api/applications/{$application->id}")->assertForbidden();
            $this->patchJson("/api/applications/{$application->id}/status", ['status' => 'hired', 'expected_status' => 'pending'])->assertForbidden();
            $response = $this->getJson("/api/job-postings/{$application->job_posting_id}")->assertOk();
            // candidate2@ applied to the same demo job; she sees only her own application.
            $this->assertNotSame($application->id, $response->json('data.my_application.id'));
            $this->assertStringNotContainsString($application->cover_note, $response->getContent());
        }
        $this->assertSame('pending', $application->fresh()->status->value);
    }
}
