<?php

namespace Tests\Feature\Applications;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsApplications;
use Tests\TestCase;

class ApplicantListTest extends TestCase
{
    use BuildsApplications, RefreshDatabase;

    private function list(int $jobId, string $query = '')
    {
        return $this->getJson("/api/applications?job_posting={$jobId}{$query}");
    }

    public function test_the_owner_lists_a_postings_applicants_with_counts(): void
    {
        $team = $this->hiringCompany();
        $pending = $this->applicantTo($team['itJob'], 'pending', [], [], ['created_at' => now()->subDays(3)]);
        $reviewed = $this->applicantTo($team['itJob'], 'reviewed', [], [], ['created_at' => now()->subDays(2)]);
        $withdrawn = $this->applicantTo($team['itJob'], 'withdrawn', [], [], ['created_at' => now()->subDay()]);
        $this->applicantTo($team['hrJob']);

        $this->actingAs($team['owner'], 'web');
        $this->list($team['itJob']->id)
            ->assertOk()
            ->assertJsonPath('data.*.id', [$withdrawn->id, $reviewed->id, $pending->id])
            ->assertJsonPath('counts', ['all' => 3, 'pending' => 1, 'reviewed' => 1, 'hired' => 0, 'rejected' => 0, 'withdrawn' => 1])
            ->assertJsonPath('job.title', 'Junior Web Developer')
            ->assertJsonPath('job.status', 'open')
            ->assertJsonPath('job.department.name', 'IT')
            ->assertJsonPath('data.1.actions', ['hire', 'reject'])
            ->assertJsonPath('data.2.actions', []);
        $this->list($team['itJob']->id, '&status=pending')->assertJsonPath('data.*.id', [$pending->id]);
        $this->list($team['itJob']->id, '&status=bogus')->assertJsonValidationErrors('status');
    }

    public function test_each_applicant_shows_how_the_job_meets_their_needs(): void
    {
        $team = $this->hiringCompany();
        $ramp = Accommodation::factory()->create(['name' => 'Ramp']);
        $lift = Accommodation::factory()->create(['name' => 'Lift']);
        $team['itJob']->accommodations()->attach($ramp->id);
        $this->applicantTo($team['itJob'], 'pending', [$ramp, $lift], [], ['interview_request' => 'Captions, please.']);

        $this->actingAs($team['owner'], 'web');
        $this->list($team['itJob']->id)
            ->assertJsonPath('data.0.match', ['needs_total' => 2, 'needs_met' => 1, 'missing' => ['Lift']])
            ->assertJsonPath('data.0.has_interview_request', true)
            ->assertJsonPath('data.0.applicant.headline', 'Bookkeeper with 3 years of experience')
            ->assertJsonMissingPath('data.0.cover_note')
            ->assertJsonMissingPath('data.0.interview_request');
    }

    public function test_an_applicant_without_active_needs_has_no_match(): void
    {
        $team = $this->hiringCompany();
        $need = Accommodation::factory()->create();
        $this->applicantTo($team['itJob']);
        $suspended = $this->applicantTo($team['itJob'], 'pending', [$need]);
        $suspended->candidate->forceFill(['is_active' => false])->save();

        $this->actingAs($team['owner'], 'web');
        $this->list($team['itJob']->id)->assertJsonCount(2, 'data')->assertJsonPath('data.0.match', null)->assertJsonPath('data.1.match', null);
    }

    public function test_withdrawn_applicants_show_only_name_and_dates(): void
    {
        $team = $this->hiringCompany();
        $withdrawn = $this->applicantTo($team['itJob'], 'withdrawn', [Accommodation::factory()->create()], [], ['interview_request' => 'Captions']);

        $this->actingAs($team['owner'], 'web');
        $row = $this->list($team['itJob']->id)->json('data.0');

        $this->assertSame(['name' => $withdrawn->candidate->name], $row['applicant']);
        $this->assertArrayNotHasKey('match', $row);
        $this->assertArrayNotHasKey('has_interview_request', $row);
        $this->assertNotNull($row['withdrawn_at']);
    }

    public function test_hr_officers_see_only_their_department(): void
    {
        $team = $this->hiringCompany();
        [$otherOwner] = $this->companyWithOwner();

        $this->actingAs($team['hr'], 'web');
        $this->list($team['hrJob']->id)->assertOk();
        $this->list($team['itJob']->id)->assertForbidden();
        $this->actingAs($otherOwner, 'web');
        $this->list($team['itJob']->id)->assertForbidden();
        // A job seeker only ever gets their own applications; an admin nothing.
        $this->actingAs(User::factory()->create(), 'web');
        $this->list($team['itJob']->id)->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs(User::factory()->admin()->create(), 'web');
        $this->list($team['itJob']->id)->assertForbidden();
        $this->actingAs($team['owner'], 'web');
        $this->getJson('/api/applications')->assertJsonValidationErrors('job_posting');
        $this->list(999999)->assertNotFound();
    }

    public function test_a_deleted_postings_applicants_are_still_listed(): void
    {
        $team = $this->hiringCompany();
        $this->applicantTo($team['itJob'], 'hired');
        $team['itJob']->delete();

        $this->actingAs($team['owner'], 'web');
        $this->list($team['itJob']->id)->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_the_applicant_list_does_not_query_per_applicant(): void
    {
        $team = $this->hiringCompany();
        $needs = Accommodation::factory()->count(2)->create();
        $team['itJob']->accommodations()->attach($needs[0]->id);
        $count = function () use ($team): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($team['owner'], 'web')->getJson("/api/applications?job_posting={$team['itJob']->id}")->assertOk();
            DB::disableQueryLog();

            return count(DB::getQueryLog());
        };

        foreach (range(1, 3) as $i) {
            $this->applicantTo($team['itJob'], 'pending', $needs->all());
        }
        $count(); // The first request also loads the employer's membership, which the test user then keeps.
        $few = $count();
        foreach (range(1, 7) as $i) {
            $this->applicantTo($team['itJob'], 'pending', $needs->all());
        }

        $this->assertSame($few, $count());
        $this->assertSame(10, Application::count());
    }
}
