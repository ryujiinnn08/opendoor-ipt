<?php

namespace Tests\Feature\Candidate;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_job_seeker_gets_an_empty_profile(): void
    {
        $seeker = User::factory()->create(['name' => 'Ana Reyes']);

        $this->actingAs($seeker, 'web')->getJson('/api/candidate/profile')->assertOk()
            ->assertJsonPath('data.name', 'Ana Reyes')
            ->assertJsonPath('data.email', $seeker->email)
            ->assertJsonPath('data.headline', null)
            ->assertJsonPath('data.show_disability', false)
            ->assertJsonPath('data.experiences', [])
            ->assertJsonPath('data.educations', [])
            ->assertJsonPath('data.resume', null);
        $this->assertDatabaseCount('candidate_profiles', 0);
    }

    public function test_saving_the_profile(): void
    {
        $seeker = User::factory()->create();

        $this->actingAs($seeker, 'web')->putJson('/api/candidate/profile', [
            'name' => 'Ana M. Reyes', 'headline' => 'Bookkeeper with 3 years of experience', 'city' => 'Quezon City',
            'province' => 'Metro Manila', 'contact_number' => '0917 123 4567', 'skills' => 'Microsoft Excel, bookkeeping',
            'about' => '  ', 'disability_type' => 'physical', 'show_disability' => false, 'experiences' => [], 'educations' => [],
        ])->assertOk()
            ->assertJsonPath('data.city', 'Quezon City')
            ->assertJsonPath('data.about', null)
            ->assertJsonPath('data.disability_type', 'physical');
        $this->assertSame('Ana M. Reyes', $seeker->fresh()->name);
        $this->getJson('/api/candidate/profile')->assertJsonPath('data.headline', 'Bookkeeper with 3 years of experience');
    }

    public function test_every_field_is_optional(): void
    {
        $this->actingAs(User::factory()->create(), 'web')->putJson('/api/candidate/profile', ['name' => 'Ana Reyes'])->assertOk();
        $this->putJson('/api/candidate/profile', ['name' => ''])->assertJsonValidationErrors(['name' => 'Enter your full name.']);
    }

    public function test_field_limits(): void
    {
        $this->actingAs(User::factory()->create(), 'web');

        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'headline' => str_repeat('a', 151)])->assertJsonValidationErrors('headline');
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'contact_number' => 'call me'])
            ->assertJsonValidationErrors(['contact_number' => 'Enter a phone number, such as 0917 123 4567.']);
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'disability_type' => 'other'])->assertJsonValidationErrors('disability_type');
    }

    public function test_saving_replaces_the_entries_in_order(): void
    {
        $seeker = User::factory()->create();
        $job = fn (string $title) => ['job_title' => $title, 'company' => 'Acme', 'started_on' => '2022-01', 'ended_on' => '2023-01', 'is_current' => false];

        $this->actingAs($seeker, 'web')->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [$job('A'), $job('B'), $job('C')]])->assertOk();
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [$job('C'), $job('A')]])
            ->assertJsonPath('data.experiences.*.job_title', ['C', 'A']);
        $this->assertSame(2, $seeker->experiences()->count());
    }

    public function test_entry_limits_and_dates(): void
    {
        $this->actingAs(User::factory()->create(), 'web');
        $entry = ['job_title' => 'Clerk', 'company' => 'Acme', 'started_on' => '2023-06', 'is_current' => true];

        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => array_fill(0, 11, $entry)])
            ->assertJsonValidationErrors('experiences');
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [[...$entry, 'is_current' => false, 'ended_on' => '2023-01']]])
            ->assertJsonValidationErrors(['experiences.0.ended_on' => "The end can't be before the start."]);
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [[...$entry, 'is_current' => false]]])
            ->assertJsonValidationErrors('experiences.0.ended_on');
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [[...$entry, 'started_on' => '2023-6']]])
            ->assertJsonValidationErrors(['experiences.0.started_on' => 'Enter when you started, such as 2023-06.']);
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [[...$entry, 'started_on' => now()->addMonths(2)->format('Y-m')]]])
            ->assertJsonValidationErrors('experiences.0.started_on');
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [['started_on' => '2023-06']]])
            ->assertJsonValidationErrors(['experiences.0.job_title' => 'Enter the job title.', 'experiences.0.company' => 'Enter the company or employer.']);
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'educations' => [['level' => 'phd', 'school' => 'UP']]])
            ->assertJsonValidationErrors('educations.0.level');
        $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'educations' => [['level' => 'college', 'school' => 'UP', 'year_finished' => 1900]]])
            ->assertJsonValidationErrors('educations.0.year_finished');
    }

    public function test_this_month_and_year_are_counted_in_philippine_time(): void
    {
        Carbon::setTestNow('2026-12-31 18:00:00'); // UTC; already January 1, 2027 in Manila
        $this->actingAs(User::factory()->create(), 'web')->putJson('/api/candidate/profile', [
            'name' => 'Ana',
            'experiences' => [['job_title' => 'Clerk', 'company' => 'Acme', 'started_on' => '2027-01', 'is_current' => true]],
            'educations' => [['level' => 'college', 'school' => 'TUP', 'year_finished' => 2027]],
        ])->assertOk();
    }

    public function test_the_current_job_needs_no_end_and_studying_needs_no_year(): void
    {
        $this->actingAs(User::factory()->create(), 'web')->putJson('/api/candidate/profile', [
            'name' => 'Ana',
            'experiences' => [['job_title' => 'Clerk', 'company' => 'Acme', 'started_on' => '2023-06', 'is_current' => true, 'ended_on' => '2024-01']],
            'educations' => [['level' => 'college', 'school' => 'TUP', 'course' => 'BSIT', 'is_studying' => true, 'year_finished' => 2020]],
        ])->assertOk()
            ->assertJsonPath('data.experiences.0.ended_on', null)
            ->assertJsonPath('data.experiences.0.is_current', true)
            ->assertJsonPath('data.educations.0.year_finished', null)
            ->assertJsonPath('data.educations.0.level', 'college');
    }

    public function test_only_job_seekers_have_a_profile(): void
    {
        $this->getJson('/api/candidate/profile')->assertUnauthorized();
        $this->actingAs(User::factory()->employer()->create(), 'web')->getJson('/api/candidate/profile')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create(), 'web')->putJson('/api/candidate/profile', ['name' => 'X'])->assertForbidden();
    }
}
