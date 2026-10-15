<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Feedback moderation (plan PHASE_6 §4.5, §6.1, part 6B): why feedback was hidden, and its
     * history, including each time an administrator asked who wrote it (Q9).
     */
    public function up(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            $table->string('hidden_reason', 500)->nullable()->after('is_hidden');
            $table->foreignId('hidden_by')->nullable()->after('hidden_reason')->constrained('users')->nullOnDelete();
        });

        Schema::create('feedback_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('feedback_id')->constrained('feedback')->cascadeOnDelete();
            $table->string('type', 30); // hidden | shown | author_viewed
            $table->string('reason', 500)->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['feedback_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_events');
        Schema::table('feedback', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hidden_by');
            $table->dropColumn('hidden_reason');
        });
    }
};
