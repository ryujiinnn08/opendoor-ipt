<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ApplicationStatus;
use App\Enums\EmployerType;
use App\Enums\PostingStatus;
use App\Enums\Role;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Application;
use App\Models\Category;
use App\Models\Employer;
use App\Models\Feedback;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\DashboardActivity;
use App\Services\TeamCapacity;
use Illuminate\Http\JsonResponse;

/**
 * What's waiting for an administrator, then OpenDoor in numbers (plan PHASE_6 §4.3, F8.3).
 */
class DashboardController extends Controller
{
    public function show(TeamCapacity $capacity): JsonResponse
    {
        $accounts = User::toBase()
            ->selectRaw('role, is_active, count(*) as total')
            ->groupBy('role', 'is_active')
            ->get();
        $countRole = fn (Role $role) => (int) $accounts->where('role', $role->value)->sum('total');
        $employers = Employer::toBase()->selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type');

        return response()->json(['data' => [
            // Waiting for you.
            'companies_waiting_for_verification' => Employer::where('type', EmployerType::Company)
                ->where('verification_status', VerificationStatus::Pending)
                ->count(),
            'postings_waiting_for_approval' => JobPosting::where('status', PostingStatus::Pending)->count(),
            // Moderation has no "checked" state, so the queue is the past week's comments (Phase 6B).
            'feedback_comments_last_7_days' => Feedback::whereNotNull('comment')->where('comment', '!=', '')
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),

            // OpenDoor in numbers.
            'job_seekers' => $countRole(Role::Candidate),
            'employer_accounts' => $countRole(Role::Employer),
            'companies' => (int) ($employers[EmployerType::Company->value] ?? 0),
            'individual_employers' => (int) ($employers[EmployerType::Individual->value] ?? 0),
            'administrators' => $countRole(Role::Admin),
            'suspended_accounts' => (int) $accounts->filter(fn ($row) => ! $row->is_active)->sum('total'),
            'open_jobs' => JobPosting::publiclyVisible()->count(),
            'applications' => Application::count(),
            'hires' => Application::where('status', ApplicationStatus::Hired)->count(),
            'employers_with_trust_score' => Employer::whereNotNull('trust_score')->count(),

            // Master data tiles (Phase 2).
            'categories' => Category::count(),
            'active_accommodations' => Accommodation::active()->count(),
            'hr_per_department_cap' => $capacity->cap(),
        ]]);
    }

    /**
     * Weekly activity for the dashboard charts (UI_FEEDBACK_WAVE_B_PLAN B3).
     */
    public function activity(DashboardActivity $activity): JsonResponse
    {
        return response()->json(['data' => $activity->forAdmin()]);
    }
}
