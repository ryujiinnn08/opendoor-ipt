<?php

namespace App\Models;

use App\Enums\DisabilityType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A job seeker's application profile. Only its owner reads or changes it (Phase 4 adds
 * employers with an application). The résumé columns are set by ResumeController only.
 */
class CandidateProfile extends Model
{
    protected $fillable = [
        'headline',
        'city',
        'province',
        'contact_number',
        'about',
        'skills',
        'trainings',
        'languages',
        'disability_type',
        'show_disability',
        'show_photo_to_employers',
        'open_to_work_setups',
        'open_to_employment_types',
    ];

    protected $attributes = [
        'show_disability' => false,
    ];

    protected function casts(): array
    {
        return [
            'disability_type' => DisabilityType::class,
            'show_disability' => 'boolean',
            'show_photo_to_employers' => 'boolean',
            'open_to_work_setups' => 'array',
            'open_to_employment_types' => 'array',
            'resume_uploaded_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
