<?php

namespace App\Http\Controllers;

use App\Http\Requests\Candidate\FeedbackRequest;
use App\Http\Resources\FeedbackFormResource;
use App\Models\Application;
use App\Services\FeedbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Post-hire accommodation feedback (M7): only the hired job seeker, never the employer.
 */
class FeedbackController extends Controller
{
    public function show(Application $application): FeedbackFormResource
    {
        Gate::authorize('giveFeedback', $application);

        return new FeedbackFormResource($application->load(FeedbackFormResource::RELATIONS));
    }

    public function store(FeedbackRequest $request, Application $application, FeedbackService $feedback): JsonResponse
    {
        $feedback->submit($application, $request->ratings(), $request->validated('comment'));

        return (new FeedbackFormResource($application->fresh()->load(FeedbackFormResource::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }
}
