<?php

namespace App\Models;

use App\Enums\ApplicationActor;
use App\Enums\ApplicationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Application extends Model
{
    use HasFactory;

    /** The filters on My applications (plan PHASE_4 §4.2). */
    public const FILTERS = ['all', 'waiting', 'hired', 'closed'];

    /**
     * The job, job seeker, status and dates are set by ApplicationWorkflow, never from input.
     */
    protected $fillable = [
        'cover_note',
        'interview_request',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'hire_confirmed_by' => ApplicationActor::class,
            'reviewed_at' => 'datetime',
            'rejected_at' => 'datetime',
            'withdrawn_at' => 'datetime',
            'hired_at' => 'date',
        ];
    }

    /**
     * The job, even after the employer deleted it, so the application keeps its title.
     */
    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class)->withTrashed();
    }

    /**
     * The job seeker who applied.
     */
    public function candidate(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The job's accommodations as they were advertised at the moment of hire.
     */
    public function hiredAccommodations(): BelongsToMany
    {
        return $this->belongsToMany(Accommodation::class, 'application_accommodation')->withPivot('note');
    }

    /**
     * How many of this job seeker's applications each filter shows, in one query.
     *
     * @return array{all: int, waiting: int, hired: int, closed: int}
     */
    public static function countsFor(User $seeker): array
    {
        $in = fn (array $statuses) => "'".implode("','", array_map(fn (ApplicationStatus $status) => $status->value, $statuses))."'";
        $row = static::query()->where('user_id', $seeker->id)->selectRaw(
            'COUNT(*) AS all_count,'
            .' SUM(CASE WHEN status IN ('.$in(ApplicationStatus::waiting()).') THEN 1 ELSE 0 END) AS waiting_count,'
            .' SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS hired_count,'
            .' SUM(CASE WHEN status IN ('.$in(ApplicationStatus::closed()).') THEN 1 ELSE 0 END) AS closed_count',
            [ApplicationStatus::Hired->value],
        )->toBase()->first();

        return [
            'all' => (int) $row->all_count,
            'waiting' => (int) $row->waiting_count,
            'hired' => (int) $row->hired_count,
            'closed' => (int) $row->closed_count,
        ];
    }

    /**
     * all, waiting (Pending or Reviewed), hired, or closed (Rejected or Withdrawn).
     */
    public function scopeInFilter(Builder $query, string $filter): void
    {
        match ($filter) {
            'waiting' => $query->whereIn('status', ApplicationStatus::waiting()),
            'hired' => $query->where('status', ApplicationStatus::Hired),
            'closed' => $query->whereIn('status', ApplicationStatus::closed()),
            default => null,
        };
    }
}
