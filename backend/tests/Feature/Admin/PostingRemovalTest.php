<?php

namespace Tests\Feature\Admin;

use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

/**
 * Removing a posting with a reason the employer sees (plan PHASE_6 §4.2, F10.2, Q7).
 */
class PostingRemovalTest extends TestCase
{
    use BuildsApplications;
    use RefreshDatabase;

    private const REASON = "Accommodations listed aren't available at this site.";

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['name' => 'Ana Cruz']);
    }

    private function remove(JobPosting $posting, ?string $reason = self::REASON)
    {
        return $this->actingAs($this->admin, 'web')
            ->deleteJson("/api/admin/job-postings/{$posting->id}", $reason === null ? [] : ['reason' => $reason]);
    }

    public function test_a_reason_is_required(): void
    {
        $job = JobPosting::factory()->open()->create();

        $this->remove($job, null)
            ->assertUnprocessable()
            ->assertJsonPath('errors.reason.0', 'Give a reason; the employer sees it.');
        $this->remove($job, ' Bad ')->assertJsonPath('errors.reason.0', 'Use at least 5 characters.');

        $this->assertFalse($job->fresh()->trashed());
    }

    public function test_removing_hides_the_job_but_keeps_who_when_and_why(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 16)->setTime(10, 0));
        $job = JobPosting::factory()->open()->create();

        $this->remove($job)->assertNoContent();

        $removed = JobPosting::withTrashed()->find($job->id);
        $this->assertTrue($removed->trashed());
        $this->assertSame($this->admin->id, $removed->removed_by);
        $this->assertSame('2026-10-16', $removed->removed_at->toDateString());
        $this->assertSame(self::REASON, $removed->removal_reason);
        $this->getJson('/api/job-postings')->assertJsonCount(0, 'data');
        $this->getJson("/api/job-postings/{$job->id}")->assertNotFound();
    }

    public function test_postings_waiting_open_rejected_or_closed_can_be_removed_but_not_drafts(): void
    {
        foreach (['pending', 'open', 'rejected', 'closed'] as $state) {
            $this->remove(JobPosting::factory()->{$state}()->create())->assertNoContent();
        }

        $this->remove(JobPosting::factory()->create())->assertNotFound();
    }

    public function test_removing_twice_finds_nothing(): void
    {
        $job = JobPosting::factory()->open()->create();
        $this->remove($job)->assertNoContent();

        $this->remove($job)->assertNotFound();
    }

    public function test_waiting_applicants_keep_their_applications_and_see_the_job_was_removed(): void
    {
        $company = $this->hiringCompany();
        $waiting = $this->applicantTo($company['itJob']);
        $hire = $this->applicantTo($company['itJob'], 'hired');

        $this->remove($company['itJob'])->assertNoContent();

        $this->assertSame('pending', $waiting->fresh()->status->value);
        $this->assertSame('hired', $hire->fresh()->status->value);
        $this->actingAs($waiting->candidate, 'web')->getJson("/api/applications/{$waiting->id}")
            ->assertOk()
            ->assertJsonPath('data.job.state', 'removed');

        // The employer still sees the applicants and can decide on them.
        $this->actingAs($company['owner'], 'web')->getJson("/api/applications?job_posting={$company['itJob']->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_the_employer_sees_it_under_removed_with_the_reason_and_no_actions(): void
    {
        $company = $this->hiringCompany();
        $this->remove($company['itJob'])->assertNoContent();
        $company['hrJob']->delete(); // the employer's own delete is not "removed"

        $this->actingAs($company['owner'], 'web')->getJson('/api/employer/job-postings?status=removed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Junior Web Developer')
            ->assertJsonPath('data.0.removal.reason', self::REASON)
            ->assertJsonMissingPath('data.0.removal.removed_by')
            ->assertJsonPath('data.0.actions', []);
        $this->getJson('/api/employer/job-postings')->assertJsonCount(0, 'data');
    }

    public function test_the_employer_cannot_edit_or_reopen_a_removed_posting(): void
    {
        $company = $this->hiringCompany();
        $job = $company['itJob'];
        $this->remove($job)->assertNoContent();

        $this->actingAs($company['owner'], 'web');
        $this->getJson("/api/employer/job-postings/{$job->id}")->assertNotFound();
        $this->putJson("/api/employer/job-postings/{$job->id}", ['title' => 'Back again'])->assertNotFound();
        $this->patchJson("/api/employer/job-postings/{$job->id}/status", ['status' => 'open'])->assertNotFound();
        $this->deleteJson("/api/employer/job-postings/{$job->id}")->assertNotFound();
    }

    public function test_the_reason_reaches_only_that_employer(): void
    {
        $company = $this->hiringCompany();
        $this->remove($company['itJob'])->assertNoContent();
        [$otherOwner] = $this->companyWithOwner();

        $this->actingAs($otherOwner, 'web')->getJson('/api/employer/job-postings?status=removed')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        // An HR officer in another department doesn't see it either.
        $this->actingAs($company['hr'], 'web')->getJson('/api/employer/job-postings?status=removed')
            ->assertJsonCount(0, 'data');
    }

    public function test_admins_open_a_removed_posting_with_who_removed_it(): void
    {
        $job = JobPosting::factory()->open()->create();
        $this->remove($job)->assertNoContent();

        $this->getJson("/api/admin/job-postings/{$job->id}")
            ->assertOk()
            ->assertJsonPath('data.removal.reason', self::REASON)
            ->assertJsonPath('data.removal.removed_by', 'Ana Cruz');
    }

    public function test_admins_cannot_open_a_posting_the_employer_deleted(): void
    {
        $job = JobPosting::factory()->open()->create();
        $job->delete();

        $this->actingAs($this->admin, 'web')->getJson("/api/admin/job-postings/{$job->id}")->assertNotFound();
    }
}
