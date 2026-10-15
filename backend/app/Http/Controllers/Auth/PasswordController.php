<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Resources\UserResource;
use App\Services\AccountService;

/**
 * Change password, for every portal (plan PHASE_6 §4.1, F1.6, Q5).
 */
class PasswordController extends Controller
{
    /**
     * Ends the user's other sessions; this one continues with a new id.
     */
    public function update(ChangePasswordRequest $request, AccountService $accounts): UserResource
    {
        $user = $request->user();
        $session = $request->hasSession() ? $request->session() : null;

        $session?->migrate(true);
        $accounts->changePassword($user, $request->validated('password'), $session?->getId());

        return new UserResource($user);
    }
}
