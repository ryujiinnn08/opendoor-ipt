<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Suspend (with a reason) or reactivate an account (plan PHASE_6 §4.1, M1).
 * Scaffold: answers 501 until 6A step 1 builds it.
 */
class UserStatusController extends Controller
{
    /**
     * `{ suspended: true, reason }` ends every session of that user; `{ suspended: false }`
     * reactivates. Both are recorded in the history. No self-suspension; the last active
     * administrator stays active (Q2, Q6).
     */
    public function update(Request $request, User $user)
    {
        abort(501, 'Not built yet.');
    }
}
