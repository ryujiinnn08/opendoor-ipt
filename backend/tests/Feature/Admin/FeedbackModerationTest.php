<?php

namespace Tests\Feature\Admin;

use App\Models\Accommodation;
use App\Models\Feedback;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\TrustScore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsFeedback;
use Tests\TestCase;

/**
 * Feedback moderation (plan PHASE_6 §4.5, F10.5, Q9).
 */
class FeedbackModerationTest extends TestCase
{
    use BuildsFeedback;
    use RefreshDatabase;

    private User $admin;

    private JobPosting $job;

    /** @var list<Feedback> */
    private array $feedback = [];

    protected function setUp(): void
    {
        parent::setUp();

        config(['opendoor.feedback.min_responses' => 3]);
        $this->admin = User::factory()->admin()->create(['name' => 'Ana Cruz']);
        $ramp = Accommodation::factory()->create(['name' => 'Ramp']);
        $this->job = JobPosting::factory()->open()->create(['title' => 'Office Clerk']);
        $this->job->accommodations()->attach($ramp->id, ['note' => null]);
        $this->job->employer->update(['name' => 'Acme Corp.']);

        foreach (['delivered', 'delivered', 'delivered', 'not_delivered'] as $i => $rating) {
            $seeker = User::factory()->create(['name' => "Seeker {$i}", 'email' => "seeker{$i}@example.com"]);
            $feedback = $this->feedbackOn($this->hireFor($this->job->fresh(), seeker: $seeker), [$ramp->id => $rating]);
            $feedback->forceFill(['comment' => $i === 3 ? 'They never built the ramp.' : null, 'created_at' => now()->subMinutes(10 - $i)])->save();
            $this->feedback[] = $feedback;
        }
        app(TrustScore::class)->recalculate($this->job->employer);
    }

    public function test_only_administrators_moderate(): void
    {
        $id = $this->feedback[3]->id;

        foreach ([User::factory()->employer()->create(), $this->feedback[3]->application->candidate] as $user) {
            $this->actingAs($user, 'web')->getJson('/api/admin/feedback')->assertForbidden();
            $this->postJson("/api/admin/feedback/{$id}/author")->assertForbidden();
            $this->patchJson("/api/admin/feedback/{$id}/hide", ['hidden' => true, 'reason' => 'Abusive words.'])->assertForbidden();
        }
    }

    public function test_the_list_shows_comments_first_and_never_the_author(): void
    {
        $response = $this->actingAs($this->admin, 'web')->getJson('/api/admin/feedback')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.comment', 'They never built the ramp.')
            ->assertJsonPath('data.0.employer.name', 'Acme Corp.')
            ->assertJsonPath('data.0.job.title', 'Office Clerk')
            ->assertJsonPath('data.0.ratings.0.name', 'Ramp')
            ->assertJsonPath('data.0.ratings.0.rating_label', 'Not delivered');

        $this->assertStringNotContainsString('Seeker 3', $response->getContent());
        $this->assertStringNotContainsString('seeker3@example.com', $response->getContent());
        $this->getJson('/api/admin/feedback?filter=all')->assertJsonCount(4, 'data')->assertJsonPath('data.0.id', $this->feedback[3]->id);
        $this->getJson('/api/admin/feedback?filter=hidden')->assertJsonCount(0, 'data');
        $this->getJson('/api/admin/feedback?filter=authors')->assertUnprocessable();
    }

    public function test_asking_who_wrote_it_is_recorded(): void
    {
        $id = $this->feedback[3]->id;

        $this->actingAs($this->admin, 'web')->postJson("/api/admin/feedback/{$id}/author")
            ->assertOk()
            ->assertJsonPath('data.name', 'Seeker 3')
            ->assertJsonPath('data.email', 'seeker3@example.com');

        $this->getJson('/api/admin/feedback')
            ->assertJsonPath('data.0.history.0.type', 'author_viewed')
            ->assertJsonPath('data.0.history.0.by', 'Ana Cruz');
    }

    public function test_hiding_needs_a_reason_and_recalculates_the_score_at_once(): void
    {
        $employer = $this->job->employer;
        $this->assertEqualsWithDelta(75.0, (float) $employer->fresh()->trust_score, 0.01);
        $id = $this->feedback[3]->id;

        $this->actingAs($this->admin, 'web')->patchJson("/api/admin/feedback/{$id}/hide", ['hidden' => true])
            ->assertUnprocessable()
            ->assertJsonPath('errors.reason.0', 'Say why you are hiding this feedback.');

        $this->patchJson("/api/admin/feedback/{$id}/hide", ['hidden' => true, 'reason' => 'Written by the employer\'s rival.'])
            ->assertOk()
            ->assertJsonPath('data.is_hidden', true)
            ->assertJsonPath('data.hidden_reason', 'Written by the employer\'s rival.')
            ->assertJsonPath('data.history.0.type', 'hidden');

        $this->assertEqualsWithDelta(100.0, (float) $employer->fresh()->trust_score, 0.01);
        $this->assertSame(3, $employer->fresh()->feedback_count);
        $this->getJson('/api/admin/feedback?filter=hidden')->assertJsonCount(1, 'data');
    }

    public function test_showing_it_again_puts_it_back_in_the_score(): void
    {
        $id = $this->feedback[3]->id;
        $this->actingAs($this->admin, 'web')->patchJson("/api/admin/feedback/{$id}/hide", ['hidden' => true, 'reason' => 'Checking it.']);

        $this->patchJson("/api/admin/feedback/{$id}/hide", ['hidden' => false])
            ->assertOk()
            ->assertJsonPath('data.is_hidden', false)
            ->assertJsonPath('data.hidden_reason', null)
            ->assertJsonPath('data.history.0.type', 'shown');
        $this->patchJson("/api/admin/feedback/{$id}/hide", ['hidden' => false])->assertConflict();

        $this->assertEqualsWithDelta(75.0, (float) $this->job->employer->fresh()->trust_score, 0.01);
    }

    public function test_a_retry_repairs_a_score_left_stale_by_a_failed_recalculation(): void
    {
        // The hide committed, but the recalculation after it failed: the score still counts it.
        $this->feedback[3]->forceFill(['is_hidden' => true, 'hidden_reason' => 'Abusive words.'])->save();
        $this->assertEqualsWithDelta(75.0, (float) $this->job->employer->fresh()->trust_score, 0.01);

        $this->actingAs($this->admin, 'web')
            ->patchJson("/api/admin/feedback/{$this->feedback[3]->id}/hide", ['hidden' => true, 'reason' => 'Abusive words.'])
            ->assertConflict();

        $this->assertEqualsWithDelta(100.0, (float) $this->job->employer->fresh()->trust_score, 0.01);
    }

    public function test_hiding_below_the_minimum_takes_the_score_away(): void
    {
        $this->actingAs($this->admin, 'web');
        foreach ([0, 1] as $i) {
            $this->patchJson("/api/admin/feedback/{$this->feedback[$i]->id}/hide", ['hidden' => true, 'reason' => 'Duplicate hires.'])->assertOk();
        }

        $this->assertNull($this->job->employer->fresh()->trust_score);
    }

    public function test_the_job_seeker_sees_that_their_ratings_were_removed(): void
    {
        $feedback = $this->feedback[3];
        $this->actingAs($this->admin, 'web')->patchJson("/api/admin/feedback/{$feedback->id}/hide", ['hidden' => true, 'reason' => 'Abusive words.']);

        $this->actingAs($feedback->application->candidate, 'web')
            ->getJson("/api/applications/{$feedback->application_id}/feedback-form")
            ->assertOk()
            ->assertJsonPath('data.sent.hidden', true)
            ->assertJsonMissingPath('data.sent.hidden_reason');
    }

    public function test_the_dashboard_counts_the_past_weeks_comments(): void
    {
        $this->feedback[0]->forceFill(['comment' => 'Old news.', 'created_at' => now()->subDays(8)])->save();

        $this->actingAs($this->admin, 'web')->getJson('/api/admin/dashboard')
            ->assertJsonPath('data.feedback_comments_last_7_days', 1);
    }
}
