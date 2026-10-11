<?php

namespace App\Http\Controllers\Candidate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Candidate\ResumeRequest;
use App\Http\Resources\CandidateProfileResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The job seeker's uploaded PDF résumé, kept on the private "local" disk under a random
 * name. Only its owner can open it (Phase 4: employers with an application).
 */
class ResumeController extends Controller
{
    public function store(ResumeRequest $request): CandidateProfileResource
    {
        $user = $request->user();
        $file = $request->file('resume');
        $profile = $user->candidateProfile()->firstOrCreate();

        $path = $file->store('resumes', 'local');
        $this->deleteFile($profile->resume_path);
        $profile->forceFill([
            'resume_path' => $path,
            'resume_name' => Str::limit(basename($file->getClientOriginalName()), 255, ''),
            'resume_uploaded_at' => now(),
        ])->save();

        return new CandidateProfileResource($user->fresh());
    }

    public function show(Request $request): StreamedResponse
    {
        $profile = $request->user()->candidateProfile;
        $disk = Storage::disk('local');

        if (! $profile?->resume_path || ! $disk->exists($profile->resume_path)) {
            abort(response()->json(['message' => "You haven't uploaded a résumé."], 404));
        }

        return $disk->response($profile->resume_path, $profile->resume_name, [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function destroy(Request $request): CandidateProfileResource
    {
        $user = $request->user();
        $profile = $user->candidateProfile;

        if ($profile) {
            $this->deleteFile($profile->resume_path);
            $profile->forceFill(['resume_path' => null, 'resume_name' => null, 'resume_uploaded_at' => null])->save();
        }

        return new CandidateProfileResource($user->fresh());
    }

    private function deleteFile(?string $path): void
    {
        if ($path) {
            Storage::disk('local')->delete($path);
        }
    }
}
