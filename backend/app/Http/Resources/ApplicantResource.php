<?php

namespace App\Http\Resources;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Services\CandidateNeeds;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * An application as the job's employer sees it (plan PHASE_4 §6.2). Never the job seeker's own
 * shape. After Withdrawn only the name and dates remain (Q4): no profile, needs, contact details
 * or messages.
 *
 * @mixin Application
 */
class ApplicantResource extends JsonResource
{
    /**
     * Relations the list uses; the job (with its accommodations) is set once by the controller.
     */
    public const RELATIONS = ['candidate.candidateProfile', 'candidate.needs'];

    private bool $detailed = false;

    /**
     * The applicant page: also the messages, each need, the profile (as it is now, Q3) and the job.
     */
    public static function detailed(Application $application): static
    {
        $resource = new static($application->loadMissing([
            ...self::RELATIONS,
            'candidate.experiences',
            'candidate.educations',
            'jobPosting.accommodations',
            'jobPosting.department',
        ]));
        $resource->detailed = true;

        return $resource;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $withdrawn = $this->status === ApplicationStatus::Withdrawn;
        $data = [
            'id' => $this->id,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'applied_at' => $this->created_at?->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'withdrawn_at' => $this->withdrawn_at?->toIso8601String(),
            'hired_at' => $this->hired_at?->toDateString(),
            'hire_confirmed_by' => $this->hire_confirmed_by?->value,
            'actions' => $this->actions(),
            'applicant' => $withdrawn
                ? ['name' => $this->candidate->name]
                : ['name' => $this->candidate->name, 'headline' => $this->candidate->candidateProfile?->headline],
        ];

        if (! $withdrawn) {
            $data['has_interview_request'] = filled($this->interview_request);
            $data['match'] = CandidateNeeds::for($this->candidate)?->matchFor($this->jobPosting, withNeeds: $this->detailed);
        }

        if ($this->detailed) {
            $data['history'] = DB::table('hiring_events')->leftJoin('users', 'users.id', '=', 'hiring_events.actor_user_id')
                ->where('application_id', $this->id)->orderByDesc('hiring_events.id')->limit(100)
                ->get(['hiring_events.id', 'action', 'previous_status', 'new_status', 'actor_user_id', 'users.name as actor_name', 'hiring_events.created_at'])
                ->map(function ($event) {
                    $event->created_at = Carbon::parse($event->created_at)->toIso8601String();

                    return $event;
                });
            $job = $this->jobPosting;
            $data['job'] = [
                ...$job->capacity(),
                'id' => $job->id,
                'title' => $job->title,
                'interview_format' => $job->interview_format?->value,
                'status' => $job->displayStatus()->value,
                'department' => $job->department ? ['name' => $job->department->name] : null,
            ];
            if (! $withdrawn) {
                $data['cover_note'] = $this->cover_note;
                $data['interview_request'] = $this->interview_request;
                $data['profile'] = $this->profile($request);
            }
        }

        return $data;
    }

    /**
     * The job seeker's profile in My résumé's shape, without what employers may not see: the
     * disability type unless the person chose to show it.
     *
     * @return array<string, mixed>
     */
    private function profile(Request $request): array
    {
        $profile = (new CandidateProfileResource($this->candidate))->resolve($request);
        if (! $profile['show_disability']) {
            $profile['disability_type'] = null;
        }
        // The photo only when the job seeker chose to show it (UI_FEEDBACK_WAVE_B_PLAN Q2).
        if (! $profile['show_photo_to_employers']) {
            $profile['has_photo'] = false;
            $profile['photo_version'] = null;
        }
        unset($profile['show_photo_to_employers']);

        return $profile;
    }

    /**
     * What the employer may do now: hire, reject.
     *
     * @return list<string>
     */
    private function actions(): array
    {
        return array_values(array_filter([
            $this->status->canTransitionTo(ApplicationStatus::Hired, ApplicationActor::Employer) && ! $this->jobPosting->trashed() && $this->jobPosting->capacity()['remaining_slots'] > 0 ? 'hire' : null,
            $this->status->canTransitionTo(ApplicationStatus::Rejected, ApplicationActor::Employer) && ! $this->jobPosting->trashed() ? 'reject' : null,
        ]));
    }
}
