<?php

namespace Tests\Feature\Feedback;

use App\Models\Employer;
use App\Models\Feedback;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoEmployerSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoFeedbackSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_demo_has_one_visible_score_and_one_about_to_appear(): void
    {
        $this->seed(DatabaseSeeder::class);

        $contactCenter = Employer::firstWhere('name', DemoEmployerSeeder::CONTACT_CENTER_NAME);
        $this->assertSame(4, $contactCenter->feedback_count);
        $this->assertSame(87.5, $contactCenter->trust_score);

        $demoCorp = Employer::firstWhere('name', DemoEmployerSeeder::COMPANY_NAME);
        $this->assertSame(2, $demoCorp->feedback_count);
        $this->assertNull($demoCorp->trust_score);

        $candidate = User::firstWhere('email', UserSeeder::DEMO_CANDIDATE_EMAIL);
        $clerk = $candidate->applications()->whereHas('jobPosting', fn ($query) => $query->where('title', 'Office Clerk'))->first();
        $this->assertSame('open', $clerk->feedbackState());
    }

    public function test_seeding_again_changes_nothing(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(6, Feedback::count());
        $this->assertSame(4, Employer::firstWhere('name', DemoEmployerSeeder::CONTACT_CENTER_NAME)->feedback_count);
    }
}
