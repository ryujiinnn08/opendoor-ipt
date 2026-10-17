<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Notifications\VerifyEmailAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Editing an account's name or email, and the list's card basics (ADMIN_USERS_PLAN).
 */
class UserEditTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['name' => 'Ana Cruz']);
    }

    private function edit(User $user, array $values)
    {
        return $this->actingAs($this->admin, 'web')->patchJson("/api/admin/users/{$user->id}", [
            'name' => $user->name,
            'email' => $user->email,
            'reason' => 'Asked by email to fix a typo.',
            ...$values,
        ]);
    }

    public function test_an_admin_corrects_a_name_and_the_history_keeps_what_and_why(): void
    {
        $maria = User::factory()->create(['name' => 'Maria Santo']);

        $this->edit($maria, ['name' => '  Maria Santos '])
            ->assertOk()
            ->assertJsonPath('data.name', 'Maria Santos')
            ->assertJsonPath('data.history.0.type', 'details_edited')
            ->assertJsonPath('data.history.0.by', 'Ana Cruz')
            ->assertJsonPath('data.history.0.reason', 'Name: Maria Santo → Maria Santos. Why: Asked by email to fix a typo.');

        $this->assertNotNull($maria->fresh()->email_verified_at);
    }

    public function test_a_new_email_must_be_confirmed_again_and_gets_a_link(): void
    {
        Notification::fake();
        $maria = User::factory()->create(['email' => 'maria@example.com']);

        $this->edit($maria, ['email' => 'Maria.Santos@Example.com'])
            ->assertOk()
            ->assertJsonPath('data.email', 'maria.santos@example.com');

        $this->assertNull($maria->fresh()->email_verified_at);
        Notification::assertSentTo($maria->fresh(), VerifyEmailAddress::class);
    }

    public function test_an_administrators_new_email_stays_confirmed(): void
    {
        Notification::fake();
        $other = User::factory()->admin()->create();

        $this->edit($other, ['email' => 'new-admin@opendoor.test'])->assertOk();

        $this->assertNotNull($other->fresh()->email_verified_at);
        Notification::assertNothingSent();
    }

    public function test_nobody_edits_their_own_account_here(): void
    {
        $this->edit($this->admin, ['name' => 'Someone Else'])->assertUnprocessable();
        $this->assertSame('Ana Cruz', $this->admin->fresh()->name);
    }

    public function test_an_edit_needs_a_reason_a_free_email_and_a_change(): void
    {
        $maria = User::factory()->create();
        $taken = User::factory()->create();

        $this->edit($maria, ['reason' => 'ok', 'email' => $taken->email, 'name' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reason', 'email', 'name']);
        $this->edit($maria, [])->assertUnprocessable()->assertJsonValidationErrors(['name']);
        $this->assertCount(0, $maria->accountEvents);
    }

    public function test_only_administrators_edit_accounts(): void
    {
        $maria = User::factory()->create();

        $this->actingAs(User::factory()->employer()->create(), 'web')
            ->patchJson("/api/admin/users/{$maria->id}", ['name' => 'X', 'email' => 'x@example.com', 'reason' => 'Because.'])
            ->assertForbidden();
    }

    public function test_the_list_shows_last_login_and_a_job_seekers_card_basics(): void
    {
        $maria = User::factory()->create(['name' => 'Maria Santos', 'last_login_at' => now()]);
        $maria->candidateProfile()->create(['headline' => 'Data encoder', 'city' => 'Quezon City', 'province' => 'Metro Manila', 'contact_number' => '0917 555 0199']);

        $response = $this->actingAs($this->admin, 'web')->getJson('/api/admin/users?q=Maria')
            ->assertOk()
            ->assertJsonPath('data.0.profile.headline', 'Data encoder')
            ->assertJsonPath('data.0.profile.city', 'Quezon City')
            ->assertJsonPath('data.0.profile.photo_version', null);

        $this->assertNotNull($response->json('data.0.last_login_at'));
        $this->assertStringNotContainsString('0917 555 0199', $response->getContent());
    }

    public function test_a_photo_is_shown_to_admins_only_when_shared_with_employers(): void
    {
        Storage::fake('local');
        $maria = User::factory()->create();
        $path = UploadedFile::fake()->image('me.jpg')->store('photos', 'local');
        $profile = $maria->candidateProfile()->create([]);
        $profile->forceFill(['photo_path' => $path, 'show_photo_to_employers' => false])->save();

        $this->actingAs($this->admin, 'web')->get("/api/admin/users/{$maria->id}/photo")->assertNotFound();
        $this->getJson("/api/admin/users/{$maria->id}")->assertJsonPath('data.profile.photo_version', null);

        $profile->forceFill(['show_photo_to_employers' => true])->save();
        $this->get("/api/admin/users/{$maria->id}/photo")->assertOk();
        $this->assertNotNull($this->getJson("/api/admin/users/{$maria->id}")->json('data.profile.photo_version'));
    }
}
