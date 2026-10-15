<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A new administrator logged in with a temporary password can only see who they are and change
 * it (plan PHASE_6 §4.1, Q4); the page sends them to Change password.
 */
class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->must_change_password && ! $request->is('api/me', 'api/me/password')) {
            abort(403, 'Change your temporary password before you continue.');
        }

        return $next($request);
    }
}
