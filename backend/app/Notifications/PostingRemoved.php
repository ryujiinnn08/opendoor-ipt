<?php

namespace App\Notifications;

use App\Models\JobPosting;
use Illuminate\Notifications\Notification;

/**
 * OpenDoor removed a posting (plan PHASE_6 §4.2, Phase 6B); sent to its managers. The reason is
 * read on the Removed list, not copied here.
 */
class PostingRemoved extends Notification
{
    public function __construct(private JobPosting $posting) {}

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
            'type' => 'posting_removed',
            'job_posting_id' => $this->posting->id,
            'job_title' => $this->posting->title,
        ];
    }
}
