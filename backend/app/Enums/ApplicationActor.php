<?php

namespace App\Enums;

/**
 * Who changes an application's status (proposal Table 1). Also stored as who confirmed a hire.
 */
enum ApplicationActor: string
{
    case Candidate = 'candidate';
    case Employer = 'employer';
}
