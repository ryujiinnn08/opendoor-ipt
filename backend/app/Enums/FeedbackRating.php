<?php

namespace App\Enums;

/**
 * A hired job seeker's answer for one accommodation (plan PHASE_5 §2, Q1). "I didn't use this"
 * is kept but never counts toward the trust score.
 */
enum FeedbackRating: string
{
    case Delivered = 'delivered';
    case Partial = 'partial';
    case NotDelivered = 'not_delivered';
    case NotUsed = 'not_used';

    public function label(): string
    {
        return match ($this) {
            self::Delivered => 'Delivered',
            self::Partial => 'Partly delivered',
            self::NotDelivered => 'Not delivered',
            self::NotUsed => "I didn't use this",
        };
    }

    /**
     * Delivered = 1, Partially delivered = 0.5, Not delivered = 0 (§VII-G); null when not counted.
     */
    public function score(): ?float
    {
        return match ($this) {
            self::Delivered => 1.0,
            self::Partial => 0.5,
            self::NotDelivered => 0.0,
            self::NotUsed => null,
        };
    }
}
