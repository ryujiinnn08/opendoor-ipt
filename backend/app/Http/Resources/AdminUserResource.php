<?php

namespace App\Http\Resources;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An account in the admin user list (plan PHASE_6 §4.1). For job seekers, only the card basics:
 * headline, place and their photo (ADMIN_USERS_PLAN U1). Never their
 * needs, disability type, contact number, résumé or ratings (PHASE_6 Q3).
 *
 * @mixin User
 */
class AdminUserResource extends JsonResource
{
    /**
     * Relations the list uses; eager-load them to avoid queries per account.
     */
    public const RELATIONS = ['membership.employer', 'membership.department', 'candidateProfile'];

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
            // Administrators never confirm an email, so theirs is shown as confirmed.
            'email_confirmed' => $this->role === Role::Admin || $this->hasVerifiedEmail(),
            'joined_at' => $this->created_at?->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'profile' => $this->when($this->role === Role::Candidate, fn () => $this->profileBasics()),
            // Employers only: null until they set up a company or individual profile.
            'employer' => $this->when($this->role === Role::Employer, fn () => $membership ? [
                'id' => $membership->employer->id,
                'name' => $membership->employer->name,
                'logo_url' => $membership->employer->logoUrl(),
                'type' => $membership->employer->type->value,
                'verification_status' => $membership->employer->verification_status->value,
                'member_role' => $membership->role->value,
                'department' => $membership->department?->name,
            ] : null),
        ];
    }

    /**
     * @return array{headline: ?string, city: ?string, province: ?string, photo_version: ?string}
     */
    private function profileBasics(): array
    {
        $profile = $this->candidateProfile;
        // Admins see any uploaded photo; "Show my photo to employers" is about employers only.
        $photo = $profile?->photo_path;

        return [
            'headline' => $profile?->headline,
            'city' => $profile?->city,
            'province' => $profile?->province,
            'photo_version' => $photo ? substr(md5($photo), 0, 8) : null,
        ];
    }
}
