<?php

namespace App\Http\Controllers\Employer;

use App\Enums\ApplicationStatus;
use App\Enums\PostingStatus;
use App\Http\Controllers\Controller;
use App\Models\JobPosting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        return response()->json(['data' => [
            'postings' => $counts,
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
}
