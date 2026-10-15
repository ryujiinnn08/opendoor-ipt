<?php

namespace Tests\Feature\Feedback;

use App\Models\Accommodation;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\TrustScore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsFeedback;
use Tests\TestCase;

class TrustScoreSummaryTest extends TestCase
{
    use BuildsFeedback, RefreshDatabase;

    /**
     * Feedback on the company's IT job, one list of ratings (accommodation id => rating) per hire,
     * then the stored score recalculated.
     *
     * @param  list<array<int, string>>  $responses
     */
    private function rated(array $team, array $responses): void
    {
        foreach ($responses as $ratings) {
            $this->feedbackOn($this->hireFor($team['itJob']), $ratings);
        }
        app(TrustScore::class)->recalculate($team['company']);
    }

    private function publicSummary(Employer $employer)
    {
        return $this->getJson("/api/employers/{$employer->id}/trust-score");
    }

    public function test_the_score_is_a_whole_percent_with_its_count(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create(['name' => 'Wheelchair-accessible entrance']);
        $this->rated($team, [[$ramp->id => 'delivered'], [$ramp->id => 'delivered'], [$ramp->id => 'delivered'], [$ramp->id => 'delivered'], [$ramp->id => 'partial'], [$ramp->id => 'delivered'], [$ramp->id => 'delivered'], [$ramp->id => 'partial']]);
        // (6 × 1 + 2 × 0.5) ÷ 8 = 87.5% → 88

        $this->publicSummary($team['company'])->assertOk()
            ->assertJsonPath('data.employer', ['id' => $team['company']->id, 'name' => $team['company']->name])
            ->assertJsonPath('data.score', 88)
            ->assertJsonPath('data.responses', 8)
            ->assertJsonPath('data.breakdown', [[
                'id' => $ramp->id, 'name' => 'Wheelchair-accessible entrance', 'group_name' => $ramp->group_name,
                'delivered' => 6, 'partial' => 2, 'not_delivered' => 0, 'rated' => 8,
            ]])
            ->assertJsonPath('data.not_enough', []);
    }

    public function test_nothing_is_counted_below_three(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $this->rated($team, [[$ramp->id => 'delivered'], [$ramp->id => 'delivered']]);
        $empty = ['score' => null, 'responses' => null, 'breakdown' => null, 'not_enough' => null];

        $this->assertSame($empty, collect($this->publicSummary($team['company'])->json('data'))->except('employer')->all());
        foreach ([$team['owner'], $team['hr']] as $member) {
            $this->assertSame($empty, collect($this->actingAs($member, 'web')->getJson('/api/employer/trust-score')->assertOk()->json('data'))->except('employer')->all());
        }
    }

    public function test_rows_need_three_ratings(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create(['name' => 'Wheelchair-accessible entrance']);
        $interpreter = Accommodation::factory()->create(['name' => 'Sign language interpreter']);
        $this->rated($team, [
            [$ramp->id => 'delivered', $interpreter->id => 'not_delivered'],
            [$ramp->id => 'delivered', $interpreter->id => 'partial'],
            [$ramp->id => 'partial'],
        ]);

        $data = $this->publicSummary($team['company'])->json('data');
        $this->assertSame(['Wheelchair-accessible entrance'], array_column($data['breakdown'], 'name'));
        $this->assertSame([['id' => $interpreter->id, 'name' => 'Sign language interpreter', 'group_name' => $interpreter->group_name]], $data['not_enough']);
    }

    public function test_not_enough_never_shows_who_rated_a_rare_accommodation(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create(['name' => 'Wheelchair-accessible entrance']);
        $interpreter = Accommodation::factory()->create(['name' => 'Sign language interpreter']);
        $team['itJob']->accommodations()->attach([$ramp->id, $interpreter->id]);
        $job = $team['itJob']->fresh();
        foreach ([1, 2, 3] as $_) {
            $this->feedbackOn($this->hireFor($job), [$ramp->id => 'delivered', $interpreter->id => 'not_used']);
        }
        $fourth = $this->hireFor($job);
        app(TrustScore::class)->recalculate($team['company']);
        $before = $this->publicSummary($team['company'])->json('data.not_enough');

        // The 4th hire rates the interpreter: the list mustn't change because of it.
        $this->feedbackOn($fourth, [$ramp->id => 'delivered', $interpreter->id => 'partial']);
        app(TrustScore::class)->recalculate($team['company']);

        $this->assertSame(['Sign language interpreter'], array_column($before, 'name'));
        $this->assertSame($before, $this->publicSummary($team['company'])->json('data.not_enough'));
    }

    public function test_not_used_is_not_a_rating(): void
    {
        $team = $this->hiringCompany();
        [$ramp, $hours] = Accommodation::factory()->count(2)->create();
        $this->rated($team, [
            [$ramp->id => 'delivered', $hours->id => 'not_used'],
            [$ramp->id => 'delivered', $hours->id => 'not_used'],
            [$ramp->id => 'delivered', $hours->id => 'delivered'],
        ]);

        $data = $this->publicSummary($team['company'])->json('data');
        $this->assertSame([$ramp->id], array_column($data['breakdown'], 'id'));
        $this->assertSame([$hours->id], array_column($data['not_enough'], 'id'));
    }

    public function test_hidden_feedback_leaves_the_breakdown(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $this->rated($team, [[$ramp->id => 'delivered'], [$ramp->id => 'delivered'], [$ramp->id => 'delivered'], [$ramp->id => 'not_delivered']]);
        $hidden = $team['itJob']->applications()->latest('id')->first()->feedback;
        $hidden->forceFill(['is_hidden' => true])->save();
        app(TrustScore::class)->recalculate($team['company']);

        $this->publicSummary($team['company'])
            ->assertJsonPath('data.score', 100)
            ->assertJsonPath('data.responses', 3)
            ->assertJsonPath('data.breakdown.0.rated', 3)
            ->assertJsonPath('data.breakdown.0.not_delivered', 0);
    }

    public function test_retired_types_are_still_listed(): void
    {
        $team = $this->hiringCompany();
        $retired = Accommodation::factory()->retired()->create(['name' => 'Shuttle service']);
        $this->rated($team, [[$retired->id => 'delivered'], [$retired->id => 'delivered'], [$retired->id => 'partial']]);

        $this->publicSummary($team['company'])->assertJsonPath('data.breakdown.0.name', 'Shuttle service');
    }

    public function test_no_response_details_leak(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $seeker = User::factory()->create(['name' => 'Maria Santos']);
        $feedback = $this->feedbackOn($this->hireFor($team['itJob'], 31, $seeker), [$ramp->id => 'not_delivered']);
        $feedback->forceFill(['comment' => 'The ramp was blocked on Mondays.'])->save();
        $this->rated($team, [[$ramp->id => 'delivered'], [$ramp->id => 'delivered']]);

        foreach ([$this->publicSummary($team['company']), $this->actingAs($team['owner'], 'web')->getJson('/api/employer/trust-score')] as $response) {
            $body = $response->assertOk()->getContent();
            $this->assertStringNotContainsString('Maria Santos', $body);
            $this->assertStringNotContainsString('blocked on Mondays', $body);
            $this->assertStringNotContainsString('_at', $body);
            $data = $response->json('data');
            $this->assertSame(['employer', 'score', 'responses', 'breakdown', 'not_enough'], array_keys($data));
            $this->assertSame(['id', 'name', 'group_name', 'delivered', 'partial', 'not_delivered', 'rated'], array_keys($data['breakdown'][0]));
        }
    }

    public function test_every_member_sees_their_own(): void
    {
        $team = $this->hiringCompany();
        [$individual, $person] = $this->individualEmployer();
        $other = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $this->rated($other, [[$ramp->id => 'delivered'], [$ramp->id => 'delivered'], [$ramp->id => 'delivered']]);

        $this->actingAs($team['owner'], 'web')->getJson('/api/employer/trust-score')->assertOk()
            ->assertJsonPath('data.employer.id', $team['company']->id)
            ->assertJsonPath('data.score', null);
        $this->actingAs($team['hr'], 'web')->getJson('/api/employer/trust-score')->assertJsonPath('data.employer.id', $team['company']->id);
        $this->actingAs($individual, 'web')->getJson('/api/employer/trust-score')->assertJsonPath('data.employer.id', $person->id);
        $this->actingAs($other['hr'], 'web')->getJson('/api/employer/trust-score')->assertJsonPath('data.score', 100);
        $this->actingAs(User::factory()->create(), 'web')->getJson('/api/employer/trust-score')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'web')->getJson('/api/employer/trust-score')->assertForbidden();
    }

    public function test_employers_and_admins_have_no_feedback_endpoint(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $team['itJob']->accommodations()->attach($ramp->id);
        $application = $this->hireFor($team['itJob']->fresh());

        foreach ([$team['owner'], $team['hr'], User::factory()->admin()->create()] as $user) {
            $this->actingAs($user, 'web');
            $this->getJson("/api/applications/{$application->id}/feedback-form")->assertForbidden();
            $this->postJson("/api/applications/{$application->id}/feedback", ['ratings' => [$ramp->id => 'delivered']])->assertForbidden();
            $this->assertArrayNotHasKey('feedback', $this->getJson("/api/applications/{$application->id}")->json('data') ?? []);
        }
    }

    public function test_the_public_score_needs_a_public_employer(): void
    {
        $hidden = Employer::factory()->create();
        JobPosting::factory()->in($hidden)->pending()->create();

        $this->getJson("/api/employers/{$hidden->id}/trust-score")->assertNotFound();
        $this->getJson('/api/employers/999999/trust-score')->assertNotFound();
    }
}
