<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The job's accommodations and notes copied at the moment of hire: the ones the hired
     * job seeker rates in Phase 5 (M4 rule), even if the posting changes later.
     */
    public function up(): void
    {
        Schema::create('application_accommodation', function (Blueprint $table) {
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            // Accommodation types are retired, never deleted.
            $table->foreignId('accommodation_id')->constrained()->restrictOnDelete();
            $table->string('note', 255)->nullable();

            $table->primary(['application_id', 'accommodation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_accommodation');
    }
};
