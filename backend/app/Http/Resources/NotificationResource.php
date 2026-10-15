<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;

/**
 * One notification for its owner (plan PHASE_6 §4.4). `details` is what was recorded: the names
 * and ids the page needs for its sentence and link; never needs or notes.
 *
 * @mixin DatabaseNotification
 */
class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = $this->data;

        return [
            'id' => $this->id,
            'type' => $data['type'] ?? 'other',
            // Not named `data`: Laravel leaves a resource with a `data` key unwrapped.
            'details' => collect($data)->except('type')->all(),
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
