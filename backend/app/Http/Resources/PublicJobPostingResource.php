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
            'closes_on' => $this->closes_on?->toDateString(),
            'category' => $this->category ? ['id' => $this->category->id, 'name' => $this->category->name] : null,
            'department' => $this->department ? ['name' => $this->department->name] : null,
            'employer' => [
                'id' => $this->employer->id,
                'type' => $this->employer->type->value,
                'name' => $this->employer->name,
                'logo_url' => $this->employer->logoUrl(),
                'is_verified' => $this->employer->isVerified(),
            ],
            'accommodations' => $this->accommodationsInDisplayOrder()->map(fn (Accommodation $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'group_name' => $item->group_name,
                'note' => $item->pivot->note,
            ]),
            // Only for a logged-in job seeker with needs (CandidateNeeds).
            'match' => $this->when($this->resource->match !== null, fn () => $this->resource->match),
        ];
    }
}
