<?php

namespace App\Services;

use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;

/**
 * Notifications follow access (Phase 6 review CR-01): someone who leaves a company or moves to
 * another department stops seeing the applicants and postings they no longer manage.
 */
class NotificationCleanup
{
    /**
     * Deletes the user's notifications about the company's postings, or only one department's.
     */
    public function forgetPostings(User $user, int $employerId, ?int $departmentId = null): void
    {
        $postingIds = JobPosting::withTrashed()
            ->where('employer_id', $employerId)
            ->when($departmentId !== null, fn ($query) => $query->where('department_id', $departmentId))
            ->pluck('id')
            ->all();

        $user->notifications()
            ->get(['id', 'data'])
            ->filter(fn (DatabaseNotification $notification) => in_array($notification->data['job_posting_id'] ?? null, $postingIds, true))
            ->each(fn (DatabaseNotification $notification) => $notification->delete());
    }
}
