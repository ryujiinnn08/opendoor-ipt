<?php

use App\Http\Controllers\NotificationController;
use Illuminate\Foundation\Inspiring;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Notifications are kept 90 days (plan PHASE_6 §4.4); the list already hides older ones.
Artisan::command('notifications:prune', function () {
    $deleted = DatabaseNotification::where('created_at', '<', now()->subDays(NotificationController::KEEP_DAYS))->delete();
    $this->info("Deleted {$deleted} notifications older than ".NotificationController::KEEP_DAYS.' days.');
})->purpose('Delete notifications older than 90 days');

Schedule::command('notifications:prune')->daily();
