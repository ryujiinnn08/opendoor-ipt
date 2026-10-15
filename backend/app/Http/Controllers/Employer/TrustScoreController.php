<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Services\TrustScore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The employer's own trust score (F8.2) for every member: the owner, HR officers and individual
 * employers. The same totals anyone sees; never an individual response.
 */
class TrustScoreController extends Controller
{
    public function show(Request $request, TrustScore $trustScore): JsonResponse
    {
        $employer = $request->user()->membership->employer;

        return response()->json(['data' => [
            'employer' => ['id' => $employer->id, 'name' => $employer->name],
            ...$trustScore->summary($employer),
        ]]);
    }
}
