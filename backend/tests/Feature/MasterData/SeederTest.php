<?php

namespace Tests\Feature\MasterData;

use App\Enums\Role;
use App\Models\Accommodation;
use App\Models\Category;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;
use Database\Seeders\AccommodationSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoCandidateSeeder;
use Database\Seeders\DemoEmployerSeeder;
use Database\Seeders\DemoJobPostingSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_twice_creates_no_duplicates(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(10, Category::count());
        $this->assertSame(18, Accommodation::count());
        $this->assertSame(8, User::count());

        $this->assertSame(17, JobPosting::count());
        $this->assertSame(
            ['closed' => 1, 'draft' => 1, 'open' => 14, 'pending' => 1],
            JobPosting::pluck('status')->map->value->countBy()->sortKeys()->all(),
        );

        // A posting someone deleted is never put back.
        JobPosting::first()->delete();
        $this->seed(DatabaseSeeder::class);
        $this->assertSame(17, JobPosting::withTrashed()->count());
    }

    public function test_demo_jobs_fill_two_pages_and_cover_the_lists(): void
    {
        $this->seed(DatabaseSeeder::class);
        $public = JobPosting::publiclyVisible()->with('accommodations')->get();

        $this->assertCount(13, $public);
        $this->assertSame(13, $this->getJson('/api/job-postings')->json('meta.total'));
        $this->assertCount(8, $public->pluck('category_id')->unique());
        $this->assertCount(18, $public->flatMap->accommodations->pluck('id')->unique());
        $this->assertCount(3, $public->pluck('work_setup')->unique());
        $this->assertCount(4, $public->pluck('employment_type')->unique());
        $this->assertSame('pending', Employer::firstWhere('name', DemoEmployerSeeder::CLINIC_NAME)->verification_status->value);
    }

    public function test_a_database_seeded_before_phase_3a_gets_the_new_demo_company_jobs(): void
    {
        $this->seed(DatabaseSeeder::class);
        // A Phase 2 database: the demo company already had postings, but not these two.
        JobPosting::withTrashed()->whereIn('title', ['Graphic Designer', 'Office Clerk'])->forceDelete();

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(17, JobPosting::count());
        $this->assertSame(13, JobPosting::publiclyVisible()->count());
    }

    public function test_demo_job_seekers_rank_the_same_jobs_differently(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);
        $expect = [
            UserSeeder::DEMO_CANDIDATE_EMAIL => [['Customer Support Associate', 'Data Encoder'], ['Sales Coordinator', 'Pharmacy Aide'], 5],
            UserSeeder::DEMO_CANDIDATE2_EMAIL => [['Chat Support Specialist', 'Front Desk Assistant'], ['Sales Coordinator', 'Medical Records Clerk', 'Pharmacy Aide'], 3],
        ];

        foreach ($expect as $email => [$fullMatches, $noMatch, $needs]) {
            $seeker = User::firstWhere('email', $email);
            $this->assertSame($needs, $seeker->needs()->count());
            $this->assertSame(1, $seeker->educations()->count());

            // Each demo account logs in to its own session (Sanctum checks the password hash per session).
            $this->flushSession();
            $jobs = $this->actingAs($seeker, 'web')->getJson('/api/job-postings?match=1&sort=match')->json('data');
            $top = array_slice($jobs, 0, 2);
            $this->assertEqualsCanonicalizing($fullMatches, array_column($top, 'title'));
            foreach ($top as $job) {
                $this->assertSame($job['match']['needs_total'], $job['match']['needs_met']);
            }
            $this->assertEmpty(array_intersect($noMatch, array_column($jobs, 'title')));
        }
    }

    public function test_demo_job_seekers_are_left_alone_once_they_have_needs(): void
    {
        $this->seed(DatabaseSeeder::class);
        $seeker = User::firstWhere('email', UserSeeder::DEMO_CANDIDATE_EMAIL);
        $seeker->needs()->detach();
        $seeker->candidateProfile->update(['headline' => 'My own words']);

        $this->seed(DemoCandidateSeeder::class);

        $this->assertSame('My own words', $seeker->candidateProfile->fresh()->headline);
        $this->assertSame(0, $seeker->needs()->count());
    }

    public function test_a_demo_posting_whose_category_is_missing_is_skipped(): void
    {
        $this->seed([CategorySeeder::class, AccommodationSeeder::class]);
        Category::firstWhere('name', 'Healthcare')->update(['name' => 'Health and Wellness']);
        // Not DatabaseSeeder: CategorySeeder would create "Healthcare" again.
        $this->seed([UserSeeder::class, DemoEmployerSeeder::class, DemoJobPostingSeeder::class]);

        $this->assertFalse(JobPosting::where('title', 'Pharmacy Aide')->exists());
        $this->assertTrue(JobPosting::where('title', 'Data Encoder')->exists());
    }

    public function test_local_defaults_create_admin_and_demo_accounts(): void
    {
        $this->seed(UserSeeder::class);

        $admin = User::firstWhere('email', UserSeeder::LOCAL_ADMIN_EMAIL);
        $this->assertSame(Role::Admin, $admin->role);
        $this->assertTrue(Hash::check(UserSeeder::LOCAL_ADMIN_PASSWORD, $admin->password));
        $this->assertTrue(Hash::check(UserSeeder::LOCAL_DEMO_PASSWORD, User::firstWhere('email', UserSeeder::DEMO_CANDIDATE_EMAIL)->password));
        $this->assertSame(Role::Candidate, User::firstWhere('email', UserSeeder::DEMO_CANDIDATE_EMAIL)->role);
        $this->assertSame(Role::Employer, User::firstWhere('email', UserSeeder::DEMO_EMPLOYER_EMAIL)->role);
    }

    public function test_reseeding_never_resets_an_existing_password(): void
    {
        $this->seed(UserSeeder::class);
        $admin = User::firstWhere('email', UserSeeder::LOCAL_ADMIN_EMAIL);
        $admin->update(['password' => 'Changed@2026']);

        $this->seed(UserSeeder::class);

        $this->assertTrue(Hash::check('Changed@2026', $admin->fresh()->password));
    }

    public function test_production_refuses_to_seed_without_admin_settings(): void
    {
        $this->app['env'] = 'production';
        config(['opendoor.seed.admin_email' => null, 'opendoor.seed.admin_password' => null]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD');

        $this->runUserSeeder();
    }

    public function test_production_skips_demo_accounts_unless_a_demo_password_is_set(): void
    {
        $this->app['env'] = 'production';
        config([
            'opendoor.seed.admin_email' => 'admin@opendoor.example',
            'opendoor.seed.admin_password' => 'Strong@Admin1',
            'opendoor.seed.demo_password' => null,
        ]);

        $this->runUserSeeder();

        $this->assertSame(1, User::count());
        $this->assertSame(Role::Admin, User::first()->role);

        config(['opendoor.seed.demo_password' => 'Strong@Demo1']);
        $this->runUserSeeder();

        $this->assertSame(8, User::count());
    }

    /**
     * Run the seeder directly; `db:seed` would stop to ask for confirmation in production.
     */
    private function runUserSeeder(): void
    {
        $this->app->make(UserSeeder::class)->run();
    }
}
