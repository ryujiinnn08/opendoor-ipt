<?php

namespace Tests\Feature\Notifications;

use App\Models\JobPosting;
use App\Models\User;
use App\Notifications\NewApplicant;
use App\Notifications\PostingDecided;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

/**
 * Notifications follow access (Phase 6 review CR-01).
 */
class NotificationAccessTest extends TestCase
{
    use BuildsApplications;
    use RefreshDatabase;

    public function test_an_hr_officer_who_leaves_stops_seeing_the_companys_applicants(): void
    {
        $team = $this->hiringCompany();
        $application = $this->applicantTo($team['hrJob']);
        Notification::send($team['hr'], new NewApplicant($application));
        $this->assertSame(1, $team['hr']->notifications()->count());

        $this->actingAs($team['owner'], 'web')
            ->deleteJson("/api/employer/members/{$team['hr']->membership->id}")
            ->assertNoContent();

        $this->actingAs($team['hr']->fresh(), 'web')->getJson('/api/notifications')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_an_hr_officer_who_moves_keeps_only_the_new_departments_notifications(): void
    {
        $team = $this->hiringCompany();
        $team['it']->update(['member_limit' => 3]);
        Notification::send($team['hr'], new NewApplicant($this->applicantTo($team['hrJob'])));
        $other = $this->companyWithOwner();
        Notification::send($team['hr'], new NewApplicant($this->applicantTo(JobPosting::factory()->open()->in($other[2])->create())));

        $this->actingAs($team['owner'], 'web')
            ->patchJson("/api/employer/members/{$team['hr']->membership->id}", ['department_id' => $team['it']->id])
            ->assertOk();

        $left = $team['hr']->notifications()->get()->pluck('data.job_posting_id')->all();
        $this->assertNotContains($team['hrJob']->id, $left);
        $this->assertCount(1, $left);
    }

    public function test_a_creator_who_left_hears_nothing_about_the_approval(): void
    {
        $team = $this->hiringCompany();
        $posting = JobPosting::factory()->in($team['hrDept'])->pending()->create(['created_by' => $team['hr']->id]);
        $team['hr']->membership->delete();
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'web')->patchJson("/api/admin/job-postings/{$posting->id}/approve", [
            'decision' => 'approve',
            'updated_at' => $posting->updated_at->toIso8601String(),
        ])->assertOk();

        $this->assertSame(0, $team['hr']->notifications()->where('type', PostingDecided::class)->count());
        $this->assertSame(1, $team['owner']->notifications()->where('type', PostingDecided::class)->count());
    }

    public function test_private_lists_are_never_kept_by_the_browser(): void
    {
        $seeker = User::factory()->create();
        $this->actingAs($seeker, 'web')->getJson('/api/notifications')->assertHeader('Cache-Control', 'no-store, private');

        $this->actingAs(User::factory()->admin()->create(), 'web')
            ->getJson("/api/admin/users/{$seeker->id}")
            ->assertHeader('Cache-Control', 'no-store, private');
    }
}
