<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\Accommodation;
use App\Models\JobPosting;
use App\Models\User;

/**
 * A job seeker's active needs, and the one match calculation used by the job list, the job
 * page and the dashboard (plan PHASE_3 Appendix C.3). A need counts as met only when the
 * posting lists that accommodation; retired needs are not counted.
 */
class CandidateNeeds
{
    /**
     * @param  array<int, array{name: string, group_name: string}>  $needs  Need id => details, in display order.
     */
    private function __construct(private array $needs) {}

    /**
     * The needs of an active job seeker who has at least one active need; null for anyone else
     * (guests, employers, admins, suspended accounts), who then see plain lists.
     */
    public static function for(?User $user): ?self
    {
        if (! $user || ! $user->is_active || $user->role !== Role::Candidate) {
            return null;
        }

        $needs = Accommodation::inDisplayOrder($user->needs()->where('is_active', true)->get());

        return $needs->isEmpty()
            ? null
            : new self($needs->mapWithKeys(fn (Accommodation $need) => [$need->id => ['name' => $need->name, 'group_name' => $need->group_name]])->all());
    }

    /**
     * @return list<int>
     */
    public function ids(): array
    {
        return array_keys($this->needs);
    }

    public function count(): int
    {
        return count($this->needs);
    }

    /**
     * How the job meets these needs, from its eager-loaded accommodations (no extra queries).
     *
     * @return array{needs_total: int, needs_met: int, missing: list<string>, needs?: list<array<string, mixed>>}
     */
    public function matchFor(JobPosting $job, bool $withNeeds = false): array
    {
        $provided = $job->accommodations->keyBy('id');
        $needs = [];
        $missing = [];

        foreach ($this->needs as $id => $need) {
            $item = $provided->get($id);
            if (! $item) {
                $missing[] = $need['name'];
            }
            $needs[] = [
                'id' => $id,
                ...$need,
                'provided' => $item !== null,
                'note' => $item?->pivot->note,
            ];
        }

        $match = [
            'needs_total' => $this->count(),
            'needs_met' => $this->count() - count($missing),
            'missing' => $missing,
        ];

        return $withNeeds ? [...$match, 'needs' => $needs] : $match;
    }
}
