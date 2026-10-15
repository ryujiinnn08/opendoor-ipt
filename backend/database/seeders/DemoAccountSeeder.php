<?php

namespace Database\Seeders;

use App\Enums\AccountEventType;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * User management demo data (plan PHASE_6 Q10): a suspended job seeker with a history line, and
 * a second administrator so the list has more than one. Existing accounts are never changed.
 *
 * The second administrator gets a random password nobody is told: the demo never logs in as
 * them, and a known password would give administrator access to anyone with the demo password.
 */
class DemoAccountSeeder extends Seeder
{
    public const SUSPENDED_EMAIL = 'suspended@opendoor.test';

    public const ADMIN2_EMAIL = 'admin2@opendoor.test';

    public const SUSPENSION_REASON = 'Sent the same message to every employer asking for payment, reported by 2 employers.';

    public function run(): void
    {
        $demoPassword = UserSeeder::demoPassword();
        $admin = User::where('role', Role::Admin)->where('is_active', true)->orderBy('id')->first();

        if (! $demoPassword || ! $admin) {
            return;
        }

        DB::transaction(function () use ($demoPassword, $admin) {
            $suspended = User::firstOrCreate(
                ['email' => self::SUSPENDED_EMAIL],
                ['name' => 'Demo Suspended Job Seeker', 'role' => Role::Candidate, 'password' => $demoPassword, 'consented_at' => now()],
            );
            if ($suspended->wasRecentlyCreated) {
                $suspended->forceFill(['is_active' => false])->save();
                $suspended->accountEvents()->create([
                    'type' => AccountEventType::Suspended,
                    'reason' => self::SUSPENSION_REASON,
                    'actor_id' => $admin->id,
                ]);
            }

            $admin2 = User::firstOrCreate(
                ['email' => self::ADMIN2_EMAIL],
                ['name' => 'Demo Admin Two', 'role' => Role::Admin, 'password' => Str::password(32)],
            );
            if ($admin2->wasRecentlyCreated) {
                $admin2->forceFill(['must_change_password' => true])->save();
                $admin2->accountEvents()->create(['type' => AccountEventType::AdminCreated, 'actor_id' => $admin->id]);
            }

            $this->command?->line('  User management demo: '.self::SUSPENDED_EMAIL.' (suspended), '.self::ADMIN2_EMAIL);
        });
    }
}
