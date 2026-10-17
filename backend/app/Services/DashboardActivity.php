<?php

namespace App\Services;

use App\Enums\ApplicationStatus;
use App\Enums\EmployerType;
use App\Enums\PostingStatus;
use App\Enums\Role;
use App\Enums\VerificationStatus;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPosting;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Weekly activity for the dashboard charts (UI_FEEDBACK_WAVE_B_PLAN B3). Weeks start on Monday in
 * Philippine time, the oldest first, and a week with nothing in it counts 0, so a chart never
 * skips one. Counting happens here rather than in SQL, so MySQL and SQLite agree on the weeks.
 */
class DashboardActivity
{
    public const WEEKS = 8;

    /** The weeks the employer chart may show, and the statuses its filters may pick. */
    public const EMPLOYER_WEEKS = [4, 8, 12];

    public const CHARTED_STATUSES = [ApplicationStatus::Pending, ApplicationStatus::Reviewed, ApplicationStatus::Hired, ApplicationStatus::Rejected];

    /**
     * The employer charts, narrowed by the dashboard's filters: how many weeks back, one job, and
     * the applications' current statuses (an empty list means every status).
     *
     * @param  list<ApplicationStatus>  $statuses
     * @return array<string, mixed>
     */
    public function forEmployer(User $user, int $weekCount = self::WEEKS, ?int $jobId = null, array $statuses = []): array
    {
        $weeks = $this->weeks($weekCount);
        $postings = $jobId !== null ? collect([$jobId]) : JobPosting::withTrashed()->visibleTo($user)->pluck('id');
        $applied = Application::whereIn('job_posting_id', $postings)
            ->when($statuses, fn ($query) => $query->whereIn('status', $statuses))
            ->where('created_at', '>=', $this->start($weeks))
            ->pluck('created_at');

        $shown = $statuses ?: self::CHARTED_STATUSES;
        $open = JobPosting::visibleTo($user)
            ->inDisplayStatus(PostingStatus::Open)
            ->when($jobId !== null, fn ($query) => $query->whereKey($jobId))
            ->withCount($this->statusCounts())
            ->get()
            ->map(fn (JobPosting $posting) => [
                'id' => $posting->id,
                'title' => $posting->title,
                'counts' => collect(ApplicationStatus::cases())
                    ->mapWithKeys(fn (ApplicationStatus $status) => [
                        $status->value => in_array($status, $shown, true) ? (int) $posting->{$status->value.'_count'} : 0,
                    ])
                    ->all(),
            ])
            // Most applicants first (counting only the statuses shown), then by title.
            ->sort(fn (array $a, array $b) => [array_sum($b['counts']), $a['title']] <=> [array_sum($a['counts']), $b['title']])
            ->take(6)
            ->values();

        return [
            'weeks' => $this->labels($weeks),
            'applications_by_week' => $this->bucket($applied, $weeks),
            'applicants_by_posting' => $open->all(),
            // The choices for the Job filter: the postings this person may see that ever took
            // applications (open or closed), open ones flagged.
            'jobs' => JobPosting::visibleTo($user)
                ->whereIn('status', [PostingStatus::Open, PostingStatus::Closed])
                ->orderBy('title')
                ->get()
                ->map(fn (JobPosting $posting) => [
                    'id' => $posting->id,
                    'title' => $posting->title,
                    'open' => $posting->displayStatus() === PostingStatus::Open,
                ])
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    public function forAdmin(): array
    {
        $weeks = $this->weeks();
        $since = $this->start($weeks);
        $accounts = User::where('created_at', '>=', $since)->whereIn('role', [Role::Candidate, Role::Employer])->get(['role', 'created_at']);
        $verification = Employer::where('type', EmployerType::Company)
            ->selectRaw('verification_status, count(*) as total')
            ->groupBy('verification_status')
            ->pluck('total', 'verification_status');

        return [
            'weeks' => $this->labels($weeks),
            'job_seekers_by_week' => $this->bucket($accounts->where('role', Role::Candidate)->pluck('created_at'), $weeks),
            'employers_by_week' => $this->bucket($accounts->where('role', Role::Employer)->pluck('created_at'), $weeks),
            'postings_approved_by_week' => $this->bucket(JobPosting::withTrashed()->where('approved_at', '>=', $since)->pluck('approved_at'), $weeks),
            'applications_by_week' => $this->bucket(Application::where('created_at', '>=', $since)->pluck('created_at'), $weeks),
            // Hire dates are whole days, already in Philippine time.
            'hires_by_week' => $this->bucket(
                Application::where('status', ApplicationStatus::Hired)->where('hired_at', '>=', $since->toDateString())->pluck('hired_at')
                    ->map(fn ($day) => Carbon::parse($day->toDateString(), $this->zone())),
                $weeks,
            ),
            'verification' => [
                'waiting' => (int) ($verification[VerificationStatus::Pending->value] ?? 0),
                'verified' => (int) ($verification[VerificationStatus::Verified->value] ?? 0),
                'not_approved' => (int) ($verification[VerificationStatus::Rejected->value] ?? 0),
            ],
        ];
    }

    /** @return list<string> */
    private function statusCounts(): array
    {
        return collect(ApplicationStatus::cases())
            ->mapWithKeys(fn (ApplicationStatus $status) => ["applications as {$status->value}_count" => fn ($query) => $query->where('status', $status)])
            ->all();
    }

    private function zone(): string
    {
        return config('opendoor.postings.timezone');
    }

    /** @return list<Carbon> Monday 00:00 in Manila of each week, the oldest first. */
    private function weeks(int $count = self::WEEKS): array
    {
        $current = now($this->zone())->startOfWeek(Carbon::MONDAY);

        return array_map(fn (int $back) => $current->copy()->subWeeks($back), range($count - 1, 0));
    }

    /** @param list<Carbon> $weeks */
    private function start(array $weeks): Carbon
    {
        return $weeks[0]->copy()->utc();
    }

    /**
     * @param  list<Carbon>  $weeks
     * @return list<string>
     */
    private function labels(array $weeks): array
    {
        return array_map(fn (Carbon $week) => $week->toDateString(), $weeks);
    }

    /**
     * @param  Collection<int, mixed>  $moments
     * @param  list<Carbon>  $weeks
     * @return list<int>
     */
    private function bucket(Collection $moments, array $weeks): array
    {
        $counts = array_fill(0, count($weeks), 0);
        foreach ($moments as $moment) {
            $local = Carbon::parse($moment)->timezone($this->zone());
            for ($i = count($weeks) - 1; $i >= 0; $i--) {
                if ($local->greaterThanOrEqualTo($weeks[$i])) {
                    $counts[$i]++;
                    break;
                }
            }
        }

        return $counts;
    }
}
