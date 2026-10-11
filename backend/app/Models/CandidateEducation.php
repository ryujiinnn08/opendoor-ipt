<?php

namespace App\Models;

use App\Enums\EducationLevel;
use Illuminate\Database\Eloquent\Model;

class CandidateEducation extends Model
{
    protected $table = 'candidate_educations';

    protected $fillable = ['position', 'level', 'school', 'course', 'year_finished', 'is_studying'];

    protected function casts(): array
    {
        return [
            'level' => EducationLevel::class,
            'year_finished' => 'integer',
            'is_studying' => 'boolean',
        ];
    }
}
