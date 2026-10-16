<?php

namespace App\Services;

use App\Models\User;
use Throwable;

/**
 * Sends the "confirm your email" message (EMAIL_VERIFICATION_PLAN). A mail service outage never
 * blocks creating an account: the failure is logged and the person can ask for a new link.
 */
class EmailVerification
{
    /**
     * @return bool Whether the email was handed to the mail service.
     */
    public function send(User $user): bool
    {
        try {
            $user->sendEmailVerificationNotification();

            return true;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }
}
