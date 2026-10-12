<?php

namespace App\Policies;

use App\Enums\ApplicationStatus;
use App\Enums\Role;
use App\Models\Application;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Who may read and act on an application (plan PHASE_4 §6.2): its own job seeker, and the
 * employer of the job (the owner, or an HR officer of the job's department), the same rule as
 * JobPostingPolicy::manage. Nobody else, admins included.
 */
class ApplicationPolicy
{
    public const NOT_YOURS = "This application isn't yours.";

    public const NOT_YOUR_APPLICANT = 'You can only see applicants for your own job postings.';

    public function view(User $user, Application $application): Response
    {
        if ($application->user_id === $user->id || $this->managesJob($user, $application)) {
            return Response::allow();
        }

        return Response::deny($user->role === Role::Employer ? self::NOT_YOUR_APPLICANT : self::NOT_YOURS);
    }

    /**
     * Hiring and rejecting.
     */
    public function actAsEmployer(User $user, Application $application): Response
    {
        return $this->managesJob($user, $application) ? Response::allow() : Response::deny(self::NOT_YOUR_APPLICANT);
    }

    /**
     * The applicant's uploaded résumé: their job's employer, and not after they withdrew (Q4).
     */
    public function viewResume(User $user, Application $application): Response
    {
        if (! $this->managesJob($user, $application)) {
            return Response::deny(self::NOT_YOUR_APPLICANT);
        }

        return $application->status === ApplicationStatus::Withdrawn
            ? Response::deny('This applicant withdrew their application.')
            : Response::allow();
    }

    /**
     * Whether this person manages the application's job (even after the job was deleted).
     */
    public function managesJob(User $user, Application $application): bool
    {
        return $user->role === Role::Employer
            && (new JobPostingPolicy)->manage($user, $application->jobPosting)->allowed();
    }

    /**
     * Withdrawing and confirming a hire.
     */
    public function actAsCandidate(User $user, Application $application): Response
    {
        return $application->user_id === $user->id ? Response::allow() : Response::deny(self::NOT_YOURS);
    }
}
