<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\ApplicantResumeController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\ApplicationStatusController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Candidate;
use App\Http\Controllers\Employer;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\Public;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Used by the React app (and deploy checks) to confirm the API and database are reachable.
Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        $database = 'ok';
    } catch (Throwable) {
        $database = 'unavailable';
    }

    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'database' => $database,
        'time' => now()->toIso8601String(),
    ]);
});

// Public lists used by forms and filters (M11).
Route::get('/categories', [Public\CategoryController::class, 'index']);
Route::get('/accommodations', [Public\AccommodationController::class, 'index']);

// Open jobs and public employer pages (M5, Phase 3A). Their own rate-limit counter, so browsing
// never uses up the registration or invite limits; ids longer than 18 digits can't be a row.
Route::middleware('throttle:120,1,public-jobs')->group(function () {
    Route::get('/job-postings', [Public\JobPostingController::class, 'index']);
    Route::get('/job-postings/{id}', [Public\JobPostingController::class, 'show'])->where('id', '[0-9]{1,18}');
    Route::get('/employers/{id}', [Public\EmployerController::class, 'show'])->where('id', '[0-9]{1,18}');
    Route::get('/employers/{id}/trust-score', [Public\TrustScoreController::class, 'show'])->where('id', '[0-9]{1,18}');
});

// Employer logos (M3) and team invites (Phase 2A).
Route::get('/employers/{employer}/logo', [Public\EmployerLogoController::class, 'show'])->name('employers.logo');
Route::get('/invites/{code}', [Public\InviteController::class, 'show'])->middleware('throttle:30,1');
Route::post('/invites/{code}/accept', [Public\InviteController::class, 'accept'])->middleware('throttle:10,1');

// Authentication (M1). Login is additionally rate-limited per email inside LoginRequest.
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware(['active', 'password.changed'])->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        // Change password (F1.6, Phase 6A): every portal.
        Route::put('/me/password', [PasswordController::class, 'update'])->middleware('throttle:10,1,password');

        // Candidate portal (M2, Phase 3B): only the logged-in job seeker's own data.
        Route::middleware('role:candidate')->prefix('candidate')->group(function () {
            Route::get('profile', [Candidate\ProfileController::class, 'show']);
            Route::put('profile', [Candidate\ProfileController::class, 'update']);
            Route::get('accommodations', [Candidate\NeedsController::class, 'index']);
            Route::put('accommodations', [Candidate\NeedsController::class, 'update']);
            Route::get('resume', [Candidate\ResumeController::class, 'show']);
            Route::post('resume', [Candidate\ResumeController::class, 'store']);
            Route::delete('resume', [Candidate\ResumeController::class, 'destroy']);
            Route::get('dashboard', [Candidate\DashboardController::class, 'show']);
        });

        // Applications (M6, Phase 4): never stored by the browser. Applying has its own per-account limit.
        Route::middleware('no.store')->group(function () {
            Route::get('applications', [ApplicationController::class, 'index']);
            Route::get('applications/{application}', [ApplicationController::class, 'show'])->where('application', '[0-9]{1,18}');
            Route::get('applications/{application}/resume', [ApplicantResumeController::class, 'show'])->where('application', '[0-9]{1,18}');
            Route::patch('applications/{application}/status', [ApplicationStatusController::class, 'update'])->where('application', '[0-9]{1,18}');
            // Accommodation feedback (M7, Phase 5): the hired job seeker only.
            Route::middleware('role:candidate')->group(function () {
                Route::get('applications/{application}/feedback-form', [FeedbackController::class, 'show'])->where('application', '[0-9]{1,18}');
                Route::post('applications/{application}/feedback', [FeedbackController::class, 'store'])
                    ->where('application', '[0-9]{1,18}')
                    ->middleware('throttle:10,1,feedback');
            });
            Route::post('job-postings/{id}/applications', [ApplicationController::class, 'store'])
                ->where('id', '[0-9]{1,18}')
                ->middleware(['role:candidate', 'throttle:10,1,applications']);
        });

        // Employer portal (M3): company or individual profile, verification and team.
        Route::middleware('role:employer')->prefix('employer')->group(function () {
            Route::post('setup', [Employer\SetupController::class, 'store']);

            Route::middleware('employer.profile')->group(function () {
                Route::get('profile', [Employer\ProfileController::class, 'show']);
                Route::put('profile', [Employer\ProfileController::class, 'update']);
                Route::post('profile/logo', [Employer\LogoController::class, 'store']);
                Route::delete('profile/logo', [Employer\LogoController::class, 'destroy']);
                Route::post('verification', [Employer\VerificationController::class, 'store']);

                Route::get('departments', [Employer\DepartmentController::class, 'index']);
                Route::post('departments', [Employer\DepartmentController::class, 'store']);
                Route::put('departments/{department}', [Employer\DepartmentController::class, 'update']);
                Route::delete('departments/{department}', [Employer\DepartmentController::class, 'destroy']);
                Route::post('departments/{department}/invites', [Employer\InviteController::class, 'store']);
                Route::delete('invites/{invite}', [Employer\InviteController::class, 'destroy']);
                Route::patch('members/{member}', [Employer\MemberController::class, 'update']);
                Route::delete('members/{member}', [Employer\MemberController::class, 'destroy']);

                // Job postings (M4, Phase 2B): department-scoped by JobPostingPolicy.
                Route::get('dashboard', [Employer\DashboardController::class, 'show']);
                Route::get('trust-score', [Employer\TrustScoreController::class, 'show']);
                Route::get('job-postings', [Employer\JobPostingController::class, 'index']);
                Route::post('job-postings', [Employer\JobPostingController::class, 'store']);
                Route::get('job-postings/{posting}', [Employer\JobPostingController::class, 'show']);
                Route::put('job-postings/{posting}', [Employer\JobPostingController::class, 'update']);
                Route::delete('job-postings/{posting}', [Employer\JobPostingController::class, 'destroy']);
                Route::patch('job-postings/{posting}/status', [Employer\JobPostingStatusController::class, 'update']);
            });
        });

        Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
            Route::get('dashboard', [Admin\DashboardController::class, 'show']);

            Route::apiResource('categories', Admin\CategoryController::class)->only(['store', 'update', 'destroy']);

            Route::apiResource('accommodations', Admin\AccommodationController::class)->only(['index', 'store', 'update']);
            Route::patch('accommodations/{accommodation}/status', [Admin\AccommodationController::class, 'updateStatus']);

            Route::get('employers', [Admin\EmployerVerificationController::class, 'index']);
            Route::patch('employers/{employer}/verify', [Admin\EmployerVerificationController::class, 'update']);

            Route::get('job-postings', [Admin\JobPostingApprovalController::class, 'index']);
            // Removed postings stay readable here, with the reason (Phase 6A).
            Route::get('job-postings/{posting}', [Admin\JobPostingApprovalController::class, 'show'])->withTrashed();
            Route::patch('job-postings/{posting}/approve', [Admin\JobPostingApprovalController::class, 'update']);
            Route::delete('job-postings/{posting}', [Admin\JobPostingRemovalController::class, 'destroy']);

            // Users (F10.1, Phase 6A).
            Route::get('users', [Admin\UserController::class, 'index']);
            Route::post('users', [Admin\UserController::class, 'store']);
            Route::get('users/{user}', [Admin\UserController::class, 'show']);
            Route::patch('users/{user}/suspend', [Admin\UserStatusController::class, 'update']);

            Route::get('settings', [Admin\SettingsController::class, 'show']);
            Route::put('settings', [Admin\SettingsController::class, 'update']);
        });
    });
});
