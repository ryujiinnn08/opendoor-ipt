<?php

namespace App\Http\Controllers\Employer;

use App\Enums\ApplicationStatus;
use App\Enums\PostingStatus;
use App\Http\Controllers\Controller;
use App\Models\JobPosting;
use App\Services\DashboardActivity;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    /**
     * Posting counts by the status people see, and the postings with applicants waiting for
     * review: the whole company for owners, their own department for HR officers.
     */
    public function show(Request $request): JsonResponse
    {
        $counts = collect(PostingStatus::cases())->mapWithKeys(fn (PostingStatus $status) => [
            $status->value => JobPosting::visibleTo($request->user())->inDisplayStatus($status)->count(),
        ]);

        // Postings with applicants nobody has opened yet, most first (F8.2).
        $waiting = JobPosting::visibleTo($request->user())
            ->whereHas('applications', fn ($query) => $query->where('status', ApplicationStatus::Pending))
            ->withCount(['applications as new_count' => fn ($query) => $query->where('status', ApplicationStatus::Pending)])
            ->get(['id', 'title'])
            ->sortBy([['new_count', 'desc'], ['title', 'asc']])
            ->values();

        $employer = $request->user()->membership->employer;

        return response()->json(['data' => [
            'postings' => $counts,
            // The employer's own trust score for the dashboard tile (F8.2); no count below 3.
            'trust_score' => $employer->shownTrustScore(),
            // For the Get started card (UI_FEEDBACK_WAVE_B_PLAN B4): the profile job seekers read.
            'profile_complete' => filled($employer->description) && filled($employer->industry) && filled($employer->address),
            'waiting_applicants' => [
                'total' => (int) $waiting->sum('new_count'),
                'postings' => $waiting->take(10)->map(fn (JobPosting $posting) => [
                    'id' => $posting->id,
                    'title' => $posting->title,
                    'new' => (int) $posting->new_count,
                ])->all(),
            ],
        ]]);
    }

    /**
     * Weekly activity for the dashboard charts (UI_FEEDBACK_WAVE_B_PLAN B3), narrowed by the
     * charts' filters: weeks (4, 8 or 12), job (a posting this person may see) and statuses.
     */
    public function activity(Request $request, DashboardActivity $activity): JsonResponse
    {
        $user = $request->user();
        $filters = $request->validate([
            'weeks' => ['nullable', 'integer', Rule::in(DashboardActivity::EMPLOYER_WEEKS)],
            'job' => ['nullable', 'integer', function (string $attribute, mixed $value, Closure $fail) use ($user) {
                if (! JobPosting::visibleTo($user)->whereKey($value)->exists()) {
                    $fail('Choose one of your job postings.');
                }
            }],
            'statuses' => ['nullable', 'array'],
            'statuses.*' => ['string', 'distinct', Rule::in(array_map(fn (ApplicationStatus $status) => $status->value, DashboardActivity::CHARTED_STATUSES))],
        ], [
            'weeks.in' => 'Choose 4, 8 or 12 weeks.',
            'statuses.*.in' => 'Choose a status shown on the chart.',
        ]);

        return response()->json(['data' => $activity->forEmployer(
            $user,
            (int) ($filters['weeks'] ?? DashboardActivity::WEEKS),
            isset($filters['job']) ? (int) $filters['job'] : null,
            array_map(fn (string $status) => ApplicationStatus::from($status), $filters['statuses'] ?? []),
        )]);
    }
}
