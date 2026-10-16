<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applying for a job and posting one need a confirmed email (EMAIL_VERIFICATION_PLAN D1).
 * The code lets the React app offer to send the link again instead of a generic error.
 */
class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please confirm your email address first. Use the link we sent to your email.',
                'code' => 'email_unverified',
            ], 403);
        }

        return $next($request);
    }
}
