<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Requests\Candidate\ApplicationListRequest;
use App\Http\Requests\Candidate\ApplyRequest;
use App\Http\Resources\CandidateApplicationResource;
use App\Models\Application;
use App\Services\ApplicationWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * Applications (M6). Job seekers apply and follow their own; employers' side comes in 4B.
 */
class ApplicationController extends Controller
{
    /**
     * My applications, newest first, 12 per page, with how many each filter shows.
     */
    public function index(ApplicationListRequest $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if ($user->role !== Role::Candidate) {
            abort(response()->json(['message' => 'Only job seekers have applications.'], 403));
        }

        $applications = $user->applications()
            ->inFilter($request->filter())
            ->with(CandidateApplicationResource::RELATIONS)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(12);

        return CandidateApplicationResource::collection($applications)
            ->additional(['counts' => Application::countsFor($user)]);
    }

    public function show(Application $application): CandidateApplicationResource
    {
        Gate::authorize('view', $application);

        return CandidateApplicationResource::detailed($application);
    }

    public function store(ApplyRequest $request, int $id, ApplicationWorkflow $workflow): JsonResponse
    {
        $application = $workflow->apply(
            $request->user(),
            $id,
            $request->validated('cover_note'),
            $request->validated('interview_request'),
        );

        return (new CandidateApplicationResource($application->load(CandidateApplicationResource::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
