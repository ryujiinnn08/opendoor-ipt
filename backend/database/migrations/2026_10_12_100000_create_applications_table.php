<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Job applications (plan PHASE_4 §6.1). Never deleted, so feedback and history stay valid.
     * The job seeker is a user id: a profile row exists only once it's first saved.
     */
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_posting_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('pending');
            $table->text('cover_note')->nullable();
            $table->text('interview_request')->nullable();
            // The date of each step, for the application's path.
            $table->dateTime('reviewed_at')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->dateTime('withdrawn_at')->nullable();
            // A whole day in Philippine time; feedback opens 30 days later (Phase 5).
            $table->date('hired_at')->nullable();
            $table->string('hire_confirmed_by', 20)->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['job_posting_id', 'user_id']);
            $table->index(['job_posting_id', 'status']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
