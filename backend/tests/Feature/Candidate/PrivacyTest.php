<?php

namespace Tests\Feature\Candidate;

use App\Models\Accommodation;
use App\Models\JobPosting;
use App\Models\User;
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
}
