<?php

namespace App\Http\Controllers\Candidate;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicJobPostingResource;
use App\Models\Application;
use App\Models\User;
use App\Services\CandidateNeeds;
use App\Services\FeedbackService;
use App\Services\JobSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The job seeker's dashboard (F8.1, F2.5): feedback due, their three best matches, their
 * applications by filter and the profile sections still missing.
 */
class DashboardController extends Controller
{
    public function show(Request $request, JobSearch $search, FeedbackService $feedback): JsonResponse
    {
        $user = $request->user();
        $feedback->remindDue($user);
        $needs = CandidateNeeds::for($user);

        $topMatches = $needs
            ? $search->paginate([
                'q' => null,
                'category' => null,
                'accommodations' => [],
                'employer' => null,
                'sort' => 'match',
                'per_page' => 3,
                'match' => true,
            ], $needs, $user->id)->getCollection()
            : collect();

        return response()->json(['data' => [
            'needs_count' => $needs?->count() ?? 0,
            'applications' => Application::countsFor($user),
            'feedback_due' => $user->applications()->feedbackOpen()->with('jobPosting.employer')->orderBy('hired_at')->orderBy('id')->get()
                ->map(fn (Application $application) => [
                    'application_id' => $application->id,
                    'job_title' => $application->jobPosting->title,
                    'employer_name' => $application->jobPosting->employer->name,
                ])->all(),
            'top_matches' => PublicJobPostingResource::collection($topMatches)->resolve($request),
            'missing_sections' => $this->missingSections($user, $needs),
        ]]);
    }

    /**
     * @return list<string>
     */
    private function missingSections(User $user, ?CandidateNeeds $needs): array
    {
        $profile = $user->candidateProfile;
        $missing = [
            'headline' => ! $profile?->headline,
            'location' => ! $profile?->city || ! $profile?->province,
            'contact_number' => ! $profile?->contact_number,
            'education' => ! $user->educations()->exists(),
            'skills' => ! $profile?->skills,
            'needs' => $needs === null,
        ];

        return array_keys(array_filter($missing));
    }
}
