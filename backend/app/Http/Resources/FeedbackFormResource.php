<?php

namespace App\Http\Resources;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\FeedbackItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The feedback form for a hired job seeker (plan PHASE_5 §4.1): the accommodations copied at the
 * hire, when the form opens and, once sent, their own ratings. Sent only to that job seeker.
 *
 * @mixin Application
 */
class FeedbackFormResource extends JsonResource
{
    public const RELATIONS = ['jobPosting.employer', 'hiredAccommodations', 'feedback.items'];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $copy = Accommodation::inDisplayOrder($this->hiredAccommodations)->values();
        $accommodations = $copy->map(fn (Accommodation $item) => [
            'id' => $item->id,
            'name' => $item->name,
            'group_name' => $item->group_name,
            'note' => $item->pivot->note,
        ]);
        $feedback = $this->feedback;

        return [
            'application_id' => $this->id,
            'job' => ['id' => $this->jobPosting->id, 'title' => $this->jobPosting->title],
            'employer' => ['id' => $this->jobPosting->employer->id, 'name' => $this->jobPosting->employer->name],
            'hired_at' => $this->hired_at?->toDateString(),
            'state' => $this->resource->feedbackState(),
            'opens_on' => $this->resource->feedbackOpensOn(),
            'accommodations' => $accommodations->all(),
            'sent' => $feedback ? [
                'sent_at' => $feedback->created_at->toIso8601String(),
                'comment' => $feedback->comment,
                'ratings' => $accommodations->map(function (array $item) use ($feedback) {
                    /** @var FeedbackItem|null $rated */
                    $rated = $feedback->items->firstWhere('accommodation_id', $item['id']);

                    return [
                        'accommodation_id' => $item['id'],
                        'name' => $item['name'],
                        'group_name' => $item['group_name'],
                        'note' => $item['note'],
                        'rating' => $rated?->rating->value,
                        'rating_label' => $rated?->rating->label(),
                    ];
                })->all(),
            ] : null,
        ];
    }
}
