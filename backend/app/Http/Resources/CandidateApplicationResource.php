<?php

namespace App\Http\Resources;

use App\Enums\ApplicationStatus;
use App\Enums\PostingStatus;
use App\Models\Accommodation;
use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * An application as its own job seeker sees it. Sent only to that job seeker.
 *
 * @mixin Application
 */
class CandidateApplicationResource extends JsonResource
{
    /**
     * Relations every response uses; eager-load them to avoid queries per application.
     */
    public const RELATIONS = ['jobPosting.employer', 'feedback'];

    /** The one-application page also gets the job's accommodations and the hire copy. */
    public const DETAIL_RELATIONS = ['jobPosting.employer', 'jobPosting.accommodations', 'hiredAccommodations', 'feedback'];

    private bool $detailed = false;

    /**
     * The shape for the one-application page (relations from DETAIL_RELATIONS).
     */
    public static function detailed(Application $application): static
    {
        $resource = new static($application->loadMissing(self::DETAIL_RELATIONS));
        $resource->detailed = true;

        return $resource;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $job = $this->jobPosting;

        $data = [
            'id' => $this->id,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'applied_at' => $this->created_at?->toIso8601String(),
            // The last change, for "Updated 2 days ago" in the job tracker (UI_FEEDBACK_WAVE_B_PLAN B2).
            'updated_at' => $this->updated_at?->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'withdrawn_at' => $this->withdrawn_at?->toIso8601String(),
            'hired_at' => $this->hired_at?->toDateString(),
            'hire_confirmed_by' => $this->hire_confirmed_by?->value,
            'cover_note' => $this->cover_note,
            'interview_request' => $this->interview_request,
            'actions' => $this->actions(),
            // Hires only: whether the accommodations can be rated yet (Phase 5). Lists add withCount('hiredAccommodations').
            'feedback' => $this->status === ApplicationStatus::Hired ? [
                'state' => $this->resource->feedbackState(),
                'opens_on' => $this->resource->feedbackOpensOn(),
                'sent_at' => $this->feedback?->created_at?->toIso8601String(),
            ] : null,
            'job' => [
                'id' => $job->id,
                'title' => $job->title,
                'interview_format' => $job->interview_format?->value,
                'state' => match (true) {
                    $job->trashed() => 'removed',
                    $job->displayStatus() === PostingStatus::Open => 'open',
                    default => 'not_open',
                },
                'employer' => [
                    'id' => $job->employer->id,
                    'name' => $job->employer->name,
                    'type' => $job->employer->type->value,
                    'is_verified' => $job->employer->isVerified(),
                    'logo_url' => $job->employer->logoUrl(),
                ],
            ],
        ];

        if ($this->detailed) {
            // The job's accommodations as they are now; for a hire, as they were advertised then.
            $data['job']['accommodations'] = $this->accommodationList($job->accommodations);
            $data['hired_accommodations'] = $this->status === ApplicationStatus::Hired
                ? $this->accommodationList($this->hiredAccommodations)
                : null;
        }

        return $data;
    }

    /**
     * @param  Collection<int, Accommodation>  $accommodations
     * @return list<array<string, mixed>>
     */
    private function accommodationList(Collection $accommodations): array
    {
        return Accommodation::inDisplayOrder($accommodations)->map(fn (Accommodation $item) => [
            'id' => $item->id,
            'name' => $item->name,
            'group_name' => $item->group_name,
            'note' => $item->pivot->note,
        ])->values()->all();
    }

    /** Applicants may only view their status. */
    private function actions(): array
    {
        return [];
    }
}
