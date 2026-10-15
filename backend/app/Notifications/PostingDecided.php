<?php

namespace App\Notifications;

use App\Enums\PostingStatus;
use App\Models\JobPosting;
use Illuminate\Notifications\Notification;

/**
 * An administrator approved or rejected a posting (M9, Phase 6B); sent to its creator and the
 * department's managers.
 */
class PostingDecided extends Notification
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
            'type' => 'posting_decided',
            'job_posting_id' => $this->posting->id,
            'job_title' => $this->posting->title,
            'approved' => $this->posting->status !== PostingStatus::Rejected,
        ];
    }
}
