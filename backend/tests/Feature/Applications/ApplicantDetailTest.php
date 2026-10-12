<?php

namespace Tests\Feature\Applications;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

class ApplicantDetailTest extends TestCase
{
    use BuildsApplications, RefreshDatabase;

    public function test_opening_a_pending_applicant_marks_it_reviewed_once(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob']);

        $this->actingAs($team['owner'], 'web');
        $this->getJson("/api/applications?job_posting={$team['itJob']->id}")->assertJsonPath('data.0.status', 'pending');
        $first = $this->getJson("/api/applications/{$application->id}")->assertOk()
            ->assertJsonPath('data.status', 'reviewed')
            ->assertJsonPath('data.actions', ['hire', 'reject'])
            ->json('data.reviewed_at');
        $this->assertNotNull($first);
        $this->travel(5)->minutes();
        $this->getJson("/api/applications/{$application->id}")->assertJsonPath('data.reviewed_at', $first);
        $this->assertSame('reviewed', $application->fresh()->status->value);
    }

    public function test_the_page_shows_the_interview_request_needs_profile_and_contact(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create(['name' => 'Ramp']);
        $lift = Accommodation::factory()->create(['name' => 'Lift']);
        $team['itJob']->accommodations()->attach($ramp->id, ['note' => 'Side door']);
        $application = $this->applicantTo($team['itJob'], 'pending', [$ramp, $lift], ['city' => 'Quezon City'], [
            'cover_note' => 'I love spreadsheets.',
            'interview_request' => 'Online interview with captions, please.',
        ]);
        $application->candidate->experiences()->create(['job_title' => 'Encoder', 'company' => 'Bayani', 'started_on' => '2023-01', 'is_current' => true, 'position' => 0]);

        $response = $this->actingAs($team['owner'], 'web')->getJson("/api/applications/{$application->id}");
        $needs = collect($response->json('data.match.needs'))->keyBy('name');
        $this->assertTrue($needs['Ramp']['provided']);
        $this->assertSame('Side door', $needs['Ramp']['note']);
        $this->assertFalse($needs['Lift']['provided']);
        $response
            ->assertJsonPath('data.interview_request', 'Online interview with captions, please.')
            ->assertJsonPath('data.cover_note', 'I love spreadsheets.')
            ->assertJsonPath('data.match.needs_met', 1)
            ->assertJsonPath('data.profile.name', $application->candidate->name)
            ->assertJsonPath('data.profile.email', $application->candidate->email)
            ->assertJsonPath('data.profile.contact_number', '0917 555 0199')
            ->assertJsonPath('data.profile.city', 'Quezon City')
            ->assertJsonPath('data.profile.experiences.0.job_title', 'Encoder')
            ->assertJsonPath('data.job.title', 'Junior Web Developer')
            ->assertJsonPath('data.job.interview_format', 'online');
    }

    public function test_the_disability_type_only_when_shown(): void
    {
        $team = $this->hiringCompany();
        $hidden = $this->applicantTo($team['itJob'], 'pending', [], ['disability_type' => 'visual', 'show_disability' => false]);
        $shown = $this->applicantTo($team['itJob'], 'pending', [], ['disability_type' => 'visual', 'show_disability' => true]);

        $this->actingAs($team['owner'], 'web');
        $body = $this->getJson("/api/applications/{$hidden->id}")->assertJsonPath('data.profile.disability_type', null)->getContent();
        $this->assertStringNotContainsString('visual', $body);
        $this->getJson("/api/applications/{$shown->id}")->assertJsonPath('data.profile.disability_type', 'visual');
    }

    public function test_opening_a_withdrawn_application_changes_nothing(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob'], 'withdrawn', [Accommodation::factory()->create()], [], ['cover_note' => 'Hi', 'interview_request' => 'Captions']);

        $data = $this->actingAs($team['owner'], 'web')->getJson("/api/applications/{$application->id}")->assertOk()->json('data');

        $this->assertSame('withdrawn', $data['status']);
        foreach (['profile', 'cover_note', 'interview_request', 'match', 'has_interview_request'] as $key) {
            $this->assertArrayNotHasKey($key, $data, $key);
        }
        $this->assertSame(['name' => $application->candidate->name], $data['applicant']);
        $this->assertSame('withdrawn', $application->fresh()->status->value);
    }

    public function test_another_department_cannot_open_or_review_it(): void
    {
        $team = $this->hiringCompany();
        [$otherOwner] = $this->companyWithOwner();
        $application = $this->applicantTo($team['itJob']);

        foreach ([$team['hr'], $otherOwner] as $other) {
            $this->actingAs($other, 'web');
            $this->getJson("/api/applications/{$application->id}")->assertForbidden()
                ->assertJsonPath('message', 'You can only see applicants for your own job postings.');
            $this->getJson("/api/applications/{$application->id}/resume")->assertForbidden();
        }
        $this->assertSame('pending', $application->fresh()->status->value);
        $this->assertNull($application->fresh()->reviewed_at);
    }

    public function test_a_user_without_a_membership_is_refused(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob']);

        $this->actingAs(User::factory()->employer()->create(), 'web')->getJson("/api/applications/{$application->id}")->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'web')->getJson("/api/applications/{$application->id}")->assertForbidden();
    }

    public function test_the_resume_for_the_jobs_employer_only(): void
    {
        Storage::fake('local');
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob'], 'reviewed');
        $path = UploadedFile::fake()->create('maria.pdf', 10, 'application/pdf')->store('resumes', 'local');
        $application->candidate->candidateProfile->forceFill(['resume_path' => $path, 'resume_name' => 'maria.pdf', 'resume_uploaded_at' => now()])->save();
        $url = "/api/applications/{$application->id}/resume";

        $response = $this->actingAs($team['owner'], 'web')->get($url, ['Accept' => 'application/json'])->assertOk();
        $this->assertStringContainsString('sandbox', $response->headers->get('Content-Security-Policy'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->getJson("/api/applications/{$application->id}")->assertJsonPath('data.profile.resume.name', 'maria.pdf');

        $this->actingAs($application->candidate, 'web')->getJson($url)->assertForbidden();

        $application->forceFill(['status' => 'withdrawn', 'withdrawn_at' => now()])->save();
        $this->actingAs($team['owner'], 'web')->getJson($url)->assertForbidden();

        $noFile = $this->applicantTo($team['itJob'], 'reviewed');
        $this->getJson("/api/applications/{$noFile->id}/resume")->assertNotFound()
            ->assertJsonPath('message', "This applicant hasn't uploaded a résumé.");
    }

    public function test_employers_never_get_the_job_seekers_shape(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob'], 'reviewed');

        $employerView = $this->actingAs($team['owner'], 'web')->getJson("/api/applications/{$application->id}")->json('data');
        $this->assertNotContains('withdraw', $employerView['actions']);
        $this->assertNotContains('confirm_hire', $employerView['actions']);
        $this->assertArrayNotHasKey('hired_accommodations', $employerView);

        $seekerView = $this->actingAs($application->candidate, 'web')->getJson("/api/applications/{$application->id}")->json('data');
        $this->assertArrayNotHasKey('profile', $seekerView);
        $this->assertSame(['withdraw', 'confirm_hire'], $seekerView['actions']);
    }
}
