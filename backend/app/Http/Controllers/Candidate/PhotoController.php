<?php

namespace App\Http\Controllers\Candidate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Candidate\PhotoRequest;
use App\Http\Resources\CandidateProfileResource;
use App\Models\Application;
use App\Models\CandidateProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The job seeker's profile photo (UI_FEEDBACK_WAVE_B_PLAN B1), kept on the private "local" disk
 * like the résumé. The job seeker always sees it; an employer only for their own applicant, and
 * only when the job seeker turned "Show my photo to employers" on.
 */
class PhotoController extends Controller
{
    public function store(PhotoRequest $request): CandidateProfileResource
    {
        $user = $request->user();
        $profile = $user->candidateProfile()->firstOrCreate();
        $path = $request->file('photo')->store('photos', 'local');
        if ($path === false) {
            abort(response()->json(['message' => "We couldn't save your photo. Please try again."], 500));
        }

        // The old file is deleted only once the new one is saved.
        $oldPath = $profile->photo_path;
        $profile->forceFill(['photo_path' => $path])->save();
        $this->deleteFile($oldPath);

        return new CandidateProfileResource($user->fresh());
    }

    public function show(Request $request): StreamedResponse
    {
        return $this->serve($request->user()->candidateProfile, "You haven't added a photo.");
    }

    public function destroy(Request $request): CandidateProfileResource
    {
        $user = $request->user();
        $profile = $user->candidateProfile;
        if ($profile) {
            $this->deleteFile($profile->photo_path);
            $profile->forceFill(['photo_path' => null])->save();
        }

        return new CandidateProfileResource($user->fresh());
    }

    /** An applicant's photo for the employer of that application, when the applicant shares it. */
    public function forApplication(Application $application): StreamedResponse
    {
        Gate::authorize('viewResume', $application);
        $profile = $application->candidate->candidateProfile;

        return $this->serve($profile?->show_photo_to_employers ? $profile : null, "This applicant hasn't shared a photo.");
    }

    /** A job seeker's photo for administrators, whether or not employers see it (ADMIN_USERS_PLAN U1). */
    public function forAdmin(User $user): StreamedResponse
    {
        return $this->serve($user->candidateProfile, "This job seeker hasn't added a photo.");
    }

    private function serve(?CandidateProfile $profile, string $missing): StreamedResponse
    {
        $disk = Storage::disk('local');
        if (! $profile?->photo_path || ! $disk->exists($profile->photo_path)) {
            abort(response()->json(['message' => $missing], 404));
        }

        return $disk->response($profile->photo_path, null, [
            'Content-Type' => $disk->mimeType($profile->photo_path) ?: 'image/jpeg',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => 'sandbox',
        ], 'inline');
    }

    private function deleteFile(?string $path): void
    {
        if ($path) {
            Storage::disk('local')->delete($path);
        }
    }
}
