<?php

namespace App\Http\Controllers\Candidate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Candidate\ProfileRequest;
use App\Http\Resources\CandidateProfileResource;
use App\Models\CandidateProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * The logged-in job seeker's own profile. Every route reads only their rows, so there is
 * nothing to authorize between people until Phase 4 (employers reading applicants).
 */
class ProfileController extends Controller
{
    public function show(Request $request): CandidateProfileResource
    {
        return new CandidateProfileResource($request->user());
    }

    public function update(ProfileRequest $request): CandidateProfileResource
    {
        $user = $request->user();
        $data = $request->validated();
        $fields = (new CandidateProfile)->getFillable();

        DB::transaction(function () use ($user, $data, $fields) {
            $user->update(['name' => $data['name']]);

            // A PUT is the whole profile: fields left out are cleared.
            $user->candidateProfile()->updateOrCreate([], [
                ...array_fill_keys($fields, null),
                'show_disability' => false,
                'show_photo_to_employers' => false,
                ...Arr::only($data, $fields),
            ]);

            $user->experiences()->delete();
            foreach (array_values($data['experiences'] ?? []) as $position => $entry) {
                $current = (bool) ($entry['is_current'] ?? false);
                $user->experiences()->create([
                    ...Arr::only($entry, ['job_title', 'company', 'started_on', 'description']),
                    'position' => $position,
                    'is_current' => $current,
                    'ended_on' => $current ? null : ($entry['ended_on'] ?? null),
                ]);
            }

            $user->educations()->delete();
            foreach (array_values($data['educations'] ?? []) as $position => $entry) {
                $studying = (bool) ($entry['is_studying'] ?? false);
                $user->educations()->create([
                    ...Arr::only($entry, ['level', 'school', 'course']),
                    'position' => $position,
                    'is_studying' => $studying,
                    'year_finished' => $studying ? null : ($entry['year_finished'] ?? null),
                ]);
            }
        });

        return new CandidateProfileResource($user->fresh());
    }
}
