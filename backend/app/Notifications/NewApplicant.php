<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Notifications\Notification;

/**
 * A job seeker applied to one of your postings (M9). Recorded only; the bell comes later.
 * Carries no needs, cover note or interview request.
 */
class NewApplicant extends Notification
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
            'type' => 'new_applicant',
            'application_id' => $this->application->id,
            'job_posting_id' => $this->application->job_posting_id,
            'job_title' => $this->application->jobPosting->title,
            'applicant_name' => $this->application->candidate->name,
        ];
    }
}
