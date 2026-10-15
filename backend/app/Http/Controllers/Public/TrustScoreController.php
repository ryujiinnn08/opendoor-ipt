<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Employer;
use App\Services\TrustScore;
use Illuminate\Http\JsonResponse;

/**
 * An employer's accommodation trust score and breakdown for anyone (F7.4, F7.5), on the same
 * employers as the public employer page. Totals only.
 */
class TrustScoreController extends Controller
{
    public function show(int $id, TrustScore $trustScore): JsonResponse
    {
        $employer = Employer::whereHas('jobPostings', fn ($query) => $query->whereNotNull('approved_at'))->findOrFail($id);

        return response()->json(['data' => [
            'employer' => ['id' => $employer->id, 'name' => $employer->name],
            ...$trustScore->summary($employer),
        ]]);
    }
}
