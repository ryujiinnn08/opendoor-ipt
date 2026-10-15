<?php

namespace App\Http\Resources;

use App\Enums\ApplicationStatus;
use App\Enums\PostingStatus;
use App\Enums\Role;
use App\Models\AccountEvent;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * One account for an administrator: what it's connected to and its history (plan PHASE_6
 * §4.1, Q3). Job seekers appear as counts only.
 *
 * @mixin User
 */
class AdminUserDetailResource extends AdminUserResource
{
    /** Postings listed on an employer's page, newest first. */
    public const POSTINGS_SHOWN = 50;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'must_change_password' => $this->must_change_password,
            'is_you' => $request->user()->is($this->resource),
            'applications' => $this->when($this->role === Role::Candidate, fn () => [
                'total' => $this->applications()->count(),
                'hires' => $this->applications()->where('status', ApplicationStatus::Hired)->count(),
            ]),
            // The postings this employer can manage, so an admin can open one and remove it.
            // Drafts belong to the employer until submitted (decision 33).
            'postings' => $this->when($this->role === Role::Employer, fn () => JobPosting::visibleTo($this->resource)
                ->where('status', '!=', PostingStatus::Draft)
                ->latest('updated_at')
                ->latest('id')
                ->limit(self::POSTINGS_SHOWN)
                ->get()
                ->map(fn (JobPosting $posting) => [
                    'id' => $posting->id,
                    'title' => $posting->title,
                    'status' => $posting->displayStatus()->value,
                ])),
            'history' => $this->accountEvents()->with('actor:id,name')->get()->map(fn (AccountEvent $event) => [
                'id' => $event->id,
                'type' => $event->type->value,
                'reason' => $event->reason,
                'by' => $event->actor?->name,
                'at' => $event->created_at?->toIso8601String(),
            ]),
        ];
    }
}
