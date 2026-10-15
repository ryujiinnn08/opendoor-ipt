<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * The logged-in person's own notifications (plan PHASE_6 §4.4, F9.1, F9.2). Every query starts
 * from the user, so another person's notification answers 404.
 */
class NotificationController extends Controller
{
    public const PER_PAGE = 20;

    /** Notifications are kept this long (§4.4). */
    public const KEEP_DAYS = 90;

    /**
     * Newest first, 20 a page.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['page' => ['nullable', 'integer', 'min:1']]);

        return NotificationResource::collection(
            $this->kept($request)->latest()->latest('id')->paginate(self::PER_PAGE),
        );
    }

    /**
     * The number in "Notifications (3)"; the header asks on every page change (Q8).
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['data' => ['count' => $this->kept($request)->whereNull('read_at')->count()]]);
    }

    /**
     * Opening a notification marks it read.
     */
    public function read(Request $request, string $id): NotificationResource
    {
        $notification = $this->kept($request)->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        return new NotificationResource($notification);
    }

    public function readAll(Request $request): Response
    {
        $this->kept($request)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->noContent();
    }

    /**
     * This person's notifications from the last 90 days; older ones are pruned daily.
     */
    private function kept(Request $request): MorphMany
    {
        return $request->user()->notifications()->reorder()->where('created_at', '>=', now()->subDays(self::KEEP_DAYS));
    }
}
