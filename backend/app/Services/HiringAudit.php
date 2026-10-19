<?php

namespace App\Services;

use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Append-only through the application: no edit/delete API or writable audit model. */
class HiringAudit
{
    public static function record(JobPosting $job, ?User $actor, string $action, ?string $before = null, ?string $after = null, ?Application $application = null, array $details = []): void
    {
        DB::table('hiring_events')->insert([
            'job_posting_id' => $job->id, 'application_id' => $application?->id,
            'actor_user_id' => $actor?->id, 'action' => $action,
            'previous_status' => $before, 'new_status' => $after,
            'details' => $details === [] ? null : json_encode($details, JSON_THROW_ON_ERROR),
            'created_at' => now(),
        ]);
    }
}
