<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A work experience entry; started_on and ended_on are 'YYYY-MM'.
 */
class CandidateExperience extends Model
{
    protected $fillable = ['position', 'job_title', 'company', 'started_on', 'ended_on', 'is_current', 'description'];

    protected function casts(): array
    {
        return ['is_current' => 'boolean'];
    }
}
