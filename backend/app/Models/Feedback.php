<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A hired job seeker's ratings of the accommodations they were promised (M7). Written only by
 * FeedbackService; never shown to the employer, only counted in its trust score.
 */
class Feedback extends Model
{
    protected $table = 'feedback';

    /** The application and is_hidden are set by FeedbackService and admins, never from input. */
    protected $fillable = ['comment'];

    protected $attributes = [
        'is_hidden' => false,
    ];

    protected function casts(): array
    {
        return [
            'is_hidden' => 'boolean',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(FeedbackItem::class);
    }
}
