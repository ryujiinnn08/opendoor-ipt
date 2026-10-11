<?php

namespace App\Services;

use App\Http\Resources\PublicJobPostingResource;
use App\Models\JobPosting;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * The public job list: one place for the open-job rule, filters, sort and pages,
 * so every page that lists jobs agrees (Phase 3B adds matching here).
 */
class JobSearch
{
    /**
     * @param  array{q: ?string, category: ?int, accommodations: list<int>, employer: ?int, sort: string, per_page: int}  $filters
     */
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = JobPosting::publiclyVisible()
            ->with(PublicJobPostingResource::RELATIONS)
            ->search($filters['q'])
            ->when($filters['category'], fn ($query, int $category) => $query->where('category_id', $category))
            ->when($filters['employer'], fn ($query, int $employer) => $query->where('employer_id', $employer))
            ->providingAll($filters['accommodations']);

        if ($filters['sort'] === 'closing') {
            $query->orderBy('closes_on')->orderBy('id');
        } else {
            $query->orderByDesc('approved_at')->orderByDesc('id');
        }

        return $query->paginate($filters['per_page'])->withQueryString();
    }
}
