<?php

namespace App\Models;

use App\Enums\AccountEventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of an account's history (Phase 6A). Written once, never edited.
 */
class AccountEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'type',
        'reason',
        'actor_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => AccountEventType::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The administrator who acted, if any. */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
