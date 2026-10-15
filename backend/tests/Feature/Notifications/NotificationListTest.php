<?php

namespace Tests\Feature\Notifications;

use App\Enums\VerificationStatus;
use App\Models\JobPosting;
use App\Models\User;
use App\Notifications\NewApplicant;
use App\Notifications\PostingDecided;
use App\Notifications\PostingRemoved;
use App\Notifications\VerificationDecided;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

/**
 * Showing notifications and the three events added in Phase 6B (plan PHASE_6 §4.4, F9.1, F9.2).
 */
class NotificationListTest extends TestCase
{
    use BuildsApplications;
    use RefreshDatabase;

    private function record(User $user, array $data, ?string $readAt = null, ?string $createdAt = null): DatabaseNotification
    {
        return $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => NewApplicant::class,
            'data' => $data,
            'read_at' => $readAt,
            'created_at' => $createdAt ?? now(),
            'updated_at' => $createdAt ?? now(),
        ]);
    }

    public function test_the_list_is_newest_first_twenty_a_page_and_hides_older_than_90_days(): void
    {
        $owner = $this->companyWithOwner()[0];
        for ($i = 21; $i >= 1; $i--) {
            $this->record($owner, ['type' => 'new_applicant', 'job_title' => "Job {$i}"], createdAt: now()->subMinutes($i)->toDateTimeString());
        }
        $this->record($owner, ['type' => 'new_applicant', 'job_title' => 'Too old'], createdAt: now()->subDays(91)->toDateTimeString());

        $this->actingAs($owner, 'web')->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('data.0.type', 'new_applicant')
            ->assertJsonPath('data.0.details.job_title', 'Job 1')
            ->assertJsonMissingPath('data.0.details.type')
            ->assertJsonPath('meta.total', 21);
    }

    public function test_the_unread_count_and_marking_read(): void
    {
        $seeker = User::factory()->create();
        $first = $this->record($seeker, ['type' => 'feedback_open', 'application_id' => 1]);
        $this->record($seeker, ['type' => 'status_changed', 'application_id' => 1, 'status' => 'reviewed']);
        $this->record($seeker, ['type' => 'status_changed'], readAt: now()->toDateTimeString());

        $this->actingAs($seeker, 'web')->getJson('/api/notifications/unread-count')->assertJsonPath('data.count', 2);

        $this->patchJson("/api/notifications/{$first->id}/read")->assertOk()->assertJsonPath('data.id', $first->id);
        $this->getJson('/api/notifications/unread-count')->assertJsonPath('data.count', 1);

        $this->patchJson('/api/notifications/read-all')->assertNoContent();
        $this->getJson('/api/notifications/unread-count')->assertJsonPath('data.count', 0);
    }

    public function test_nobody_reads_or_marks_another_persons_notification(): void
    {
        $maria = User::factory()->create();
        $jose = User::factory()->create();
        $marias = $this->record($maria, ['type' => 'feedback_open']);

        $this->actingAs($jose, 'web');
        $this->getJson('/api/notifications')->assertJsonCount(0, 'data');
        $this->patchJson("/api/notifications/{$marias->id}/read")->assertNotFound();
        $this->patchJson('/api/notifications/read-all')->assertNoContent();

        $this->assertNull($marias->fresh()->read_at);
    }

    public function test_administrators_and_guests_have_no_notifications(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
        $this->actingAs(User::factory()->admin()->create(), 'web')->getJson('/api/notifications/unread-count')->assertForbidden();
    }

    public function test_the_owner_hears_the_verification_result(): void
    {
        [$owner, $company] = $this->companyWithOwner(['verification_status' => VerificationStatus::Pending, 'name' => 'Acme Corp.']);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'web')
            ->patchJson("/api/admin/employers/{$company->id}/verify", ['decision' => 'reject', 'reason' => 'The number does not match.'])
            ->assertOk();

        $data = $owner->notifications()->where('type', VerificationDecided::class)->first()->data;
        $this->assertSame(['type' => 'verification_decided', 'employer_id' => $company->id, 'employer_name' => 'Acme Corp.', 'verified' => false], $data);
    }

    public function test_the_creator_and_managers_hear_an_approval_once_each(): void
    {
        $team = $this->hiringCompany();
        $posting = JobPosting::factory()->in($team['hrDept'])->pending()->create(['created_by' => $team['hr']->id, 'title' => 'Payroll Clerk']);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'web')->patchJson("/api/admin/job-postings/{$posting->id}/approve", [
            'decision' => 'approve',
            'updated_at' => $posting->updated_at->toIso8601String(),
        ])->assertOk();

        foreach ([$team['owner'], $team['hr']] as $person) {
            $sent = $person->notifications()->where('type', PostingDecided::class)->get();
            $this->assertCount(1, $sent);
            $this->assertSame(['type' => 'posting_decided', 'job_posting_id' => $posting->id, 'job_title' => 'Payroll Clerk', 'approved' => true], $sent->first()->data);
        }
    }

    public function test_managers_hear_a_removal_but_not_its_applicants(): void
    {
        $team = $this->hiringCompany();
        $applicant = $this->applicantTo($team['itJob']);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'web')
            ->deleteJson("/api/admin/job-postings/{$team['itJob']->id}", ['reason' => 'Fake accommodations.'])
            ->assertNoContent();

        $data = $team['owner']->notifications()->where('type', PostingRemoved::class)->first()->data;
        $this->assertSame('posting_removed', $data['type']);
        $this->assertArrayNotHasKey('reason', $data);
        $this->assertSame(0, $team['hr']->notifications()->count());
        $this->assertSame(0, $applicant->candidate->notifications()->where('type', PostingRemoved::class)->count());
    }
}
