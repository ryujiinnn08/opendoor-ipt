<?php

namespace App\Notifications;

use App\Models\Employer;
use Illuminate\Notifications\Notification;

/**
 * An administrator verified or rejected the company (M9, Phase 6B); sent to its owner.
 */
class VerificationDecided extends Notification
{
    public function __construct(private Employer $employer) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'verification_decided',
            'employer_id' => $this->employer->id,
            'employer_name' => $this->employer->name,
            'verified' => $this->employer->isVerified(),
        ];
    }
}
