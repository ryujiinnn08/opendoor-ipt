<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Every account, one account's page, and adding an administrator (plan PHASE_6 §4.1, F10.1).
 * Scaffold: answers 501 until 6A step 1 builds it.
 */
class UserController extends Controller
{
    /**
     * Newest first, 20 a page; `q` matches name or email; filters `role` and `status`.
     */
    public function index(Request $request)
    {
        abort(501, 'Not built yet.');
    }

    /**
     * The account, what it's connected to (company and role, or application and hire counts) and
     * its history. Never a job seeker's profile, needs, disability type or résumé (Q3).
     */
    public function show(User $user)
    {
        abort(501, 'Not built yet.');
    }

    /**
     * Add an administrator: name and email; returns a 16-character temporary password once and
     * sets `must_change_password` (Q4).
     */
    public function store(Request $request)
    {
        abort(501, 'Not built yet.');
    }
}
