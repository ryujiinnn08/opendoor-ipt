<?php

namespace Tests\Feature\Auth;

use App\Models\Application;
use App\Models\DepartmentInvite;
use App\Models\JobPosting;
use App\Models\User;
use App\Notifications\VerifyEmailAddress;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Events\NotificationSending;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use RuntimeException;
use Tests\Concerns\BuildsTeams;
use Tests\TestCase;

/**
 * Email verification (EMAIL_VERIFICATION_PLAN): the email on sign-up, the signed link, sending it
 * again, and the gate on applying and posting.
 */
class EmailVerificationTest extends TestCase
{
    use BuildsTeams, RefreshDatabase;

    private const VERIFIED = 'http://localhost:5173/?verified=1';

    private const FAILED = 'http://localhost:5173/?verified=0';

    private function registration(array $overrides = []): array
    {
        return array_merge([
            'role' => 'candidate',
            'name' => 'Maria Santos',
            'email' => 'maria@example.com',
            'password' => 'Secure@123',
            'password_confirmation' => 'Secure@123',
            'consent' => true,
        ], $overrides);
    }

    /**
     * The link in the email sent to $user (Notification must be faked).
     */
    private function linkSentTo(User $user): string
    {
        $url = null;
        Notification::assertSentTo($user, VerifyEmailAddress::class, function (VerifyEmailAddress $notification) use ($user, &$url) {
            $url = $notification->toMail($user)->actionUrl;

            return true;
        });

        return $url;
    }

    private function linkFor(User $user): string
    {
        Notification::fake();
        $user->sendEmailVerificationNotification();

        return $this->linkSentTo($user);
    }

    public function test_registering_sends_the_email_and_still_logs_the_person_in(): void
    {
        Notification::fake();

        $this->postJson('/api/register', $this->registration())
            ->assertCreated()
            ->assertJsonPath('data.email_verified', false);

        $user = User::firstWhere('email', 'maria@example.com');
        $this->assertAuthenticatedAs($user, 'web');
        Notification::assertSentToTimes($user, VerifyEmailAddress::class, 1);
    }

    public function test_the_email_is_short_and_plain_and_links_to_the_api(): void
    {
        $user = User::factory()->unverified()->create();
        $mail = (new VerifyEmailAddress)->toMail($user);

        $this->assertSame('Confirm your email for OpenDoor', $mail->subject);
        $this->assertSame('Confirm my email', $mail->actionText);
        $this->assertStringStartsWith(rtrim(config('app.url'), '/')."/api/email/verify/{$user->id}/", $mail->actionUrl);
        $this->assertContains('The link works for 24 hours. After that, log in to OpenDoor and ask for a new link.', $mail->outroLines);
    }

    public function test_the_email_is_shown_in_opendoors_look_with_a_working_link(): void
    {
        $user = User::factory()->unverified()->create();
        $mail = (new VerifyEmailAddress)->toMail($user);
        $html = (string) $mail->render();

        $this->assertStringContainsString('Confirm your email</h1>', $html);
        $this->assertStringContainsString('href="'.e($mail->actionUrl).'"', $html);
        $this->assertStringContainsString('>Confirm my email</a>', $html);
        $this->assertStringContainsString('The link works for 24 hours.', $html);
        $this->assertStringContainsString('/email-logo.png', $html);
    }

    public function test_registering_works_even_when_the_email_cannot_be_sent(): void
    {
        Event::listen(NotificationSending::class, fn () => throw new RuntimeException('Mail service is down.'));

        $this->postJson('/api/register', $this->registration())
            ->assertCreated()
            ->assertJsonPath('data.email_verified', false);

        $this->assertAuthenticatedAs(User::firstWhere('email', 'maria@example.com'), 'web');
    }

    public function test_joining_a_team_through_an_invite_sends_the_email(): void
    {
        Notification::fake();
        [, , $general] = $this->companyWithOwner();
        DepartmentInvite::factory()->for($general)->withCode('join-code')->create();

        $this->postJson('/api/invites/join-code/accept', array_diff_key($this->registration(), ['role' => true]))
            ->assertCreated()
            ->assertJsonPath('data.email_verified', false);

        Notification::assertSentTo(User::firstWhere('email', 'maria@example.com'), VerifyEmailAddress::class);
    }

    public function test_the_link_confirms_the_email_without_logging_in_and_returns_to_the_website(): void
    {
        $user = User::factory()->unverified()->create();
        $link = $this->linkFor($user);
        Event::fake([Verified::class]);

        $this->get($link)->assertRedirect(self::VERIFIED);

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->assertGuest('web');
        Event::assertDispatched(Verified::class);
    }

    public function test_opening_the_link_again_still_says_confirmed(): void
    {
        $user = User::factory()->unverified()->create();
        $link = $this->linkFor($user);

        $this->get($link)->assertRedirect(self::VERIFIED);
        $this->get($link)->assertRedirect(self::VERIFIED);
    }

    public function test_a_changed_link_does_not_confirm_the_email(): void
    {
        $user = User::factory()->unverified()->create();
        $other = User::factory()->unverified()->create();
        $link = $this->linkFor($user);

        // Another account's id, a different hash, a changed signature, no signature, a word for the id.
        $this->get(str_replace("/verify/{$user->id}/", "/verify/{$other->id}/", $link))->assertRedirect(self::FAILED);
        $this->get(preg_replace('#/verify/(\d+)/[0-9a-f]{40}#', '/verify/$1/'.sha1('someone@else.com'), $link))->assertRedirect(self::FAILED);
        $this->get(preg_replace('/signature=[0-9a-f]+/', 'signature='.str_repeat('a', 64), $link))->assertRedirect(self::FAILED);
        $this->get(strtok($link, '?'))->assertRedirect(self::FAILED);
        $this->get('/api/email/verify/abc/'.sha1($user->email))->assertRedirect(self::FAILED);

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
        $this->assertFalse($other->fresh()->hasVerifiedEmail());
    }

    public function test_an_expired_link_does_not_confirm_the_email(): void
    {
        $user = User::factory()->unverified()->create();
        $link = $this->linkFor($user);

        $this->travel(25)->hours();

        $this->get($link)->assertRedirect(self::FAILED);
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_a_logged_in_person_can_ask_for_the_link_again(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create(['email' => 'maria@example.com']);

        $this->actingAs($user, 'web')->postJson('/api/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('message', 'We sent a new link to maria@example.com.')
            ->assertJsonPath('email_verified', false);

        Notification::assertSentTo($user, VerifyEmailAddress::class);
    }

    public function test_asking_again_after_confirming_sends_nothing(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->actingAs($user, 'web')->postJson('/api/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('email_verified', true);

        Notification::assertNothingSent();
    }

    public function test_asking_again_needs_a_login_and_is_limited(): void
    {
        Notification::fake();
        $this->postJson('/api/email/verification-notification')->assertUnauthorized();

        $user = User::factory()->unverified()->create();
        for ($i = 0; $i < 6; $i++) {
            $this->actingAs($user, 'web')->postJson('/api/email/verification-notification')->assertOk();
        }
        $this->actingAs($user, 'web')->postJson('/api/email/verification-notification')->assertTooManyRequests();
    }

    public function test_asking_again_says_so_when_the_email_cannot_be_sent(): void
    {
        Event::listen(NotificationSending::class, fn () => throw new RuntimeException('Mail service is down.'));
        $user = User::factory()->unverified()->create();

        $this->actingAs($user, 'web')->postJson('/api/email/verification-notification')
            ->assertServiceUnavailable()
            ->assertJsonPath('message', "We couldn't send the email just now. Please try again in a few minutes.");
    }

    public function test_the_account_says_whether_the_email_is_confirmed(): void
    {
        $this->actingAs(User::factory()->unverified()->create(), 'web')->getJson('/api/me')->assertJsonPath('data.email_verified', false);
        $this->actingAs(User::factory()->create(), 'web')->getJson('/api/me')->assertJsonPath('data.email_verified', true);
    }

    public function test_a_job_seeker_confirms_their_email_before_applying(): void
    {
        $job = JobPosting::factory()->open()->create();
        $seeker = User::factory()->unverified()->create();

        $this->actingAs($seeker, 'web')->postJson("/api/job-postings/{$job->id}/applications", [])
            ->assertForbidden()
            ->assertJsonPath('code', 'email_unverified')
            ->assertJsonPath('message', 'Please confirm your email address first. Use the link we sent to your email.');
        $this->assertSame(0, Application::count());

        $seeker->markEmailAsVerified();
        $this->actingAs($seeker->fresh(), 'web')->postJson("/api/job-postings/{$job->id}/applications", [])->assertCreated();
    }

    public function test_an_employer_confirms_their_email_before_posting_but_can_still_browse_and_edit_the_profile(): void
    {
        [, , $general] = $this->companyWithOwner();
        $hr = $this->hrOfficerIn($general);
        $hr->forceFill(['email_verified_at' => null])->save();

        $this->actingAs($hr, 'web')->postJson('/api/employer/job-postings', ['title' => 'Data encoder'])
            ->assertForbidden()
            ->assertJsonPath('code', 'email_unverified');
        $this->assertSame(0, JobPosting::count());

        $this->actingAs($hr, 'web')->getJson('/api/employer/job-postings')->assertOk();
        $this->actingAs($hr, 'web')->getJson('/api/employer/dashboard')->assertOk();

        $hr->markEmailAsVerified();
        $this->actingAs($hr->fresh(), 'web')->postJson('/api/employer/job-postings', ['title' => 'Data encoder'])->assertCreated();
    }

    public function test_an_unconfirmed_job_seeker_can_still_edit_their_profile(): void
    {
        $seeker = User::factory()->unverified()->create();

        $this->actingAs($seeker, 'web')->getJson('/api/candidate/profile')->assertOk();
        $this->actingAs($seeker, 'web')->getJson('/api/candidate/dashboard')->assertOk();
    }

    public function test_seeded_accounts_count_as_confirmed(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(0, User::whereNull('email_verified_at')->count());
    }
}
