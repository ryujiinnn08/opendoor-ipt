<?php

namespace App\Http\Resources;

use App\Models\CandidateEducation;
use App\Models\CandidateExperience;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A job seeker's own profile, including the private fields. Sent only to that job seeker.
 *
 * @mixin User
 */
class CandidateProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $profile = $this->candidateProfile;

        return [
            'name' => $this->name,
            'email' => $this->email,
            'headline' => $profile?->headline,
            'city' => $profile?->city,
            'province' => $profile?->province,
            'contact_number' => $profile?->contact_number,
            'about' => $profile?->about,
            'skills' => $profile?->skills,
            'trainings' => $profile?->trainings,
            'languages' => $profile?->languages,
            'disability_type' => $profile?->disability_type?->value,
            'show_disability' => (bool) $profile?->show_disability,
            // The photo itself comes from GET /api/candidate/profile/photo (or, when shared, the
            // applicant-photo route for employers); the version busts the browser's copy on change.
            'has_photo' => (bool) $profile?->photo_path,
            'photo_version' => $profile?->photo_path ? substr(md5($profile->photo_path), 0, 8) : null,
            'show_photo_to_employers' => (bool) $profile?->show_photo_to_employers,
            'open_to_work_setups' => array_values($profile?->open_to_work_setups ?? []),
            'open_to_employment_types' => array_values($profile?->open_to_employment_types ?? []),
            'experiences' => $this->experiences->map(fn (CandidateExperience $entry) => [
                'job_title' => $entry->job_title,
                'company' => $entry->company,
                'started_on' => $entry->started_on,
                'ended_on' => $entry->ended_on,
                'is_current' => $entry->is_current,
                'description' => $entry->description,
            ]),
            'educations' => $this->educations->map(fn (CandidateEducation $entry) => [
                'level' => $entry->level->value,
                'school' => $entry->school,
                'course' => $entry->course,
                'year_finished' => $entry->year_finished,
                'is_studying' => $entry->is_studying,
            ]),
            'resume' => $profile?->resume_path ? [
                'name' => $profile->resume_name,
                'uploaded_at' => $profile->resume_uploaded_at?->toIso8601String(),
            ] : null,
        ];
    }
}
