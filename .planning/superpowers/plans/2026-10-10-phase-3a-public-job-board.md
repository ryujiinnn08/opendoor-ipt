# Phase 3A: Public Job Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anyone can browse open jobs (keyword search, category and accommodation filters, sort, 12 per page, filters kept in the address, the result count read out), open a job's page and its employer's page, and start a search from Home. The demo data grows to two pages of open jobs, designed for Phase 3B's matching demo.

**Architecture:** Laravel gets a public, rate-limited read API. Three `JobPosting` scopes (`publiclyVisible`, `search`, `providingAll`) are composed by a `JobSearch` service, fed by a `JobSearchRequest`, and returned through slim public resources for postings and employers. React gets `api/jobs.js`, a URL-state hook (`useJobSearchParams`) with a debounce hook, four building blocks (`JobCard`, `AccommodationFilterPanel`, `Pagination`, `EmptyState`), three public pages and a Home search. The pages take base paths, so Phase 3B can mount the same pages inside the candidate portal.

**Tech Stack:** Laravel 12 on a PHP 8.2 platform, Sanctum SPA cookies, MySQL 8 / XAMPP MariaDB 10.4 (SQLite in tests); React 19, React Router 7, Tailwind CSS 4, Vitest + Testing Library + vitest-axe, oxlint.

**Spec:** `.planning/PHASE_3_PLAN.md` (approved 2026-10-10): §2 (3A), §4.2, §5 (J1–J6), §6.3–§6.5 (3A rows), §7, §8 (3A rows), §9 steps 1–2, Appendix A (3A rows) and C. Source papers (local only, not in git): `.planning/papers/MODULES_AND_FEATURES.md`, M5 and F3.5.

**Base commit:** `930fbc3`.

## Global Constraints

- PHP must run on 8.2: no typed class constants, no `#[\Override]`, no `json_validate()`.
- Migrations: required date columns use `dateTime()`, not `timestamp()` (README, MariaDB 10.4).
- Open job = status Open, closing date today or later in Philippine time (`JobPosting::today()`), not deleted. "Only open, approved postings appear in search and matching" (M4 rule); Open already implies approved.
- 12 jobs per page (F5.6). 3A sorts: **Newest** (most recently approved first) and **Closing soon**. Best match comes in 3B.
- Search: "Title, description, company name and location, as a 'contains' search"; "100 characters and 8 words at most"; each word must match somewhere in the same posting.
- "Typing in search updates the list after a 300 ms pause (or at once on Enter); filters update at once; the new count is read out, such as '12 jobs found'."
- Filters: keyword, category (one), accommodations ("the job must provide every one ticked").
- The public posting shape leaves out the author, rejection reason, approval and submission dates, verification details and `actions`.
- Employer page: "Company details, Verified badge and open jobs; never the registration number, team members or email addresses. Only for employers with at least one approved posting" (not counting deleted ones).
- Public job routes: "120 requests a minute per IP address".
- Copy, from spec §7: count "15 jobs", "1 job", "No jobs", read out as "15 jobs found"; no results "No jobs match these filters. Try fewer filters or different words." with **Clear all filters**; job not open "This job isn't open. It may have closed or been removed." with **Browse open jobs**; guest line "Have accommodation needs? Register as a job seeker to see how well each job fits you."
- Accessibility: every icon has text beside it; 44 px targets (`min-h-11`); keyboard only works; no sideways scrolling at 360 px; focus moves to the results heading after a page change; filter changes keep focus; announcements through `useAnnounce()`.
- Design (Phase 2 §4.10 and spec §7): approved tokens only; amber (`accent`) only for accommodations a job provides; Atkinson Hyperlegible; ruled rows, not cards; no all-caps labels, gradients, decorative shadows or dot-separated detail lines; no new motion.
- Seeders never change existing data.
- Two commits for 3A on `main`: backend (end of Task 3) and frontend (end of Task 9), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Philippine midnight.** Between 00:00 and 08:00 Manila time the UTC date is a day behind. A posting that closed yesterday in Manila must already be hidden. Test: Task 1 `test_a_posting_that_closed_yesterday_in_manila_is_hidden_before_8_am`.
2. **Wildcards in search.** `%`, `_` and `!` typed by a person are ordinary characters, and the escaping must work on both SQLite (tests) and MariaDB (XAMPP), so use `LIKE ? ESCAPE '!'`, not backslashes (SQLite has no default escape character). Test: Task 1 `test_search_treats_wildcards_as_plain_characters`.
3. **Hand-edited addresses.** `?category=999999`, `accommodations[]=abc`, `sort=price`, `per_page=50` and `page=0` are refused with 422 by the API; on the page, unknown values in the address fall back to defaults instead of breaking. Tests: Task 1 `test_crafted_parameters_are_refused`, Task 4 `ignores values it does not understand`.
4. **Fast changes and Back.** A slow earlier response must not replace a newer one, and Back must restore both the list and the search box. Tests: Task 6 `shows the latest results when an earlier request finishes last` and `restores the previous search with Back`.
5. **Unpublished postings and private employers at public addresses.** Drafts and postings that are waiting, rejected, closed, expired or deleted answer 404. So does an employer whose only approved posting was deleted. Tests: Task 1 `test_job_details_show_open_postings_and_hide_the_rest`, Task 2 `test_employers_without_an_approved_posting_are_not_found`.

## File map

**Backend (`backend/`)**

| File | Responsibility |
|---|---|
| `app/Models/JobPosting.php` | Scopes `publiclyVisible`, `search`, `providingAll`; `accommodationsInDisplayOrder()` |
| `app/Models/Employer.php` | `jobPostings()` relation |
| `app/Services/JobSearch.php` | Builds the public list query from filters (3B adds matching here) |
| `app/Http/Requests/Public/JobSearchRequest.php` | Validates query parameters; `filters()` |
| `app/Http/Resources/PublicJobPostingResource.php`, `PublicEmployerResource.php` | Public JSON shapes |
| `app/Http/Resources/JobPostingResource.php` | Uses `accommodationsInDisplayOrder()` (no behavior change) |
| `app/Http/Controllers/Public/JobPostingController.php`, `EmployerController.php` | Public endpoints |
| `routes/api.php` | Public routes under `throttle:120,1` |
| `database/migrations/2026_10_10_100000_add_public_list_index_to_job_postings_table.php` | Index on status and closing date |
| `database/seeders/UserSeeder.php`, `DemoEmployerSeeder.php`, `DemoJobPostingSeeder.php` | Demo owners, companies and postings |
| `tests/Feature/Jobs/PublicJobSearchTest.php`, `PublicEmployerTest.php`; `tests/Feature/MasterData/SeederTest.php` | Tests |

**Frontend (`frontend/src/`)**

| File | Responsibility |
|---|---|
| `api/jobs.js` | `searchJobs`, `getJob`, `getEmployer` |
| `hooks/useDebouncedValue.js`, `hooks/useJobSearchParams.js` | 300 ms debounce; filters kept in the address |
| `lib/jobText.js`, `lib/pageItems.js` | Count and "Provides" wording; page-number list |
| `components/jobs/JobCard.jsx`, `components/jobs/AccommodationFilterPanel.jsx` | One job as a ruled row; filter controls |
| `components/ui/Pagination.jsx`, `components/ui/EmptyState.jsx` | Page links; empty-list message |
| `components/postings/JobDetails.jsx` | Gains `employerHref`; Verified badge from `is_verified` |
| `portals/public/BrowseJobsPage.jsx`, `JobPage.jsx`, `EmployerPage.jsx`, `HomePage.jsx` | Pages |
| `router.jsx`, `components/layout/PublicLayout.jsx` | Routes; **Browse jobs** in the header |
| `test/publicJobFixture.js` | One job in the public shape |

---

### Task 1: Public job search API

**Files:**
- Create: `backend/app/Services/JobSearch.php`, `backend/app/Http/Requests/Public/JobSearchRequest.php`, `backend/app/Http/Resources/PublicJobPostingResource.php`, `backend/app/Http/Controllers/Public/JobPostingController.php`, `backend/database/migrations/2026_10_10_100000_add_public_list_index_to_job_postings_table.php`
- Modify: `backend/app/Models/JobPosting.php`, `backend/app/Http/Resources/JobPostingResource.php` (the accommodations sort moves to the model), `backend/routes/api.php`
- Test: `backend/tests/Feature/Jobs/PublicJobSearchTest.php`

**Interfaces:**
- Consumes: `JobPosting::scopeInDisplayStatus()`, `JobPosting::today()`, factories `open()`, `expired()`, `closed()`, `pending()`, `rejected()`, `in()`.
- Produces:
  - `JobPosting::scopePubliclyVisible(Builder $query): void`
  - `JobPosting::scopeSearch(Builder $query, ?string $terms): void`
  - `JobPosting::scopeProvidingAll(Builder $query, array $accommodationIds): void`
  - `JobPosting::accommodationsInDisplayOrder(): Collection`, sorted by group order, then group, then name, as `JobPostingResource` did
  - `JobSearchRequest::filters(): array`, returning `['q' => ?string, 'category' => ?int, 'accommodations' => list<int>, 'employer' => ?int, 'sort' => 'newest'|'closing', 'per_page' => int]` (defaults: `sort` `newest`, `per_page` 12)
  - `JobSearch::paginate(array $filters): LengthAwarePaginator`
  - `PublicJobPostingResource::RELATIONS = ['employer', 'department', 'category', 'accommodations']`
  - JSON item: `{ id, title, description, location, employment_type, work_setup, interview_format, closes_on, category: {id, name}|null, department: {name}|null, employer: {id, type, name, logo_url, is_verified}, accommodations: [{id, name, group_name, note}] }`; list responses add Laravel's `meta` (`current_page`, `last_page`, `per_page`, `total`) and `links`
  - Routes: `GET /api/job-postings`, `GET /api/job-postings/{id}` (numeric)

- [ ] **Step 1: Write the failing tests** in `PublicJobSearchTest` (`use BuildsTeams, RefreshDatabase`)

```php
public function test_lists_only_open_postings_that_have_not_closed(): void
{
    $open = JobPosting::factory()->open()->create();
    JobPosting::factory()->expired()->create();
    JobPosting::factory()->closed()->create();
    JobPosting::factory()->create(); // draft
    JobPosting::factory()->pending()->create();
    JobPosting::factory()->rejected()->create();
    JobPosting::factory()->open()->create()->delete();

    $this->getJson('/api/job-postings')->assertOk()
        ->assertJsonPath('data.*.id', [$open->id])
        ->assertJsonPath('meta.total', 1);
}

public function test_a_posting_that_closed_yesterday_in_manila_is_hidden_before_8_am(): void
{
    Carbon::setTestNow('2026-10-10 18:30:00'); // UTC; already October 11, 02:30 in Manila
    $closedYesterday = JobPosting::factory()->open()->create(['closes_on' => '2026-10-10']);
    $closesToday = JobPosting::factory()->open()->create(['closes_on' => '2026-10-11']);

    $ids = $this->getJson('/api/job-postings')->json('data.*.id');
    $this->assertSame([$closesToday->id], $ids);
    $this->getJson("/api/job-postings/{$closedYesterday->id}")->assertNotFound();
}

public function test_newest_first_by_approval_or_closing_soon(): void
{
    $older = JobPosting::factory()->open()->create(['approved_at' => now()->subDays(3), 'closes_on' => JobPosting::today()]);
    $newer = JobPosting::factory()->open()->create(['approved_at' => now()->subDay(), 'closes_on' => Carbon::parse(JobPosting::today())->addDays(9)->toDateString()]);

    $this->assertSame([$newer->id, $older->id], $this->getJson('/api/job-postings')->json('data.*.id'));
    $this->assertSame([$older->id, $newer->id], $this->getJson('/api/job-postings?sort=closing')->json('data.*.id'));
}

public function test_pages_of_twelve_with_totals(): void
{
    JobPosting::factory()->count(13)->open()->create();

    $this->getJson('/api/job-postings')->assertJsonCount(12, 'data')->assertJsonPath('meta.last_page', 2)->assertJsonPath('meta.total', 13);
    $this->getJson('/api/job-postings?page=2')->assertJsonCount(1, 'data');
    $this->getJson('/api/job-postings?page=3')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/job-postings?per_page=3')->assertJsonCount(3, 'data');
}

public function test_search_matches_each_word_in_title_description_location_or_company(): void
{
    // Factory text is random (a Faker job title can be "Web Developer"), so every field here is fixed.
    $make = fn (array $fields, string $employer = 'Neutral Employer') => JobPosting::factory()
        ->in(Employer::factory()->create(['name' => $employer.' '.fake()->unique()->numberBetween(1, 999)]))
        ->open()
        ->create(array_merge(['title' => 'Assistant', 'description' => 'Plain duties.', 'location' => 'Makati City'], $fields));
    $web = $make(['title' => 'Junior Web Developer']);
    $books = $make(['description' => 'Simple bookkeeping for a family shop.']);
    $cebu = $make(['location' => 'Cebu City']);
    $byCompany = $make([], 'Bayanihan Contact Center Inc.');

    $this->assertSame([$web->id], $this->getJson('/api/job-postings?q=WEB developer')->json('data.*.id'));
    $this->assertSame([$books->id], $this->getJson('/api/job-postings?q=bookkeep')->json('data.*.id'));
    $this->assertSame([$cebu->id], $this->getJson('/api/job-postings?q=cebu')->json('data.*.id'));
    $this->assertSame([$byCompany->id], $this->getJson('/api/job-postings?q=bayanihan')->json('data.*.id'));
    $this->assertSame([], $this->getJson('/api/job-postings?q=web cebu')->json('data.*.id'));
}

public function test_search_treats_wildcards_as_plain_characters(): void
{
    $percent = JobPosting::factory()->open()->create(['title' => '100% remote encoder']);
    JobPosting::factory()->open()->create(['title' => 'Sales Representative']);

    $this->assertSame([$percent->id], $this->getJson('/api/job-postings?q=%25')->json('data.*.id'));
    $this->assertSame([], $this->getJson('/api/job-postings?q=_')->json('data.*.id'));
    $this->assertSame([], $this->getJson('/api/job-postings?q=!')->json('data.*.id'));
}

public function test_search_limits(): void
{
    $this->getJson('/api/job-postings?q='.str_repeat('a', 101))->assertUnprocessable()->assertJsonValidationErrors('q');
    $this->getJson('/api/job-postings?q=one two three four five six seven eight nine')
        ->assertUnprocessable()
        ->assertJsonPath('errors.q.0', 'Search with 8 words or fewer.');
}

public function test_category_and_accommodation_filters(): void
{
    [$it, $health] = Category::factory()->count(2)->create();
    [$ramp, $interpreter] = Accommodation::factory()->count(2)->create();
    $both = JobPosting::factory()->open()->create(['category_id' => $it->id]);
    $both->accommodations()->attach([$ramp->id, $interpreter->id]);
    $rampOnly = JobPosting::factory()->open()->create(['category_id' => $it->id]);
    $rampOnly->accommodations()->attach($ramp->id);
    $otherCategory = JobPosting::factory()->open()->create(['category_id' => $health->id]);
    $otherCategory->accommodations()->attach([$ramp->id, $interpreter->id]);

    $this->assertSame([$both->id], $this->getJson("/api/job-postings?category={$it->id}&accommodations[]={$ramp->id}&accommodations[]={$interpreter->id}")->json('data.*.id'));
    $this->assertCount(3, $this->getJson("/api/job-postings?accommodations[]={$ramp->id}")->json('data'));
}

public function test_crafted_parameters_are_refused(): void
{
    foreach (['category=999999', 'accommodations[]=abc', 'accommodations[]=999999', 'sort=price', 'per_page=50', 'page=0', 'employer=abc'] as $query) {
        $this->getJson("/api/job-postings?{$query}")->assertUnprocessable();
    }
}

public function test_the_public_shape_leaves_out_private_fields(): void
{
    [$owner, , $department] = $this->companyWithOwner();
    $posting = JobPosting::factory()->in($department)->open()->create(['created_by' => $owner->id]);
    $posting->accommodations()->attach(Accommodation::factory()->create()->id, ['note' => 'Ramp at the side door.']);

    $item = $this->actingAs($owner, 'web')->getJson('/api/job-postings')->json('data.0');
    foreach (['actions', 'created_by', 'rejection_reason', 'submitted_at', 'approved_at', 'changed_after_approval', 'status'] as $key) {
        $this->assertArrayNotHasKey($key, $item);
    }
    $this->assertSame(['id', 'type', 'name', 'logo_url', 'is_verified'], array_keys($item['employer']));
    $this->assertSame(['id', 'name', 'group_name', 'note'], array_keys($item['accommodations'][0]));
    $this->assertSame(['name' => 'General'], $item['department']);
}

public function test_job_details_show_open_postings_and_hide_the_rest(): void
{
    $open = JobPosting::factory()->open()->create(['title' => 'Data Encoder']);
    $this->getJson("/api/job-postings/{$open->id}")->assertOk()->assertJsonPath('data.title', 'Data Encoder');

    $deleted = JobPosting::factory()->open()->create();
    $deleted->delete();
    $hidden = [
        JobPosting::factory()->create(), JobPosting::factory()->pending()->create(), JobPosting::factory()->rejected()->create(),
        JobPosting::factory()->closed()->create(), JobPosting::factory()->expired()->create(), $deleted,
    ];
    foreach ($hidden as $posting) {
        $this->getJson("/api/job-postings/{$posting->id}")->assertNotFound();
    }
}

public function test_the_public_list_is_rate_limited(): void
{
    $route = app('router')->getRoutes()->match(Request::create('/api/job-postings', 'GET'));
    $this->assertContains('throttle:120,1', $route->gatherMiddleware());
}

public function test_listing_does_not_query_per_job(): void
{
    $count = function (int $postings): int {
        JobPosting::factory()->count($postings)->open()->hasAttached(Accommodation::factory()->count(2), ['note' => null])->create();
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/job-postings')->assertOk();

        return count(DB::getQueryLog());
    };

    $this->assertSame($count(2), $count(8));
}
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `cd backend && php artisan test --filter=PublicJobSearchTest`
Expected: FAIL (404 for `/api/job-postings`).

- [ ] **Step 3: Add the migration**: `$table->index(['status', 'closes_on'])` in `up()`, `dropIndex(['status', 'closes_on'])` in `down()`.

- [ ] **Step 4: Add the scopes and `accommodationsInDisplayOrder()` to `JobPosting`**
  - `publiclyVisible`: `$query->inDisplayStatus(PostingStatus::Open)`. Soft-deleted rows are already excluded.
  - `search`: split `trim($terms)` on whitespace (`preg_split('/\s+/u', …, -1, PREG_SPLIT_NO_EMPTY)`), take at most 8 words, and for each word add one grouped `where` that matches `job_postings.title`, `job_postings.description` or `job_postings.location` with `whereRaw("… LIKE ? ESCAPE '!'")`, or `orWhereHas('employer', …)` on `name` the same way. Escape with `str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $word)` and wrap in `%…%`. Does nothing for an empty value.
  - `providingAll`: return early for `[]`; otherwise `whereHas('accommodations', fn ($q) => $q->whereIn('accommodations.id', $ids), '>=', count($ids))`. No `HAVING`, so SQLite and MariaDB agree.
  - `accommodationsInDisplayOrder()`: move the sort closure out of `JobPostingResource`, and make `JobPostingResource` call it.

- [ ] **Step 5: Write `JobSearchRequest`** (`authorize()` returns true). Rules: `q` nullable, string, max:100, plus a closure that fails with "Search with 8 words or fewer." when there are more than 8 words; `category` nullable, integer, `exists:categories,id`; `accommodations` nullable, array, max:50; `accommodations.*` integer, distinct, `exists:accommodations,id`; `employer` nullable, integer; `sort` nullable, `in:newest,closing`; `page` nullable, integer, min:1; `per_page` nullable, integer, between:1,12. `filters()` returns the Interfaces shape with defaults.

- [ ] **Step 6: Write `JobSearch::paginate()`**: `JobPosting::publiclyVisible()->with(PublicJobPostingResource::RELATIONS)->search(q)`, then category, employer and `providingAll(accommodations)`. Sort `newest` orders by `approved_at` desc, then `id` desc; sort `closing` by `closes_on`, then `id`. Finish with `->paginate($filters['per_page'])->withQueryString()`.

- [ ] **Step 7: Write `PublicJobPostingResource`** (fields exactly as in Interfaces; accommodations from `accommodationsInDisplayOrder()`; department as `['name' => …]`), and `Public\JobPostingController`:
  - `index(JobSearchRequest $request, JobSearch $search): AnonymousResourceCollection`
  - `show(int $id): PublicJobPostingResource`, using `JobPosting::publiclyVisible()->with(RELATIONS)->findOrFail($id)`

- [ ] **Step 8: Add the routes** in `routes/api.php`, next to the other public routes: a `Route::middleware('throttle:120,1')->group(...)` with `GET /job-postings` and `GET /job-postings/{id}` (`->whereNumber('id')`). Task 2 adds the employer route to the same group.

- [ ] **Step 9: Run the tests and see them pass**

Run: `cd backend && php artisan test --filter=PublicJobSearchTest && php artisan test`
Expected: PASS; the whole suite still passes (`JobPostingResource` output unchanged).

No commit yet; Task 3 commits the backend.

---

### Task 2: Public employer page API

**Files:**
- Create: `backend/app/Http/Controllers/Public/EmployerController.php`, `backend/app/Http/Resources/PublicEmployerResource.php`
- Modify: `backend/app/Models/Employer.php`, `backend/routes/api.php`
- Test: `backend/tests/Feature/Jobs/PublicEmployerTest.php`

**Interfaces:**
- Consumes: Task 1's route group and `JobSearchRequest`'s `employer` filter.
- Produces:
  - `Employer::jobPostings(): HasMany`
  - `GET /api/employers/{id}` returning `{ data: { id, type, name, industry, address, description, logo_url, is_verified } }`
  - The employer's jobs come from `GET /api/job-postings?employer={id}`

- [ ] **Step 1: Write the failing tests** (`use BuildsTeams, RefreshDatabase`)

```php
public function test_shows_a_company_with_an_approved_posting(): void
{
    $company = Employer::factory()->verified()->create(['name' => 'Bayanihan Contact Center Inc.']);
    JobPosting::factory()->in($company)->open()->create();

    $data = $this->getJson("/api/employers/{$company->id}")->assertOk()->json('data');
    $this->assertSame(['id', 'type', 'name', 'industry', 'address', 'description', 'logo_url', 'is_verified'], array_keys($data));
    $this->assertTrue($data['is_verified']);
}

public function test_the_page_stays_after_the_job_closes(): void
{
    $company = Employer::factory()->create();
    JobPosting::factory()->in($company)->closed()->create();

    $this->getJson("/api/employers/{$company->id}")->assertOk();
}

public function test_employers_without_an_approved_posting_are_not_found(): void
{
    $neverApproved = Employer::factory()->create();
    JobPosting::factory()->in($neverApproved)->pending()->create();
    $deletedOnly = Employer::factory()->create();
    JobPosting::factory()->in($deletedOnly)->open()->create()->delete();

    $this->getJson("/api/employers/{$neverApproved->id}")->assertNotFound();
    $this->getJson("/api/employers/{$deletedOnly->id}")->assertNotFound();
    $this->getJson('/api/employers/999999')->assertNotFound();
}

public function test_registration_details_and_team_are_never_shown(): void
{
    [$owner, $company, $department] = $this->companyWithOwner();
    $company->forceFill(['business_reg_no' => 'CS202612345'])->save();
    JobPosting::factory()->in($department)->open()->create();

    $body = $this->getJson("/api/employers/{$company->id}")->assertOk()->getContent();
    foreach (['CS202612345', 'business_reg_no', 'registration_type', 'verification_status', $owner->email] as $private) {
        $this->assertStringNotContainsString($private, $body);
    }
}

public function test_open_jobs_come_from_the_search_endpoint(): void
{
    $company = Employer::factory()->create();
    $mine = JobPosting::factory()->in($company)->open()->create();
    JobPosting::factory()->in($company)->closed()->create();
    JobPosting::factory()->open()->create(); // another employer

    $this->assertSame([$mine->id], $this->getJson("/api/job-postings?employer={$company->id}")->json('data.*.id'));
}
```

- [ ] **Step 2: Run the tests and see them fail**: `cd backend && php artisan test --filter=PublicEmployerTest`. Expected: FAIL (404 on every request).

- [ ] **Step 3: Implement.** Add `Employer::jobPostings()`. `PublicEmployerResource` returns exactly the eight fields. `EmployerController::show(int $id)` uses `Employer::whereHas('jobPostings', fn ($q) => $q->whereNotNull('approved_at'))->findOrFail($id)`. Add the route to Task 1's throttled group: `GET /employers/{id}`, `->whereNumber('id')`. It doesn't clash with `/employers/{employer}/logo`.

- [ ] **Step 4: Run the tests and see them pass**: `cd backend && php artisan test --filter=PublicEmployerTest`. Expected: PASS.

---

### Task 3: Demo data for two pages of jobs (and for Phase 3B's matching demo)

**Files:**
- Modify: `backend/database/seeders/UserSeeder.php`, `backend/database/seeders/DemoEmployerSeeder.php`, `backend/database/seeders/DemoJobPostingSeeder.php`
- Test: `backend/tests/Feature/MasterData/SeederTest.php`

**Interfaces:**
- Produces: `UserSeeder::DEMO_EMPLOYER2_EMAIL = 'employer2@opendoor.test'` (name "Demo Contact Center Owner") and `UserSeeder::DEMO_EMPLOYER3_EMAIL = 'employer3@opendoor.test'` (name "Demo Clinic Owner"); `DemoEmployerSeeder::CONTACT_CENTER_NAME = 'Bayanihan Contact Center Inc.'` and `DemoEmployerSeeder::CLINIC_NAME = 'Kalinga Wellness Clinic'`. Phase 3B's demo job seekers rely on the accommodation lists below.

**The demo data** (each company's description: "A sample company used to demonstrate OpenDoor. It is not a real business."):

| Company | Owner | Verification | Industry, address | Department |
|---|---|---|---|---|
| Bayanihan Contact Center Inc. | `employer2@` | Verified (SEC, `DEMO-2026-0002`) | Business Process Outsourcing; IT Park, Lahug, Cebu City | Operations (limit 3) |
| Kalinga Wellness Clinic | `employer3@` | Waiting for review (DTI, `DEMO-2026-0003`) | Healthcare; Tomas Morato Avenue, Quezon City | Front Office (limit 3) |

| # | Employer, department | Title | Category | Setup, type | Status (closes in) | Accommodations |
|---|---|---|---|---|---|---|
| a | Demo Corp, IT | Graphic Designer | Creative & Design | Remote, Contract | Open (35) | Remote work; Flexible hours; Screen reader software provided |
| b | Demo Corp, Human Resources | Office Clerk | Administrative & Clerical | On-site, Full-time | Closed early (20) | Wheelchair-accessible entrance; Accessible restroom |
| c | Bayanihan | Customer Support Associate | Customer Service & BPO | On-site, Full-time | Open (50) | Wheelchair-accessible entrance; Accessible restroom; Elevator or ground-floor workspace; Adjustable workstation; Flexible hours; Job coach or onboarding buddy |
| d | Bayanihan | Chat Support Specialist | Customer Service & BPO | Hybrid, Full-time | Open (42) | Sign language interpreter; Written or captioned meetings; Flexible hours; Hybrid work; Screen-reader-compatible work tools |
| e | Bayanihan | Quality Analyst | Customer Service & BPO | On-site, Full-time | Open (28) | Elevator or ground-floor workspace; Accessible restroom; Written or captioned meetings; Assistive listening devices |
| f | Bayanihan | Training Assistant | Education & Training | On-site, Internship | Open (21) | Sign language interpreter; Written or captioned meetings; Wheelchair-accessible entrance; Part-time schedule |
| g | Bayanihan | Data Encoder | Administrative & Clerical | On-site, Contract | Open (33) | Wheelchair-accessible entrance; Accessible restroom; Elevator or ground-floor workspace; Adjustable workstation; Flexible hours; Accessible parking |
| h | Bayanihan | Sales Coordinator | Sales & Marketing | Hybrid, Full-time | Open (55) | Hybrid work; Assistive listening devices; Job coach or onboarding buddy |
| i | Kalinga | Medical Records Clerk | Healthcare | On-site, Full-time | Open (38) | Accessible restroom; Elevator or ground-floor workspace; Modified duties |
| j | Kalinga | Front Desk Assistant | Healthcare | On-site, Part-time | Open (26) | Written or captioned meetings; Sign language interpreter; Flexible hours; Transportation assistance |
| k | Kalinga | Pharmacy Aide | Healthcare | On-site, Full-time | Open (47) | Service animal allowed; Transportation assistance |
| l | Kalinga | Laboratory Aide | Healthcare | On-site, Full-time | Open, closed yesterday (−1) | Accessible restroom |

Write the descriptions (two sentences, plain language), the locations (the company's city; "Anywhere in the Philippines" for remote) and the interview formats yourself; notes are optional. Why this design: the wheelchair user in 3B has two full matches (c, g) and two jobs with no matches (h, k); the Deaf job seeker has two full matches (d, j) and three with none (h, i, k). Together with today's three open postings that makes 13 open jobs (two pages), 8 categories, all 18 accommodation types, every work setup and every employment type.

- [ ] **Step 1: Update and add the failing tests** in `SeederTest`

```php
// in test_seeding_twice_creates_no_duplicates
$this->assertSame(7, User::count());
$this->assertSame(17, JobPosting::count());
$this->assertSame(
    ['closed' => 1, 'draft' => 1, 'open' => 14, 'pending' => 1],
    JobPosting::pluck('status')->map->value->countBy()->sortKeys()->all(),
);
// (the existing "a deleted posting is never put back" check becomes withTrashed()->count() === 17)

public function test_demo_jobs_fill_two_pages_and_cover_the_lists(): void
{
    $this->seed(DatabaseSeeder::class);
    $public = JobPosting::publiclyVisible()->with('accommodations')->get();

    $this->assertCount(13, $public);
    $this->assertSame(13, $this->getJson('/api/job-postings')->json('meta.total'));
    $this->assertCount(8, $public->pluck('category_id')->unique());
    $this->assertCount(18, $public->flatMap->accommodations->pluck('id')->unique());
    $this->assertCount(3, $public->pluck('work_setup')->unique());
    $this->assertCount(4, $public->pluck('employment_type')->unique());
    $this->assertSame('pending', Employer::firstWhere('name', DemoEmployerSeeder::CLINIC_NAME)->verification_status->value);
}

public function test_a_demo_posting_whose_category_is_missing_is_skipped(): void
{
    $this->seed([CategorySeeder::class, AccommodationSeeder::class]);
    Category::firstWhere('name', 'Healthcare')->update(['name' => 'Health and Wellness']);
    // Not DatabaseSeeder: CategorySeeder would create "Healthcare" again.
    $this->seed([UserSeeder::class, DemoEmployerSeeder::class, DemoJobPostingSeeder::class]);

    $this->assertFalse(JobPosting::where('title', 'Pharmacy Aide')->exists());
    $this->assertTrue(JobPosting::where('title', 'Data Encoder')->exists());
}
```

- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=SeederTest`. Expected: FAIL (5 users, 5 postings).

- [ ] **Step 3: Seed the two owners** in `UserSeeder`, under the same demo-password rule as the other demo accounts.

- [ ] **Step 4: Seed the two companies** in `DemoEmployerSeeder`, each only when its owner exists and has no membership (the same pattern as the demo company). Set verification with `forceFill`, as `createDemoCompany` does.

- [ ] **Step 5: Seed the postings** in `DemoJobPostingSeeder`. Add a and b to `postCompanyJobs`; post c–h and i–l for the new companies, each only when that employer has no postings (`hasNoPostings`). In `post()`: set `approved_at` for both Open and Closed postings; allow a negative `closes_in`; when the category isn't found, skip the posting with `$this->command?->warn("  Demo posting skipped, category not found: {title}")`.

- [ ] **Step 6: Run the tests and see them pass**

Run: `cd backend && php artisan test`
Expected: PASS (all backend tests).

- [ ] **Step 7: Commit the backend**

```bash
git add backend
git commit -m "Add the public job search, job and employer API (Phase 3A backend)" -m "<bullets: open-job rule in Manila time, contains search (8 words, wildcards literal), category and accommodation filters, newest and closing soon, 12 per page, public shapes without private fields, employer pages only after an approved posting, 120 requests a minute, two demo companies and 12 postings (13 open jobs), N tests>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Frontend data layer

**Files:**
- Create: `frontend/src/api/jobs.js`, `frontend/src/hooks/useDebouncedValue.js`, `frontend/src/hooks/useJobSearchParams.js`
- Test: `frontend/src/api/jobs.test.js`, `frontend/src/hooks/useDebouncedValue.test.jsx`, `frontend/src/hooks/useJobSearchParams.test.jsx`

**Interfaces:**
- Produces:
  - `searchJobs({ q, category, accommodations = [], employer, sort, page, perPage } = {}) → Promise<{ jobs: Job[], meta: { current_page, last_page, per_page, total } }>`. Sends `q` (only when not blank), `category`, `accommodations` (an array, which axios sends as `accommodations[]`), `employer`, `sort`, `page`, `per_page`; leaves out empty values
  - `getJob(id) → Promise<Job>` and `getEmployer(id) → Promise<Employer>`
  - `useDebouncedValue(value, delayMs = 300) → value`
  - `useJobSearchParams() → { filters: { q: string, category: string, accommodations: number[], sort: 'newest' | 'closing', page: number }, setFilters(changes), clearFilters(), hrefForPage(page) → string, activeFilterCount: number }`
    - The address uses `q`, `category`, `accommodations` (comma-separated ids, e.g. `accommodations=1,2`), `sort` (only when not `newest`) and `page` (only when above 1).
    - Unknown values fall back to defaults.
    - `setFilters` adds a history entry and resets `page` to 1 unless `changes` includes `page`.
    - `clearFilters()` removes `category` and `accommodations` and keeps `q` and `sort`.
    - `activeFilterCount` = (category ? 1 : 0) + the number of accommodations.

- [ ] **Step 1: Write the failing tests**

```jsx
// useDebouncedValue.test.jsx
it('updates only after a 300 ms pause', () => {
  vi.useFakeTimers()
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), { initialProps: { value: 'w' } })
  rerender({ value: 'web' })
  act(() => vi.advanceTimersByTime(299))
  expect(result.current).toBe('w')
  act(() => vi.advanceTimersByTime(1))
  expect(result.current).toBe('web')
  vi.useRealTimers()
})

// useJobSearchParams.test.jsx (render inside createMemoryRouter; read router.state.location.search)
it('reads the filters from the address', () => { /* /jobs?q=web&category=3&accommodations=1,2&sort=closing&page=2
  → filters toEqual { q: 'web', category: '3', accommodations: [1, 2], sort: 'closing', page: 2 }; activeFilterCount 3 */ })
it('ignores values it does not understand', () => { /* ?sort=price&page=abc&accommodations=1,x&category=it
  → { q: '', category: '', accommodations: [1], sort: 'newest', page: 1 } */ })
it('goes back to page 1 when a filter changes, and keeps the search words', () => { /* from ?q=web&page=3,
  setFilters({ category: '4' }) → search '?q=web&category=4' */ })
it('keeps the filters when only the page changes', () => { /* setFilters({ page: 2 }) on ?q=web → '?q=web&page=2';
  hrefForPage(3) → '/jobs?q=web&page=3' */ })
it('clears category and accommodations but keeps the search words and sort', () => { /* ?q=web&category=4&accommodations=1&sort=closing
  → clearFilters() → '?q=web&sort=closing' */ })

// jobs.test.js (vi.mock('./client.js'))
it('sends only the filters that are set', async () => {
  client.get.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { total: 1, last_page: 1, current_page: 1, per_page: 3 } } })
  const result = await searchJobs({ q: '  ', category: '3', accommodations: [1, 2], sort: 'newest', page: 2, perPage: 3 })
  expect(client.get).toHaveBeenCalledWith('/api/job-postings', {
    params: { category: '3', accommodations: [1, 2], sort: 'newest', page: 2, per_page: 3 },
  })
  expect(result).toEqual({ jobs: [{ id: 1 }], meta: { total: 1, last_page: 1, current_page: 1, per_page: 3 } })
})
```

- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/hooks src/api/jobs.test.js`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the three modules** (`useJobSearchParams` builds on React Router's `useSearchParams`).

- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 5: Building blocks

**Files:**
- Create: `frontend/src/lib/jobText.js`, `frontend/src/lib/pageItems.js`, `frontend/src/components/ui/Pagination.jsx`, `frontend/src/components/ui/EmptyState.jsx`, `frontend/src/components/jobs/JobCard.jsx`, `frontend/src/components/jobs/AccommodationFilterPanel.jsx`, `frontend/src/test/publicJobFixture.js`
- Test: `frontend/src/lib/jobText.test.js`, `frontend/src/lib/pageItems.test.js`, `frontend/src/components/ui/Pagination.test.jsx`, `frontend/src/components/jobs/JobCard.test.jsx`, `frontend/src/components/jobs/AccommodationFilterPanel.test.jsx`

**Interfaces:**
- Consumes: `AccommodationPicker` (`withNotes={false}`), `AccommodationGroupIcon`, `VerificationBadge`, `SelectField`, `Button`, `formatDay`, `optionLabel` with `WORK_SETUPS` and `EMPLOYMENT_TYPES`.
- Produces:
  - `jobCountText(total) → string`: `"15 jobs"`, `"1 job"`, `"No jobs"`
  - `providesText(names) → string`: `"Provides A"`, `"Provides A and B"`, `"Provides A, B and C"`, `"Provides A, B, C and 2 more"`
  - `pageItems(current, last) → Array<number | 'gap'>` (at most 7 entries)
  - `<Pagination page lastPage hrefForPage label="Pages" />`
  - `<EmptyState action>{children}</EmptyState>`
  - `<JobCard job to />` (an `<li>`)
  - `<AccommodationFilterPanel filters categories groups onChange onClear activeCount />`: `onChange` receives `{ category }` or `{ accommodations }`
  - `publicJobFixture` (the Task 1 JSON shape, with four accommodations)

- [ ] **Step 1: Write the failing tests**

```js
// jobText.test.js
expect(jobCountText(15)).toBe('15 jobs'); expect(jobCountText(1)).toBe('1 job'); expect(jobCountText(0)).toBe('No jobs')
expect(providesText(['Remote work'])).toBe('Provides Remote work')
expect(providesText(['A', 'B', 'C', 'D', 'E'])).toBe('Provides A, B, C and 2 more')
// pageItems.test.js
expect(pageItems(1, 1)).toEqual([1]); expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5])
expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10])
expect(pageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10])
expect(pageItems(10, 10)).toEqual([1, 'gap', 6, 7, 8, 9, 10])
```

```jsx
// Pagination.test.jsx
it('marks the current page and links the others', () => {
  // render <Pagination page={1} lastPage={2} hrefForPage={(n) => `/jobs?page=${n}`} /> in a MemoryRouter
  // nav named "Pages"; "1" has aria-current="page" and is not a link; link "Next" → /jobs?page=2; no "Previous" link
})
it('renders nothing for a single page', () => { /* lastPage 1 → container is empty */ })

// JobCard.test.jsx
it('shows the job as job seekers need it', async () => {
  // renders inside <ul> in a MemoryRouter with to="/jobs/2"
  // link "Junior Web Developer" → /jobs/2; text "Acme Corp."; "Verified company";
  // "Work setup: Remote"; "Employment type: Full-time"; "Location: Anywhere in the Philippines"; "Apply by: November 30, 2026";
  // "Provides Remote work, Flexible hours, Screen reader software provided and 1 more"; axe has no violations
})
it('says when the employer is an individual', () => { /* employer.type 'individual' → "Individual employer", no "Verified company" */ })

// AccommodationFilterPanel.test.jsx
it('reports category and accommodation changes', async () => {
  // select "Category" → option "Healthcare" → onChange({ category: '4' }); tick "Wheelchair-accessible entrance" → onChange({ accommodations: [1] })
})
it('offers Clear all filters only when a filter is on', () => { /* activeCount 0 → no button; 2 → button calls onClear */ })
it('opens and closes on phones, saying how many filters are on', async () => {
  // button "Filters, 2 on" has aria-expanded="false" and aria-controls="job-filters"; click → "true"; axe has no violations
})
```

- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/lib src/components/ui/Pagination.test.jsx src/components/jobs`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **`JobCard`:** a ruled row like `PostingListItem` (`border-b border-border py-6 first:border-t`). The `<h3>` holds the title link (21 px; `min-h-11`). Below it come the employer line (name, then `VerificationBadge status="verified"` for verified companies, or "Individual employer"), the labelled facts as a wrapping `<ul>` (no dot separators), and the provides line: an amber check, plus the group icon beside each listed name.
  - **`AccommodationFilterPanel`:** a section with an `h2` "Filters". On phones a `lg:hidden` toggle (`aria-expanded`, `aria-controls="job-filters"`) shows "Filters" or "Filters, N on"; the panel `#job-filters` gets `hidden lg:block` while closed.
  - The panel's `SelectField` has id `filter-category`, label "Category" and a first option "Any category". `AccommodationPicker` has id `filter-accommodations`, legend "Accommodations provided" and hint "Show jobs that provide every one you tick." **Clear all filters** uses Button `variant="link"`.
  - **`Pagination`:** a `nav` with the given label; links use `TEXT_LINK` sizing; the current page is a `<span aria-current="page">`; a gap is a `<span aria-hidden="true">…</span>`.

- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 6: Browse jobs page, its route and the header link

**Files:**
- Create: `frontend/src/portals/public/BrowseJobsPage.jsx`, `frontend/src/components/layout/PublicLayout.test.jsx`
- Modify: `frontend/src/router.jsx` (add `/jobs` under `PublicLayout`, before `*`), `frontend/src/components/layout/PublicLayout.jsx`
- Test: `frontend/src/portals/public/BrowseJobsPage.test.jsx`

**Interfaces:**
- Consumes: Tasks 4–5; `getCategories`, `getAccommodationGroups` (`api/masterData.js`); `useAnnounce`; `useAuth`.
- Produces: `<BrowseJobsPage basePath="/jobs" employerBasePath="/employers" />`. Job links are `${basePath}/${id}`. Phase 3B mounts it at `/candidate/jobs` with candidate paths.

**Page structure:**
- `PageHeader`: title "Browse jobs", intro "Find open jobs and see which accommodations each one provides."
- For guests only, the guest line (spec copy), linking "Register as a job seeker" to `/register?type=candidate`.
- A search form (`role="search"`): `FormField` id `job-search`, label "Search jobs", hint "Job title, skill, company or place", and a submit button "Search".
- `SelectField` id `job-sort`, label "Sort by", with options Newest and Closing soon.
- At `lg` and wider, a two-column grid (`lg:grid-cols-[18rem_minmax(0,1fr)]`): the filter panel on the left; on the right the results `h2` (`jobCountText(total)`, `tabIndex={-1}`), the `JobCard` list, then `Pagination`.
- Empty states:
  - with filters on: the spec's no-results copy and **Clear all filters**;
  - with nothing on: "No open jobs right now. Check back soon."
- Load errors use `generalErrorFrom` with **Try again**, as `JobPostingsPage` does.
- If the filter lists can't load, the panel shows the hint "We couldn't load the filters. Reload the page to try again."

**Behavior:**
- **Search box:** keeps its own text and applies `useDebouncedValue(text, 300)` to `setFilters({ q })`. Enter applies it at once.
- **Loading:** every change of `filters` loads `searchJobs` with the latest-request-wins counter from `JobPostingsPage`.
- **Announcing:** after any load except the first, announce `` `${jobCountText(total)} found` ``.
- **Page changes:** when results for a new page arrive, focus the results heading.
- **Back:** when the address changes (Back or Forward), the search box shows `filters.q`.

- [ ] **Step 1: Write the failing tests** (mock `api/jobs.js` and `api/masterData.js`, and render with `renderRoutes`)

```jsx
it('lists open jobs with the count, using the filters in the address', async () => {
  // path '/jobs?q=web&category=4' → searchJobs called with { q: 'web', category: '4', accommodations: [], sort: 'newest', page: 1 }
  // heading level 2 "15 jobs" (meta.total 15); link "Junior Web Developer" → /jobs/2
})
it('searches 300 ms after typing stops, or at once on Enter', async () => {
  // fake timers with userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  // type "data" → no new call before 300 ms; after it, router.state.location.search === '?q=data'
  // clear, type "clerk{Enter}" → applied at once
})
it('reads out the new count after a filter changes, but not on the first load', async () => {
  // announce not called after the first load; choose Category "Healthcare" → announce('12 jobs found'); the page param is gone
})
it('moves focus to the results heading after a page change', async () => {
  // meta.last_page 2; click link "Next" → after the load, document.activeElement is the heading "15 jobs"
})
it('shows the latest results when an earlier request finishes last', async () => {
  // first searchJobs promise resolves after the second; only the second request's titles are shown
})
it('restores the previous search with Back', async () => {
  // type "web", let 300 ms pass, router.navigate(-1) → the search box is empty again and searchJobs was called with q ''
})
it('explains an empty list and offers to clear the filters', async () => {
  // meta.total 0 with category '4' → "No jobs match these filters. Try fewer filters or different words." and button "Clear all filters"
  // meta.total 0 and nothing on → "No open jobs right now. Check back soon."
})
it('shows the guest line to guests only', async () => { /* guest → link "Register as a job seeker" → /register?type=candidate; authenticated → absent */ })
it('has no accessibility violations', async () => { /* axe(container) */ })

// PublicLayout.test.jsx
it('links to Browse jobs from a main navigation', () => {
  // nav named "Main" contains link "Browse jobs" → /jobs; on /jobs it has aria-current="page"
})
```

- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/portals/public/BrowseJobsPage.test.jsx src/components/layout/PublicLayout.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement the page, add the route, and add `<nav aria-label="Main">` with a `NavLink` "Browse jobs" to `PublicLayout`** (`TEXT_LINK` sizing, before the account navigation; both wrap at 360 px).

- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 7: Job page and employer page

**Files:**
- Create: `frontend/src/portals/public/JobPage.jsx`, `frontend/src/portals/public/EmployerPage.jsx`
- Modify: `frontend/src/components/postings/JobDetails.jsx`, `frontend/src/router.jsx` (add `/jobs/:id` and `/employers/:id`)
- Test: `frontend/src/portals/public/JobPage.test.jsx`, `frontend/src/portals/public/EmployerPage.test.jsx`, `frontend/src/components/postings/JobDetails.test.jsx` (new cases)

**Interfaces:**
- Consumes: `getJob`, `getEmployer`, `searchJobs`, `JobCard`, `Pagination`, `useJobSearchParams` (the employer page's `page`).
- Produces:
  - `<JobPage basePath="/jobs" employerBasePath="/employers" />` and `<EmployerPage basePath="/jobs" />`
  - `JobDetails` gains `employerHref` (string, optional). With it, the employer name becomes a link. When there's no `verification_status` (the public shape), a verified company shows `VerificationBadge status="verified"`.

**Copy:**
- Job not open: the spec text and the link **Browse open jobs** (to `basePath`).
- Employer not found: "We couldn't find this employer. They may not have published a job yet." and **Browse jobs**.
- The employer page heading for jobs is "Open jobs (N)", or "No open jobs right now." when there are none.
- Company details are labelled "Industry", "Address" and "About the company". An individual employer shows "Individual employer", "City or municipality" and "About".

Every state of both pages renders the same `PageHeader` wrapper, so the `<h1>` that `RootLayout` focused is never replaced (the 2B focus lesson).

- [ ] **Step 1: Write the failing tests**

```jsx
// JobDetails.test.jsx
it('links the employer when given an address', () => { /* employerHref '/employers/1' → link "Acme Corp." → /employers/1 */ })
it('shows the Verified badge from the public shape', () => { /* publicJobFixture (no verification_status) → "Verified company" */ })

// JobPage.test.jsx
it('shows an open job with its employer link', async () => {
  // getJob resolves publicJobFixture → heading level 1 "Junior Web Developer"; link "Acme Corp." → /employers/1;
  // heading "Accommodations provided"; link "Back to jobs" → /jobs
})
it('explains a job that is not open', async () => {
  // getJob rejects { response: { status: 404 } } → "This job isn't open. It may have closed or been removed."; link "Browse open jobs" → /jobs
})
it('keeps focus on the page heading when the job finishes loading', async () => {
  // focus the h1 while loading; after the load document.activeElement is still the (same) h1 element
})

// EmployerPage.test.jsx
it('shows a company and its open jobs', async () => {
  // getEmployer → { id: 1, type: 'company', name: 'Acme Corp.', industry: 'Healthcare', address: 'Quezon City', description: 'We hire inclusively.', logo_url: null, is_verified: true }
  // searchJobs called with { employer: 1, sort: 'newest', page: 1 }; heading level 1 "Acme Corp."; "Verified company";
  // "Industry"/"Healthcare"; heading "Open jobs (2)"; job links go to /jobs/{id}; axe has no violations
})
it('shows an individual employer without company details', async () => { /* "Individual employer"; "City or municipality"; no "Industry" */ })
it('explains an employer page that does not exist', async () => { /* 404 → the not-found copy and link "Browse jobs" → /jobs */ })
```

- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/portals/public/JobPage.test.jsx src/portals/public/EmployerPage.test.jsx src/components/postings/JobDetails.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement the two pages, the `JobDetails` changes and the routes.** The existing `JobDetails` tests must keep passing.

- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 8: Home search and featured jobs

**Files:**
- Modify: `frontend/src/portals/public/HomePage.jsx`
- Test: `frontend/src/portals/public/HomePage.test.jsx` (new)

**Interfaces:**
- Consumes: `searchJobs`, `JobCard`.

Home gains two things below its introduction:
- A search form (`role="search"`) with label "Search jobs" and a button "Search", going to `/jobs?q=…` (just `/jobs` when blank).
- A section "Open jobs" with up to three `JobCard`s from `searchJobs({ sort: 'newest', perPage: 3 })` and a link **Browse all jobs** to `/jobs`. If that request fails, the section is left out quietly, so Home never shows an error.

- [ ] **Step 1: Write the failing tests**

```jsx
it('starts a job search from Home', async () => { /* type "encoder" + click "Search" → router.state.location is /jobs?q=encoder */ })
it('shows three open jobs and a link to all of them', async () => {
  // searchJobs called with { sort: 'newest', perPage: 3 }; three job links; link "Browse all jobs" → /jobs
})
it('leaves the jobs out quietly when they cannot load', async () => { /* rejected → no "Open jobs" heading, no error text; axe passes */ })
```

- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/portals/public/HomePage.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement**, keeping Home's existing sections and register links.

- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 9: Checks, keyboard and phone pass, docs, commit and push

**Files:**
- Modify: `README.md` (demo logins: `employer2@` and `employer3@` with what they show; the sample postings paragraph: 13 open jobs across three companies and the individual employer, plus one closed and one expired example; "Browse jobs" in the walkthrough), `.planning/PHASE_3_PLAN.md` (a "Phase 3A build notes" section: checks run, what was found and fixed, what's left)

- [ ] **Step 1: Run every automatic check**

Run: `cd backend && php artisan test` and `cd frontend && npm run test && npm run lint && npm run build`
Expected: all pass. The bundle-size warning may remain; code splitting is scheduled for the audit days (spec §4.3).

- [ ] **Step 2: Walk through J1–J5 in the browser** on the separate `opendoor_verify` database (`php artisan migrate:fresh --seed` against it, as in 2B), at 1024 px and 360 px, so the team's `opendoor` data stays untouched. Record each step's result in the build notes.

- [ ] **Step 3: J6, keyboard only at 360 px.** Tab through Browse jobs, filters, the Filters toggle, pages, a job and its employer page; confirm there's no sideways scrolling (`document.documentElement.scrollWidth === 360`).

- [ ] **Step 4: Reviews** (spec §4.2, "Checks before finishing"): Superpowers code review of the 3A diff from `930fbc3`; GSD code review, UI review and security audit of the changed files, against §8's 3A rows. Fix what they find, test-first.

- [ ] **Step 5: Update the README and the build notes, then commit the frontend**

```bash
git add frontend README.md .planning/PHASE_3_PLAN.md
git commit -m "Add Browse jobs, job and employer pages and Home search (Phase 3A)" -m "<bullets: pages, building blocks, filters in the address, 300 ms search, spoken counts, focus after page change, demo steps J1-J6 checked at 1024 and 360 px, test counts>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Push `main`** with `git push origin main`. This only works once the user's override of the GitHub repository is done. If the push is refused, stop and tell the user rather than forcing it. Then show the user 3A (screenshots of Browse jobs at 1024 px and 360 px) and continue with the Phase 3B plan, unless they stop you.
