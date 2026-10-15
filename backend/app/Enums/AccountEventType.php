<?php

namespace App\Enums;

/** What happened to an account, for its history (plan PHASE_6 §4.1). */
enum AccountEventType: string
{
    case Suspended = 'suspended';
    case Reactivated = 'reactivated';
    case AdminCreated = 'admin_created';
    // A new temporary password for an administrator who hadn't changed theirs (review WR-05).
    case TemporaryPasswordReplaced = 'temporary_password_replaced';
    case PasswordChanged = 'password_changed';
}
