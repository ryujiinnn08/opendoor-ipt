<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * An administrator confirms someone's email for them when the link can't reach them.
 */
class ConfirmEmailTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['name' => 'Ana Cruz']);
    }

    private function confirm(User $user, ?string $reason = 'The confirmation email never arrived.')
    {
        return $this->actingAs($this->admin, 'web')->postJson("/api/admin/users/{$user->id}/confirm-email", ['reason' => $reason]);
    }

    public function test_an_admin_confirms_an_employers_email_and_the_history_keeps_why(): void
    {
        $employer = User::factory()->employer()->unverified()->create();

        $this->actingAs($this->admin, 'web')->getJson("/api/admin/users/{$employer->id}")
            ->assertJsonPath('data.email_confirmed', false);

        $this->confirm($employer, '  The confirmation email never arrived. ')
            ->assertOk()
            ->assertJsonPath('data.email_confirmed', true)
            ->assertJsonPath('data.history.0.type', 'email_confirmed')
            ->assertJsonPath('data.history.0.by', 'Ana Cruz')
            ->assertJsonPath('data.history.0.reason', 'The confirmation email never arrived.');

        $this->assertTrue($employer->fresh()->hasVerifiedEmail());
    }

    public function test_a_job_seekers_email_can_be_confirmed_too(): void
    {
        $candidate = User::factory()->unverified()->create();

        $this->confirm($candidate)->assertOk();

        $this->assertTrue($candidate->fresh()->hasVerifiedEmail());
    }

    public function test_a_reason_is_required(): void
    {
        $employer = User::factory()->employer()->unverified()->create();

        $this->confirm($employer, '')->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->confirm($employer, 'ok')->assertUnprocessable()->assertJsonValidationErrors('reason');

        $this->assertFalse($employer->fresh()->hasVerifiedEmail());
    }

    public function test_an_email_already_confirmed_is_refused(): void
    {
        $employer = User::factory()->employer()->create();

        $this->confirm($employer)->assertConflict();
        $this->assertSame(0, $employer->accountEvents()->count());
    }

    public function test_not_for_administrators_or_ones_own_account(): void
    {
        $other = User::factory()->admin()->unverified()->create();

        $this->confirm($other)->assertUnprocessable();
        $this->confirm($this->admin)->assertUnprocessable();
    }

    public function test_only_administrators_can_confirm_an_email(): void
    {
        $employer = User::factory()->employer()->unverified()->create();
        $someone = User::factory()->employer()->create();

        $this->actingAs($someone, 'web')->postJson("/api/admin/users/{$employer->id}/confirm-email", ['reason' => 'Let me in please.'])
            ->assertForbidden();
        $this->assertFalse($employer->fresh()->hasVerifiedEmail());
    }
}
