<?php

namespace Tests\Feature\Auth;

use App\Enums\AccountEventType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Change password, for every portal (plan PHASE_6 §4.1, F1.6, Q5).
 */
class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function change(string $current = 'Password@123', string $new = 'Better@2026', ?string $confirm = null): array
    {
        return ['current_password' => $current, 'password' => $new, 'password_confirmation' => $confirm ?? $new];
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function roles(): array
    {
        return ['job seeker' => ['candidate'], 'employer' => ['employer'], 'administrator' => ['admin']];
    }

    #[DataProvider('roles')]
    public function test_every_role_can_change_their_password(string $role): void
    {
        $user = User::factory()->create(['role' => $role]);

        $this->actingAs($user, 'web')->putJson('/api/me/password', $this->change())
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);

        $this->assertTrue(Hash::check('Better@2026', $user->fresh()->password));
        $this->assertSame(AccountEventType::PasswordChanged, $user->accountEvents()->first()->type);
        $this->assertNull($user->accountEvents()->first()->actor_id);
    }

    public function test_the_current_password_must_be_right(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')->putJson('/api/me/password', $this->change(current: 'Wrong@123'))
            ->assertUnprocessable()
            ->assertJsonPath('errors.current_password.0', "That isn't your current password.");

        $this->assertTrue(Hash::check('Password@123', $user->fresh()->password));
    }

    public function test_the_new_password_follows_the_registration_rules(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web');

        $this->putJson('/api/me/password', $this->change(new: 'short'))->assertJsonValidationErrors(['password']);
        $this->putJson('/api/me/password', $this->change(confirm: 'Different@2026'))
            ->assertJsonPath('errors.password.0', 'The two new passwords do not match.');
        $this->putJson('/api/me/password', $this->change(new: 'Password@123'))
            ->assertJsonPath('errors.password.0', 'Choose a password different from your current one.');

        $this->assertSame(0, $user->accountEvents()->count());
    }

    public function test_changing_it_ends_the_other_sessions_but_not_this_one(): void
    {
        config(['session.driver' => 'database']);
        $user = User::factory()->create();
        $other = User::factory()->create();
        DB::table('sessions')->insert([
            ['id' => 'old-phone', 'user_id' => $user->id, 'payload' => '', 'last_activity' => now()->getTimestamp()],
            ['id' => 'someone-else', 'user_id' => $other->id, 'payload' => '', 'last_activity' => now()->getTimestamp()],
        ]);

        $this->actingAs($user, 'web')->putJson('/api/me/password', $this->change())->assertOk();

        $this->assertFalse(DB::table('sessions')->where('id', 'old-phone')->exists());
        $this->assertTrue(DB::table('sessions')->where('id', 'someone-else')->exists());
        $this->getJson('/api/me')->assertOk();
    }

    public function test_it_clears_the_forced_change(): void
    {
        $user = User::factory()->admin()->create();
        $user->forceFill(['must_change_password' => true])->save();

        $this->actingAs($user, 'web')->putJson('/api/me/password', $this->change())
            ->assertJsonPath('data.must_change_password', false);

        $this->assertFalse($user->fresh()->must_change_password);
    }
}
