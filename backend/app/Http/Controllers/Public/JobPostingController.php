<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\JobSearchRequest;
use App\Http\Resources\PublicJobPostingResource;
use App\Models\JobPosting;
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
        $job = JobPosting::publiclyVisible()->with(PublicJobPostingResource::RELATIONS)->findOrFail($id);
        $job->match = CandidateNeeds::for($request->user())?->matchFor($job, withNeeds: true);

        return new PublicJobPostingResource($job);
    }
}
