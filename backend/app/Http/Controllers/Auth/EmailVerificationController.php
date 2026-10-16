<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EmailVerification;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Email verification (EMAIL_VERIFICATION_PLAN §2.4).
 */
class EmailVerificationController extends Controller
{
    /**
     * The link in the email. It needs no session, so it works in any browser, and always ends on
     * the website: /?verified=1 when the email is confirmed, /?verified=0 when the link is wrong
     * or expired.
     */
    public function verify(Request $request, string $id, string $hash): RedirectResponse
    {
        $user = ctype_digit($id) ? User::find($id) : null;

        $valid = $user !== null
            && $request->hasValidRelativeSignature()
            && hash_equals(sha1($user->getEmailForVerification()), $hash);

        if ($valid && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        // markEmailAsVerified() is false only for a failed save; an already confirmed email still counts.
        $verified = $valid && $user->hasVerifiedEmail();

        return redirect()->away(rtrim((string) config('opendoor.frontend_url'), '/').'/?verified='.($verified ? '1' : '0'));
    }

    /**
     * "Send the link again" from the website.
     */
    public function send(Request $request, EmailVerification $verification): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email address is already confirmed.', 'email_verified' => true]);
        }

        if (! $verification->send($user)) {
            abort(503, "We couldn't send the email just now. Please try again in a few minutes.");
        }

        return response()->json(['message' => "We sent a new link to {$user->email}.", 'email_verified' => false]);
    }
}
