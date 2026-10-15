<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Notifications\Notification;

/**
 * The hired job seeker can now rate the accommodations (F7.6, Q7). Recorded once per hire;
 * the bell comes later.
 */
class FeedbackOpen extends Notification
{
    public function __construct(private Application $application) {}

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
            'type' => 'feedback_open',
            'application_id' => $this->application->id,
            'job_title' => $this->application->jobPosting->title,
            'employer_name' => $this->application->jobPosting->employer->name,
        ];
    }
}
