<?php

namespace Tests\Concerns;

use App\Models\Accommodation;
use App\Models\Application;
use App\Models\Department;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;

/**
 * A company with two departments (IT, HR), its owner, an HR officer in HR, an open posting in each,
 * and applicants with profiles and needs. Uses BuildsTeams.
 */
trait BuildsApplications
{
    use BuildsTeams;

    /**
     * @return array{owner: User, company: Employer, it: Department, hrDept: Department, hr: User, itJob: JobPosting, hrJob: JobPosting}
     */
    protected function hiringCompany(): array
    {
        [$owner, $company, $it] = $this->companyWithOwner();
        $it->update(['name' => 'IT']);
        $hrDept = $company->departments()->create(['name' => 'HR', 'member_limit' => 3]);

        return [
            'owner' => $owner,
            'company' => $company,
            'it' => $it,
            'hrDept' => $hrDept,
            'hr' => $this->hrOfficerIn($hrDept),
            'itJob' => JobPosting::factory()->open()->in($it)->create(['title' => 'Junior Web Developer']),
            'hrJob' => JobPosting::factory()->open()->in($hrDept)->create(['title' => 'HR Assistant']),
        ];
    }

    /**
     * An application to $job by a new job seeker with a profile and these needs.
     *
     * @param  list<Accommodation>  $needs
     * @param  array<string, mixed>  $profile
     * @param  array<string, mixed>  $attributes
     */
    protected function applicantTo(JobPosting $job, string $state = 'pending', array $needs = [], array $profile = [], array $attributes = []): Application
    {
        $seeker = User::factory()->create();
        $seeker->candidateProfile()->create(['headline' => 'Bookkeeper with 3 years of experience', 'contact_number' => '0917 555 0199', ...$profile]);
        $seeker->needs()->attach(array_map(fn (Accommodation $need) => $need->id, $needs));
        $factory = Application::factory();
        $factory = $state === 'pending' ? $factory : $factory->{$state}();

        return $factory->create(['job_posting_id' => $job->id, 'user_id' => $seeker->id, ...$attributes]);
    }
}
