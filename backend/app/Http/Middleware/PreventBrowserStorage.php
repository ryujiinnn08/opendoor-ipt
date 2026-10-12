<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Responses with private, disability-related details (applications, their interview requests)
 * must not be kept on disk by the browser, for example on a shared computer at a PESO office.
 */
class PreventBrowserStorage
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
