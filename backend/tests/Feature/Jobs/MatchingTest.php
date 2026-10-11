<?php

namespace Tests\Feature\Jobs;

use App\Models\Accommodation;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MatchingTest extends TestCase
{
    use RefreshDatabase;

    private function seekerNeeding(Accommodation ...$needs): User
    {
        $seeker = User::factory()->create();
        $seeker->needs()->attach(array_map(fn (Accommodation $need) => $need->id, $needs));

        return $seeker;
    }

    /**
     * @param  list<Accommodation>  $provides
     */
    private function job(string $title, array $provides, int $approvedDaysAgo = 1): JobPosting
    {
        $job = JobPosting::factory()->open()->create(['title' => $title, 'approved_at' => now()->subDays($approvedDaysAgo)]);
        $job->accommodations()->attach(array_map(fn (Accommodation $item) => $item->id, $provides));

        return $job;
    }

    /**
     * @return list<Accommodation>
     */
    private function physicalAccess(string ...$names): array
    {
        return array_map(fn (string $name) => Accommodation::factory()->create(['name' => $name, 'group_name' => 'Physical access']), $names);
    }

    public function test_counts_met_needs_and_names_the_missing_ones(): void
    {
        [$ramp, $restroom, $lift] = $this->physicalAccess('Lift', 'Ramp', 'Restroom');
        $this->job('Clerk', [$ramp, $lift]);

        $this->actingAs($this->seekerNeeding($ramp, $restroom, $lift), 'web')->getJson('/api/job-postings')
            ->assertJsonPath('data.0.match', ['needs_total' => 3, 'needs_met' => 2, 'missing' => ['Ramp']]);
    }

    public function test_matches_my_needs_shows_jobs_meeting_at_least_one_need_best_first(): void
    {
        [$a, $b, $c] = $this->physicalAccess('A', 'B', 'C');
        $full = $this->job('Full', [$a, $b], 3);
        $partial = $this->job('Partial', [$a], 0);
        $none = $this->job('None', [$c], 0);
        $newerFull = $this->job('Newer full', [$a, $b], 0);
        $this->actingAs($this->seekerNeeding($a, $b), 'web');

        $this->assertSame(['Newer full', 'Full', 'Partial'], $this->getJson('/api/job-postings?match=1&sort=match')->json('data.*.title'));

        $all = $this->getJson('/api/job-postings?sort=match')->json('data');
        $this->assertSame(['Newer full', 'Full', 'Partial', 'None'], array_column($all, 'title'));
        $this->assertSame(0, $all[3]['match']['needs_met']);
        $this->assertSame(['A', 'B'], $all[3]['match']['missing']);
        $this->assertSame([$newerFull->id, $none->id, $partial->id, $full->id], $this->getJson('/api/job-postings')->json('data.*.id'));
    }

    public function test_match_needs_an_active_job_seeker_with_needs(): void
    {
        [$a] = $this->physicalAccess('A');
        $this->job('Older', [$a], 3);
        $this->job('Newer', [], 0);
        $suspended = User::factory()->suspended()->create();
        $suspended->needs()->attach($a->id);

        $viewers = [null, User::factory()->employer()->create(), User::factory()->admin()->create(), User::factory()->create(), $suspended];
        foreach ($viewers as $viewer) {
            $viewer ? $this->actingAs($viewer, 'web') : $this->app['auth']->forgetGuards();
            $items = $this->getJson('/api/job-postings?match=1&sort=match')->assertOk()->json('data');

            $this->assertSame(['Newer', 'Older'], array_column($items, 'title'));
            foreach ($items as $item) {
                $this->assertArrayNotHasKey('match', $item);
            }
        }
    }

    public function test_retired_needs_are_not_counted(): void
    {
        $needs = $this->physicalAccess('A', 'B', 'C', 'D', 'E');
        $this->job('Everything', $needs);
        $seeker = $this->seekerNeeding(...$needs);
        $needs[4]->update(['is_active' => false]);

        $this->actingAs($seeker, 'web')->getJson('/api/job-postings')
            ->assertJsonPath('data.0.match', ['needs_total' => 4, 'needs_met' => 4, 'missing' => []]);
    }

    public function test_the_job_page_lists_each_need_as_provided_or_missing(): void
    {
        [$ramp, $restroom] = $this->physicalAccess('Ramp', 'Restroom');
        $job = JobPosting::factory()->open()->create();
        $job->accommodations()->attach($ramp->id, ['note' => 'Side door']);

        $this->actingAs($this->seekerNeeding($ramp, $restroom), 'web')->getJson("/api/job-postings/{$job->id}")
            ->assertJsonPath('data.match.needs_met', 1)
            ->assertJsonPath('data.match.needs', [
                ['id' => $ramp->id, 'name' => 'Ramp', 'group_name' => 'Physical access', 'provided' => true, 'note' => 'Side door'],
                ['id' => $restroom->id, 'name' => 'Restroom', 'group_name' => 'Physical access', 'provided' => false, 'note' => null],
            ]);
        $this->actingAs(User::factory()->employer()->create(), 'web')->getJson("/api/job-postings/{$job->id}")->assertJsonMissingPath('data.match');
    }

    public function test_matching_does_not_query_per_job(): void
    {
        $needs = $this->physicalAccess('A', 'B', 'C');
        $this->actingAs($this->seekerNeeding(...$needs), 'web');

        $count = function (int $jobs) use ($needs): int {
            foreach (range(1, $jobs) as $index) {
                $this->job("Job {$index}", [$needs[$index % 3]]);
            }
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->getJson('/api/job-postings?match=1&sort=match')->assertOk();

            return count(DB::getQueryLog());
        };

        $this->assertSame($count(2), $count(8));
    }
}
