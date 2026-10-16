<?php

namespace Tests\Feature\Public;

use App\Mail\ContactMessage;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * The "Contact us" form: emails the team inbox, with the visitor as reply-to.
 */
class ContactTest extends TestCase
{
    private const INBOX = 'team@example.com';

    protected function setUp(): void
    {
        parent::setUp();
        config(['mail.contact_to' => self::INBOX]);
    }

    /**
     * @return array<string, string>
     */
    private function form(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Maria Santos',
            'email' => 'maria@example.com',
            'message' => 'I cannot upload my resume. Can you help?',
        ], $overrides);
    }

    public function test_a_visitor_can_send_a_message_to_the_team_inbox(): void
    {
        Mail::fake();

        $this->postJson('/api/contact', $this->form())
            ->assertAccepted()
            ->assertJsonPath('message', 'Thank you. Your message was sent. We will reply by email.');

        Mail::assertSent(ContactMessage::class, fn (ContactMessage $mail) => $mail->hasTo(self::INBOX)
            && $mail->hasReplyTo('maria@example.com')
            && $mail->senderName === 'Maria Santos'
            && str_contains($mail->body, 'resume'));
        Mail::assertSentCount(1);
    }

    public function test_the_mail_is_readable_text_with_the_senders_details(): void
    {
        $mail = new ContactMessage('Maria Santos', 'maria@example.com', 'I need help with <b>my</b> account.');

        $mail->assertSeeInText('From: Maria Santos <maria@example.com>');
        $mail->assertSeeInText('I need help with <b>my</b> account.');
    }

    public function test_the_styled_version_escapes_the_message_and_keeps_its_line_breaks(): void
    {
        config(['opendoor.frontend_url' => 'https://opendoor.example']);
        $mail = new ContactMessage('Maria Santos', 'maria@example.com', "Line one <script>x</script>\nLine two");

        $mail->assertSeeInHtml('New message from Maria Santos');
        $mail->assertSeeInHtml('&lt;script&gt;x&lt;/script&gt;<br />', false);
        $mail->assertDontSeeInHtml('<script>', false);
        $mail->assertSeeInHtml('href="mailto:maria@example.com?subject=Re%3A%20Your%20message%20to%20OpenDoor"', false);
        $mail->assertSeeInHtml('src="https://opendoor.example/email-logo.png"', false);
        $mail->assertSeeInHtml('(Philippine time)');
    }

    public function test_a_name_cannot_put_line_breaks_in_the_subject(): void
    {
        $mail = new ContactMessage("Maria\r\nBcc: spam@example.com", 'maria@example.com', 'Hello team, please help.');

        $this->assertSame('OpenDoor contact form: Maria Bcc: spam@example.com', $mail->envelope()->subject);
    }

    public function test_missing_fields_are_rejected_with_plain_messages(): void
    {
        Mail::fake();

        $this->postJson('/api/contact', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'message'])
            ->assertJsonPath('errors.name.0', 'Enter your name.')
            ->assertJsonPath('errors.email.0', 'Enter your email address.')
            ->assertJsonPath('errors.message.0', 'Write your message.');

        Mail::assertNothingSent();
    }

    public function test_the_email_and_message_must_be_valid(): void
    {
        Mail::fake();

        $this->postJson('/api/contact', $this->form(['email' => 'not-an-email', 'message' => 'Hi']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Enter a valid email address, like name@example.com.')
            ->assertJsonPath('errors.message.0', 'Write at least 10 characters so we can understand your message.');

        $this->postJson('/api/contact', $this->form(['message' => str_repeat('a', 2001)]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.message.0', 'Your message must be 2,000 characters or fewer.');

        Mail::assertNothingSent();
    }

    public function test_a_filled_trap_field_gets_a_thank_you_but_sends_nothing(): void
    {
        Mail::fake();

        $this->postJson('/api/contact', $this->form(['website' => 'https://spam.example']))
            ->assertAccepted();

        Mail::assertNothingSent();
    }

    public function test_it_says_unavailable_when_no_inbox_is_set(): void
    {
        Mail::fake();
        config(['mail.contact_to' => null]);

        $this->postJson('/api/contact', $this->form())->assertStatus(503);

        Mail::assertNothingSent();
    }

    public function test_a_mail_failure_gives_a_friendly_error(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('Resend is down'));

        $this->postJson('/api/contact', $this->form())
            ->assertStatus(503)
            ->assertJsonPath('message', 'We could not send your message. Please try again in a few minutes.');
    }

    public function test_it_allows_five_messages_a_minute_then_slows_down(): void
    {
        Mail::fake();

        foreach (range(1, 5) as $i) {
            $this->postJson('/api/contact', $this->form())->assertAccepted();
        }

        $this->postJson('/api/contact', $this->form())->assertStatus(429);
        Mail::assertSentCount(5);
    }
}
