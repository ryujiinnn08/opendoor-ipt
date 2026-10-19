<?php

/**
 * Opt-in real MySQL integration test. ONLY use a disposable database whose name begins
 * opendoor_security_test. This script recreates that database's tables.
 * Usage: APP_ENV=testing DB_CONNECTION=mysql DB_DATABASE=opendoor_security_test ... php tests/Concurrency/run.php
 */

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use App\Enums\MemberRole;
use App\Models\Application;
use App\Models\Employer;
use App\Models\EmployerMember;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\ApplicationWorkflow;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\Process\Process;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (! app()->environment('testing') || DB::getDriverName() !== 'mysql'
    || ! str_starts_with(DB::connection()->getDatabaseName(), 'opendoor_security_test')) {
    throw new RuntimeException('Requires APP_ENV=testing and a disposable MySQL database named opendoor_security_test*.');
}
Notification::fake();

if (($argv[1] ?? '') === 'worker') {
    $user = User::findOrFail((int) $argv[3]);
    echo "ready\n";
    flush();
    try {
        if ($argv[2] === 'apply') {
            app(ApplicationWorkflow::class)->apply($user, (int) $argv[4], null, null);
        } else {
            app(ApplicationWorkflow::class)->changeStatus(Application::findOrFail((int) $argv[4]),
                ApplicationStatus::Hired, ApplicationActor::Employer, ApplicationStatus::Reviewed, $user);
        }
        echo "result:200\n";
    } catch (HttpResponseException $e) {
        echo 'result:'.$e->getResponse()->getStatusCode()."\n";
    }
    exit;
}

Artisan::call('migrate:fresh', ['--force' => true]);

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

/** Both workers wait on the same locked parent row before either may decide. */
function race(JobPosting $job, array $requests): array
{
    $workers = [];
    try {
        DB::beginTransaction();
        JobPosting::whereKey($job->id)->lockForUpdate()->firstOrFail();
        foreach ($requests as $request) {
            $worker = new Process([PHP_BINARY, __FILE__, 'worker', ...array_map('strval', $request)], base_path());
            $worker->setTimeout(20);
            $worker->start();
            $workers[] = $worker;
        }
        $deadline = microtime(true) + 10;
        do {
            $ready = true;
            foreach ($workers as $worker) {
                check($worker->isRunning(), 'Worker exited before releasing the lock: '.$worker->getErrorOutput());
                $ready = $ready && str_contains($worker->getOutput(), 'ready');
            }
            if ($ready) {
                break;
            }
            usleep(10000);
        } while (microtime(true) < $deadline);
        check($ready, 'Workers did not reach the lock barrier.');
        usleep(200000);
        foreach ($workers as $worker) {
            check(! str_contains($worker->getOutput(), 'result:'), 'Worker bypassed the parent job lock.');
        }
        DB::commit();
        $results = [];
        foreach ($workers as $worker) {
            $worker->wait();
            check($worker->isSuccessful(), $worker->getErrorOutput());
            check(preg_match('/result:(\d+)/', $worker->getOutput(), $match) === 1, 'Missing worker result.');
            $results[] = (int) $match[1];
        }
        sort($results);

        return $results;
    } finally {
        if (DB::transactionLevel() > 0) {
            DB::rollBack();
        }
        foreach ($workers as $worker) {
            if ($worker->isRunning()) {
                $worker->stop();
            }
        }
    }
}

$job = JobPosting::factory()->open()->create(['application_limit' => 1]);
$a = User::factory()->create();
$b = User::factory()->create();
check(race($job, [['apply', $a->id, $job->id], ['apply', $b->id, $job->id]]) === [200, 409], 'Application limit race failed.');
check($job->applications()->count() === 1, 'Too many applications.');
echo "PASS: simultaneous applicants for one remaining application place\n";

$job = JobPosting::factory()->open()->create();
check(race($job, [['apply', $a->id, $job->id], ['apply', $a->id, $job->id]]) === [200, 409], 'Duplicate application race failed.');
check($job->applications()->count() === 1, 'Duplicate application committed.');
echo "PASS: simultaneous duplicate submissions\n";

$employer = Employer::factory()->individual()->create();
$owner = User::factory()->employer()->create();
EmployerMember::create(['user_id' => $owner->id, 'employer_id' => $employer->id, 'role' => MemberRole::Owner]);
$job = JobPosting::factory()->open()->in($employer)->create(['hiring_slots' => 1]);
$first = Application::factory()->reviewed()->create(['job_posting_id' => $job->id]);
$second = Application::factory()->reviewed()->create(['job_posting_id' => $job->id]);
check(race($job, [['hire', $owner->id, $first->id], ['hire', $owner->id, $second->id]]) === [200, 409], 'Hiring capacity race failed.');
check($job->applications()->where('status', 'hired')->count() === 1, 'Too many hires.');
check($job->fresh()->status->value === 'closed', 'Filled posting was not closed.');
check(DB::table('hiring_events')->where('job_posting_id', $job->id)->where('action', 'status_changed')->count() === 1, 'Incorrect audit records for hiring race.');
echo "PASS: simultaneous hires for the last slot, automatic closure, and one audit event\n";

// Exercise upgrade/backfill and rollback on real existing records, not just an empty schema.
$legacyJob = JobPosting::factory()->open()->create(['hiring_slots' => 3]);
Application::factory()->hired()->count(2)->create(['job_posting_id' => $legacyJob->id]);
$legacyHire = Application::factory()->hired()->create(['job_posting_id' => $legacyJob->id, 'hire_confirmed_by' => 'candidate']);
check(Artisan::call('migrate:rollback', ['--step' => 3, '--force' => true]) === 0, 'Security migration rollback failed.');
check(Artisan::call('migrate', ['--force' => true]) === 0, 'Security migration backfill failed.');
check($legacyJob->fresh()->hiring_slots === 3 && $legacyJob->fresh()->status->value === 'closed', 'Legacy capacity was not preserved.');
$event = DB::table('hiring_events')->where('application_id', $legacyHire->id)->where('action', 'legacy_status_recorded')->first();
check(json_decode($event->details, true)['requires_review'] === true, 'Legacy applicant-confirmed hire was not flagged.');
echo "PASS: MySQL migration rollback/backfill preserves hires and flags legacy self-confirmations\n";
