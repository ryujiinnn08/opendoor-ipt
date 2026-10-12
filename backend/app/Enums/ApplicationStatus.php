<?php

namespace App\Enums;

/**
 * An application's status (plan PHASE_4 §2). canTransitionTo() is the only place the
 * proposal's Table 1 lives; everything it doesn't list is refused, including moving backward.
 */
enum ApplicationStatus: string
{
    case Pending = 'pending';
    case Reviewed = 'reviewed';
    case Hired = 'hired';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Reviewed => 'Reviewed',
            self::Hired => 'Hired',
            self::Rejected => 'Rejected',
            self::Withdrawn => 'Withdrawn',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Hired, self::Rejected, self::Withdrawn], true);
    }

    public function canTransitionTo(self $next, ApplicationActor $actor): bool
    {
        return match ($actor) {
            ApplicationActor::Candidate => match ($this) {
                self::Pending => $next === self::Withdrawn,
                self::Reviewed => in_array($next, [self::Withdrawn, self::Hired], true),
                default => false,
            },
            ApplicationActor::Employer => match ($this) {
                self::Pending => $next === self::Reviewed,
                self::Reviewed => in_array($next, [self::Rejected, self::Hired], true),
                default => false,
            },
        };
    }

    /**
     * Waiting for a decision: My applications' "Waiting" filter.
     *
     * @return list<self>
     */
    public static function waiting(): array
    {
        return [self::Pending, self::Reviewed];
    }

    /**
     * Ended without a hire: My applications' "Closed" filter.
     *
     * @return list<self>
     */
    public static function closed(): array
    {
        return [self::Rejected, self::Withdrawn];
    }
}
