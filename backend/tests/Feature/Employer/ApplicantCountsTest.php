<?php

namespace Tests\Feature\Employer;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

class ApplicantCountsTest extends TestCase
{
    use BuildsApplications, RefreshDatabase;

    public function test_a_posting_with_waiting_applicants_cannot_be_deleted(): void
    {
        $team = $this->hiringCompany();
        $waiting = [$this->applicantTo($team['itJob']), $this->applicantTo($team['itJob'], 'reviewed'), $this->applicantTo($team['itJob'])];
        $one = $this->applicantTo($team['hrJob']);

        $this->actingAs($team['owner'], 'web');
        $this->deleteJson("/api/employer/job-postings/{$team['itJob']->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', '3 applicants are waiting for your decision. Decide on them or close the posting instead.');
        $this->deleteJson("/api/employer/job-postings/{$team['hrJob']->id}")
            ->assertJsonPath('message', '1 applicant is waiting for your decision. Decide on them or close the posting instead.');
        $this->assertNotSoftDeleted($team['itJob']);

        $waiting[0]->forceFill(['status' => 'hired'])->save();
        $waiting[1]->forceFill(['status' => 'rejected'])->save();
        $waiting[2]->forceFill(['status' => 'withdrawn'])->save();
        $this->deleteJson("/api/employer/job-postings/{$team['itJob']->id}")->assertNoContent();
        $this->assertSoftDeleted($team['itJob']);
        $this->assertSame('pending', $one->fresh()->status->value);
    }

    public function test_postings_show_applicant_counts(): void
    {
        $team = $this->hiringCompany();
        $this->applicantTo($team['itJob']);
        $this->applicantTo($team['itJob']);
        $this->applicantTo($team['itJob'], 'reviewed');
        $this->applicantTo($team['itJob'], 'withdrawn');

        $postings = collect($this->actingAs($team['owner'], 'web')->getJson('/api/employer/job-postings')->assertOk()->json('data'))->keyBy('title');

        $this->assertSame(['total' => 4, 'new' => 2], $postings['Junior Web Developer']['applicants']);
        $this->assertSame(['total' => 0, 'new' => 0], $postings['HR Assistant']['applicants']);
    }

    public function test_the_dashboard_lists_postings_with_new_applicants(): void
    {
        $team = $this->hiringCompany();
        $this->applicantTo($team['itJob']);
        $this->applicantTo($team['hrJob']);
        $this->applicantTo($team['hrJob']);
        $this->applicantTo($team['hrJob'], 'reviewed');

        $this->actingAs($team['owner'], 'web')->getJson('/api/employer/dashboard')
            ->assertJsonPath('data.waiting_applicants.total', 3)
            ->assertJsonPath('data.waiting_applicants.postings', [
                ['id' => $team['hrJob']->id, 'title' => 'HR Assistant', 'new' => 2],
                ['id' => $team['itJob']->id, 'title' => 'Junior Web Developer', 'new' => 1],
            ]);
        $this->actingAs($team['hr'], 'web')->getJson('/api/employer/dashboard')
            ->assertJsonPath('data.waiting_applicants.total', 2)
            ->assertJsonPath('data.waiting_applicants.postings.*.title', ['HR Assistant']);
    }
}
