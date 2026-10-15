<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Creates the administrator and the demo accounts (plan PHASE_1 §3.1, PHASE_2 decision 23).
 *
 * Existing accounts are never changed, so re-seeding never resets a password.
 */
class UserSeeder extends Seeder
{
    public const LOCAL_ADMIN_EMAIL = 'admin@opendoor.test';

    public const LOCAL_ADMIN_PASSWORD = 'Admin_1234';

    public const LOCAL_DEMO_PASSWORD = 'Demo_1234';

    public const DEMO_CANDIDATE_EMAIL = 'candidate@opendoor.test';

    /** A second demo job seeker with different needs, so the same jobs rank differently (Phase 3B). */
    public const DEMO_CANDIDATE2_EMAIL = 'candidate2@opendoor.test';

    /** Owner of the demo company. */
    public const DEMO_EMPLOYER_EMAIL = 'employer@opendoor.test';

    /** HR officer in the demo company's Human Resources department. */
    public const DEMO_HR_EMAIL = 'hr@opendoor.test';

    public const DEMO_INDIVIDUAL_EMAIL = 'individual@opendoor.test';

    /** Owner of the second demo company, a verified contact center (Phase 3A). */
    public const DEMO_EMPLOYER2_EMAIL = 'employer2@opendoor.test';

    /** Owner of the third demo company, a clinic waiting for verification (Phase 3A). */
    public const DEMO_EMPLOYER3_EMAIL = 'employer3@opendoor.test';

    public function run(): void
    {
        $production = app()->isProduction();

        $adminEmail = config('opendoor.seed.admin_email') ?: ($production ? null : self::LOCAL_ADMIN_EMAIL);
        $adminPassword = config('opendoor.seed.admin_password') ?: ($production ? null : self::LOCAL_ADMIN_PASSWORD);

        if (! $adminEmail || ! $adminPassword) {
            throw new RuntimeException('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before seeding production.');
        }

        $this->createAccount($adminEmail, 'OpenDoor Admin', Role::Admin, $adminPassword);

        // Demo accounts are a backup for demonstrations; in production they are opt-in.
        $demoPassword = self::demoPassword();

        if (! $demoPassword) {
            $this->command?->warn('Demo accounts skipped: SEED_DEMO_PASSWORD is not set.');

            return;
        }

        $this->createAccount(self::DEMO_CANDIDATE_EMAIL, 'Demo Candidate', Role::Candidate, $demoPassword);
        $this->createAccount(self::DEMO_CANDIDATE2_EMAIL, 'Demo Candidate Two', Role::Candidate, $demoPassword);
        $this->createAccount(self::DEMO_EMPLOYER_EMAIL, 'Demo Employer', Role::Employer, $demoPassword);
        $this->createAccount(self::DEMO_HR_EMAIL, 'Demo HR Officer', Role::Employer, $demoPassword);
        $this->createAccount(self::DEMO_INDIVIDUAL_EMAIL, 'Demo Individual', Role::Employer, $demoPassword);
        $this->createAccount(self::DEMO_EMPLOYER2_EMAIL, 'Demo Contact Center Owner', Role::Employer, $demoPassword);
        $this->createAccount(self::DEMO_EMPLOYER3_EMAIL, 'Demo Clinic Owner', Role::Employer, $demoPassword);
    }

    /**
     * The demo accounts' password: SEED_DEMO_PASSWORD, or the local one outside production.
     * Null means demo accounts are skipped.
     */
    public static function demoPassword(): ?string
    {
        return config('opendoor.seed.demo_password') ?: (app()->isProduction() ? null : self::LOCAL_DEMO_PASSWORD);
    }

    private function createAccount(string $email, string $name, Role $role, string $password): void
    {
        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'role' => $role, 'password' => $password, 'consented_at' => now()],
        );

        $this->command?->line(sprintf(
            '  %s account %s: %s',
            $role->label(),
            $user->wasRecentlyCreated ? 'created' : 'already exists',
            $email,
        ));
    }
}
