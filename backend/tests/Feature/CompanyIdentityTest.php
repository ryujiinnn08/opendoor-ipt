<?php

namespace Tests\Feature;

use App\Models\Employer;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsTeams;
use Tests\TestCase;

class CompanyIdentityTest extends TestCase
{
    use BuildsTeams, RefreshDatabase;

    public function test_duplicate_company_registration_is_refused_but_a_different_location_is_allowed(): void
    {
        Employer::factory()->create(['name' => 'Acme', 'address' => 'Makati']);
        $user = User::factory()->employer()->create();
        $this->actingAs($user, 'web');
        $body = ['type' => 'company', 'name' => ' ACME ', 'address' => ' makati ', 'industry' => 'IT'];
        $this->postJson('/api/employer/setup', $body)->assertJsonValidationErrors('name');
        $this->assertDatabaseCount('employers', 1);
        $this->assertNull($user->fresh()->membership);
        $this->postJson('/api/employer/setup', [...$body, 'address' => 'Cebu'])->assertCreated();
    }

    public function test_profile_updates_cannot_duplicate_another_company_but_can_keep_their_own_identity(): void
    {
        [$owner, $company] = $this->companyWithOwner(['name' => 'Acme', 'address' => 'Makati']);
        Employer::factory()->create(['name' => 'Other', 'address' => 'Cebu']);
        $this->actingAs($owner, 'web');
        $this->putJson('/api/employer/profile', ['name' => 'Acme', 'address' => 'Makati', 'industry' => 'IT'])->assertOk();
        $this->putJson('/api/employer/profile', ['name' => 'other', 'address' => 'cebu', 'industry' => 'IT'])->assertJsonValidationErrors('name');
        $this->assertSame('Acme', $company->fresh()->name);
    }

    public function test_database_unique_key_cannot_be_bypassed_by_raw_insert(): void
    {
        Employer::factory()->create(['name' => 'Acme', 'address' => 'Makati']);
        $this->expectException(UniqueConstraintViolationException::class);
        DB::table('employers')->insert(['type' => 'company', 'name' => ' acme ', 'address' => ' MAKATI ']);
    }

    public function test_individual_employers_are_not_subject_to_company_identity_uniqueness(): void
    {
        Employer::factory()->individual()->count(2)->create(['name' => 'Alex', 'address' => 'Makati']);
        $this->assertDatabaseCount('employers', 2);
    }
}
