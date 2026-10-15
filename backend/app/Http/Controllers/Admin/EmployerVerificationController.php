<?php

namespace App\Http\Controllers\Admin;

use App\Enums\EmployerType;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DecisionRequest;
use App\Http\Resources\AdminCompanyResource;
use App\Models\Employer;
use App\Notifications\VerificationDecided;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmployerVerificationController extends Controller
{
    /**
     * Companies by verification status; the waiting queue is oldest first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->validate([
            'verification' => ['nullable', Rule::in(['pending', 'verified', 'rejected'])],
        ])['verification'] ?? 'pending';

        $companies = Employer::with('owner.user')
            ->where('type', EmployerType::Company)
            ->where('verification_status', $status)
            ->when(
                $status === 'pending',
                fn ($query) => $query->orderBy('verification_submitted_at'),
                fn ($query) => $query->latest('updated_at'),
            )
            ->limit(200)
            ->get();

        return AdminCompanyResource::collection($companies);
    }

    /**
     * The company row is locked, so two administrators deciding at once can't both succeed
     * (Phase 6 review WR-02). The owner hears the result once it's committed (M9, Phase 6B).
     */
    public function update(DecisionRequest $request, Employer $employer): AdminCompanyResource
    {
        $approve = $request->validated('decision') === 'approve';

        $employer = DB::transaction(function () use ($request, $employer, $approve) {
            $locked = Employer::whereKey($employer->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isCompany() || $locked->verification_status !== VerificationStatus::Pending) {
                throw ValidationException::withMessages(['decision' => 'This company is not waiting for review.']);
            }

            $locked->forceFill([
                'verification_status' => $approve ? VerificationStatus::Verified : VerificationStatus::Rejected,
                'verified_at' => $approve ? now() : null,
                'verification_rejection_reason' => $approve ? null : $request->validated('reason'),
            ])->save();

            DB::afterCommit(function () use ($locked) {
                $owner = $locked->owner?->user;
                if ($owner?->is_active) {
                    $owner->notify(new VerificationDecided($locked));
                }
            });

            return $locked;
        });

        return new AdminCompanyResource($employer->load('owner.user'));
    }
}
