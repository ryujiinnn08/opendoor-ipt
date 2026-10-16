<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

/**
 * The "confirm your email" message (EMAIL_VERIFICATION_PLAN §2.5), in short, plain words.
 *
 * The link is signed without the host, so it stays valid behind Cloudflare and Railway's proxy,
 * and points at the API's public address (APP_URL), which then sends the person to the website.
 */
class VerifyEmailAddress extends VerifyEmail
{
    protected function verificationUrl($notifiable): string
    {
        $path = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(self::lifetimeMinutes()),
            ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification())],
            absolute: false,
        );

        return rtrim((string) config('app.url'), '/').$path;
    }

    protected function buildMailMessage($url): MailMessage
    {
        $hours = intdiv(self::lifetimeMinutes(), 60);

        return (new MailMessage)
            ->subject('Confirm your email for OpenDoor')
            ->greeting('Hello,')
            ->line('Thank you for creating an OpenDoor account. Please confirm that this is your email address.')
            ->action('Confirm my email', $url)
            ->line("The link works for {$hours} hours. After that, log in to OpenDoor and ask for a new link.")
            ->line('If you did not create an OpenDoor account, you can ignore this email.')
            ->salutation('The OpenDoor team')
            // Shown in OpenDoor's look; the lines above stay as the message's content for tests and logs.
            ->view(['html' => 'mail.verify-email-html', 'text' => 'mail.verify-email'], ['hours' => $hours]);
    }

    private static function lifetimeMinutes(): int
    {
        return (int) config('auth.verification.expire', 60);
    }
}
