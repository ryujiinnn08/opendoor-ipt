<?php

namespace App\Enums;

/** What an administrator did with a feedback (plan PHASE_6 §4.5). */
enum FeedbackEventType: string
{
    case Hidden = 'hidden';
    case Shown = 'shown';
    case AuthorViewed = 'author_viewed';
}
