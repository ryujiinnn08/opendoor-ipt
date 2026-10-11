<?php

namespace App\Services;

use App\Http\Resources\PublicJobPostingResource;
use App\Models\JobPosting;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * The public job list: one place for the open-job rule, filters, sort, pages and matching,
 * so every page that lists jobs agrees.
 */
class JobSearch
{
    /**
     * With a job seeker's needs, every job carries its match, `match` keeps jobs meeting at
     * least one need, and sort `match` puts full matches first, then by needs met, then newest.
     * Without needs, `match` is ignored and sort `match` means newest.
     *
     * @param  array{q: ?string, category: ?int, accommodations: list<int>, employer: ?int, sort: string, per_page: int, match: bool}  $filters
     */
    public function paginate(array $filters, ?CandidateNeeds $needs = null): LengthAwarePaginator
    {
        $query = JobPosting::publiclyVisible()
            ->with(PublicJobPostingResource::RELATIONS)
            ->search($filters['q'])
            ->when($filters['category'], fn ($query, int $category) => $query->where('category_id', $category))
            ->when($filters['employer'], fn ($query, int $employer) => $query->where('employer_id', $employer))
            ->providingAll($filters['accommodations']);

        if ($needs) {
            $meetsANeed = fn ($query) => $query->whereIn('accommodations.id', $needs->ids());
            $query->withCount(['accommodations as needs_met' => $meetsANeed]);

            if ($filters['match']) {
                $query->whereHas('accommodations', $meetsANeed);
            }
        }

        if ($filters['sort'] === 'match' && $needs) {
            $query->orderByDesc('needs_met')->orderByDesc('approved_at')->orderByDesc('id');
        } elseif ($filters['sort'] === 'closing') {
            // A job without a closing date never closes, so it goes last (nulls sort first otherwise).
            $query->orderByRaw('closes_on IS NULL')->orderBy('closes_on')->orderBy('id');
        } else {
            $query->orderByDesc('approved_at')->orderByDesc('id');
        }

        $page = $query->paginate($filters['per_page'])->withQueryString();

        if ($needs) {
            $page->getCollection()->each(fn (JobPosting $job) => $job->match = $needs->matchFor($job));
        }

        return $page;
    }
}
