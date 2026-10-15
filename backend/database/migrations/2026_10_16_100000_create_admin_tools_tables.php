<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Admin tools (plan PHASE_6 §6.1, part 6A): the account history, the forced password change
     * for new administrators, and postings removed by OpenDoor.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Set for administrators created with a temporary password (Q4).
            $table->boolean('must_change_password')->default(false)->after('is_active');
            $table->dateTime('last_login_at')->nullable()->after('must_change_password');
        });

        // An account's history, read only by administrators (Q6).
        Schema::create('account_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30); // suspended | reactivated | admin_created | password_changed
            $table->string('reason', 500)->nullable();
            // The administrator who acted; null when the person acted on their own account.
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
        });

        Schema::table('job_postings', function (Blueprint $table) {
            // Removed by an administrator (Q7): soft-deleted as well, the reason shown to the employer.
            $table->foreignId('removed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('removed_at')->nullable();
            $table->string('removal_reason', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('removed_by');
            $table->dropColumn(['removed_at', 'removal_reason']);
        });
        Schema::dropIfExists('account_events');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['must_change_password', 'last_login_at']));
    }
};
