<?php

namespace App\Services;

use App\Enums\AccountEventType;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Suspending, reactivating, adding administrators and changing passwords (plan PHASE_6 §4.1).
 * Every change is recorded in the account's history.
 */
class AccountService
{
    /** Length of a new administrator's temporary password (Q4). */
    public const TEMPORARY_PASSWORD_LENGTH = 16;

    /** Symbols that are easy to read aloud and type. */
    private const SYMBOLS = '!@#$%&*?+=';

    /**
     * Stops the account and logs the person out everywhere at once (M1, Q2, Q6).
     */
    public function suspend(User $user, User $admin, string $reason): User
    {
        if ($user->is($admin)) {
            abort(422, "You can't suspend your own account.");
        }

        DB::transaction(function () use ($user, $admin, $reason) {
            // Lock every active administrator, so two admins suspending each other at once can't
            // leave OpenDoor with none.
            $activeAdmins = User::where('role', Role::Admin)->where('is_active', true)->lockForUpdate()->pluck('id');
            $user->refresh();

            if (! $user->is_active) {
                abort(409, 'This account is already suspended.');
            }
            if ($user->role === Role::Admin && $activeAdmins->count() <= 1) {
                abort(422, 'OpenDoor needs at least one active administrator.');
            }

            $user->forceFill(['is_active' => false])->save();
            $this->endSessions($user);
            $user->accountEvents()->create([
                'type' => AccountEventType::Suspended,
                'reason' => $reason,
                'actor_id' => $admin->id,
            ]);
        });

        return $user;
    }

    public function reactivate(User $user, User $admin): User
    {
        DB::transaction(function () use ($user, $admin) {
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($user->is_active) {
                abort(409, 'This account is already active.');
            }

            $user->forceFill(['is_active' => true])->save();
            $user->accountEvents()->create(['type' => AccountEventType::Reactivated, 'actor_id' => $admin->id]);
        });

        return $user->refresh();
    }

    /**
     * Creates an administrator with a temporary password, returned once and never stored in
     * plain text; they must change it after logging in (Q4).
     *
     * @return array{0: User, 1: string}
     */
    public function createAdmin(string $name, string $email, User $admin): array
    {
        $password = $this->temporaryPassword();

        $user = DB::transaction(function () use ($name, $email, $password, $admin) {
            $user = User::create(['name' => $name, 'email' => $email, 'password' => $password, 'role' => Role::Admin]);
            $user->forceFill(['must_change_password' => true])->save();
            $user->accountEvents()->create(['type' => AccountEventType::AdminCreated, 'actor_id' => $admin->id]);

            return $user;
        });

        return [$user, $password];
    }

    /**
     * Saves the new password and ends every other session of this user (F1.6).
     */
    public function changePassword(User $user, string $password, ?string $currentSessionId): void
    {
        DB::transaction(function () use ($user, $password, $currentSessionId) {
            $user->forceFill([
                'password' => $password,
                'must_change_password' => false,
                'remember_token' => Str::random(60),
            ])->save();
            $this->endSessions($user, $currentSessionId);
            $user->accountEvents()->create(['type' => AccountEventType::PasswordChanged]);
        });
    }

    /**
     * Deletes the user's stored sessions, except the one given. Sessions live in the database
     * (SESSION_DRIVER=database); with any other driver the `active` middleware is the backstop.
     */
    public function endSessions(User $user, ?string $exceptSessionId = null): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->when($exceptSessionId !== null, fn ($query) => $query->where('id', '!=', $exceptSessionId))
            ->delete();
    }

    /**
     * Upper and lower case letters, numbers and symbols, so it passes the password rules.
     */
    public function temporaryPassword(): string
    {
        $sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', self::SYMBOLS];
        $all = implode('', $sets);

        $characters = array_map(fn (string $set) => $set[random_int(0, strlen($set) - 1)], $sets);
        while (count($characters) < self::TEMPORARY_PASSWORD_LENGTH) {
            $characters[] = $all[random_int(0, strlen($all) - 1)];
        }

        // Fisher–Yates with random_int, so the required characters aren't always first.
        for ($i = count($characters) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$characters[$i], $characters[$j]] = [$characters[$j], $characters[$i]];
        }

        return implode('', $characters);
    }
}
