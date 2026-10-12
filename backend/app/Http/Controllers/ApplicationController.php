<?php

namespace App\Http\Controllers;

use App\Enums\ApplicationStatus;
use App\Enums\Role;
use App\Http\Requests\Candidate\ApplicationListRequest;
use App\Http\Requests\Candidate\ApplyRequest;
use App\Http\Resources\ApplicantResource;
use App\Http\Resources\CandidateApplicationResource;
use App\Models\Application;
use App\Models\JobPosting;
use App\Services\ApplicationWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * Applications (M6). Job seekers apply and follow their own; employers see their jobs' applicants.
 */
class ApplicationController extends Controller
{
    /**
     * My applications, newest first, 12 per page, with how many each filter shows.
     */
    public function index(ApplicationListRequest $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if ($user->role === Role::Employer) {
            return $this->applicants($request);
        }
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

    /**
     * One posting's applicants for its employer (owner, or HR officer of its department), newest
     * first, 12 per page, with how many have each status. Works for deleted postings too.
     */
    private function applicants(ApplicationListRequest $request): AnonymousResourceCollection
    {
        $posting = JobPosting::withTrashed()->with(['accommodations', 'department'])->findOrFail($request->validated('job_posting'));
        Gate::authorize('manage', $posting);
        $status = $request->validated('status') ?? 'all';

        $applicants = $posting->applications()
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->with(ApplicantResource::RELATIONS)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(12);
        // The job and its accommodations are loaded once for every applicant's match.
        $applicants->getCollection()->each(fn (Application $application) => $application->setRelation('jobPosting', $posting));

        $byStatus = $posting->applications()->toBase()->selectRaw('status, COUNT(*) AS total')->groupBy('status')->pluck('total', 'status');
        $counts = ['all' => (int) $byStatus->sum()];
        foreach (ApplicationStatus::cases() as $case) {
            $counts[$case->value] = (int) ($byStatus[$case->value] ?? 0);
        }

        return ApplicantResource::collection($applicants)->additional([
            'counts' => $counts,
            'job' => [
                'id' => $posting->id,
                'title' => $posting->title,
                'status' => $posting->displayStatus()->value,
                'department' => $posting->department ? ['name' => $posting->department->name] : null,
            ],
        ]);
    }

    /**
     * One application. Its job seeker gets their own shape; the job's employer gets the applicant
     * page, and opening a Pending application marks it Reviewed (F6.5).
     */
    public function show(Request $request, Application $application, ApplicationWorkflow $workflow): CandidateApplicationResource|ApplicantResource
    {
        Gate::authorize('view', $application);

        if ($application->user_id === $request->user()->id) {
            return CandidateApplicationResource::detailed($application);
        }

        return ApplicantResource::detailed($workflow->markReviewed($application, $request->user()));
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
