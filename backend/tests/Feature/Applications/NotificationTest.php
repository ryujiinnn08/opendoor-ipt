<?php

namespace Tests\Feature\Applications;

use App\Models\Accommodation;
use App\Models\JobPosting;
use App\Models\User;
use App\Notifications\ApplicationStatusChanged;
use App\Notifications\NewApplicant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use BuildsApplications, RefreshDatabase;

    /**
     * @return list<array<string, mixed>>
     */
    private function recorded(User $user, string $type): array
    {
        return $user->notifications()->where('type', $type)->get()->pluck('data')->all();
    }

    public function test_a_new_application_notifies_the_owner_and_the_departments_hr(): void
    {
        $team = $this->hiringCompany();
        $itHr = $this->hrOfficerIn($team['it']);
        $seeker = User::factory()->create(['name' => 'Maria Santos']);

        $this->actingAs($seeker, 'web')->postJson("/api/job-postings/{$team['itJob']->id}/applications", ['cover_note' => 'Secret note'])->assertCreated();

        $data = $this->recorded($team['owner'], NewApplicant::class);
        $this->assertCount(1, $data);
        $this->assertSame('new_applicant', $data[0]['type']);
        $this->assertSame('Junior Web Developer', $data[0]['job_title']);
        $this->assertSame('Maria Santos', $data[0]['applicant_name']);
        $this->assertCount(1, $this->recorded($itHr, NewApplicant::class));
        $this->assertCount(0, $this->recorded($team['hr'], NewApplicant::class));
        $this->assertSame(0, $seeker->notifications()->count());
    }

    public function test_each_status_change_notifies_the_other_party(): void
    {
        $team = $this->hiringCompany();
        $opened = $this->applicantTo($team['itJob']);
        $hired = $this->applicantTo($team['itJob'], 'reviewed');
        $rejected = $this->applicantTo($team['itJob'], 'reviewed');
        $withdrawn = $this->applicantTo($team['itJob'], 'reviewed');
        $confirmed = $this->applicantTo($team['itJob'], 'reviewed');

        $this->actingAs($team['owner'], 'web');
        $this->getJson("/api/applications/{$opened->id}")->assertOk();
        $this->patchJson("/api/applications/{$hired->id}/status", ['status' => 'hired', 'expected_status' => 'reviewed'])->assertOk();
        $this->patchJson("/api/applications/{$rejected->id}/status", ['status' => 'rejected', 'expected_status' => 'reviewed'])->assertOk();
        $this->actingAs($withdrawn->candidate, 'web')->patchJson("/api/applications/{$withdrawn->id}/status", ['status' => 'withdrawn', 'expected_status' => 'reviewed'])->assertOk();
        $this->actingAs($confirmed->candidate, 'web')->patchJson("/api/applications/{$confirmed->id}/status", ['status' => 'hired', 'expected_status' => 'reviewed'])->assertOk();

        foreach ([[$opened, 'reviewed'], [$hired, 'hired'], [$rejected, 'rejected']] as [$application, $status]) {
            $data = $this->recorded($application->candidate, ApplicationStatusChanged::class);
            $this->assertCount(1, $data, $status);
            $this->assertSame($status, $data[0]['status']);
            $this->assertSame('employer', $data[0]['actor']);
            $this->assertSame('Junior Web Developer', $data[0]['job_title']);
        }
        $toEmployer = collect($this->recorded($team['owner'], ApplicationStatusChanged::class));
        $this->assertEqualsCanonicalizing(['withdrawn', 'hired'], $toEmployer->pluck('status')->all());
        $this->assertSame(['candidate', 'candidate'], $toEmployer->pluck('actor')->all());
        $this->assertSame(0, $withdrawn->candidate->notifications()->count());
    }

    public function test_nothing_is_recorded_for_a_refused_change(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob']);

        $this->actingAs($team['owner'], 'web');
        $this->patchJson("/api/applications/{$application->id}/status", ['status' => 'hired', 'expected_status' => 'pending'])->assertStatus(422);
        $this->patchJson("/api/applications/{$application->id}/status", ['status' => 'hired', 'expected_status' => 'reviewed'])->assertStatus(409);
        $this->actingAs($application->candidate, 'web')->postJson("/api/job-postings/{$team['itJob']->id}/applications", [])->assertStatus(409);

        $this->assertSame(0, $application->candidate->notifications()->count());
        $this->assertSame(0, $team['owner']->notifications()->count());
    }

    public function test_opening_twice_notifies_once(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['itJob']);

        $this->actingAs($team['owner'], 'web');
        $this->getJson("/api/applications/{$application->id}")->assertOk();
        $this->getJson("/api/applications/{$application->id}")->assertOk();

        $this->assertSame(1, $application->candidate->notifications()->count());
    }

    public function test_notifications_carry_no_private_details(): void
    {
        $team = $this->hiringCompany();
        $need = Accommodation::factory()->create(['name' => 'Very specific need']);
        $seeker = User::factory()->create();
        $seeker->needs()->attach($need->id);

        $this->actingAs($seeker, 'web')->postJson("/api/job-postings/{$team['itJob']->id}/applications", [
            'cover_note' => 'Private cover note',
            'interview_request' => 'Private interview request',
        ])->assertCreated();

        $stored = json_encode($team['owner']->notifications()->get()->pluck('data')->all());
        foreach (['Private cover note', 'Private interview request', 'Very specific need'] as $private) {
            $this->assertStringNotContainsString($private, $stored);
        }
    }

    public function test_managers_are_the_owner_and_the_departments_active_hr(): void
    {
        $team = $this->hiringCompany();
        $suspended = $this->hrOfficerIn($team['hrDept']);
        $suspended->forceFill(['is_active' => false])->save();

        $this->assertEqualsCanonicalizing(
            [$team['owner']->id, $team['hr']->id],
            $team['hrJob']->managers()->pluck('id')->all(),
        );
        $this->assertEqualsCanonicalizing([$team['owner']->id], JobPosting::find($team['itJob']->id)->managers()->pluck('id')->all());
    }
}
