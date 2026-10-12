<?php

namespace Tests\Unit;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use PHPUnit\Framework\TestCase;

class ApplicationStatusTest extends TestCase
{
    /**
     * The proposal's Table 1, and nothing else (plan PHASE_4 §2).
     */
    public function test_table_1_and_nothing_else(): void
    {
        $allowed = [
            'pending>reviewed>employer',
            'pending>withdrawn>candidate',
            'reviewed>withdrawn>candidate',
            'reviewed>rejected>employer',
            'reviewed>hired>employer',
            'reviewed>hired>candidate',
        ];

        foreach (ApplicationStatus::cases() as $from) {
            foreach (ApplicationStatus::cases() as $to) {
                foreach (ApplicationActor::cases() as $actor) {
                    $key = "{$from->value}>{$to->value}>{$actor->value}";
                    $this->assertSame(in_array($key, $allowed, true), $from->canTransitionTo($to, $actor), $key);
                }
            }
        }
    }

    public function test_final_statuses(): void
    {
        $this->assertSame(
            ['hired', 'rejected', 'withdrawn'],
            array_values(array_map(fn (ApplicationStatus $status) => $status->value, array_filter(ApplicationStatus::cases(), fn (ApplicationStatus $status) => $status->isFinal()))),
        );
        $this->assertSame(
            ['Pending', 'Reviewed', 'Hired', 'Rejected', 'Withdrawn'],
            array_map(fn (ApplicationStatus $status) => $status->label(), ApplicationStatus::cases()),
        );
        $this->assertSame([ApplicationStatus::Pending, ApplicationStatus::Reviewed], ApplicationStatus::waiting());
        $this->assertSame([ApplicationStatus::Rejected, ApplicationStatus::Withdrawn], ApplicationStatus::closed());
    }
}
