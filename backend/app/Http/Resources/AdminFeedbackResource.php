<?php

namespace App\Http\Resources;

use App\Models\Feedback;
use App\Models\FeedbackEvent;
use App\Models\FeedbackItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One feedback for moderation (plan PHASE_6 §4.5): the employer, the job, the ratings and the
 * comment, but never the author; that comes only from the author address, which is recorded (Q9).
 *
 * @mixin Feedback
 */
class AdminFeedbackResource extends JsonResource
{
    /**
     * Relations every response uses; eager-load them to avoid queries per feedback.
     */
    public const RELATIONS = ['application.jobPosting.employer', 'items.accommodation', 'events.actor:id,name'];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $job = $this->application->jobPosting;

        return [
            'id' => $this->id,
            'sent_at' => $this->created_at?->toIso8601String(),
            'employer' => ['id' => $job->employer->id, 'name' => $job->employer->name],
            'job' => ['id' => $job->id, 'title' => $job->title],
            'ratings' => $this->items->sortBy(fn (FeedbackItem $item) => $item->accommodation->name)->values()->map(fn (FeedbackItem $item) => [
                'name' => $item->accommodation->name,
                'rating' => $item->rating->value,
                'rating_label' => $item->rating->label(),
            ]),
            'comment' => $this->comment,
            'is_hidden' => $this->is_hidden,
            'hidden_reason' => $this->hidden_reason,
            'history' => $this->events->map(fn (FeedbackEvent $event) => [
                'id' => $event->id,
                'type' => $event->type->value,
                'reason' => $event->reason,
                'by' => $event->actor?->name,
                'at' => $event->created_at?->toIso8601String(),
            ]),
        ];
    }
}
