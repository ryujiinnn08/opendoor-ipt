<?php

namespace App\Http\Resources;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An account in the admin user list (plan PHASE_6 §4.1). Never a job seeker's profile, needs,
 * disability type or résumé (Q3).
 *
 * @mixin User
 */
class AdminUserResource extends JsonResource
{
    /**
     * Relations the list uses; eager-load them to avoid queries per account.
     */
    public const RELATIONS = ['membership.employer', 'membership.department'];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $membership = $this->role === Role::Employer ? $this->membership : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'is_active' => $this->is_active,
            'joined_at' => $this->created_at?->toIso8601String(),
            // Employers only: null until they set up a company or individual profile.
            'employer' => $this->when($this->role === Role::Employer, fn () => $membership ? [
                'id' => $membership->employer->id,
                'name' => $membership->employer->name,
                'type' => $membership->employer->type->value,
                'verification_status' => $membership->employer->verification_status->value,
                'member_role' => $membership->role->value,
                'department' => $membership->department?->name,
            ] : null),
        ];
    }
}
