<?php

namespace App\Services;

use App\Enums\FeedbackRating;
use App\Models\Application;
use App\Models\Feedback;
use App\Models\User;
use App\Notifications\FeedbackOpen;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * The only writer of feedback (plan PHASE_5 §2, §4.1): a Hired application's own job seeker,
 * from the day it opens, once, rating exactly the accommodations copied at the hire.
 */
class FeedbackService
{
    public const ALREADY_SENT = "You've already sent your ratings.";

    public const NOTHING_TO_RATE = "This job listed no accommodations, so there's nothing to rate.";

    public function __construct(private TrustScore $trustScore) {}

    /**
     * "You can rate your employer's accommodations from November 12, 2026."
     */
    public static function opensText(string $day): string
    {
        return "You can rate your employer's accommodations from ".CarbonImmutable::parse($day)->format('F j, Y').'.';
    }

    /**
     * Saves the ratings and comment, then recalculates the employer's trust score.
     *
     * @param  array<int, FeedbackRating>  $ratings  accommodation id => rating, already checked against the hire copy
     */
    public function submit(Application $application, array $ratings, ?string $comment): Feedback
    {
        return DB::transaction(function () use ($application, $ratings, $comment) {
            $current = Application::query()->lockForUpdate()->findOrFail($application->id);
            $this->refuseUnlessOpen($current);

            $feedback = new Feedback(['comment' => $comment]);
            $feedback->forceFill(['application_id' => $current->id]);
            try {
                $feedback->save();
            } catch (UniqueConstraintViolationException) {
                abort(response()->json(['message' => self::ALREADY_SENT], 409));
            }
            foreach ($ratings as $accommodationId => $rating) {
                $feedback->items()->create(['accommodation_id' => $accommodationId, 'rating' => $rating]);
            }

            $this->trustScore->recalculate($current->jobPosting->employer);

            return $feedback;
        });
    }

    /**
     * Records one "feedback open" notification per hire whose form has opened (Q7). Claiming the
     * row first means two requests at once still record it once.
     */
    public function remindDue(User $seeker): void
    {
        $due = $seeker->applications()->feedbackOpen()->whereNull('feedback_reminded_at')->with('jobPosting.employer')->get();

        foreach ($due as $application) {
            $claimed = Application::query()->whereKey($application->id)->whereNull('feedback_reminded_at')->update(['feedback_reminded_at' => now()]);
            if ($claimed === 1) {
                $seeker->notify(new FeedbackOpen($application));
            }
        }
    }

    /**
     * Refuses with the reason when the application can't be rated now.
     */
    public function refuseUnlessOpen(Application $application): void
    {
        match ($application->feedbackState()) {
            'open' => null,
            'sent' => abort(response()->json(['message' => self::ALREADY_SENT], 409)),
            'nothing_to_rate' => abort(response()->json(['message' => self::NOTHING_TO_RATE], 422)),
            'not_yet' => abort(response()->json(['message' => self::opensText($application->feedbackOpensOn())], 403)),
            default => abort(403),
        };
    }
}
