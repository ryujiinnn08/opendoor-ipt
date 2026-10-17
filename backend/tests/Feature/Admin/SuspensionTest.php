<?php

namespace Tests\Feature\Admin;

use App\Enums\AccountEventType;
use App\Models\User;
use App\Services\AccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

/**
 * Suspending and reactivating accounts (plan PHASE_6 §4.1, M1, Q2, Q6).
 */
class SuspensionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['name' => 'Ana Cruz']);
    }

    private function storeSession(string $id, User $user): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'payload' => base64_encode(serialize([])),
            'last_activity' => now()->getTimestamp(),
        ]);
    }

    public function test_suspending_needs_a_reason(): void
    {
        $maria = User::factory()->create();

        $this->actingAs($this->admin, 'web')->patchJson("/api/admin/users/{$maria->id}/suspend", ['suspended' => true, 'reason' => '  '])
            ->assertUnprocessable()
            ->assertJsonPath('errors.reason.0', 'Say why you are suspending this account.');
        $this->patchJson("/api/admin/users/{$maria->id}/suspend", ['suspended' => true, 'reason' => 'Bad'])
            ->assertJsonPath('errors.reason.0', 'Use at least 5 characters.');
        $this->patchJson("/api/admin/users/{$maria->id}/suspend", [])
            ->assertJsonValidationErrors(['suspended']);

        $this->assertTrue($maria->fresh()->is_active);
    }

    public function test_suspending_stops_the_account_and_records_who_and_why(): void
    {
        $maria = User::factory()->create();

        $this->actingAs($this->admin, 'web')
            ->patchJson("/api/admin/users/{$maria->id}/suspend", ['suspended' => true, 'reason' => 'Posted fake jobs.'])
            ->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.history.0.type', 'suspended')
            ->assertJsonPath('data.history.0.reason', 'Posted fake jobs.')
            ->assertJsonPath('data.history.0.by', 'Ana Cruz');

        $this->assertFalse($maria->fresh()->is_active);
    }

    public function test_suspending_ends_every_session_of_that_person_only(): void
    {
        config(['session.driver' => 'database']);
        $maria = User::factory()->create();
        $other = User::factory()->create();
        $this->storeSession('maria-phone', $maria);
        $this->storeSession('maria-laptop', $maria);
        $this->storeSession('other-laptop', $other);

        $this->actingAs($this->admin, 'web')
            ->patchJson("/api/admin/users/{$maria->id}/suspend", ['suspended' => true, 'reason' => 'Posted fake jobs.'])
            ->assertOk();

        $this->assertSame(0, DB::table('sessions')->where('user_id', $maria->id)->count());
        $this->assertTrue(DB::table('sessions')->where('id', 'other-laptop')->exists());
    }

    public function test_a_suspended_person_is_refused_at_once_and_cannot_log_in(): void
    {
        $maria = User::factory()->create(['email' => 'maria@example.com']);
        app(AccountService::class)->suspend($maria, $this->admin, 'Posted fake jobs.');

        $this->actingAs($maria->fresh(), 'web')->getJson('/api/me')->assertForbidden();
        $this->postJson('/api/login', ['email' => 'maria@example.com', 'password' => 'Password@123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'This account has been suspended. Contact the OpenDoor administrators for help.')
            ->assertJsonPath('code', 'account_suspended');
    }

    public function test_reactivating_restores_the_account_and_is_recorded(): void
    {
        $maria = User::factory()->suspended()->create(['email' => 'maria@example.com']);

        $this->actingAs($this->admin, 'web')->patchJson("/api/admin/users/{$maria->id}/suspend", ['suspended' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.history.0.type', 'reactivated')
            ->assertJsonPath('data.history.0.reason', null);
        $this->postJson('/api/logout');

        $this->postJson('/api/login', ['email' => 'maria@example.com', 'password' => 'Password@123'])->assertOk();
    }

    public function test_suspending_or_reactivating_twice_is_refused(): void
    {
        $active = User::factory()->create();
        $suspended = User::factory()->suspended()->create();

        $this->actingAs($this->admin, 'web')
            ->patchJson("/api/admin/users/{$suspended->id}/suspend", ['suspended' => true, 'reason' => 'Posted fake jobs.'])
            ->assertConflict();
        $this->patchJson("/api/admin/users/{$active->id}/suspend", ['suspended' => false])->assertConflict();

        $this->assertSame(0, $active->accountEvents()->count() + $suspended->accountEvents()->count());
    }

    public function test_an_admin_cannot_suspend_themself(): void
    {
        $this->actingAs($this->admin, 'web')
            ->patchJson("/api/admin/users/{$this->admin->id}/suspend", ['suspended' => true, 'reason' => 'Testing the guard.'])
            ->assertUnprocessable()
            ->assertJsonPath('message', "You can't suspend your own account.");

        $this->assertTrue($this->admin->fresh()->is_active);
    }

    public function test_another_administrator_can_be_suspended(): void
    {
        $rosa = User::factory()->admin()->create();

        $this->actingAs($this->admin, 'web')
            ->patchJson("/api/admin/users/{$rosa->id}/suspend", ['suspended' => true, 'reason' => 'Left the team.'])
            ->assertOk();

        $this->assertFalse($rosa->fresh()->is_active);
    }

    public function test_the_last_active_administrator_stays_active(): void
    {
        // Only reachable by an actor who is no longer active (e.g., suspended a moment earlier).
        $this->admin->forceFill(['is_active' => false])->save();
        $rosa = User::factory()->admin()->create();

        try {
            app(AccountService::class)->suspend($rosa, $this->admin, 'Left the team.');
            $this->fail('The last active administrator was suspended.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
            $this->assertSame('OpenDoor needs at least one active administrator.', $exception->getMessage());
        }

        $this->assertTrue($rosa->fresh()->is_active);
        $this->assertFalse($rosa->accountEvents()->where('type', AccountEventType::Suspended)->exists());
    }
}
