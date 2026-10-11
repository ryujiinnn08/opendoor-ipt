<?php

namespace App\Http\Controllers\Candidate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Candidate\NeedsRequest;
use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The logged-in job seeker's accommodation needs (F2.2).
 */
class NeedsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return $this->needsOf($request->user());
    }

    public function update(NeedsRequest $request): JsonResponse
    {
        $request->user()->needs()->sync($request->ids());

        return $this->needsOf($request->user());
    }

    private function needsOf(User $user): JsonResponse
    {
        $needs = Accommodation::inDisplayOrder($user->needs()->get());

        return response()->json([
            'data' => $needs->map(fn (Accommodation $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'group_name' => $item->group_name,
                'is_active' => $item->is_active,
            ]),
        ]);
    }
}
