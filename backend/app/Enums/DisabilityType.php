<?php

namespace App\Enums;

/**
 * The PWD ID disability categories (plan PHASE_3 §4.1). Optional, private by default and
 * never used to match or filter jobs.
 */
enum DisabilityType: string
{
    case DeafOrHardOfHearing = 'deaf_or_hard_of_hearing';
    case Intellectual = 'intellectual';
    case Learning = 'learning';
    case Mental = 'mental';
    case Physical = 'physical';
    case Psychosocial = 'psychosocial';
    case SpeechAndLanguage = 'speech_and_language';
    case Visual = 'visual';
    case Cancer = 'cancer';
    case RareDisease = 'rare_disease';
    case PreferNotToSay = 'prefer_not_to_say';

    public function label(): string
    {
        return match ($this) {
            self::DeafOrHardOfHearing => 'Deaf or hard of hearing',
            self::Intellectual => 'Intellectual',
            self::Learning => 'Learning',
            self::Mental => 'Mental',
            self::Physical => 'Physical (orthopedic)',
            self::Psychosocial => 'Psychosocial',
            self::SpeechAndLanguage => 'Speech and language',
            self::Visual => 'Visual',
            self::Cancer => 'Cancer',
            self::RareDisease => 'Rare disease',
            self::PreferNotToSay => 'Prefer not to say',
        };
    }
}
