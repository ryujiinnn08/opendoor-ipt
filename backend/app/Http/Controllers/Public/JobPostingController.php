<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\JobSearchRequest;
use App\Http\Resources\PublicJobPostingResource;
use App\Models\JobPosting;
use App\Services\JobSearch;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Open jobs for anyone (M5). Anything that isn't open answers "not found".
 */
class JobPostingController extends Controller
{
    public function index(JobSearchRequest $request, JobSearch $search): AnonymousResourceCollection
    {
        return PublicJobPostingResource::collection($search->paginate($request->filters()));
    }

    public function show(int $id): PublicJobPostingResource
    {
        return new PublicJobPostingResource(
            JobPosting::publiclyVisible()->with(PublicJobPostingResource::RELATIONS)->findOrFail($id),
        );
    }
}
