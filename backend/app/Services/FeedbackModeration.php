<?php

namespace App\Services;

use App\Enums\FeedbackEventType;
use App\Models\Feedback;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Hiding and showing feedback, and recording who looked at its author (plan PHASE_6 §4.5,
 * F10.5, Q9). A hidden response leaves the employer's trust score at once (M7).
 */
class FeedbackModeration
{
    public function __construct(private TrustScore $trustScore) {}

    public function hide(Feedback $feedback, User $admin, string $reason): Feedback
    {
        return $this->setHidden($feedback, $admin, true, $reason);
    }

    public function show(Feedback $feedback, User $admin): Feedback
    {
        return $this->setHidden($feedback, $admin, false, null);
    }

    /**
     * The job seeker who wrote it, recorded in the feedback's history each time it's asked.
     */
    public function author(Feedback $feedback, User $admin): User
    {
        $feedback->events()->create(['type' => FeedbackEventType::AuthorViewed, 'actor_id' => $admin->id]);

        return $feedback->application->candidate;
    }

    private function setHidden(Feedback $feedback, User $admin, bool $hidden, ?string $reason): Feedback
    {
        DB::transaction(function () use ($feedback, $admin, $hidden, $reason) {
            $locked = Feedback::whereKey($feedback->id)->lockForUpdate()->firstOrFail();

            if ($locked->is_hidden === $hidden) {
                abort(409, $hidden ? 'This feedback is already hidden.' : 'This feedback is already shown.');
            }

            $locked->forceFill([
                'is_hidden' => $hidden,
                'hidden_reason' => $hidden ? $reason : null,
                'hidden_by' => $hidden ? $admin->id : null,
            ])->save();
            $locked->events()->create([
                'type' => $hidden ? FeedbackEventType::Hidden : FeedbackEventType::Shown,
                'reason' => $reason,
                'actor_id' => $admin->id,
            ]);
        });

        // After the commit, as FeedbackService does: the recalculation locks the employer first.
        $feedback->refresh();
        $this->trustScore->recalculate($feedback->application->jobPosting->employer);

        return $feedback;
    }
}
