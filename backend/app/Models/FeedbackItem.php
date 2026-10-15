<?php

namespace App\Models;

use App\Enums\FeedbackRating;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One accommodation's rating within a feedback.
 */
class FeedbackItem extends Model
{
    protected $fillable = ['accommodation_id', 'rating'];

    protected function casts(): array
    {
        return [
            'rating' => FeedbackRating::class,
        ];
    }

    public function feedback(): BelongsTo
    {
        return $this->belongsTo(Feedback::class);
    }

    public function accommodation(): BelongsTo
    {
        return $this->belongsTo(Accommodation::class);
    }
}
