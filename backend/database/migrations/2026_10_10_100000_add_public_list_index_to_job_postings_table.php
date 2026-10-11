<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The public job list filters on status and closing date (Phase 3A).
     */
    public function up(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->index(['status', 'closes_on']);
        });
    }

    public function down(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropIndex(['status', 'closes_on']);
        });
    }
};
