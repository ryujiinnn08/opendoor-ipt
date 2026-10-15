<?php

namespace App\Http\Resources;

use App\Enums\PostingStatus;
use App\Enums\Role;
use App\Models\Accommodation;
use App\Models\JobPosting;
use App\Services\JobPostingWorkflow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A job posting for its employer and for administrators. `status` is the status people see
 * (an open posting past its closing date is "closed"); `actions` is sent to employers only.
 *
 * @mixin JobPosting
 */
class JobPostingResource extends JsonResource
{
    /**
     * Relations every response uses; eager-load them to avoid queries per posting.
     */
    public const RELATIONS = ['employer', 'department', 'category', 'creator', 'accommodations'];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->displayStatus();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'employment_type' => $this->employment_type?->value,
            'work_setup' => $this->work_setup?->value,
            'interview_format' => $this->interview_format?->value,
            'closes_on' => $this->closes_on?->toDateString(),
            'status' => $status->value,
            'closed_automatically' => $this->isExpired(),
            'rejection_reason' => $status === PostingStatus::Rejected ? $this->rejection_reason : null,
            // Removed by OpenDoor (Phase 6A): the employer and admins see the reason; which
            // administrator removed it is for admins only.
            'removal' => $this->removed_at === null ? null : [
                'removed_at' => $this->removed_at->toIso8601String(),
                'reason' => $this->removal_reason,
                'removed_by' => $this->when(
                    $request->user()?->role === Role::Admin,
                    fn () => $this->remover?->name,
                ),
            ],
            'changed_after_approval' => $this->status === PostingStatus::Pending && $this->approved_at !== null,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'category' => $this->category ? ['id' => $this->category->id, 'name' => $this->category->name] : null,
            'department' => $this->department ? ['id' => $this->department->id, 'name' => $this->department->name] : null,
            'employer' => [
                'id' => $this->employer->id,
                'type' => $this->employer->type->value,
                'name' => $this->employer->name,
                'logo_url' => $this->employer->logoUrl(),
                'is_verified' => $this->employer->isVerified(),
                'verification_status' => $this->employer->verification_status->value,
            ],
            'created_by' => $this->creator ? ['name' => $this->creator->name] : null,
            'accommodations' => $this->accommodationsInDisplayOrder()->map(fn (Accommodation $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'group_name' => $item->group_name,
                'note' => $item->pivot->note,
                'is_active' => $item->is_active,
            ]),
            // On the employer's list only (withCount); "new" means Pending, not yet opened.
            'applicants' => $this->when(isset($this->resource->applications_count), fn () => [
                'total' => (int) $this->resource->applications_count,
                'new' => (int) $this->resource->new_applications_count,
            ]),
            'actions' => $this->when(
                $request->user()?->role === Role::Employer,
                fn () => app(JobPostingWorkflow::class)->actionsFor($this->resource),
            ),
        ];
    }
}
