<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SuspendRequest;
use App\Http\Resources\AdminUserDetailResource;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\AccountService;

/**
 * Suspend (with a reason) or reactivate an account (plan PHASE_6 §4.1, M1).
 */
class UserStatusController extends Controller
{
    /**
     * `{ suspended: true, reason }` ends every session of that user; `{ suspended: false }`
     * reactivates. No self-suspension; the last active administrator stays active (Q2, Q6).
     */
    public function update(SuspendRequest $request, User $user, AccountService $accounts): AdminUserDetailResource
    {
        $user = $request->boolean('suspended')
            ? $accounts->suspend($user, $request->user(), $request->validated('reason'))
            : $accounts->reactivate($user, $request->user());

        return new AdminUserDetailResource($user->load(AdminUserResource::RELATIONS));
    }
}
