<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Post-hire accommodation feedback and the employer's trust score (plan PHASE_5 §6.1).
     * One feedback per hired application, one rating per accommodation of the hire copy.
     */
    public function up(): void
    {
        Schema::create('feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->unique()->constrained()->restrictOnDelete();
            // Read only by OpenDoor's administrators (Q2).
            $table->text('comment')->nullable();
            // Hidden by an admin (Phase 6): left out of the trust score.
            $table->boolean('is_hidden')->default(false);
            $table->timestamps();
        });

        Schema::create('feedback_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('feedback_id')->constrained('feedback')->cascadeOnDelete();
            // Accommodation types are retired, never deleted.
            $table->foreignId('accommodation_id')->constrained()->restrictOnDelete();
            $table->string('rating', 20); // delivered | partial | not_delivered | not_used
            $table->timestamps();

            $table->unique(['feedback_id', 'accommodation_id']);
        });

        Schema::table('employers', function (Blueprint $table) {
            // Written only by TrustScore: null until enough responses count.
            $table->decimal('trust_score', 5, 2)->nullable();
            $table->unsignedInteger('feedback_count')->default(0);
        });

        Schema::table('applications', function (Blueprint $table) {
            // When the "feedback open" notification was recorded (Q7), so it's recorded once.
            $table->dateTime('feedback_reminded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('applications', fn (Blueprint $table) => $table->dropColumn('feedback_reminded_at'));
        Schema::table('employers', fn (Blueprint $table) => $table->dropColumn(['trust_score', 'feedback_count']));
        Schema::dropIfExists('feedback_items');
        Schema::dropIfExists('feedback');
    }
};
