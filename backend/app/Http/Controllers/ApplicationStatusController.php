<?php

namespace App\Http\Controllers;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Enums\Role;
use App\Http\Requests\Candidate\ApplicationStatusRequest;
use App\Http\Resources\ApplicantResource;
use App\Http\Resources\CandidateApplicationResource;
use App\Models\Application;
use App\Services\ApplicationWorkflow;
use Illuminate\Support\Facades\Gate;

/**
 * Changing an application's status (Table 1). Job seekers withdraw or confirm a hire; the job's
 * employer hires or rejects.
 */
class ApplicationStatusController extends Controller
{
    public function update(ApplicationStatusRequest $request, Application $application, ApplicationWorkflow $workflow): CandidateApplicationResource|ApplicantResource
    {
        $employer = $request->user()->role === Role::Employer;
        Gate::authorize($employer ? 'actAsEmployer' : 'actAsCandidate', $application);

        $changed = $workflow->changeStatus(
            $application,
            ApplicationStatus::from($request->validated('status')),
            $employer ? ApplicationActor::Employer : ApplicationActor::Candidate,
            ApplicationStatus::from($request->validated('expected_status')),
            $request->user(),
        );

        return $employer ? ApplicantResource::detailed($changed) : CandidateApplicationResource::detailed($changed);
    }
}
