<?php

namespace App\Enums;

/** What happened to an account, for its history (plan PHASE_6 §4.1). */
enum AccountEventType: string
{
    case Suspended = 'suspended';
    case Reactivated = 'reactivated';
    case AdminCreated = 'admin_created';
    case PasswordChanged = 'password_changed';
}
