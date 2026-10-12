<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Who may read and act on an application (plan PHASE_4 §6.2). In 4A only its own job seeker;
 * 4B adds the employer of the job (owner, or an HR officer of its department).
 */
class ApplicationPolicy
{
    public const NOT_YOURS = "This application isn't yours.";

    public function view(User $user, Application $application): Response
    {
        return $this->actAsCandidate($user, $application);
    }

    /**
     * Withdrawing and confirming a hire.
     */
    public function actAsCandidate(User $user, Application $application): Response
    {
        return $application->user_id === $user->id ? Response::allow() : Response::deny(self::NOT_YOURS);
    }
}
