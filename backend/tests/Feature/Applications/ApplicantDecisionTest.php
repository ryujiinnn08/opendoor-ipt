<?php

namespace Tests\Feature\Applications;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

class ApplicantDecisionTest extends TestCase
{
    use BuildsApplications, RefreshDatabase;

    private function decide(Application $application, string $status, ?string $expected = null)
    {
        return $this->patchJson("/api/applications/{$application->id}/status", [
            'status' => $status,
            'expected_status' => $expected ?? $application->fresh()->status->value,
        ]);
    }

    public function test_the_employer_hires_from_reviewed(): void
    {
        Carbon::setTestNow('2026-10-12 17:30:00');
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create();
        $team['itJob']->accommodations()->attach($ramp->id, ['note' => 'Side door']);
        $application = $this->applicantTo($team['itJob'], 'reviewed');

        $this->actingAs($team['owner'], 'web');
        $this->decide($application, 'hired')
            ->assertOk()
            ->assertJsonPath('data.status', 'hired')
            ->assertJsonPath('data.hired_at', '2026-10-13')
            ->assertJsonPath('data.hire_confirmed_by', 'employer')
            ->assertJsonPath('data.actions', [])
            ->assertJsonPath('data.profile.name', $application->candidate->name);
        $fresh = $application->fresh();
        $this->assertSame($team['owner']->id, $fresh->decided_by);
        $this->assertSame([$ramp->id], $fresh->hiredAccommodations->pluck('id')->all());
        $this->actingAs($application->candidate, 'web')->getJson("/api/applications/{$application->id}")->assertJsonPath('data.status', 'hired');
        Carbon::setTestNow();
    }

    public function test_the_employer_rejects_from_reviewed(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob'], 'reviewed');

        $this->actingAs($team['owner'], 'web');
        $this->decide($application, 'rejected')->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->assertNotNull($application->fresh()->rejected_at);
        $this->assertCount(0, $application->fresh()->hiredAccommodations);
    }

    public function test_pending_must_be_opened_first(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob']);

        $this->actingAs($team['owner'], 'web');
        $this->decide($application, 'hired')->assertStatus(422)->assertJsonPath('message', "This application can't be changed to Hired.");
        $this->decide($application, 'rejected')->assertStatus(422)->assertJsonPath('message', "This application can't be changed to Rejected.");
        $this->assertSame('pending', $application->fresh()->status->value);
    }

    public function test_decisions_on_closed_and_waiting_postings(): void
    {
        $team = $this->hiringCompany();
        $closed = $this->applicantTo($team['itJob'], 'reviewed');
        $team['itJob']->forceFill(['status' => 'closed'])->save();
        $waiting = $this->applicantTo($team['hrJob'], 'reviewed');
        $team['hrJob']->forceFill(['status' => 'pending'])->save();

        $this->actingAs($team['owner'], 'web');
        $this->decide($closed, 'hired')->assertOk();
        $this->decide($waiting, 'hired')->assertOk();
    }

    public function test_wrong_people_and_statuses(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob'], 'reviewed');

        $this->actingAs($team['hr'], 'web');
        $this->decide($application, 'hired')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'web');
        $this->decide($application, 'hired')->assertForbidden();
        $this->actingAs($application->candidate, 'web');
        $this->decide($application, 'rejected')->assertForbidden();
        $this->actingAs($team['owner'], 'web');
        $this->decide($application, 'withdrawn')->assertJsonValidationErrors('status');
        $this->decide($application, 'reviewed')->assertJsonValidationErrors('status');
        $this->assertSame('reviewed', $application->fresh()->status->value);
    }

    public function test_a_stale_decision_is_refused_and_not_notified(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob'], 'reviewed');

        // Another manager already decided while this tab still showed Reviewed.
        $application->forceFill(['status' => 'rejected'])->save();
        $this->actingAs($team['owner'], 'web');
        $this->decide($application, 'hired', 'reviewed')
            ->assertStatus(409)
            ->assertJsonPath('message', 'This application changed while you were looking at it. Reload to see its status.');

        $this->assertSame('rejected', $application->fresh()->status->value);
        $this->assertSame(0, $application->candidate->notifications()->count());
    }
}
