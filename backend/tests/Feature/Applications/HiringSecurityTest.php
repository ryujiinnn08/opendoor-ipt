<?php

namespace Tests\Feature\Applications;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\JobPostingWorkflow;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

class HiringSecurityTest extends TestCase
{
    use BuildsApplications, RefreshDatabase;

    public function test_last_hire_closes_posting_and_prevents_over_hiring_and_reopening(): void
    {
        $team = $this->hiringCompany();
        $first = $this->applicantTo($team['itJob'], 'reviewed');
        $second = $this->applicantTo($team['itJob'], 'reviewed');
        $this->actingAs($team['owner'], 'web');
        $body = ['status' => 'hired', 'expected_status' => 'reviewed', 'hiring_slots' => 999, 'hired_count' => 0];
        $this->patchJson("/api/applications/{$first->id}/status", $body)->assertOk()
            ->assertJsonPath('data.job.remaining_slots', 0)->assertJsonPath('data.job.status', 'closed');
        $this->patchJson("/api/applications/{$second->id}/status", $body)->assertStatus(409);
        $this->assertSame(ApplicationStatus::Reviewed, $second->fresh()->status);
        $this->assertSame(1, $team['itJob']->fresh()->hiring_slots);
        $this->assertDatabaseHas('hiring_events', ['application_id' => $first->id, 'actor_user_id' => $team['owner']->id,
            'action' => 'status_changed', 'previous_status' => 'reviewed', 'new_status' => 'hired']);
        $this->assertDatabaseHas('hiring_events', ['job_posting_id' => $team['itJob']->id, 'action' => 'slots_filled']);
        $this->patchJson("/api/employer/job-postings/{$team['itJob']->id}/status", ['action' => 'reopen', 'closes_on' => now()->addDays(10)->toDateString()])
            ->assertJsonValidationErrors('hiring_slots');
        $this->actingAs(User::factory()->create(), 'web')->postJson("/api/job-postings/{$team['itJob']->id}/applications", [])->assertNotFound();
        // Rejections remain available after a filled job closes.
        $this->actingAs($team['owner'], 'web')->patchJson("/api/applications/{$second->id}/status", ['status' => 'rejected', 'expected_status' => 'reviewed'])->assertOk();
    }

    public function test_application_limit_counts_rejected_and_withdrawn_submissions(): void
    {
        $job = JobPosting::factory()->open()->create(['hiring_slots' => 2, 'application_limit' => 2]);
        Application::factory()->rejected()->create(['job_posting_id' => $job->id]);
        $seeker = User::factory()->create();
        $url = "/api/job-postings/{$job->id}/applications";
        $this->actingAs($seeker, 'web')->postJson($url, [])->assertCreated();
        $this->postJson($url, [])->assertStatus(409)->assertJsonPath('message', 'You have already applied for this job. Please wait for confirmation.');
        $this->actingAs(User::factory()->create(), 'web')->postJson($url, [])->assertStatus(409)
            ->assertJsonPath('message', 'This job has reached its application limit.');
        $this->getJson("/api/job-postings/{$job->id}")->assertOk()->assertJsonPath('data.accepting_applications', false);
        $this->assertSame(2, $job->applications()->count());
        $this->assertDatabaseCount('hiring_events', 1);
    }

    public function test_capacity_cannot_be_reduced_below_existing_totals(): void
    {
        $team = $this->hiringCompany();
        $job = $team['itJob'];
        $job->update(['hiring_slots' => 3]);
        $this->applicantTo($job, 'hired');
        $this->applicantTo($job, 'hired');
        $this->actingAs($team['owner'], 'web');
        foreach (['hiring_slots' => 1, 'application_limit' => 1] as $field => $value) {
            try {
                app(JobPostingWorkflow::class)->update($job, $team['owner'], [$field => $value], null, false);
                $this->fail('Capacity reduction should be rejected.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey($field, $e->errors());
            }
        }
        $this->assertSame(3, $job->fresh()->hiring_slots);
        $this->assertDatabaseCount('hiring_events', 0);
    }

    public function test_setting_capacity_to_existing_hires_keeps_the_posting_closed(): void
    {
        $team = $this->hiringCompany();
        $job = $team['itJob'];
        $job->update(['hiring_slots' => 3]);
        $this->applicantTo($job, 'hired');
        $this->applicantTo($job, 'hired');
        $saved = app(JobPostingWorkflow::class)->update($job, $team['owner'], ['hiring_slots' => 2], null, false);
        $this->assertSame('closed', $saved->status->value);
        $this->assertSame('slots_filled', $saved->closure_reason);
        $this->assertSame(0, $saved->capacity()['remaining_slots']);
    }

    public function test_posting_api_validates_limits_and_ignores_forged_counts(): void
    {
        $team = $this->hiringCompany();
        $this->actingAs($team['owner'], 'web');
        $base = ['title' => 'Clerk', 'department_id' => $team['it']->id];
        foreach ([0, -1, 1.5, 1000001, 'bogus'] as $invalid) {
            $this->postJson('/api/employer/job-postings', [...$base, 'hiring_slots' => $invalid, 'application_limit' => $invalid])
                ->assertJsonValidationErrors(['hiring_slots', 'application_limit']);
        }
        $this->postJson('/api/employer/job-postings', [...$base, 'hiring_slots' => 5, 'application_limit' => 100,
            'hired_count' => 99, 'application_count' => 99, 'closure_reason' => 'slots_filled'])
            ->assertCreated()->assertJsonPath('data.hiring_slots', 5)->assertJsonPath('data.application_limit', 100)
            ->assertJsonPath('data.hired_count', 0)->assertJsonPath('data.application_count', 0)->assertJsonPath('data.closure_reason', null);
    }

    public function test_direct_database_writes_cannot_store_zero_capacity(): void
    {
        $job = JobPosting::factory()->create();
        $this->expectException(QueryException::class);
        DB::table('job_postings')->where('id', $job->id)->update(['hiring_slots' => 0]);
    }

    public function test_invalid_status_is_rejected_by_database(): void
    {
        $application = Application::factory()->create();
        $this->expectException(QueryException::class);
        DB::table('applications')->where('id', $application->id)->update(['status' => 'invented']);
    }

    public function test_audit_failure_rolls_back_the_hire_and_capacity(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob'], 'reviewed');
        // Simulate unavailable audit storage; no unaudited hire may commit.
        DB::listen(function ($query) {
            if (str_starts_with($query->sql, 'insert') && str_contains($query->sql, 'hiring_events')) {
                throw new \RuntimeException('Audit storage unavailable.');
            }
        });
        $this->actingAs($team['owner'], 'web')->patchJson("/api/applications/{$application->id}/status", [
            'status' => 'hired', 'expected_status' => 'reviewed',
        ])->assertStatus(500);
        $this->assertSame(ApplicationStatus::Reviewed, $application->fresh()->status);
        $this->assertSame('open', $team['itJob']->fresh()->status->value);
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_review_is_audited_once_and_private_to_the_employer(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob']);
        $this->actingAs($team['owner'], 'web');
        $url = "/api/applications/{$application->id}";
        $this->getJson($url)->assertOk()->assertJsonPath('data.history.0.new_status', 'reviewed');
        $this->getJson($url)->assertOk();
        $this->assertDatabaseCount('hiring_events', 1);
        $this->actingAs($application->candidate, 'web')->getJson($url)->assertJsonMissingPath('data.history');
        $this->actingAs($team['hr'], 'web')->getJson($url)->assertForbidden();
    }
}
