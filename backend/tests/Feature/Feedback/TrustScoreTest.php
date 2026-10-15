<?php

namespace Tests\Feature\Feedback;

use App\Enums\EmployerType;
use App\Models\Accommodation;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Services\TrustScore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsFeedback;
use Tests\TestCase;

class TrustScoreTest extends TestCase
{
    use BuildsFeedback, RefreshDatabase;

    public function test_the_score_is_null_until_three_responses(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $score = app(TrustScore::class);

        foreach ([1, 2] as $_) {
            $this->feedbackOn($this->hireFor($team['itJob']), [$ramp->id => 'delivered']);
        }
        $score->recalculate($team['company']);
        $this->assertNull($team['company']->fresh()->trust_score);
        $this->assertSame(2, $team['company']->fresh()->feedback_count);

        $this->feedbackOn($this->hireFor($team['itJob']), [$ramp->id => 'delivered']);
        $score->recalculate($team['company']);
        $this->assertSame(100.0, $team['company']->fresh()->trust_score);
        $this->assertSame(3, $team['company']->fresh()->feedback_count);
    }

    public function test_the_formula_counts_partial_as_half_and_skips_not_used(): void
    {
        $team = $this->hiringCompany();
        [$a, $b] = Accommodation::factory()->count(2)->create();

        $this->feedbackOn($this->hireFor($team['itJob']), [$a->id => 'delivered', $b->id => 'not_used']);
        $this->feedbackOn($this->hireFor($team['itJob']), [$a->id => 'partial']);
        $this->feedbackOn($this->hireFor($team['hrJob']), [$a->id => 'not_delivered', $b->id => 'not_used']);
        app(TrustScore::class)->recalculate($team['company']);

        $this->assertSame(50.0, $team['company']->fresh()->trust_score);
    }

    public function test_every_job_of_the_employer_counts_including_deleted_ones(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $closed = JobPosting::factory()->closed()->in($team['it'])->create();

        $this->feedbackOn($this->hireFor($team['itJob']), [$ramp->id => 'delivered']);
        $this->feedbackOn($this->hireFor($team['hrJob']), [$ramp->id => 'delivered']);
        $this->feedbackOn($this->hireFor($closed), [$ramp->id => 'not_delivered']);
        $closed->delete();
        app(TrustScore::class)->recalculate($team['company']);

        $this->assertSame(3, $team['company']->fresh()->feedback_count);
        $this->assertEqualsWithDelta(66.67, $team['company']->fresh()->trust_score, 0.001);
    }

    public function test_another_employers_feedback_is_not_counted(): void
    {
        $team = $this->hiringCompany();
        $other = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        foreach ([1, 2, 3] as $_) {
            $this->feedbackOn($this->hireFor($other['itJob']), [$ramp->id => 'delivered']);
        }
        app(TrustScore::class)->recalculate($team['company']);

        $this->assertSame(0, $team['company']->fresh()->feedback_count);
        $this->assertNull($team['company']->fresh()->trust_score);
    }

    public function test_hidden_feedback_is_left_out(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $feedback = collect([1, 2, 3])->map(fn () => $this->feedbackOn($this->hireFor($team['itJob']), [$ramp->id => 'delivered']));
        app(TrustScore::class)->recalculate($team['company']);
        $this->assertSame(100.0, $team['company']->fresh()->trust_score);

        $feedback->first()->forceFill(['is_hidden' => true])->save();
        app(TrustScore::class)->recalculate($team['company']);

        $this->assertNull($team['company']->fresh()->trust_score);
        $this->assertSame(2, $team['company']->fresh()->feedback_count);
    }

    public function test_trust_score_is_not_fillable(): void
    {
        $employer = Employer::create(['type' => EmployerType::Individual, 'name' => 'Ana', 'trust_score' => 99, 'feedback_count' => 9]);

        $this->assertNull($employer->fresh()->trust_score);
        $this->assertSame(0, $employer->fresh()->feedback_count);
    }
}
