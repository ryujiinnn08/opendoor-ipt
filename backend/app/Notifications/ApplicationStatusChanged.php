<?php

namespace App\Notifications;

use App\Enums\ApplicationActor;
use App\Models\Application;
use Illuminate\Notifications\Notification;

/**
 * An application's status changed; sent to the other party (M6 rule, M9). Recorded only.
 */
class ApplicationStatusChanged extends Notification
{
    public function __construct(private Application $application, private ApplicationActor $actor) {}

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
            'type' => 'status_changed',
            'application_id' => $this->application->id,
            'job_posting_id' => $this->application->job_posting_id,
            'job_title' => $this->application->jobPosting->title,
            'employer_name' => $this->application->jobPosting->employer->name,
            'applicant_name' => $this->application->candidate->name,
            'status' => $this->application->status->value,
            'actor' => $this->actor->value,
        ];
    }
}
