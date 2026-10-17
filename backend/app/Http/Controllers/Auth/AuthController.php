<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\EmailVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/**
 * Session-based (Sanctum SPA cookie) authentication for the React app.
 */
class AuthController extends Controller
{
    public function register(RegisterRequest $request, EmailVerification $verification): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'role' => $request->validated('role'),
            'consented_at' => now(),
        ]);

        // Logged in straight away as before; the email only gates applying and posting.
        $verification->send($user);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function login(LoginRequest $request): UserResource
    {
        $request->authenticate();

        $user = $request->user();

        if (! $user->is_active) {
            $this->endSession($request);

            // The code lets the website show the "account on hold" page instead of a plain error.
            abort(response()->json([
                'message' => 'This account has been suspended. Contact the OpenDoor administrators for help.',
                'code' => 'account_suspended',
            ], 403));
        }

        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        return new UserResource($user);
    }

    public function logout(Request $request): Response
    {
        $this->endSession($request);

        return response()->noContent();
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    private function endSession(Request $request): void
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
