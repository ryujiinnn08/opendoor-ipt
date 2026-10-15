<?php

namespace Tests\Feature\Admin;

use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 6A users, suspension, adding administrators and removing postings (plan PHASE_6 §4.1–4.2).
 * The scaffold pins who can reach each address; the rules arrive with 6A step 1.
 */
class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return list<array{0: string, 1: string}>
     */
    private function adminAddresses(User $user, JobPosting $posting): array
    {
        return [
            ['GET', '/api/admin/users'],
            ['POST', '/api/admin/users'],
            ['GET', "/api/admin/users/{$user->id}"],
            ['PATCH', "/api/admin/users/{$user->id}/suspend"],
            ['DELETE', "/api/admin/job-postings/{$posting->id}"],
        ];
    }

    public function test_only_administrators_reach_the_user_and_removal_addresses(): void
    {
        $candidate = User::factory()->create();
        $employer = User::factory()->employer()->create();
        $posting = JobPosting::factory()->open()->create();

        foreach ([$candidate, $employer] as $user) {
            foreach ($this->adminAddresses($candidate, $posting) as [$method, $uri]) {
                $this->actingAs($user, 'web')->json($method, $uri)->assertForbidden();
            }
        }
    }

    public function test_guests_must_log_in_first(): void
    {
        $candidate = User::factory()->create();
        $posting = JobPosting::factory()->open()->create();

        foreach ($this->adminAddresses($candidate, $posting) as [$method, $uri]) {
            $this->json($method, $uri)->assertUnauthorized();
        }
        $this->putJson('/api/me/password')->assertUnauthorized();
    }

    public function test_new_accounts_need_no_password_change_and_have_no_history(): void
    {
        $user = User::factory()->create();

        $this->assertFalse($user->must_change_password);
        $this->assertNull($user->last_login_at);
        $this->assertCount(0, $user->accountEvents);
    }
}
