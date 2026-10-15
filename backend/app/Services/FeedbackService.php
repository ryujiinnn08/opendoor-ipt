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
use Illuminate\Validation\ValidationException;

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

    public const ONLY_THE_HIRE_COPY = 'You can only rate the accommodations listed when you were hired.';

    public const AT_LEAST_ONE = 'Rate at least one accommodation you used.';

    /**
     * Saves the ratings and comment, then recalculates the employer's trust score.
     *
     * @param  array<int, FeedbackRating>  $ratings  accommodation id => rating: exactly the hire copy
     */
    public function submit(Application $application, array $ratings, ?string $comment): Feedback
    {
        $feedback = DB::transaction(function () use ($application, $ratings, $comment) {
            $current = Application::query()->lockForUpdate()->findOrFail($application->id);
            $this->refuseUnlessOpen($current);
            // Checked again here: the request only checks while the form is open, and it may
            // open between the request's check and this one (midnight in Manila on day 30).
            $this->refuseUnlessHireCopy($current, $ratings);

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

            return $feedback;
        });

        // After the commit, in its own transaction that locks the employer first: on MySQL and
        // MariaDB its reads then see every other hire's feedback committed meanwhile. Inside the
        // transaction above they would read the snapshot taken before the lock (stale counts).
        $this->trustScore->recalculate($application->jobPosting->employer);

        return $feedback;
    }

    /**
     * Exactly the accommodations copied at the hire, at least one of them used; else 422.
     *
     * @param  array<int, FeedbackRating>  $ratings
     */
    private function refuseUnlessHireCopy(Application $application, array $ratings): void
    {
        $copy = $application->hiredAccommodations()->pluck('accommodations.id')->map(fn ($id) => (int) $id)->sort()->values()->all();
        $rated = collect(array_keys($ratings))->map(fn ($id) => (int) $id)->sort()->values()->all();

        if ($rated !== $copy) {
            throw ValidationException::withMessages(['ratings' => self::ONLY_THE_HIRE_COPY]);
        }
        if (collect($ratings)->every(fn (FeedbackRating $rating) => $rating === FeedbackRating::NotUsed)) {
            throw ValidationException::withMessages(['ratings' => self::AT_LEAST_ONE]);
        }
    }

    /**
     * Records one "feedback open" notification per hire whose form has opened (Q7). Claiming the
     * row first means two requests at once still record it once; claim and notification are one
     * transaction, so a failed notification leaves the reminder to be recorded next time.
     */
    public function remindDue(User $seeker): void
    {
        $due = $seeker->applications()->feedbackOpen()->whereNull('feedback_reminded_at')->with('jobPosting.employer')->get();

        foreach ($due as $application) {
            DB::transaction(function () use ($seeker, $application) {
                $claimed = Application::query()->whereKey($application->id)->whereNull('feedback_reminded_at')->update(['feedback_reminded_at' => now()]);
                if ($claimed === 1) {
                    $seeker->notifyNow(new FeedbackOpen($application));
                }
            });
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
