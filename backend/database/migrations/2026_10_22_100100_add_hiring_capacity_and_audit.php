<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->unsignedInteger('hiring_slots')->default(1);
            $table->unsignedInteger('application_limit')->nullable();
            $table->string('closure_reason', 30)->nullable();
        });
        Schema::create('hiring_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_posting_id')->constrained()->restrictOnDelete();
            $table->foreignId('application_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 50);
            $table->string('previous_status', 20)->nullable();
            $table->string('new_status', 20)->nullable();
            $table->json('details')->nullable();
            $table->timestamp('created_at');
            $table->index(['job_posting_id', 'id']);
            $table->index(['application_id', 'id']);
        });
        // Preserve existing decisions and make their provenance explicit. Existing hires occupy
        // slots conservatively until the employer edits capacity. Do not invent employer approval.
        DB::table('job_postings')->orderBy('id')->chunkById(200, function ($jobs) {
            foreach ($jobs as $job) {
                $hired = DB::table('applications')->where('job_posting_id', $job->id)->where('status', 'hired')->count();
                if ($hired > 0) {
                    DB::table('job_postings')->where('id', $job->id)->update([
                        'hiring_slots' => $hired, 'status' => 'closed', 'closure_reason' => 'slots_filled',
                    ]);
                }
                DB::table('hiring_events')->insert([
                    'job_posting_id' => $job->id, 'action' => 'capacity_initialized',
                    'previous_status' => $job->status, 'new_status' => $hired > 0 ? 'closed' : $job->status,
                    'details' => json_encode(['hiring_slots' => max(1, $hired), 'application_limit' => null]),
                    'created_at' => now(),
                ]);
            }
        });
        DB::table('applications')->orderBy('id')->chunkById(200, function ($applications) {
            foreach ($applications as $application) {
                DB::table('hiring_events')->insert([
                    'job_posting_id' => $application->job_posting_id, 'application_id' => $application->id,
                    'actor_user_id' => $application->decided_by, 'action' => 'legacy_status_recorded',
                    'new_status' => $application->status,
                    'details' => json_encode(['hire_confirmed_by' => $application->hire_confirmed_by,
                        'requires_review' => $application->status === 'hired' && $application->hire_confirmed_by !== 'employer']),
                    'created_at' => now(),
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hiring_events');
        Schema::table('job_postings', fn (Blueprint $table) => $table->dropColumn(['hiring_slots', 'application_limit', 'closure_reason']));
    }
};
