<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Logs out suspended users on their next request.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && ! $request->user()->is_active) {
            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            // The code lets the website show the "account on hold" page instead of a plain error.
            abort(response()->json([
                'message' => 'This account has been suspended. Contact the OpenDoor administrators for help.',
                'code' => 'account_suspended',
            ], 403));
        }

        return $next($request);
    }
}
