<?php

namespace Tests\Feature\Admin;

use App\Enums\AccountEventType;
use App\Models\User;
use Database\Seeders\DemoAccountSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * User management demo data (plan PHASE_6 Q10).
 */
class DemoAccountSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_adds_a_suspended_job_seeker_and_a_second_administrator_once(): void
    {
        $this->seed([UserSeeder::class, DemoAccountSeeder::class, DemoAccountSeeder::class]);

        $suspended = User::firstWhere('email', DemoAccountSeeder::SUSPENDED_EMAIL);
        $this->assertFalse($suspended->is_active);
        $this->assertTrue(Hash::check(UserSeeder::LOCAL_DEMO_PASSWORD, $suspended->password));
        $this->assertCount(1, $suspended->accountEvents);
        $this->assertSame(AccountEventType::Suspended, $suspended->accountEvents->first()->type);
        $this->assertSame(DemoAccountSeeder::SUSPENSION_REASON, $suspended->accountEvents->first()->reason);
        $this->assertSame(UserSeeder::LOCAL_ADMIN_EMAIL, $suspended->accountEvents->first()->actor->email);

        // Nobody knows the second administrator's password.
        $admin2 = User::firstWhere('email', DemoAccountSeeder::ADMIN2_EMAIL);
        $this->assertTrue($admin2->is_active);
        $this->assertTrue($admin2->must_change_password);
        $this->assertFalse(Hash::check(UserSeeder::LOCAL_DEMO_PASSWORD, $admin2->password));
        $this->assertCount(1, $admin2->accountEvents);
    }

    public function test_reseeding_leaves_a_reactivated_demo_account_alone(): void
    {
        $this->seed([UserSeeder::class, DemoAccountSeeder::class]);
        $suspended = User::firstWhere('email', DemoAccountSeeder::SUSPENDED_EMAIL);
        $suspended->forceFill(['is_active' => true])->save();

        $this->seed(DemoAccountSeeder::class);

        $this->assertTrue($suspended->fresh()->is_active);
    }

    public function test_it_is_skipped_without_demo_accounts(): void
    {
        $this->app['env'] = 'production';
        config([
            'opendoor.seed.admin_email' => 'admin@opendoor.example',
            'opendoor.seed.admin_password' => 'Strong@Admin1',
            'opendoor.seed.demo_password' => null,
        ]);

        // Run directly: db:seed asks for confirmation in production.
        $this->app->make(UserSeeder::class)->run();
        $this->app->make(DemoAccountSeeder::class)->run();

        $this->assertSame(1, User::count());
    }
}
