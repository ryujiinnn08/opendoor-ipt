<?php

namespace App\Models;

use App\Enums\FeedbackEventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of a feedback's moderation history (Phase 6B). Written once, never edited.
 */
class FeedbackEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['type', 'reason', 'actor_id'];

    protected function casts(): array
    {
        return [
            'type' => FeedbackEventType::class,
        ];
    }

    public function feedback(): BelongsTo
    {
        return $this->belongsTo(Feedback::class);
    }

    /** The administrator who acted. */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
