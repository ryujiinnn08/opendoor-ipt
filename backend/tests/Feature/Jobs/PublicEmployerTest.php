<?php

namespace Tests\Feature\Jobs;

use App\Models\Employer;
use App\Models\JobPosting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTeams;
use Tests\TestCase;

class PublicEmployerTest extends TestCase
{
    use BuildsTeams, RefreshDatabase;

    public function test_shows_a_company_with_an_approved_posting(): void
    {
        $company = Employer::factory()->verified()->create(['name' => 'Bayanihan Contact Center Inc.']);
        JobPosting::factory()->in($company)->open()->create();

        $data = $this->getJson("/api/employers/{$company->id}")->assertOk()->json('data');
        $this->assertSame(['id', 'type', 'name', 'industry', 'address', 'description', 'logo_url', 'is_verified'], array_keys($data));
        $this->assertTrue($data['is_verified']);
    }

    public function test_the_page_stays_after_the_job_closes(): void
    {
        $company = Employer::factory()->create();
        JobPosting::factory()->in($company)->closed()->create();

        $this->getJson("/api/employers/{$company->id}")->assertOk();
    }

    public function test_employers_without_an_approved_posting_are_not_found(): void
    {
        $neverApproved = Employer::factory()->create();
        JobPosting::factory()->in($neverApproved)->pending()->create();
        $deletedOnly = Employer::factory()->create();
        JobPosting::factory()->in($deletedOnly)->open()->create()->delete();

        $this->getJson("/api/employers/{$neverApproved->id}")->assertNotFound();
        $this->getJson("/api/employers/{$deletedOnly->id}")->assertNotFound();
        $this->getJson('/api/employers/999999')->assertNotFound();
    }

    public function test_registration_details_and_team_are_never_shown(): void
    {
        [$owner, $company, $department] = $this->companyWithOwner();
        $company->forceFill(['business_reg_no' => 'CS202612345'])->save();
        JobPosting::factory()->in($department)->open()->create();

        $body = $this->getJson("/api/employers/{$company->id}")->assertOk()->getContent();
        foreach (['CS202612345', 'business_reg_no', 'registration_type', 'verification_status', $owner->email] as $private) {
            $this->assertStringNotContainsString($private, $body);
        }
    }

    public function test_open_jobs_come_from_the_search_endpoint(): void
    {
        $company = Employer::factory()->create();
        $mine = JobPosting::factory()->in($company)->open()->create();
        JobPosting::factory()->in($company)->closed()->create();
        JobPosting::factory()->open()->create(); // another employer

        $this->assertSame([$mine->id], $this->getJson("/api/job-postings?employer={$company->id}")->json('data.*.id'));
    }
}
