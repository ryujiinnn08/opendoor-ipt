<?php

namespace App\Services;

use App\Enums\FeedbackRating;
use App\Models\Employer;
use Illuminate\Support\Facades\DB;

/**
 * The only writer of employers.trust_score and feedback_count (plan PHASE_5 §4.2): the average of
 * every counted rating in the employer's non-hidden feedback, on all of its jobs (closed and
 * deleted ones too), × 100; null until enough feedback forms count.
 */
class TrustScore
{
    public function recalculate(Employer $employer): void
    {
        DB::transaction(function () use ($employer) {
            $locked = Employer::query()->lockForUpdate()->findOrFail($employer->id);

            // A raw join, so feedback on deleted postings still counts.
            $feedback = DB::table('feedback')
                ->join('applications', 'applications.id', '=', 'feedback.application_id')
                ->join('job_postings', 'job_postings.id', '=', 'applications.job_posting_id')
                ->where('job_postings.employer_id', $locked->id)
                ->where('feedback.is_hidden', false);

            $responses = (clone $feedback)->count();

            $cases = collect(FeedbackRating::cases())
                ->filter(fn (FeedbackRating $rating) => $rating->score() !== null)
                ->map(fn (FeedbackRating $rating) => "WHEN '{$rating->value}' THEN {$rating->score()}")
                ->implode(' ');
            $average = (clone $feedback)
                ->join('feedback_items', 'feedback_items.feedback_id', '=', 'feedback.id')
                ->where('feedback_items.rating', '<>', FeedbackRating::NotUsed->value)
                ->selectRaw("AVG(CASE feedback_items.rating {$cases} END) AS average")
                ->value('average');

            $locked->forceFill([
                'trust_score' => $responses >= config('opendoor.feedback.min_responses') && $average !== null
                    ? round((float) $average * 100, 2)
                    : null,
                'feedback_count' => $responses,
            ])->save();

            $employer->setRawAttributes($locked->getAttributes(), true);
        });
    }
}
