<?php

namespace App\Models;

use App\Enums\AccommodationGroup;
use App\Enums\EmploymentType;
use App\Enums\InterviewFormat;
use App\Enums\PostingStatus;
use App\Enums\WorkSetup;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class JobPosting extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The status, employer, department, author and approval dates are set by
     * JobPostingWorkflow, never from request input.
     */
    protected $fillable = [
        'title',
        'description',
        'location',
        'employment_type',
        'work_setup',
        'interview_format',
        'closes_on',
        'category_id',
    ];

    protected $attributes = [
        'status' => 'draft',
    ];

    protected function casts(): array
    {
        return [
            'status' => PostingStatus::class,
            'employment_type' => EmploymentType::class,
            'work_setup' => WorkSetup::class,
            'interview_format' => InterviewFormat::class,
            'closes_on' => 'date',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function accommodations(): BelongsToMany
    {
        return $this->belongsToMany(Accommodation::class, 'job_posting_accommodation')->withPivot('note');
    }

    /**
     * The accommodations by group order, then group, then name, as every page lists them.
     *
     * @return Collection<int, Accommodation>
     */
    public function accommodationsInDisplayOrder(): Collection
    {
        return $this->accommodations
            ->sortBy(fn (Accommodation $item) => sprintf('%02d %s %s', AccommodationGroup::sortOrder($item->group_name), $item->group_name, $item->name))
            ->values();
    }

    /**
     * Today's date in Philippine time (Y-m-d); closing dates are whole days there.
     */
    public static function today(): string
    {
        return now(config('opendoor.postings.timezone'))->toDateString();
    }

    /**
     * An open posting whose closing date has passed. It is shown and filtered as Closed,
     * so no scheduled job is needed (plan D7).
     */
    public function isExpired(): bool
    {
        return $this->status === PostingStatus::Open
            && $this->closes_on !== null
            && $this->closes_on->toDateString() < static::today();
    }

    /**
     * The status people see.
     */
    public function displayStatus(): PostingStatus
    {
        return $this->isExpired() ? PostingStatus::Closed : $this->status;
    }

    /**
     * Postings shown with the given status: an open posting past its closing date counts as Closed.
     */
    public function scopeInDisplayStatus(Builder $query, PostingStatus $status): void
    {
        $today = static::today();

        match ($status) {
            PostingStatus::Open => $query
                ->where('status', PostingStatus::Open)
                ->where(fn (Builder $query) => $query->whereNull('closes_on')->orWhere('closes_on', '>=', $today)),
            PostingStatus::Closed => $query->where(fn (Builder $query) => $query
                ->where('status', PostingStatus::Closed)
                ->orWhere(fn (Builder $query) => $query->where('status', PostingStatus::Open)->where('closes_on', '<', $today))),
            default => $query->where('status', $status),
        };
    }

    /**
     * Postings this employer member may see: the whole employer for owners, only their own
     * department for HR officers (decision 3c). People without a membership see none.
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $member = $user->membership;

        if ($member === null) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where('employer_id', $member->employer_id);

        if (! $member->isOwner()) {
            $query->where('department_id', $member->department_id);
        }
    }

    /**
     * Postings anyone may see: open and not past their closing date in Philippine time.
     * Open implies approved; soft-deleted postings are already excluded.
     */
    public function scopePubliclyVisible(Builder $query): void
    {
        $query->inDisplayStatus(PostingStatus::Open);
    }

    /**
     * A "contains" search: every word must appear in the title, description, location or
     * employer name. %, _ and ! are plain characters (escaped with ! so SQLite and MariaDB agree).
     */
    public function scopeSearch(Builder $query, ?string $terms): void
    {
        $words = array_slice(preg_split('/\s+/u', trim((string) $terms), -1, PREG_SPLIT_NO_EMPTY), 0, 8);

        foreach ($words as $word) {
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $word).'%';

            $query->where(fn (Builder $query) => $query
                ->whereRaw("job_postings.title LIKE ? ESCAPE '!'", [$pattern])
                ->orWhereRaw("job_postings.description LIKE ? ESCAPE '!'", [$pattern])
                ->orWhereRaw("job_postings.location LIKE ? ESCAPE '!'", [$pattern])
                ->orWhereHas('employer', fn (Builder $query) => $query->whereRaw("employers.name LIKE ? ESCAPE '!'", [$pattern])));
        }
    }

    /**
     * Postings that provide every one of these accommodations. whereHas with a count, not HAVING,
     * so SQLite and MariaDB agree.
     *
     * @param  list<int>  $accommodationIds
     */
    public function scopeProvidingAll(Builder $query, array $accommodationIds): void
    {
        if ($accommodationIds === []) {
            return;
        }

        $query->whereHas(
            'accommodations',
            fn (Builder $query) => $query->whereIn('accommodations.id', $accommodationIds),
            '>=',
            count($accommodationIds),
        );
    }
}
