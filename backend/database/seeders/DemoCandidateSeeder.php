<?php

namespace Database\Seeders;

use App\Enums\DisabilityType;
use App\Enums\EducationLevel;
use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Profiles and needs for the two demo job seekers (plan PHASE_3 §4.2): a wheelchair user and
 * a Deaf job seeker, so the same demo jobs rank differently. Runs only for a demo job seeker
 * with no profile and no needs yet, so it never changes what a person set up.
 */
class DemoCandidateSeeder extends Seeder
{
    public function run(): void
    {
        $this->setUp(UserSeeder::DEMO_CANDIDATE_EMAIL, [
            'headline' => 'Data encoder with 2 years of experience',
            'city' => 'Quezon City',
            'province' => 'Metro Manila',
            'contact_number' => '0917 555 0101',
            'about' => 'I enter and check records carefully and on time. I use a wheelchair and work best at a desk I can adjust.',
            'skills' => 'Microsoft Excel, data entry, customer service',
            'languages' => 'Filipino, English',
            'disability_type' => DisabilityType::Physical,
            'show_disability' => false,
        ], [
            ['job_title' => 'Data Encoder', 'company' => 'Bayani Logistics', 'started_on' => '2023-01', 'ended_on' => '2024-12', 'is_current' => false,
                'description' => 'Encoded delivery records and checked them against receipts.'],
        ], [
            ['level' => EducationLevel::College, 'school' => 'Technological University of the Philippines', 'course' => 'BS Information Technology', 'year_finished' => 2022],
        ], [
            'Wheelchair-accessible entrance', 'Accessible restroom', 'Elevator or ground-floor workspace', 'Adjustable workstation', 'Flexible hours',
        ]);

        $this->setUp(UserSeeder::DEMO_CANDIDATE2_EMAIL, [
            'headline' => 'Customer support agent fluent in Filipino Sign Language',
            'city' => 'Cebu City',
            'province' => 'Cebu',
            'about' => 'I answer customers by chat and email. I am Deaf and use Filipino Sign Language.',
            'skills' => 'Chat support, email support, Filipino Sign Language',
            'languages' => 'Filipino, English, Filipino Sign Language',
            'disability_type' => DisabilityType::DeafOrHardOfHearing,
            'show_disability' => false,
        ], [], [
            ['level' => EducationLevel::SeniorHigh, 'school' => 'Cebu City National Science High School', 'course' => 'ICT strand', 'year_finished' => 2021],
        ], [
            'Sign language interpreter', 'Written or captioned meetings', 'Flexible hours',
        ]);
    }

    /**
     * @param  array<string, mixed>  $profile
     * @param  list<array<string, mixed>>  $experiences
     * @param  list<array<string, mixed>>  $educations
     * @param  list<string>  $needs  Accommodation names; a missing one is skipped with a warning.
     */
    private function setUp(string $email, array $profile, array $experiences, array $educations, array $needs): void
    {
        $seeker = User::firstWhere('email', $email);
        if (! $seeker || $seeker->candidateProfile()->exists() || $seeker->needs()->exists()) {
            return;
        }

        $seeker->candidateProfile()->create($profile);
        foreach ($experiences as $position => $entry) {
            $seeker->experiences()->create([...$entry, 'position' => $position]);
        }
        foreach ($educations as $position => $entry) {
            $seeker->educations()->create([...$entry, 'position' => $position]);
        }

        $ids = Accommodation::whereIn('name', $needs)->pluck('id', 'name');
        foreach (array_diff($needs, $ids->keys()->all()) as $missing) {
            $this->command?->warn("  Demo need skipped, accommodation not found: {$missing}");
        }
        $seeker->needs()->sync($ids->values()->all());

        $this->command?->line("  Demo job seeker profile and needs created: {$email}");
    }
}
