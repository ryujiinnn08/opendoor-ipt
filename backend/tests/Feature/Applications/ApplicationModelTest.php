<?php

namespace Tests\Feature\Applications;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplicationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_application_per_job_and_job_seeker(): void
    {
        $application = Application::factory()->create();

        $this->expectException(UniqueConstraintViolationException::class);
        Application::factory()->create(['job_posting_id' => $application->job_posting_id, 'user_id' => $application->user_id]);
    }

    public function test_status_and_dates_are_not_mass_assignable(): void
    {
        $application = new Application(['status' => 'hired', 'hired_at' => '2026-01-01', 'user_id' => 99, 'cover_note' => 'Hi']);

        $this->assertSame(ApplicationStatus::Pending, $application->status);
        $this->assertNull($application->hired_at);
        $this->assertNull($application->user_id);
        $this->assertSame('Hi', $application->cover_note);
    }

    public function test_a_deleted_job_is_still_reachable(): void
    {
        $application = Application::factory()->create();
        $title = $application->jobPosting->title;
        $application->jobPosting->delete();

        $this->assertSame($title, $application->fresh()->jobPosting->title);
        $this->assertTrue($application->fresh()->jobPosting->trashed());
    }

    public function test_relations_and_factory_states(): void
    {
        $seeker = User::factory()->create();
        $job = JobPosting::factory()->open()->create();
        $hired = Application::factory()->hired()->create(['user_id' => $seeker->id, 'job_posting_id' => $job->id]);

        $this->assertSame(ApplicationStatus::Hired, $hired->status);
        $this->assertNotNull($hired->hired_at);
        $this->assertTrue($seeker->applications->contains($hired));
        $this->assertTrue($job->applications->contains($hired));
        $this->assertTrue($hired->candidate->is($seeker));
    }
}
