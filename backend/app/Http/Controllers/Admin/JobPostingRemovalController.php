<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\JobPosting;
use Illuminate\Http\Request;

/**
 * Remove a posting with a reason the employer sees (plan PHASE_6 §4.2, F10.2).
 * Scaffold: answers 501 until 6A step 1 builds it.
 */
class JobPostingRemovalController extends Controller
{
    /**
     * Allowed with applicants waiting (Q7): soft-deleted, with `removed_by`, `removed_at` and
     * `removal_reason`; applications and hires stay as they are.
     */
    public function destroy(Request $request, JobPosting $posting)
    {
        abort(501, 'Not built yet.');
    }
}
