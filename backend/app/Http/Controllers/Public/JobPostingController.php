<?php

namespace App\Http\Controllers\Public;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\JobSearchRequest;
use App\Http\Resources\PublicJobPostingResource;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\CandidateNeeds;
use App\Services\JobSearch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Open jobs for anyone (M5). Anything that isn't open answers "not found". A logged-in job
 * seeker with needs also gets how each job meets them; everyone else is treated as a guest.
 */
class JobPostingController extends Controller
{
    public function index(JobSearchRequest $request, JobSearch $search): AnonymousResourceCollection
    {
        return PublicJobPostingResource::collection($search->paginate($request->filters(), CandidateNeeds::for($request->user())));
    }

    public function show(Request $request, int $id): PublicJobPostingResource
    {
        $job = JobPosting::publiclyVisible()->with(PublicJobPostingResource::RELATIONS)->withCapacityCounts()->findOrFail($id);
        $job->match = CandidateNeeds::for($request->user())?->matchFor($job, withNeeds: true);
        $job->myApplication = $this->myApplication($request->user(), $job);
        $job->withEmployerAbout = true;

        return new PublicJobPostingResource($job);
    }

    /**
     * The logged-in job seeker's application to this job, if any. Nobody else learns of it.
     *
     * @return array<string, mixed>|null
     */
    private function myApplication(?User $user, JobPosting $job): ?array
    {
        if (! $user || ! $user->is_active || $user->role !== Role::Candidate) {
            return null;
        }

        $application = $user->applications()->where('job_posting_id', $job->id)->first();

        return $application ? [
            'id' => $application->id,
            'status' => $application->status->value,
            'status_label' => $application->status->label(),
            'applied_at' => $application->created_at?->toIso8601String(),
        ] : null;
    }
}
