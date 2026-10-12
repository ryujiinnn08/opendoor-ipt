<?php

namespace Database\Factories;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    /**
     * A Pending application by a job seeker to an open job.
     */
    public function definition(): array
    {
        return [
            'job_posting_id' => JobPosting::factory()->open(),
            'user_id' => User::factory(),
            'status' => ApplicationStatus::Pending,
        ];
    }

    public function reviewed(): static
    {
        return $this->state(fn () => ['status' => ApplicationStatus::Reviewed, 'reviewed_at' => now()]);
    }

    public function hired(): static
    {
        return $this->reviewed()->state(fn () => [
            'status' => ApplicationStatus::Hired,
            'hired_at' => JobPosting::today(),
            'hire_confirmed_by' => ApplicationActor::Employer,
        ]);
    }

    public function rejected(): static
    {
        return $this->reviewed()->state(fn () => ['status' => ApplicationStatus::Rejected, 'rejected_at' => now()]);
    }

    public function withdrawn(): static
    {
        return $this->state(fn () => ['status' => ApplicationStatus::Withdrawn, 'withdrawn_at' => now()]);
    }
}
