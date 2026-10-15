<?php

namespace Tests\Feature\Feedback;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\BuildsFeedback;
use Tests\TestCase;

class GiveFeedbackTest extends TestCase
{
    use BuildsFeedback, RefreshDatabase;

    /**
     * The IT job with two accommodations (a ramp with a note, flexible hours), and a hire 31 days ago.
     *
     * @return array{0: array<string, mixed>, 1: Application, 2: Accommodation, 3: Accommodation}
     */
    private function hiredWithTwoAccommodations(int $daysAgo = 31): array
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create(['name' => 'Wheelchair-accessible entrance']);
        $hours = Accommodation::factory()->create(['name' => 'Flexible hours']);
        $team['itJob']->accommodations()->attach([$ramp->id => ['note' => 'Ramp at the main entrance.'], $hours->id => ['note' => null]]);

        return [$team, $this->hireFor($team['itJob']->fresh(), $daysAgo), $ramp, $hours];
    }

    private function send(Application $application, array $ratings, ?string $comment = null)
    {
        return $this->postJson("/api/applications/{$application->id}/feedback", ['ratings' => $ratings, 'comment' => $comment]);
    }

    public function test_the_form_lists_the_hire_copy_with_notes(): void
    {
        [$team, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();

        $response = $this->actingAs($application->candidate, 'web')->getJson("/api/applications/{$application->id}/feedback-form")
            ->assertOk()
            ->assertJsonPath('data.state', 'open')
            ->assertJsonPath('data.job.title', 'Junior Web Developer')
            ->assertJsonPath('data.employer.name', $team['company']->name)
            ->assertJsonPath('data.sent', null)
            ->assertJsonCount(2, 'data.accommodations');
        $notes = collect($response->json('data.accommodations'))->pluck('note', 'name');
        $this->assertSame('Ramp at the main entrance.', $notes['Wheelchair-accessible entrance']);
        $this->assertNull($notes['Flexible hours']);
    }

    public function test_feedback_is_saved_and_the_score_recalculated(): void
    {
        [$team, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();
        $ramp2 = Accommodation::find($ramp->id);
        foreach ([1, 2] as $_) {
            $this->feedbackOn($this->hireFor($team['itJob']), [$ramp2->id => 'delivered']);
        }

        $this->actingAs($application->candidate, 'web');
        $sent = $this->send($application, [$ramp->id => 'partial', $hours->id => 'not_used'], '  The ramp was blocked on Mondays.  ')
            ->assertCreated()
            ->assertJsonPath('data.state', 'sent')
            ->assertJsonPath('data.sent.comment', 'The ramp was blocked on Mondays.')
            ->json('data.sent.ratings');
        $byName = collect($sent)->keyBy('name');
        $this->assertSame('partial', $byName['Wheelchair-accessible entrance']['rating']);
        $this->assertSame('Partly delivered', $byName['Wheelchair-accessible entrance']['rating_label']);
        $this->assertSame('Ramp at the main entrance.', $byName['Wheelchair-accessible entrance']['note']);
        $this->assertSame('not_used', $byName['Flexible hours']['rating']);

        $company = $team['company']->fresh();
        $this->assertSame(3, $company->feedback_count);
        $this->assertSame(83.33, $company->trust_score);
        $this->getJson("/api/applications/{$application->id}/feedback-form")->assertJsonPath('data.state', 'sent');
    }

    public function test_only_the_hire_copy_can_be_rated(): void
    {
        [$team, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();
        $added = Accommodation::factory()->create(['name' => 'Screen reader software provided']);
        $team['itJob']->accommodations()->sync([$added->id => ['note' => null]]);

        $this->actingAs($application->candidate, 'web');
        $this->getJson("/api/applications/{$application->id}/feedback-form")
            ->assertJsonCount(2, 'data.accommodations');
        $this->send($application, [$ramp->id => 'delivered', $hours->id => 'delivered', $added->id => 'delivered'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.ratings.0', 'You can only rate the accommodations listed when you were hired.');
        $this->assertNull($application->fresh()->feedback);
    }

    public function test_every_accommodation_needs_an_answer(): void
    {
        [, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();

        $this->actingAs($application->candidate, 'web');
        $key = "ratings.{$hours->id}";
        foreach ([[$ramp->id => 'delivered'], [$ramp->id => 'delivered', $hours->id => null]] as $ratings) {
            $errors = $this->send($application, $ratings)->assertUnprocessable()->json('errors');
            $this->assertSame(['Choose an answer for Flexible hours.'], $errors[$key]);
            $this->assertArrayNotHasKey("ratings.{$ramp->id}", $errors);
        }
        $this->send($application, [$ramp->id => 'delivered', $hours->id => 'excellent'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$key]);
    }

    public function test_at_least_one_real_rating_is_needed(): void
    {
        [, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();

        $this->actingAs($application->candidate, 'web');
        $this->send($application, [$ramp->id => 'not_used', $hours->id => 'not_used'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.ratings.0', 'Rate at least one accommodation you used.');
    }

    public function test_feedback_is_sent_once(): void
    {
        [$team, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();

        $this->actingAs($application->candidate, 'web');
        $this->send($application, [$ramp->id => 'delivered', $hours->id => 'delivered'])->assertCreated();
        $this->send($application, [$ramp->id => 'not_delivered', $hours->id => 'not_delivered'])
            ->assertConflict()
            ->assertJsonPath('message', "You've already sent your ratings.");

        $this->assertSame(1, $team['company']->fresh()->feedback_count);
        $this->assertSame('delivered', $application->fresh()->feedback->items->first()->rating->value);
    }

    public function test_the_window_opens_on_day_30_in_manila(): void
    {
        Carbon::setTestNow('2026-11-11 20:00:00'); // November 12, 04:00 in Manila
        [$team, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();
        $application->forceFill(['hired_at' => '2026-10-13'])->save();
        $later = $this->hireFor($team['itJob']->fresh());
        $later->forceFill(['hired_at' => '2026-10-14'])->save();

        $this->actingAs($application->candidate, 'web')->getJson("/api/applications/{$application->id}/feedback-form")
            ->assertJsonPath('data.state', 'open')
            ->assertJsonPath('data.opens_on', '2026-11-12');

        $this->actingAs($later->candidate, 'web');
        $this->getJson("/api/applications/{$later->id}/feedback-form")
            ->assertOk()
            ->assertJsonPath('data.state', 'not_yet')
            ->assertJsonPath('data.opens_on', '2026-11-13');
        $this->send($later, [$ramp->id => 'delivered', $hours->id => 'delivered'])
            ->assertForbidden()
            ->assertJsonPath('message', "You can rate your employer's accommodations from November 13, 2026.");
        Carbon::setTestNow();
    }

    public function test_the_delay_is_a_setting(): void
    {
        config(['opendoor.feedback.delay_days' => 0]);
        [, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations(0);

        $this->actingAs($application->candidate, 'web');
        $this->send($application, [$ramp->id => 'delivered', $hours->id => 'delivered'])->assertCreated();
    }

    public function test_a_hire_without_accommodations_has_nothing_to_rate(): void
    {
        $team = $this->hiringCompany();
        $application = $this->hireFor($team['itJob']);

        $this->actingAs($application->candidate, 'web');
        $this->getJson("/api/applications/{$application->id}/feedback-form")
            ->assertJsonPath('data.state', 'nothing_to_rate')
            ->assertJsonCount(0, 'data.accommodations');
        $this->send($application, [])
            ->assertUnprocessable()
            ->assertJsonPath('message', "This job listed no accommodations, so there's nothing to rate.");
        $this->assertSame(0, $team['company']->fresh()->feedback_count);
    }

    public function test_only_the_hired_job_seeker_can_give_feedback(): void
    {
        [$team, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();
        $ratings = [$ramp->id => 'delivered', $hours->id => 'delivered'];

        foreach (['pending', 'reviewed', 'rejected', 'withdrawn'] as $state) {
            $other = $this->applicantTo($team['itJob'], $state);
            $this->actingAs($other->candidate, 'web');
            $this->getJson("/api/applications/{$other->id}/feedback-form")->assertForbidden();
            $this->send($other, $ratings)->assertForbidden();
        }

        foreach ([User::factory()->create(), $team['owner'], $team['hr'], User::factory()->admin()->create()] as $stranger) {
            $this->actingAs($stranger, 'web');
            $this->getJson("/api/applications/{$application->id}/feedback-form")->assertForbidden();
            $this->send($application, $ratings)->assertForbidden();
        }
        $this->assertNull($application->fresh()->feedback);
    }

    public function test_the_comment_is_limited_to_1000_characters(): void
    {
        [, $application, $ramp, $hours] = $this->hiredWithTwoAccommodations();

        $this->actingAs($application->candidate, 'web');
        $this->send($application, [$ramp->id => 'delivered', $hours->id => 'delivered'], str_repeat('a', 1001))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['comment']);
    }

    public function test_no_store_is_sent(): void
    {
        [, $application] = $this->hiredWithTwoAccommodations();

        $response = $this->actingAs($application->candidate, 'web')->getJson("/api/applications/{$application->id}/feedback-form");

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }
}
