<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PostingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RemovePostingRequest;
use App\Models\JobPosting;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * Remove a posting with a reason the employer sees (plan PHASE_6 §4.2, F10.2).
 */
class JobPostingRemovalController extends Controller
{
    /**
     * Allowed with applicants waiting (Q7). The posting is soft-deleted, so it's hidden from every
     * list but its applications and hires stay valid for feedback (M4 rule).
     */
    public function destroy(RemovePostingRequest $request, JobPosting $posting): Response
    {
        // Drafts belong to the employer until they are submitted (decision 33).
        abort_if($posting->status === PostingStatus::Draft, 404);

        DB::transaction(function () use ($request, $posting) {
            $posting = JobPosting::whereKey($posting->id)->lockForUpdate()->firstOrFail();

            $posting->forceFill([
                'removed_by' => $request->user()->id,
                'removed_at' => now(),
                'removal_reason' => $request->validated('reason'),
            ])->save();
            $posting->delete();
        });

        return response()->noContent();
    }
}
