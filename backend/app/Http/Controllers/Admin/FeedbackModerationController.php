<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminFeedbackResource;
use App\Models\Feedback;
use App\Services\FeedbackModeration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Feedback moderation (plan PHASE_6 §4.5, F10.5): read comments, hide or show feedback, and ask
 * who wrote one on purpose (Q9).
 */
class FeedbackModerationController extends Controller
{
    public const PER_PAGE = 20;

    /**
     * Newest first, 20 a page. `filter`: `comments` (default) | `all` | `hidden`.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filter = $request->validate([
            'filter' => ['nullable', Rule::in(['comments', 'all', 'hidden'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ])['filter'] ?? 'comments';

        $feedback = Feedback::with(AdminFeedbackResource::RELATIONS)
            ->when($filter === 'comments', fn ($query) => $query->whereNotNull('comment')->where('comment', '!=', ''))
            ->when($filter === 'hidden', fn ($query) => $query->where('is_hidden', true))
            ->latest()
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return AdminFeedbackResource::collection($feedback);
    }

    /**
     * "Show who wrote this": the name and email, recorded in the feedback's history.
     */
    public function author(Request $request, Feedback $feedback, FeedbackModeration $moderation): JsonResponse
    {
        $author = $moderation->author($feedback, $request->user());

        return response()->json(['data' => ['name' => $author->name, 'email' => $author->email]]);
    }

    /**
     * `{ hidden: true, reason }` takes it out of the trust score; `{ hidden: false }` puts it back.
     */
    public function hide(Request $request, Feedback $feedback, FeedbackModeration $moderation): AdminFeedbackResource
    {
        $request->merge(['reason' => is_string($request->reason) ? trim($request->reason) : $request->reason]);
        $validated = $request->validate([
            'hidden' => ['required', 'boolean'],
            'reason' => ['nullable', 'required_if_accepted:hidden', 'string', 'min:5', 'max:500'],
        ], [
            'hidden.required' => 'Choose hide or show.',
            'hidden.boolean' => 'Choose hide or show.',
            'reason.required_if_accepted' => 'Say why you are hiding this feedback.',
            'reason.min' => 'Use at least 5 characters.',
            'reason.max' => 'Use 500 characters or fewer.',
        ]);

        $feedback = $request->boolean('hidden')
            ? $moderation->hide($feedback, $request->user(), $validated['reason'])
            : $moderation->show($feedback, $request->user());

        return new AdminFeedbackResource($feedback->load(AdminFeedbackResource::RELATIONS));
    }
}
