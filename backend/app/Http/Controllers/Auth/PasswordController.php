<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Change password, for every portal (plan PHASE_6 §4.1, F1.6, Q5).
 * Scaffold: answers 501 until 6A step 1 builds it.
 */
class PasswordController extends Controller
{
    /**
     * Current password, new password (the registration rules) and confirmation; clears
     * `must_change_password`, ends the user's other sessions and records it in the history.
     */
    public function update(Request $request)
    {
        abort(501, 'Not built yet.');
    }
}
