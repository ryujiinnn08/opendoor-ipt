<?php

namespace App\Http\Resources;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            // A new administrator's temporary password must be changed first (Phase 6A, Q4).
            'must_change_password' => (bool) $this->must_change_password,
            // Job seekers and employers confirm their email before applying or posting.
            'email_verified' => $this->hasVerifiedEmail(),
            // Job seekers only: the profile photo's version for the account menu, null without one
            // (UI_FEEDBACK_WAVE_B_PLAN B1). The photo itself is fetched from its private route.
            'photo_version' => $this->when($this->role === Role::Candidate, function () {
                $path = $this->candidateProfile?->photo_path;

                return $path ? substr(md5($path), 0, 8) : null;
            }),
            // Employers only: null until they set up a company or individual profile.
            'membership' => $this->when($this->role === Role::Employer, function () {
                $membership = $this->membership()->with(['employer', 'department'])->first();

                return $membership ? new MembershipResource($membership) : null;
            }),
        ];
    }
}
