<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A job seeker's accommodation needs (composite key, as in the proposal's database section).
     */
    public function up(): void
    {
        Schema::create('candidate_accommodation', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Accommodation types are retired, never deleted.
            $table->foreignId('accommodation_id')->constrained()->restrictOnDelete();
            $table->timestamps();

            $table->primary(['user_id', 'accommodation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_accommodation');
    }
};
