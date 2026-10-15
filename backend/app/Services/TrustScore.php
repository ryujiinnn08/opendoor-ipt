<?php

namespace App\Services;

use App\Enums\FeedbackRating;
use App\Models\Accommodation;
use App\Models\Employer;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * The only writer of employers.trust_score and feedback_count (plan PHASE_5 §4.2): the average of
 * every counted rating in the employer's non-hidden feedback, on all of its jobs (closed and
 * deleted ones too), × 100; null until enough feedback forms count. summary() is the only shape
 * anyone sees: totals, never a response, name, comment or date.
 */
class TrustScore
{
    /**
     * The score as a whole percent with its count, and per accommodation type the delivered,
     * partly and not-delivered counts where 3 or more people rated it (Q4). not_enough names every
     * other type the employer's hires were promised, rated by nobody included, so a type appearing
     * there never tells the employer that one particular hire rated it. Everything null below the
     * minimum responses (Q3: not even the count).
     *
     * @return array{score: ?int, responses: ?int, breakdown: ?list<array<string, mixed>>, not_enough: ?list<array<string, mixed>>}
     */
    public function summary(Employer $employer): array
    {
        $shown = $employer->shownTrustScore();
        if ($shown['score'] === null) {
            return [...$shown, 'breakdown' => null, 'not_enough' => null];
        }

        $rows = $this->counted($employer->id)
            ->groupBy('feedback_items.accommodation_id')
            ->selectRaw(
                'feedback_items.accommodation_id AS id,'
                .' SUM(CASE WHEN feedback_items.rating = ? THEN 1 ELSE 0 END) AS delivered,'
                .' SUM(CASE WHEN feedback_items.rating = ? THEN 1 ELSE 0 END) AS partial,'
                .' SUM(CASE WHEN feedback_items.rating = ? THEN 1 ELSE 0 END) AS not_delivered,'
                .' COUNT(*) AS rated',
                [FeedbackRating::Delivered->value, FeedbackRating::Partial->value, FeedbackRating::NotDelivered->value],
            )
            ->get()
            ->keyBy('id');
        // Every type copied at any of the employer's hires (all jobs, deleted ones too).
        $promised = DB::table('application_accommodation')
            ->join('applications', 'applications.id', '=', 'application_accommodation.application_id')
            ->join('job_postings', 'job_postings.id', '=', 'applications.job_posting_id')
            ->where('job_postings.employer_id', $employer->id)
            ->distinct()
            ->pluck('application_accommodation.accommodation_id');
        $types = Accommodation::inDisplayOrder(Accommodation::query()->whereIn('id', $promised->merge($rows->keys())->unique())->get());
        $minimum = config('opendoor.feedback.min_responses');
        $rated = fn (Accommodation $type) => (int) ($rows[$type->id]->rated ?? 0);
        $describe = fn (Accommodation $type) => ['id' => $type->id, 'name' => $type->name, 'group_name' => $type->group_name];

        return [
            ...$shown,
            'breakdown' => $types->filter(fn (Accommodation $type) => $rated($type) >= $minimum)
                ->map(fn (Accommodation $type) => [
                    ...$describe($type),
                    'delivered' => (int) $rows[$type->id]->delivered,
                    'partial' => (int) $rows[$type->id]->partial,
                    'not_delivered' => (int) $rows[$type->id]->not_delivered,
                    'rated' => (int) $rows[$type->id]->rated,
                ])->values()->all(),
            'not_enough' => $types->filter(fn (Accommodation $type) => $rated($type) < $minimum)->map($describe)->values()->all(),
        ];
    }

    /**
     * Call it outside any transaction that has already read these tables (as FeedbackService does,
     * after its commit): the employer lock comes first, so on MySQL and MariaDB the reads that
     * follow see everything committed before the lock was granted.
     */
    public function recalculate(Employer $employer): void
    {
        DB::transaction(function () use ($employer) {
            $locked = Employer::query()->lockForUpdate()->findOrFail($employer->id);

            $responses = $this->feedbackOf($locked->id)->count();

            $cases = collect(FeedbackRating::cases())
                ->filter(fn (FeedbackRating $rating) => $rating->score() !== null)
                ->map(fn (FeedbackRating $rating) => "WHEN '{$rating->value}' THEN {$rating->score()}")
                ->implode(' ');
            $average = $this->counted($locked->id)
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

    /**
     * The employer's non-hidden feedback, on all of its jobs. A raw join, so feedback on deleted
     * postings still counts.
     */
    private function feedbackOf(int $employerId): Builder
    {
        return DB::table('feedback')
            ->join('applications', 'applications.id', '=', 'feedback.application_id')
            ->join('job_postings', 'job_postings.id', '=', 'applications.job_posting_id')
            ->where('job_postings.employer_id', $employerId)
            ->where('feedback.is_hidden', false);
    }

    /**
     * Their ratings that count: every answer except "I didn't use this".
     */
    private function counted(int $employerId): Builder
    {
        return $this->feedbackOf($employerId)
            ->join('feedback_items', 'feedback_items.feedback_id', '=', 'feedback.id')
            ->where('feedback_items.rating', '<>', FeedbackRating::NotUsed->value);
    }
}
