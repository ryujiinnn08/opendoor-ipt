<?php

namespace App\Http\Controllers;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Http\Requests\Candidate\ApplicationStatusRequest;
use App\Http\Resources\CandidateApplicationResource;
use App\Models\Application;
use App\Services\ApplicationWorkflow;
use Illuminate\Support\Facades\Gate;

/**
 * Changing an application's status (Table 1). Job seekers withdraw or confirm a hire;
 * employers' decisions come in 4B.
 */
class ApplicationStatusController extends Controller
{
    public function update(ApplicationStatusRequest $request, Application $application, ApplicationWorkflow $workflow): CandidateApplicationResource
    {
        Gate::authorize('actAsCandidate', $application);

        $changed = $workflow->changeStatus(
            $application,
            ApplicationStatus::from($request->validated('status')),
            ApplicationActor::Candidate,
            ApplicationStatus::from($request->validated('expected_status')),
            $request->user(),
        );

        return CandidateApplicationResource::detailed($changed);
    }
}
