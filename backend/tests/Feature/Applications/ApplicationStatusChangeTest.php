<?php

namespace Tests\Feature\Applications;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\User;
use App\Services\ApplicationWorkflow;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

class ApplicationStatusChangeTest extends TestCase
{
    use BuildsApplications, RefreshDatabase;

    public function test_applicant_statuses_are_read_only_even_with_forged_role_and_decision_fields(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web');
        foreach (ApplicationStatus::cases() as $state) {
            $application = Application::factory()->create(['user_id' => $seeker->id, 'status' => $state]);
            foreach (ApplicationStatus::cases() as $next) {
                $this->patchJson("/api/applications/{$application->id}/status", [
                    'status' => $next->value, 'expected_status' => $state->value,
                    'role' => 'employer', 'actor' => 'employer', 'decided_by' => 1,
                ])->assertForbidden();
            }
            $this->assertSame($state, $application->fresh()->status);
            $this->getJson("/api/applications/{$application->id}")->assertOk()->assertJsonPath('data.actions', []);
        }
        $this->assertDatabaseCount('hiring_events', 0);
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_unauthenticated_and_unrelated_people_cannot_change_status(): void
    {
        $application = Application::factory()->reviewed()->create();
        $url = "/api/applications/{$application->id}/status";
        $body = ['status' => 'hired', 'expected_status' => 'reviewed'];
        $this->patchJson($url, $body)->assertUnauthorized();
        foreach ([User::factory()->create(), User::factory()->employer()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user, 'web')->patchJson($url, $body)->assertForbidden();
        }
        $this->assertSame(ApplicationStatus::Reviewed, $application->fresh()->status);
    }

    public function test_workflow_itself_refuses_a_candidate_claiming_to_be_the_employer(): void
    {
        $application = Application::factory()->reviewed()->create();
        $this->expectException(HttpException::class);
        app(ApplicationWorkflow::class)->changeStatus($application, ApplicationStatus::Hired,
            ApplicationActor::Employer, ApplicationStatus::Reviewed, $application->candidate);
    }

    public function test_workflow_itself_refuses_an_unrelated_employer(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob'], 'reviewed');
        $this->expectException(AuthorizationException::class);
        app(ApplicationWorkflow::class)->changeStatus($application, ApplicationStatus::Hired,
            ApplicationActor::Employer, ApplicationStatus::Reviewed, $team['hr']);
    }
}
