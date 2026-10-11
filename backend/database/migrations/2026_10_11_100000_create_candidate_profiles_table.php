<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One job application profile per job seeker (plan PHASE_3 §4.1). Every field is optional.
     */
    public function up(): void
    {
        Schema::create('candidate_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('headline', 150)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('contact_number', 30)->nullable();
            $table->text('about')->nullable();
            $table->text('skills')->nullable();
            $table->text('trainings')->nullable();
            $table->string('languages', 255)->nullable();
            $table->string('disability_type', 40)->nullable();
            $table->boolean('show_disability')->default(false);
            // The uploaded PDF résumé, on the private disk.
            $table->string('resume_path')->nullable();
            $table->string('resume_name', 255)->nullable();
            $table->dateTime('resume_uploaded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_profiles');
    }
};
