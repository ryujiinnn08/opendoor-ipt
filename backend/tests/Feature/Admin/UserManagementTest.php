<?php

namespace Tests\Feature\Admin;

use App\Enums\AccountEventType;
use App\Enums\Role;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\AccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

/**
 * The user list, a user's page and adding administrators (plan PHASE_6 §4.1, F10.1).
 */
class UserManagementTest extends TestCase
{
    use BuildsApplications;
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['name' => 'Ana Cruz', 'email' => 'ana@opendoor.test']);
    }

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

    public function test_the_list_is_newest_first_twenty_a_page(): void
    {
        User::factory()->count(21)->create();
        $newest = User::factory()->create(['name' => 'Newest Person']);

        $this->actingAs($this->admin, 'web')->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('data.0.name', 'Newest Person')
            ->assertJsonPath('data.0.id', $newest->id)
            ->assertJsonPath('meta.total', 23)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_search_matches_name_or_email_and_filters_by_role_and_status(): void
    {
        User::factory()->create(['name' => 'Maria Santos', 'email' => 'maria@example.com']);
        User::factory()->create(['name' => 'Jose Reyes', 'email' => 'santos.fan@example.com']);
        User::factory()->suspended()->create(['name' => 'Pedro Santos']);
        User::factory()->employer()->create(['name' => 'Santos Hiring']);

        $names = fn (string $query) => collect($this->actingAs($this->admin, 'web')->getJson("/api/admin/users?{$query}")->assertOk()->json('data'))
            ->pluck('name')->sort()->values()->all();

        $this->assertSame(['Jose Reyes', 'Maria Santos', 'Pedro Santos', 'Santos Hiring'], $names('q=santos'));
        $this->assertSame(['Jose Reyes', 'Maria Santos', 'Pedro Santos'], $names('q=santos&role=candidate'));
        $this->assertSame(['Pedro Santos'], $names('q=santos&status=suspended'));
        $this->assertSame(['Jose Reyes', 'Maria Santos'], $names('q=santos&role=candidate&status=active'));
        $this->assertSame([], $names('q=%25'));
    }

    public function test_unknown_filters_are_refused(): void
    {
        $this->actingAs($this->admin, 'web')->getJson('/api/admin/users?role=owner&status=deleted')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role', 'status']);
    }

    public function test_employers_are_listed_with_their_company_and_role(): void
    {
        $company = $this->hiringCompany();
        $company['company']->update(['name' => 'Acme Corp.']);

        $this->actingAs($this->admin, 'web')->getJson("/api/admin/users?q={$company['hr']->email}")
            ->assertJsonPath('data.0.employer.name', 'Acme Corp.')
            ->assertJsonPath('data.0.employer.member_role', 'hr')
            ->assertJsonPath('data.0.employer.department', 'HR');
    }

    public function test_a_job_seekers_page_shows_counts_and_card_basics_but_never_needs_or_disability(): void
    {
        $company = $this->hiringCompany();
        $hire = $this->applicantTo($company['itJob'], 'hired');
        $this->applicantTo($company['hrJob'], 'pending', [], [], ['user_id' => $hire->user_id]);

        $response = $this->actingAs($this->admin, 'web')->getJson("/api/admin/users/{$hire->user_id}")
            ->assertOk()
            ->assertJsonPath('data.role', 'candidate')
            ->assertJsonPath('data.applications.total', 2)
            ->assertJsonPath('data.applications.hires', 1)
            ->assertJsonMissingPath('data.employer')
            ->assertJsonMissingPath('data.postings')
            // Only what employers see on a card (ADMIN_USERS_PLAN U1).
            ->assertJsonStructure(['data' => ['profile' => ['headline', 'city', 'province', 'photo_version']]]);

        $body = $response->getContent();
        foreach (['contact_number', 'needs', 'disability', 'resume', '0917 555 0199'] as $private) {
            $this->assertStringNotContainsString($private, $body);
        }
    }

    public function test_an_employers_page_lists_their_postings_but_not_drafts(): void
    {
        $company = $this->hiringCompany();
        JobPosting::factory()->in($company['it'])->create(['title' => 'Unsent draft']);

        $postings = $this->actingAs($this->admin, 'web')->getJson("/api/admin/users/{$company['owner']->id}")
            ->assertOk()
            ->assertJsonPath('data.employer.member_role', 'owner')
            ->assertJsonMissingPath('data.applications')
            ->json('data.postings');

        $this->assertEqualsCanonicalizing(['Junior Web Developer', 'HR Assistant'], array_column($postings, 'title'));
    }

    public function test_the_history_is_newest_first_with_who_and_why(): void
    {
        $maria = User::factory()->create();
        $accounts = app(AccountService::class);
        $accounts->suspend($maria, $this->admin, 'Posted fake jobs, reported by 3 job seekers.');
        $accounts->reactivate($maria, $this->admin);

        $this->actingAs($this->admin, 'web')->getJson("/api/admin/users/{$maria->id}")
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.is_you', false)
            ->assertJsonPath('data.history.0.type', 'reactivated')
            ->assertJsonPath('data.history.0.by', 'Ana Cruz')
            ->assertJsonPath('data.history.1.type', 'suspended')
            ->assertJsonPath('data.history.1.reason', 'Posted fake jobs, reported by 3 job seekers.');
    }

    public function test_an_admin_sees_their_own_page_marked(): void
    {
        $this->actingAs($this->admin, 'web')->getJson("/api/admin/users/{$this->admin->id}")
            ->assertJsonPath('data.is_you', true);
    }

    public function test_adding_an_administrator_returns_a_temporary_password_once(): void
    {
        $response = $this->actingAs($this->admin, 'web')->postJson('/api/admin/users', [
            'name' => 'Rosa Lim',
            'email' => ' Rosa@OpenDoor.test ',
            'role' => 'candidate',
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'rosa@opendoor.test')
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.must_change_password', true)
            ->assertJsonPath('data.history.0.type', 'admin_created')
            ->assertJsonPath('data.history.0.by', 'Ana Cruz');

        $password = $response->json('temporary_password');
        $this->assertSame(AccountService::TEMPORARY_PASSWORD_LENGTH, strlen($password));
        $this->assertMatchesRegularExpression('/[A-Z]/', $password);
        $this->assertMatchesRegularExpression('/[a-z]/', $password);
        $this->assertMatchesRegularExpression('/[0-9]/', $password);

        $rosa = User::firstWhere('email', 'rosa@opendoor.test');
        $this->assertSame(Role::Admin, $rosa->role);
        $this->assertNotSame($password, $rosa->password);
        $this->assertTrue(Hash::check($password, $rosa->password));

        // Shown once: the account's page never repeats it.
        $this->getJson("/api/admin/users/{$rosa->id}")->assertJsonMissingPath('temporary_password');
    }

    public function test_a_new_administrator_needs_a_name_and_an_unused_email(): void
    {
        $this->actingAs($this->admin, 'web')->postJson('/api/admin/users', ['email' => 'ana@opendoor.test'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email'])
            ->assertJsonPath('errors.email.0', 'An account with this email already exists.');
    }

    public function test_a_new_administrator_must_change_the_password_before_anything_else(): void
    {
        $password = $this->actingAs($this->admin, 'web')
            ->postJson('/api/admin/users', ['name' => 'Rosa Lim', 'email' => 'rosa@opendoor.test'])
            ->json('temporary_password');
        $this->postJson('/api/logout');
        // Each real request starts fresh; forget the admin resolved by actingAs.
        $this->app['auth']->forgetGuards();

        $this->postJson('/api/login', ['email' => 'rosa@opendoor.test', 'password' => $password])
            ->assertOk()
            ->assertJsonPath('data.email', 'rosa@opendoor.test')
            ->assertJsonPath('data.must_change_password', true);
        $this->getJson('/api/me')->assertOk();
        $this->getJson('/api/admin/dashboard')
            ->assertForbidden()
            ->assertJsonPath('message', 'Change your temporary password before you continue.');

        $this->putJson('/api/me/password', [
            'current_password' => $password,
            'password' => 'Rosa_New_2026',
            'password_confirmation' => 'Rosa_New_2026',
        ])->assertOk()->assertJsonPath('data.must_change_password', false);

        $this->getJson('/api/admin/dashboard')->assertOk();
        $this->assertSame(
            [AccountEventType::PasswordChanged, AccountEventType::AdminCreated],
            User::firstWhere('email', 'rosa@opendoor.test')->accountEvents->pluck('type')->all(),
        );
    }

    public function test_a_lost_temporary_password_can_be_replaced_once_more(): void
    {
        $first = $this->actingAs($this->admin, 'web')
            ->postJson('/api/admin/users', ['name' => 'Rosa Lim', 'email' => 'rosa@opendoor.test'])
            ->json('temporary_password');
        $rosa = User::firstWhere('email', 'rosa@opendoor.test');

        $second = $this->postJson("/api/admin/users/{$rosa->id}/temporary-password")
            ->assertOk()
            ->assertJsonPath('data.history.0.type', 'temporary_password_replaced')
            ->assertJsonPath('data.history.0.by', 'Ana Cruz')
            ->json('temporary_password');

        $this->assertSame(AccountService::TEMPORARY_PASSWORD_LENGTH, strlen($second));
        $this->assertFalse(Hash::check($first, $rosa->fresh()->password));
        $this->assertTrue(Hash::check($second, $rosa->fresh()->password));
    }

    public function test_only_an_administrator_still_on_a_temporary_password_gets_a_new_one(): void
    {
        $settled = User::factory()->admin()->create();
        $seeker = User::factory()->create();
        $this->actingAs($this->admin, 'web');

        $this->postJson("/api/admin/users/{$settled->id}/temporary-password")->assertUnprocessable();
        $this->postJson("/api/admin/users/{$seeker->id}/temporary-password")->assertUnprocessable();
        $this->admin->forceFill(['must_change_password' => true])->save();
        $this->postJson("/api/admin/users/{$this->admin->id}/temporary-password")->assertForbidden();
    }

    public function test_registration_still_refuses_the_admin_role(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Not An Admin',
            'email' => 'sneaky@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'role' => 'admin',
            'consent' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors(['role']);
    }

    public function test_logging_in_records_the_time(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 16)->setTime(9, 0));
        $maria = User::factory()->create(['email' => 'maria@example.com']);

        $this->postJson('/api/login', ['email' => 'maria@example.com', 'password' => 'Password@123'])->assertOk();

        $this->assertSame('2026-10-16 09:00', $maria->fresh()->last_login_at->format('Y-m-d H:i'));
    }
}
