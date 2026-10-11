<?php

namespace App\Enums;

/**
 * Education levels on a job seeker's profile (plan PHASE_3 §4.1).
 */
enum EducationLevel: string
{
    case Elementary = 'elementary';
    case JuniorHigh = 'junior_high';
    case SeniorHigh = 'senior_high';
    case Als = 'als';
    case Vocational = 'vocational';
    case College = 'college';
    case Postgraduate = 'postgraduate';

    public function label(): string
    {
        return match ($this) {
            self::Elementary => 'Elementary',
            self::JuniorHigh => 'Junior high school',
            self::SeniorHigh => 'Senior high school',
            self::Als => 'Alternative Learning System',
            self::Vocational => 'Vocational or TESDA',
            self::College => 'College',
            self::Postgraduate => 'Postgraduate',
        };
    }
}
