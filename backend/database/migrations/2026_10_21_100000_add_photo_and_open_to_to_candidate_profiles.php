<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The job seeker's profile photo and "Open to" choices (UI_FEEDBACK_WAVE_B_PLAN B1). The photo is
 * private by default: employers see it only when the job seeker turns show_photo_to_employers on.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidate_profiles', function (Blueprint $table) {
            // On the private "local" disk, like the résumé.
            $table->string('photo_path')->nullable()->after('resume_uploaded_at');
            $table->boolean('show_photo_to_employers')->default(false)->after('photo_path');
            $table->json('open_to_work_setups')->nullable()->after('show_photo_to_employers');
            $table->json('open_to_employment_types')->nullable()->after('open_to_work_setups');
        });
    }

    public function down(): void
    {
        Schema::table('candidate_profiles', function (Blueprint $table) {
            $table->dropColumn(['photo_path', 'show_photo_to_employers', 'open_to_work_setups', 'open_to_employment_types']);
        });
    }
};
