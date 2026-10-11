<?php

namespace App\Models;

use App\Enums\AccommodationGroup;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class Accommodation extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'group_name', 'description', 'is_active'];

    /**
     * Mirror the database default so new models report it before being reloaded.
     */
    protected $attributes = [
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * Accommodations by group order, then group, then name, as every page lists them.
     *
     * @param  Collection<int, self>  $items
     * @return Collection<int, self>
     */
    public static function inDisplayOrder(Collection $items): Collection
    {
        return $items
            ->sortBy(fn (self $item) => sprintf('%02d %s %s', AccommodationGroup::sortOrder($item->group_name), $item->group_name, $item->name))
            ->values();
    }
}
