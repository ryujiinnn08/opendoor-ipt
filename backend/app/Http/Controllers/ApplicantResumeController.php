<?php

namespace App\Http\Controllers;

use App\Models\Application;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * An applicant's uploaded PDF résumé, for their job's employer only (plan PHASE_4 §8). Served
 * sandboxed, so a PDF can never run scripts as OpenDoor.
 */
class ApplicantResumeController extends Controller
{
    public function show(Application $application): StreamedResponse
    {
        Gate::authorize('viewResume', $application);

        $profile = $application->candidate->candidateProfile;
        $disk = Storage::disk('local');
        if (! $profile?->resume_path || ! $disk->exists($profile->resume_path)) {
            abort(response()->json(['message' => "This applicant hasn't uploaded a résumé."], 404));
        }

        return $disk->response($profile->resume_path, $profile->resume_name, [
            'Content-Type' => 'application/pdf',
            'Content-Security-Policy' => 'sandbox',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ], 'inline');
    }
}
