<?php

namespace App\Http\Controllers;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Http\Requests\Candidate\ApplicationStatusRequest;
use App\Http\Resources\ApplicantResource;
use App\Models\Application;
use App\Services\ApplicationWorkflow;
use Illuminate\Support\Facades\Gate;

/**
 * Only an authorized employer can record hiring decisions.
 */
class ApplicationStatusController extends Controller
{
    public function update(ApplicationStatusRequest $request, Application $application, ApplicationWorkflow $workflow): ApplicantResource
    {
        Gate::authorize('actAsEmployer', $application);

        $changed = $workflow->changeStatus(
            $application,
            ApplicationStatus::from($request->validated('status')),
            ApplicationActor::Employer,
            ApplicationStatus::from($request->validated('expected_status')),
            $request->user(),
        );

        return ApplicantResource::detailed($changed);
    }
}
