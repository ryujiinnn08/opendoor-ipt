<?php

namespace Tests\Feature\Feedback;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use App\Notifications\FeedbackOpen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsFeedback;
use Tests\TestCase;

class FeedbackDueTest extends TestCase
{
    use BuildsFeedback, RefreshDatabase;

    /**
     * @return array{0: array<string, mixed>, 1: User}
     */
    private function seekerWithRampJob(): array
    {
        $team = $this->hiringCompany();
        $team['itJob']->accommodations()->attach(Accommodation::factory()->create()->id, ['note' => null]);
        $team['itJob']->load('accommodations');

        return [$team, User::factory()->create()];
    }

    public function test_applications_show_each_feedback_state(): void
    {
        [$team, $seeker] = $this->seekerWithRampJob();
        $open = $this->hireFor($team['itJob'], 31, $seeker);
        $notYet = $this->hireFor($team['hrJob']->fresh(), 3, $seeker); // HR job: no accommodations
        $team['hrJob']->accommodations()->attach(Accommodation::factory()->create()->id, ['note' => null]);
        $notYet->hiredAccommodations()->sync($team['hrJob']->fresh()->accommodations->pluck('id'));
        $nothing = $this->hireFor(JobPosting::factory()->open()->in($team['it'])->create(), 40, $seeker);
        $sentJob = JobPosting::factory()->open()->in($team['it'])->create();
        $sentJob->accommodations()->attach(Accommodation::factory()->create()->id, ['note' => null]);
        $sent = $this->hireFor($sentJob->fresh(), 50, $seeker);
        $this->feedbackOn($sent, [$sentJob->accommodations->first()->id => 'delivered']);
        $pending = Application::factory()->create(['user_id' => $seeker->id]);

        $this->actingAs($seeker, 'web');
        $states = collect($this->getJson('/api/applications')->assertOk()->json('data'))->keyBy('id');
        $this->assertSame('open', $states[$open->id]['feedback']['state']);
        $this->assertSame('not_yet', $states[$notYet->id]['feedback']['state']);
        $this->assertSame($notYet->feedbackOpensOn(), $states[$notYet->id]['feedback']['opens_on']);
        $this->assertSame('nothing_to_rate', $states[$nothing->id]['feedback']['state']);
        $this->assertSame('sent', $states[$sent->id]['feedback']['state']);
        $this->assertNotNull($states[$sent->id]['feedback']['sent_at']);
        $this->assertNull($states[$pending->id]['feedback']);

        $this->getJson("/api/applications/{$open->id}")->assertJsonPath('data.feedback.state', 'open');
    }

    public function test_the_dashboard_lists_feedback_due(): void
    {
        [$team, $seeker] = $this->seekerWithRampJob();
        $this->actingAs($seeker, 'web')->getJson('/api/candidate/dashboard')->assertJsonPath('data.feedback_due', []);

        $open = $this->hireFor($team['itJob'], 31, $seeker);
        $this->hireFor($team['hrJob'], 40, $seeker); // nothing to rate

        $this->getJson('/api/candidate/dashboard')
            ->assertJsonPath('data.feedback_due', [[
                'application_id' => $open->id,
                'job_title' => 'Junior Web Developer',
                'employer_name' => $team['company']->name,
            ]]);
    }

    public function test_the_reminder_is_recorded_once(): void
    {
        [$team, $seeker] = $this->seekerWithRampJob();
        $application = $this->hireFor($team['itJob'], 31, $seeker);

        $this->actingAs($seeker, 'web');
        $this->getJson('/api/candidate/dashboard')->assertOk();
        $this->getJson('/api/candidate/dashboard')->assertOk();
        $this->getJson('/api/applications')->assertOk();

        $this->assertSame(1, $seeker->notifications()->count());
        $notification = $seeker->notifications()->first();
        $this->assertSame(FeedbackOpen::class, $notification->type);
        $this->assertSame([
            'type' => 'feedback_open',
            'application_id' => $application->id,
            'job_title' => 'Junior Web Developer',
            'employer_name' => $team['company']->name,
        ], $notification->data);
        $this->assertNotNull($application->fresh()->feedback_reminded_at);
    }

    public function test_no_reminder_before_the_window_or_after_sending(): void
    {
        [$team, $seeker] = $this->seekerWithRampJob();
        $this->hireFor($team['itJob'], 29, $seeker);
        $sent = $this->hireFor(tap(JobPosting::factory()->open()->in($team['it'])->create(), fn ($job) => $job->accommodations()->attach($team['itJob']->accommodations->first()->id))->fresh(), 40, $seeker);
        $this->feedbackOn($sent, [$team['itJob']->accommodations->first()->id => 'delivered']);

        $this->actingAs($seeker, 'web')->getJson('/api/candidate/dashboard')->assertJsonPath('data.feedback_due', []);

        $this->assertSame(0, $seeker->notifications()->count());
    }

    public function test_the_list_does_not_query_per_application(): void
    {
        [$team, $seeker] = $this->seekerWithRampJob();
        $this->hireFor($team['itJob'], 31, $seeker);
        $this->actingAs($seeker, 'web')->getJson('/api/applications')->assertOk();
        $count = function () {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->getJson('/api/applications')->assertOk();
            $queries = count(DB::getQueryLog());
            DB::disableQueryLog();

            return $queries;
        };

        $one = $count();
        foreach (range(1, 4) as $_) {
            $this->hireFor(tap(JobPosting::factory()->open()->in($team['it'])->create(), fn ($job) => $job->accommodations()->attach($team['itJob']->accommodations->first()->id))->fresh(), 31, $seeker)
                ->forceFill(['feedback_reminded_at' => now()])->save();
        }

        $this->assertSame($one, $count());
    }
}
