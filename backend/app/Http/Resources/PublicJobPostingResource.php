<?php

namespace App\Http\Resources;

use App\Models\Accommodation;
use App\Models\JobPosting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An open job as anyone sees it. Leaves out the author, status, rejection reason,
 * submission and approval dates, verification details and employer actions.
 *
 * @mixin JobPosting
 */
class PublicJobPostingResource extends JsonResource
{
    /**
     * Relations every response uses; eager-load them to avoid queries per job.
     */
    public const RELATIONS = ['employer', 'department', 'category', 'accommodations'];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'employment_type' => $this->employment_type?->value,
            'work_setup' => $this->work_setup?->value,
            'interview_format' => $this->interview_format?->value,
            ...$this->resource->capacity(),
            'closure_reason' => $this->closure_reason,
            'closes_on' => $this->closes_on?->toDateString(),
            // The day it went live in Manila (for "New" on job cards); the exact approval time stays private.
            'posted_on' => $this->approved_at?->timezone(config('opendoor.postings.timezone'))->toDateString(),
            'category' => $this->category ? ['id' => $this->category->id, 'name' => $this->category->name] : null,
            'department' => $this->department ? ['name' => $this->department->name] : null,
            'employer' => [
                'id' => $this->employer->id,
                'type' => $this->employer->type->value,
                'name' => $this->employer->name,
                'logo_url' => $this->employer->logoUrl(),
                'is_verified' => $this->employer->isVerified(),
                // The accommodation trust score (Phase 5): null, with no count, until 3 responses.
                'trust_score' => $this->employer->shownTrustScore()['score'],
                'trust_count' => $this->employer->shownTrustScore()['responses'],
                // About the company, on the job page only (the list stays small).
                ...($this->resource->withEmployerAbout ? [
                    'industry' => $this->employer->industry,
                    'address' => $this->employer->address,
                    'description' => $this->employer->description,
                ] : []),
            ],
            'accommodations' => $this->accommodationsInDisplayOrder()->map(fn (Accommodation $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'group_name' => $item->group_name,
                'note' => $item->pivot->note,
            ]),
            // Only for a logged-in job seeker with needs (CandidateNeeds).
            'match' => $this->when($this->resource->match !== null, fn () => $this->resource->match),
            // Only for the job seeker who applied (Phase 4).
            'my_application' => $this->when($this->resource->myApplication !== null, fn () => $this->resource->myApplication),
        ];
    }
}
