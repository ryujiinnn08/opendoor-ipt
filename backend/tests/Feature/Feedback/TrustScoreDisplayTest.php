<?php

namespace Tests\Feature\Feedback;

use App\Models\Accommodation;
use App\Models\JobPosting;
use App\Services\TrustScore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsFeedback;
use Tests\TestCase;

class TrustScoreDisplayTest extends TestCase
{
    use BuildsFeedback, RefreshDatabase;

    /**
     * A company with 4 responses (88%) and one with 2 (no score yet).
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function twoCompanies(): array
    {
        $scored = $this->hiringCompany();
        $unscored = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        foreach (['delivered', 'delivered', 'partial', 'delivered'] as $rating) {
            $this->feedbackOn($this->hireFor($scored['itJob']), [$ramp->id => $rating]);
        }
        foreach (['delivered', 'delivered'] as $rating) {
            $this->feedbackOn($this->hireFor($unscored['itJob']), [$ramp->id => $rating]);
        }
        app(TrustScore::class)->recalculate($scored['company']);
        app(TrustScore::class)->recalculate($unscored['company']);

        return [$scored, $unscored];
    }

    public function test_jobs_and_employers_carry_the_score(): void
    {
        [$scored, $unscored] = $this->twoCompanies();

        $byEmployer = collect($this->getJson('/api/job-postings')->assertOk()->json('data'))->pluck('employer')->keyBy('id');
        $this->assertSame(88, $byEmployer[$scored['company']->id]['trust_score']);
        $this->assertSame(4, $byEmployer[$scored['company']->id]['trust_count']);
        $this->assertNull($byEmployer[$unscored['company']->id]['trust_score']);
        $this->assertNull($byEmployer[$unscored['company']->id]['trust_count']);

        $this->getJson("/api/job-postings/{$scored['itJob']->id}")
            ->assertJsonPath('data.employer.trust_score', 88)
            ->assertJsonPath('data.employer.trust_count', 4);
        $this->getJson("/api/employers/{$scored['company']->id}")
            ->assertJsonPath('data.trust_score', 88)
            ->assertJsonPath('data.trust_count', 4);
        $this->getJson("/api/employers/{$unscored['company']->id}")
            ->assertJsonPath('data.trust_score', null)
            ->assertJsonPath('data.trust_count', null);
    }

    public function test_the_list_does_not_query_per_job(): void
    {
        [$scored] = $this->twoCompanies();
        $count = function () {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->getJson('/api/job-postings')->assertOk();
            $queries = count(DB::getQueryLog());
            DB::disableQueryLog();

            return $queries;
        };

        $before = $count();
        JobPosting::factory()->count(5)->open()->in($scored['it'])->create();

        $this->assertSame($before, $count());
    }

    public function test_the_employer_dashboard_has_the_tile(): void
    {
        [$scored, $unscored] = $this->twoCompanies();

        $this->actingAs($scored['hr'], 'web')->getJson('/api/employer/dashboard')
            ->assertJsonPath('data.trust_score', ['score' => 88, 'responses' => 4]);
        $this->actingAs($unscored['owner'], 'web')->getJson('/api/employer/dashboard')
            ->assertJsonPath('data.trust_score', ['score' => null, 'responses' => null]);
    }
}
