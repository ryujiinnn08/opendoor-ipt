# Phase 3B: Profile, Digital Résumé and Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A job seeker fills in a job application profile with a printable **My résumé** page and an optional PDF, saves their accommodation needs on **My needs**, and sees jobs ranked by **Matches my needs** ("Meets 4 of 5 of your needs", "Missing: …") on **Find jobs**, on the job page (**How this job fits your needs**) and on the dashboard. Nobody else can read any of it.

**Architecture:** Laravel gets a candidate profile (one row per job seeker) with work experience and education entries, a needs list (`candidate_accommodation`), a private PDF résumé, and a `CandidateNeeds` value object that `JobSearch` uses to count met needs with `withCount`, so the list, the job page and the dashboard share one calculation. The public job endpoints read the session: an active job seeker with needs gets a `match` block on every job, and `match=1` keeps only jobs meeting at least one need. React reuses 3A's pages in the candidate portal (`/candidate/jobs`, `/candidate/jobs/:id`, `/candidate/employers/:id`) and adds My needs, My profile, My résumé and a new dashboard.

**Tech Stack:** Laravel 12 on a PHP 8.2 platform, Sanctum SPA cookies, MySQL 8 / XAMPP MariaDB 10.4 (SQLite in tests); React 19, React Router 7, Tailwind CSS 4, Vitest + Testing Library + vitest-axe, oxlint. Icons: Icons8 Fluency Systems Regular through `Icon` (README "Icons").

**Spec:** `.planning/PHASE_3_PLAN.md` (approved 2026-10-10): §2 (3B), §4.1, §4.2, §5 (C1–C8), §6.1–6.5 (3B rows), §7, §8 (3B rows), §9 steps 3–5, Appendix A (3B rows), B and C. 3A's build notes (end of the spec) list what 3A left for later.

**Base commit:** `d008099`.

## Global Constraints

- PHP must run on 8.2: no typed class constants, no `#[\Override]`, no `json_validate()`.
- Migrations: required date columns use `dateTime()`, not `timestamp()` (README, MariaDB 10.4). Month values (experience start and end) are stored as `'YYYY-MM'` strings.
- "Every field is optional in Phase 3." The profile save never requires a field, except inside an entry that exists (a job title and company for work experience, a level and school for education).
- "At most 10 work and 10 education entries, with length limits on every field."
- "A need counts as met only when the posting lists that accommodation." Matching never uses work setup or disability type.
- "Find jobs starts in Matches my needs: jobs that meet at least one need, full matches first, then by how many needs are met, then newest. All jobs shows every open job." Retired needs stay on the list as "no longer offered", aren't counted, and can be removed but not added again.
- "Needs, profile, résumé and disability type never reach guests, other job seekers, employers or admins." Hiding something in React is only for convenience; the server checks every rule. "`match=1` without a candidate login is ignored." "A suspended account is treated as a guest."
- Résumé: "PDF only (file type and extension checked), 5 MB, a random stored name, never in a public folder, downloaded only by its owner." Replacing deletes the old file.
- Copy, from spec §7: badge "Meets all 5 of your needs", "Meets 4 of 5 of your needs", "Meets none of your 5 needs"; with one need "Meets your need" or "Doesn't meet your need"; "Missing: A, B and 2 more" (two names, then the count); no matches "No open jobs meet your needs yet." with **Show all jobs**; saved "Your needs are saved. Find jobs now ranks jobs by them." and "Your profile is saved."; disability hint "Optional. OpenDoor never uses this to match or filter jobs. Employers see it only if you tick the box below and apply to one of their jobs."
- Design (spec §7): the match badge is the one bold element: the count in bold ink with an amber check, "Missing" in muted text with an open circle (`Icon name="circle"`), never red or a percentage. Ink means "your needs", amber "the employer's promises". Ruled rows; no new colours or motion; 44 px targets; no sideways scrolling at 360 px; every icon has text beside it; icons only through `Icon` (Icons8).
- Accessibility (3A lessons): every state of a page keeps the same `PageHeader` (the focused `<h1>` survives loading); latest request wins; focus moves with effects after render, not `requestAnimationFrame`; announcements through `useAnnounce()`; entries and filter groups are fieldsets with legends; checkboxes keep the 44 px click area.
- Seeders never change existing data.
- Two commits for 3B on `main`: backend (end of Task 6) and frontend (end of Task 14), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push to `origin` (`ryujiinnn08/opendoor-ipt`).

## Questions for you (I go ahead with the recommendation unless you say otherwise)

1. **Entries are always open for editing.** §7 shows each work experience and education entry with **Edit** and **Remove**. **Recommendation:** show every entry as an open, labelled field group ("Work experience 1 of 2") with **Remove**, and no Edit step. It's one less click per change, nothing is hidden from screen readers, and it saves a day of state handling before the defense. Each entry's legend still names it.
2. **The disability type also appears on My résumé only if "Show my disability type to employers I apply to" is ticked.** **Recommendation:** yes, so the printed résumé matches what employers will see in Phase 4.
3. **A logged-in job seeker on the public `/jobs` pages** also sees the match badge and the fit panel (the server sends it for their session). **Recommendation:** keep it; Find jobs stays the main entry point from the menu.

## Review Focus

1. **Someone else's data.** An employer, an admin, another job seeker or a guest asking for `/api/candidate/*` gets 401/403, and the public job endpoints never carry `match` for them, even with `match=1`. Tests: Task 6 `test_no_other_role_can_reach_candidate_data`, Task 4 `test_match_needs_an_active_job_seeker_with_needs`.
2. **Retired needs.** A need the admin retired after it was saved stays listed as "no longer offered", isn't counted (needs_total drops to 4), and a hand-made request can't add a retired type. Tests: Task 2 `test_a_retired_type_can_be_kept_but_not_added`, Task 4 `test_retired_needs_are_not_counted`.
3. **Entries replaced on save.** Saving the profile with fewer entries removes the others; the order sent is the order kept; 11 entries are refused; an end month before the start month is refused. Tests: Task 1 `test_saving_replaces_the_entries_in_order`, `test_entry_limits_and_dates`.
4. **Résumé files.** A file renamed to `.pdf` that isn't a PDF, a PDF over 5 MB, and the download by anyone but the owner all fail; replacing or removing deletes the stored file. Tests: Task 3 `test_only_real_pdfs_up_to_5_mb`, `test_only_the_owner_can_open_it`, `test_replacing_and_removing_delete_the_old_file`.
5. **Fast changes between Matches and All jobs, and Back.** The Show switch and the Best match sort live in the address like 3A's filters, so Back restores them and the latest request wins. Test: Task 12 `restores Matches my needs with Back`.

## File map

**Backend (`backend/`)**

| File | Responsibility |
|---|---|
| `app/Enums/EducationLevel.php`, `DisabilityType.php` | Choices with labels |
| `database/migrations/2026_10_11_100000_create_candidate_profiles_table.php` (+ `…100100_experiences`, `…100200_educations`, `…100300_candidate_accommodation`) | Tables |
| `app/Models/CandidateProfile.php`, `CandidateExperience.php`, `CandidateEducation.php`; `User.php` | Profile and entries; `User::candidateProfile()`, `experiences()`, `educations()`, `needs()` |
| `app/Http/Requests/Candidate/ProfileRequest.php`, `NeedsRequest.php`, `ResumeRequest.php` | Validation |
| `app/Http/Resources/CandidateProfileResource.php` | The job seeker's own profile |
| `app/Http/Controllers/Candidate/ProfileController.php`, `NeedsController.php`, `ResumeController.php`, `DashboardController.php` | Endpoints under `role:candidate` |
| `app/Services/CandidateNeeds.php`; `JobSearch.php`; `Public/JobSearchRequest.php`; `PublicJobPostingResource.php`; `Public/JobPostingController.php` | Matching |
| `database/seeders/UserSeeder.php`, `DemoCandidateSeeder.php`, `DatabaseSeeder.php` | Demo job seekers |
| `tests/Feature/Candidate/*Test.php`, `tests/Feature/Jobs/MatchingTest.php` | Tests |

**Frontend (`frontend/src/`)**

| File | Responsibility |
|---|---|
| `api/candidate.js`; `api/jobs.js` | Candidate endpoints; `searchJobs` gains `match` |
| `hooks/useJobSearchParams.js` | `matching` mode: `show` and the Best match sort |
| `lib/matchText.js` | Badge and "Missing" wording |
| `components/jobs/MatchBadge.jsx`, `NeedsFit.jsx`; `JobCard.jsx`; `postings/JobDetails.jsx` | Match display |
| `components/candidate/EntryList.jsx`, `ResumeUpload.jsx`, `ResumeView.jsx` | Profile pieces |
| `portals/candidate/NeedsPage.jsx`, `ProfilePage.jsx`, `ResumePage.jsx`, `FindJobsPage.jsx`, `CandidateDashboard.jsx` | Pages |
| `portals/public/BrowseJobsPage.jsx` | Gains the matching props |
| `router.jsx`, `components/layout/portalMenus.js`, `PortalLayout.jsx` | Routes, menu, print styles |
| `test/candidateFixture.js` | A profile and needs in the API shape |

---

### Task 1: Profile and entries API

**Files:**
- Create: the two enums, the profile/experience/education migrations, the three models, `ProfileRequest`, `CandidateProfileResource`, `Candidate\ProfileController`
- Modify: `app/Models/User.php`, `routes/api.php`
- Test: `tests/Feature/Candidate/ProfileTest.php`

**Interfaces:**
- Produces:
  - `EducationLevel`: `elementary` "Elementary", `junior_high` "Junior high school", `senior_high` "Senior high school", `als` "Alternative Learning System", `vocational` "Vocational or TESDA", `college` "College", `postgraduate` "Postgraduate"; `label(): string`.
  - `DisabilityType`: `deaf_or_hard_of_hearing` "Deaf or hard of hearing", `intellectual` "Intellectual", `learning` "Learning", `mental` "Mental", `physical` "Physical (orthopedic)", `psychosocial` "Psychosocial", `speech_and_language` "Speech and language", `visual` "Visual", `cancer` "Cancer", `rare_disease` "Rare disease", `prefer_not_to_say` "Prefer not to say"; `label(): string`.
  - Tables: `candidate_profiles` (`user_id` unique FK cascade; nullable `headline` 150, `city` 100, `province` 100, `contact_number` 30, `about` text, `skills` text, `trainings` text, `languages` 255, `disability_type` 40; `show_disability` bool default false; nullable `resume_path`, `resume_name` 255, `resume_uploaded_at` dateTime), `candidate_experiences` and `candidate_educations` (`user_id` FK cascade, `position` unsigned tinyint, the entry fields below).
  - `User::candidateProfile(): HasOne`, `experiences(): HasMany` and `educations(): HasMany`, both ordered by `position`.
  - `GET /api/candidate/profile` and `PUT /api/candidate/profile` (middleware `auth:sanctum`, `active`, `role:candidate`), both returning:
    `{ data: { name, email, headline, city, province, contact_number, about, skills, trainings, languages, disability_type, show_disability, experiences: [{ job_title, company, started_on: 'YYYY-MM', ended_on: 'YYYY-MM'|null, is_current, description }], educations: [{ level, school, course, year_finished, is_studying }], resume: { name, uploaded_at }|null } }` (empty strings come back as `null`; a job seeker without a profile row gets all `null`, `show_disability: false`, empty lists).
  - The PUT accepts the same fields except `email` and `resume`; `name` is required (the account name, `max:255`, message "Enter your full name."). Limits: `headline` 150, `city` and `province` 100, `contact_number` 30 with `regex:/^[0-9+()\-\s]{7,30}$/` ("Enter a phone number, such as 0917 123 4567."), `about` 2000, `skills` 1000, `trainings` 2000, `languages` 255; `disability_type` `Rule::enum`; `show_disability` boolean; `experiences` and `educations` arrays `max:10`. Experience: `job_title` required 150 ("Enter the job title."), `company` required 150 ("Enter the company or employer."), `started_on` required `date_format:Y-m` not after this month ("Enter when you started, such as 2023-06."), `is_current` boolean, `ended_on` required unless current, `date_format:Y-m`, `after_or_equal:experiences.*.started_on` ("The end can't be before the start."), `description` 2000. Education: `level` required enum ("Choose a level."), `school` required 200 ("Enter the school."), `course` 150, `is_studying` boolean, `year_finished` nullable integer between 1950 and this year (ignored when studying).
  - Saving replaces both entry lists in one transaction, keeping the order sent.
  - No `CandidateProfilePolicy` yet (spec Appendix B): every candidate route reads only the logged-in job seeker's own rows, so there is nothing to authorize between people until Phase 4 lets employers read applicants' profiles; the policy arrives with that rule.

- [ ] **Step 1: Write the failing tests** (`RefreshDatabase`)

```php
public function test_a_new_job_seeker_gets_an_empty_profile(): void
{
    $seeker = User::factory()->create(['name' => 'Ana Reyes']); // factory role is candidate
    $this->actingAs($seeker, 'web')->getJson('/api/candidate/profile')->assertOk()
        ->assertJsonPath('data.name', 'Ana Reyes')
        ->assertJsonPath('data.email', $seeker->email)
        ->assertJsonPath('data.headline', null)
        ->assertJsonPath('data.show_disability', false)
        ->assertJsonPath('data.experiences', [])
        ->assertJsonPath('data.resume', null);
    $this->assertDatabaseCount('candidate_profiles', 0);
}

public function test_saving_the_profile(): void
{
    $seeker = User::factory()->create();
    $this->actingAs($seeker, 'web')->putJson('/api/candidate/profile', [
        'name' => 'Ana M. Reyes', 'headline' => 'Bookkeeper with 3 years of experience', 'city' => 'Quezon City',
        'province' => 'Metro Manila', 'contact_number' => '0917 123 4567', 'skills' => 'Microsoft Excel, bookkeeping',
        'disability_type' => 'physical', 'show_disability' => false, 'experiences' => [], 'educations' => [],
    ])->assertOk()->assertJsonPath('data.city', 'Quezon City')->assertJsonPath('data.disability_type', 'physical');
    $this->assertSame('Ana M. Reyes', $seeker->fresh()->name);
}

public function test_every_field_is_optional(): void
{
    $this->actingAs(User::factory()->create(), 'web')->putJson('/api/candidate/profile', ['name' => 'Ana Reyes'])->assertOk();
}

public function test_saving_replaces_the_entries_in_order(): void
{
    $seeker = User::factory()->create();
    $job = fn (string $title) => ['job_title' => $title, 'company' => 'Acme', 'started_on' => '2022-01', 'ended_on' => '2023-01', 'is_current' => false];
    $this->actingAs($seeker, 'web')->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [$job('A'), $job('B'), $job('C')]]);
    $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [$job('C'), $job('A')]])
        ->assertJsonPath('data.experiences.*.job_title', ['C', 'A']);
    $this->assertSame(2, $seeker->experiences()->count());
}

public function test_entry_limits_and_dates(): void
{
    $seeker = User::factory()->create();
    $entry = ['job_title' => 'Clerk', 'company' => 'Acme', 'started_on' => '2023-06', 'is_current' => true];
    $this->actingAs($seeker, 'web')->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => array_fill(0, 11, $entry)])
        ->assertJsonValidationErrors('experiences');
    $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [[...$entry, 'is_current' => false, 'ended_on' => '2023-01']]])
        ->assertJsonValidationErrors(['experiences.0.ended_on' => "The end can't be before the start."]);
    $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'experiences' => [[...$entry, 'started_on' => '2023-6']]])
        ->assertJsonValidationErrors('experiences.0.started_on');
    $this->putJson('/api/candidate/profile', ['name' => 'Ana', 'educations' => [['level' => 'phd', 'school' => 'UP']]])
        ->assertJsonValidationErrors('educations.0.level');
}

public function test_the_current_job_needs_no_end_and_studying_needs_no_year(): void
{
    $this->actingAs(User::factory()->create(), 'web')->putJson('/api/candidate/profile', [
        'name' => 'Ana',
        'experiences' => [['job_title' => 'Clerk', 'company' => 'Acme', 'started_on' => '2023-06', 'is_current' => true, 'ended_on' => '2024-01']],
        'educations' => [['level' => 'college', 'school' => 'TUP', 'is_studying' => true, 'year_finished' => 2020]],
    ])->assertOk()->assertJsonPath('data.experiences.0.ended_on', null)->assertJsonPath('data.educations.0.year_finished', null);
}

public function test_only_job_seekers_have_a_profile(): void
{
    $this->getJson('/api/candidate/profile')->assertUnauthorized();
    $this->actingAs(User::factory()->employer()->create(), 'web')->getJson('/api/candidate/profile')->assertForbidden();
    $this->actingAs(User::factory()->admin()->create(), 'web')->putJson('/api/candidate/profile', ['name' => 'X'])->assertForbidden();
}
```

- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=ProfileTest`. Expected: FAIL (404). `UserFactory` makes job seekers by default and has `employer()`, `admin()` and `suspended()` states.

- [ ] **Step 3: Implement** the enums, migrations, models (`CandidateProfile` `$fillable` excludes the résumé columns; casts `show_disability` boolean, `disability_type` enum, `resume_uploaded_at` datetime), the `User` relations, `ProfileRequest` (trim strings and turn `''` into `null` in `prepareForValidation`, as `Employer\ProfileRequest` does), the resource, the controller (`show` uses `$user->candidateProfile ?? new CandidateProfile`; `update` saves the name on the user, `updateOrCreate`s the profile and replaces the entries in `DB::transaction`), and the routes in a `role:candidate` `prefix('candidate')` group next to the employer group.

- [ ] **Step 4: Run them and see them pass**: `cd backend && php artisan test --filter=ProfileTest && php artisan test`. Expected: PASS, whole suite still green.

No commit yet; Task 6 commits the backend.

---

### Task 2: Needs API

**Files:**
- Create: `database/migrations/2026_10_11_100300_create_candidate_accommodation_table.php`, `NeedsRequest`, `Candidate\NeedsController`
- Modify: `app/Models/User.php`, `routes/api.php`
- Test: `tests/Feature/Candidate/NeedsTest.php`

**Interfaces:**
- Produces:
  - `candidate_accommodation` (`user_id`, `accommodation_id`, both FK cascade, composite primary key, timestamps).
  - `User::needs(): BelongsToMany` (Accommodation, ordered as `JobPosting::accommodationsInDisplayOrder()` sorts: group order, group, name).
  - `GET /api/candidate/accommodations` and `PUT /api/candidate/accommodations` → `{ data: [{ id, name, group_name, is_active }] }` in display order. PUT body `{ accommodations: list<int> }`: array `max:50`; each integer, distinct, `exists:accommodations,id`; a retired type is refused unless it is already in the person's list, with "\"{name}\" is no longer offered. Untick it to continue." on `accommodations.{index}` (the posting form's rule and wording). `[]` clears the list.

- [ ] **Step 1: Write the failing tests**

```php
public function test_saving_and_reading_needs(): void
{
    $seeker = User::factory()->create();
    [$ramp, $captions] = Accommodation::factory()->count(2)->create();
    $this->actingAs($seeker, 'web')->putJson('/api/candidate/accommodations', ['accommodations' => [$captions->id, $ramp->id]])->assertOk();
    $this->getJson('/api/candidate/accommodations')->assertOk()->assertJsonCount(2, 'data');
    $this->putJson('/api/candidate/accommodations', ['accommodations' => []])->assertOk()->assertJsonCount(0, 'data');
}

public function test_a_retired_type_can_be_kept_but_not_added(): void
{
    $seeker = User::factory()->create();
    [$kept, $other] = Accommodation::factory()->count(2)->create();
    $seeker->needs()->attach($kept->id);
    $kept->update(['is_active' => false]);
    $other->update(['is_active' => false]);

    $this->actingAs($seeker, 'web')->putJson('/api/candidate/accommodations', ['accommodations' => [$kept->id]])
        ->assertOk()->assertJsonPath('data.0.is_active', false);
    $this->putJson('/api/candidate/accommodations', ['accommodations' => [$kept->id, $other->id]])
        ->assertJsonValidationErrors(['accommodations.1' => "\"{$other->name}\" is no longer offered. Untick it to continue."]);
}

public function test_unknown_and_oversized_lists_are_refused(): void
{
    $this->actingAs(User::factory()->create(), 'web');
    $this->putJson('/api/candidate/accommodations', ['accommodations' => [999999]])->assertJsonValidationErrors('accommodations.0');
    $this->putJson('/api/candidate/accommodations', ['accommodations' => range(1, 51)])->assertJsonValidationErrors('accommodations');
}
```

- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=NeedsTest`. Expected: FAIL.

- [ ] **Step 3: Implement** (as `JobPostingRequest`: skip the per-item rules when the list has more than 50 items; `sync()` the ids).

- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 3: Résumé upload, download and removal

**Files:**
- Create: `ResumeRequest`, `Candidate\ResumeController`
- Modify: `routes/api.php`, `CandidateProfileResource` (no change in shape; it already sends `resume`)
- Test: `tests/Feature/Candidate/ResumeTest.php`

**Interfaces:**
- Produces: `POST /api/candidate/resume` (multipart, field `resume`) → the profile resource; `GET /api/candidate/resume` → the PDF, `Content-Type: application/pdf`, `Content-Disposition: inline; filename="<original name>"`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`; 404 "You haven't uploaded a résumé." when there is none; `DELETE /api/candidate/resume` → the profile resource.
- Rules: `required`, `file`, `mimes:pdf`, `mimetypes:application/pdf`, `max:5120`. Messages: "Choose a PDF file." (required, file), "The résumé must be a PDF file." (mimes, mimetypes), "The résumé must be smaller than 5 MB." (max, uploaded).
- Storage: `store('resumes', 'local')` (random name, private disk, as logos); `resume_name` is the client name reduced to `basename()` and cut to 255 characters.

- [ ] **Step 1: Write the failing tests** (`Storage::fake('local')`; `UploadedFile::fake()->create('cv.pdf', 300, 'application/pdf')` for a PDF, and for the fake PDF a `.pdf` whose content is `'<?php echo 1;'`)

```php
public function test_uploading_a_pdf(): void
{
    $seeker = User::factory()->create();
    $this->actingAs($seeker, 'web')->post('/api/candidate/resume', ['resume' => $this->pdf('Ana Reyes CV.pdf')], ['Accept' => 'application/json'])
        ->assertOk()->assertJsonPath('data.resume.name', 'Ana Reyes CV.pdf');
    Storage::disk('local')->assertExists($seeker->candidateProfile->resume_path);
    $this->assertStringStartsWith('resumes/', $seeker->candidateProfile->resume_path);
}

public function test_only_real_pdfs_up_to_5_mb(): void { /* fake .pdf with PHP text → 'The résumé must be a PDF file.'; 5121 KB PDF → 'The résumé must be smaller than 5 MB.'; a .docx → PDF message */ }

public function test_only_the_owner_can_open_it(): void
{
    // owner GET → 200, header Content-Type application/pdf and Cache-Control containing no-store;
    // another job seeker GET → 404 "You haven't uploaded a résumé." (they only ever reach their own);
    // employer and admin → 403; guest → 401
}

public function test_replacing_and_removing_delete_the_old_file(): void
{
    // upload, keep the path; upload again → old path missing, new path exists;
    // DELETE → file missing, data.resume null
}
```

- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=ResumeTest`. Expected: FAIL.

- [ ] **Step 3: Implement** (the profile row is created on first upload with `firstOrCreate`).

- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 4: Matching in the job search

**Files:**
- Create: `app/Services/CandidateNeeds.php`
- Modify: `app/Services/JobSearch.php`, `app/Http/Requests/Public/JobSearchRequest.php`, `app/Http/Resources/PublicJobPostingResource.php`, `app/Http/Controllers/Public/JobPostingController.php`, `app/Models/JobPosting.php`
- Test: `tests/Feature/Jobs/MatchingTest.php`

**Interfaces:**
- Consumes: Task 2's `User::needs()`; 3A's `JobSearch::paginate()`, `JobSearchRequest::filters()`.
- Produces:
  - `CandidateNeeds::for(?User $user): ?CandidateNeeds`: `null` unless the user is an active job seeker with at least one **active** need. Methods: `ids(): list<int>`, `count(): int`, `matchFor(JobPosting $job, bool $withNeeds = false): array` returning `['needs_total' => int, 'needs_met' => int, 'missing' => list<string>]` (missing names in display order) and, with `$withNeeds`, `'needs' => [['id', 'name', 'group_name', 'provided' => bool, 'note' => ?string]]` (the employer's note when provided).
  - `JobSearchRequest`: new `match` (`nullable|boolean`) and `sort` `in:newest,closing,match`; `filters()` adds `'match' => bool`.
  - `JobSearch::paginate(array $filters, ?CandidateNeeds $needs = null)`: with `$needs`, `withCount(['accommodations as needs_met' => whereIn ids])`; with `$needs` and `match`, `whereHas('accommodations', whereIn ids)`; with `$needs` and sort `match`, order by `needs_met` desc, `approved_at` desc, `id` desc. Without `$needs`, `match` is ignored and sort `match` falls back to `newest`. Every job gets `$job->match = $needs->matchFor($job)`.
  - `JobPosting` gains `public ?array $match = null;` (set by `JobSearch` for a job seeker; never stored).
  - `PublicJobPostingResource` adds `'match' => $this->when($this->resource->match !== null, …)`.
  - The controller passes `CandidateNeeds::for($request->user())`; `show()` sets `match` with `withNeeds: true`.

- [ ] **Step 1: Write the failing tests** (`BuildsTeams`, `RefreshDatabase`; a helper `seekerNeeding(Accommodation ...$needs): User`)

```php
public function test_counts_met_needs_and_names_the_missing_ones(): void
{
    [$ramp, $restroom, $lift] = Accommodation::factory()->count(3)->sequence(['name' => 'Ramp'], ['name' => 'Restroom'], ['name' => 'Lift'])->create(['group_name' => 'Physical access']);
    $job = JobPosting::factory()->open()->create();
    $job->accommodations()->attach([$ramp->id, $lift->id]);
    $seeker = $this->seekerNeeding($ramp, $restroom, $lift);

    $this->actingAs($seeker, 'web')->getJson('/api/job-postings')
        ->assertJsonPath('data.0.match', ['needs_total' => 3, 'needs_met' => 2, 'missing' => ['Restroom']]);
}

public function test_matches_my_needs_shows_jobs_meeting_at_least_one_need_best_first(): void
{
    // needs A, B; jobs: full (A, B, approved 3 days ago), partial (A, approved today), none (C), newer full (A, B, today)
    // ?match=1&sort=match → [newer full, full, partial]; no "none"
    // ?sort=match (All jobs) → the same three first, then "none"; "none" carries needs_met 0
}

public function test_match_needs_an_active_job_seeker_with_needs(): void
{
    // guest, employer, admin, a job seeker without needs, and a suspended job seeker with needs (User::factory()->suspended()):
    // ?match=1&sort=match lists every open job newest first and no item has a "match" key
}

public function test_retired_needs_are_not_counted(): void
{
    // five needs, one then retired; a job providing all five → needs_total 4, needs_met 4, missing []
}

public function test_the_job_page_lists_each_need_as_provided_or_missing(): void
{
    // GET /api/job-postings/{id} as the job seeker → data.match.needs:
    // [{id, name: 'Ramp', group_name, provided: true, note: 'Side door'}, {…'Restroom', provided: false, note: null}]
}

public function test_matching_does_not_query_per_job(): void
{
    // as 3A's test_listing_does_not_query_per_job, logged in as a job seeker with 3 needs and ?match=1&sort=match
}
```

- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=MatchingTest`. Expected: FAIL.

- [ ] **Step 3: Implement.** `CandidateNeeds` loads the active needs once, as `id => name` in display order. `matchFor` compares them with the job's eager-loaded accommodations, so no extra queries.

- [ ] **Step 4: Run them and see them pass**: `cd backend && php artisan test --filter='MatchingTest|PublicJobSearchTest'`. Expected: PASS (3A's tests unchanged).

---

### Task 5: Candidate dashboard API

**Files:**
- Create: `Candidate\DashboardController`
- Modify: `routes/api.php`
- Test: `tests/Feature/Candidate/DashboardTest.php`

**Interfaces:**
- Consumes: `CandidateNeeds`, `JobSearch`, `PublicJobPostingResource`.
- Produces: `GET /api/candidate/dashboard` → `{ data: { needs_count: int, top_matches: Job[] (at most 3, Matches my needs, best first, each with match), missing_sections: list<'headline'|'location'|'contact_number'|'education'|'skills'|'needs'> } }`. `location` is missing when city or province is empty; `needs_count` counts active needs; `top_matches` is `[]` without needs.

- [ ] **Step 1: Write the failing tests**: a new job seeker → `needs_count` 0, `top_matches` [], `missing_sections` all six in that order; with a full profile, one education entry and two needs → `missing_sections` []; with five matching open jobs → three `top_matches`, best first; employer → 403.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=DashboardTest`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass.**

---

### Task 6: Demo job seekers, privacy checks and the backend commit

**Files:**
- Create: `database/seeders/DemoCandidateSeeder.php`, `tests/Feature/Candidate/PrivacyTest.php`
- Modify: `database/seeders/UserSeeder.php`, `DatabaseSeeder.php`, `tests/Feature/MasterData/SeederTest.php`

**Interfaces:**
- Produces: `UserSeeder::DEMO_CANDIDATE2_EMAIL = 'candidate2@opendoor.test'` (name "Demo Candidate Two", same demo-password rule).

**The demo data** (each only when that job seeker has no profile row and no needs):

| Account | Profile | Needs |
|---|---|---|
| `candidate@` | Headline "Data encoder with 2 years of experience"; Quezon City, Metro Manila; 0917 555 0101; skills "Microsoft Excel, data entry, customer service"; languages "Filipino, English"; one work experience (Data Encoder, Bayani Logistics, 2023-01 to 2024-12); one education (College, Technological University of the Philippines, BS Information Technology, 2022); disability type Physical, not shown | Wheelchair-accessible entrance; Accessible restroom; Elevator or ground-floor workspace; Adjustable workstation; Flexible hours |
| `candidate2@` | Headline "Customer support agent fluent in Filipino Sign Language"; Cebu City, Cebu; skills "Chat support, email support, Filipino Sign Language"; languages "Filipino, English, Filipino Sign Language"; one education (Senior high school, Cebu City National Science High School, ICT strand, 2021); disability type Deaf or hard of hearing, not shown | Sign language interpreter; Written or captioned meetings; Flexible hours |

With 3A's demo jobs: `candidate@` has two full matches (Customer Support Associate, Data Encoder) and none for Sales Coordinator and Pharmacy Aide; `candidate2@` has two full matches (Chat Support Specialist, Front Desk Assistant) and none for Sales Coordinator, Medical Records Clerk and Pharmacy Aide. Needs are found by name; a missing one is skipped with a warning, as the posting seeder does.

- [ ] **Step 1: Write the failing tests**
  - `SeederTest`: users become 8; `test_demo_job_seekers_rank_the_same_jobs_differently` asserts, through `GET /api/job-postings?match=1&sort=match` as each account, that the first two titles are the two full matches above (any order between them) with `needs_met` equal to `needs_total`, and that the titles with no match are absent; seeding twice changes nothing.
  - `PrivacyTest::test_no_other_role_can_reach_candidate_data`: for guest (401), employer, admin (403), every `/api/candidate/*` route (profile GET/PUT, accommodations GET/PUT, resume GET/POST/DELETE, dashboard). Another job seeker reading `/api/candidate/profile` gets only their own (empty) profile, never the first job seeker's headline. The public job list and job page, read as an employer and an admin, contain no `match` key, and no disability type or needs appear anywhere in their JSON.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter='SeederTest|PrivacyTest'`. Expected: FAIL (7 users; …).
- [ ] **Step 3: Implement** the seeder and add it to `DatabaseSeeder` after `DemoJobPostingSeeder`.
- [ ] **Step 4: Run the whole backend suite**: `cd backend && php artisan test && vendor/bin/pint --dirty --test`. Expected: PASS.
- [ ] **Step 5: Commit the backend**

```bash
git add backend
git commit -m "Add job seeker profiles, needs, résumés and matching API (Phase 3B backend)" -m "<bullets: profile with entries (10 each), needs with the retired-type rule, private PDF résumé, matching counted in one place, match=1 and Best match, dashboard data, two demo job seekers, privacy tests, N tests>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Frontend data layer

**Files:**
- Create: `frontend/src/api/candidate.js`, `frontend/src/test/candidateFixture.js`
- Modify: `frontend/src/api/jobs.js`, `frontend/src/hooks/useJobSearchParams.js`
- Test: `frontend/src/api/candidate.test.js`, `api/jobs.test.js`, `hooks/useJobSearchParams.test.jsx` (new cases)

**Interfaces:**
- Produces:
  - `getProfile()`, `saveProfile(values)`, `getNeeds()`, `saveNeeds(ids)`, `uploadResume(file)` (FormData field `resume`, as `uploadLogo`), `removeResume()`, `getDashboard()`; each returns `data.data`. `RESUME_URL = `${API_URL}/api/candidate/resume``.
  - `searchJobs({ …, match })` sends `match: 1` only when `match` is true.
  - `useJobSearchParams({ matching = false } = {})`: in matching mode `filters` gains `show: 'matches' | 'all'` (address `show=all` only for All jobs; default `matches`) and `sort` accepts `match`, which is then the default (`sort` is left out of the address when it equals the default). Outside matching mode, `sort=match` and `show` fall back as unknown values do. `clearFilters()` keeps `q`, `sort` and `show`.
  - `candidateFixture`: `{ profile, needs }` in the Task 1 and Task 2 shapes (profile with one experience and one education; three needs, one retired).

- [ ] **Step 1: Write the failing tests**: `searchJobs({ match: true, sort: 'match' })` → params `{ match: 1, sort: 'match' }`, and `match: false` leaves `match` out; `saveNeeds([3, 1])` → `PUT /api/candidate/accommodations` with `{ accommodations: [3, 1] }`; `uploadResume(file)` posts FormData with field `resume`; matching mode reads `/candidate/jobs` as `{ show: 'matches', sort: 'match', … }` and `?show=all&sort=newest` as given; `setFilters({ show: 'all' })` → `?show=all` (page reset); public mode reads `?sort=match&show=all` as `{ sort: 'newest' }` with no `show` key.
- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/api src/hooks`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass.**

---

### Task 8: Match badge, needs fit and the job card

**Files:**
- Create: `frontend/src/lib/matchText.js`, `frontend/src/components/jobs/MatchBadge.jsx`, `frontend/src/components/jobs/NeedsFit.jsx`
- Modify: `frontend/src/components/jobs/JobCard.jsx`, `frontend/src/components/postings/JobDetails.jsx`
- Test: `lib/matchText.test.js`, `components/jobs/MatchBadge.test.jsx`, `NeedsFit.test.jsx`, `JobCard.test.jsx`, `postings/JobDetails.test.jsx` (new cases)

**Interfaces:**
- Produces:
  - `matchCountText({ needs_total, needs_met }) → string`: `(5, 5)` "Meets all 5 of your needs", `(5, 4)` "Meets 4 of 5 of your needs", `(5, 0)` "Meets none of your 5 needs", `(1, 1)` "Meets your need", `(1, 0)` "Doesn't meet your need".
  - `missingText(names) → string | null`: `[]` null, `['A']` "Missing: A", `['A', 'B']` "Missing: A and B", `['A', 'B', 'C', 'D']` "Missing: A, B and 2 more".
  - `<MatchBadge match />`: the count in bold ink with an amber `Icon name="check"`, then the missing line in muted text with `Icon name="circle"`; plain text, no live region.
  - `<NeedsFit needs />`: section "How this job fits your needs" with an ink left rule (`border-l-4 border-text`), `MatchBadge`-style count, then one line per need: "Flexible hours: Provided" (amber check, the employer's note under it) or "Adjustable workstation: Missing. You can ask the employer about it." (open circle).
  - `JobCard` shows `<MatchBadge>` under the employer line when `job.match` exists.
  - `JobDetails` gains `fit` (a node shown above "Accommodations provided" in the right column).

- [ ] **Step 1: Write the failing tests** with the wording above; `MatchBadge` and `NeedsFit` pass axe; `JobCard` without `match` renders no badge (3A tests unchanged).
- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/lib src/components/jobs src/components/postings`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass.**

---

### Task 9: My needs page, the candidate menu and routes

**Files:**
- Create: `frontend/src/portals/candidate/NeedsPage.jsx`
- Modify: `frontend/src/components/layout/portalMenus.js`, `frontend/src/router.jsx`
- Test: `portals/candidate/NeedsPage.test.jsx`, `components/layout/portalMenus.test.js` (new case)

**Interfaces:**
- Consumes: `getNeeds`, `saveNeeds`, `getAccommodationGroups`, `AccommodationPicker` (`withNotes={false}`), `useFormErrors`, `ErrorSummary`.
- Produces: route `/candidate/needs`; candidate menu "Dashboard" `/candidate/dashboard`, "Find jobs" `/candidate/jobs` (`end: false`), "My needs" `/candidate/needs`, "My profile" `/candidate/profile` (`end: false`).

**Page:** `PageHeader` "My needs", intro "Tick the workplace accommodations you need. Find jobs ranks jobs by how many of them each one provides." A "Who sees this" line: "Only you. Employers see your needs only when you apply to one of their jobs." The picker's legend "Accommodations I need"; saved needs that were retired are added under their group so they show "(no longer offered)" and can be unticked. **Save my needs** saves; success shows and announces "Your needs are saved. Find jobs now ranks jobs by them." with a link **Find jobs**; a 422 goes to the error summary.

- [ ] **Step 1: Write the failing tests**: loads and ticks the saved needs; a retired saved need shows "(no longer offered)"; saving calls `saveNeeds` with the ticked ids in display order and announces the saved text; a refused retired type shows the server message in the error summary; axe passes; the candidate menu lists the four items.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass.**

---

### Task 10: My profile page

**Files:**
- Create: `frontend/src/components/candidate/EntryList.jsx`, `frontend/src/components/candidate/ResumeUpload.jsx`, `frontend/src/portals/candidate/ProfilePage.jsx`
- Modify: `frontend/src/router.jsx`
- Test: `components/candidate/EntryList.test.jsx`, `ResumeUpload.test.jsx`, `portals/candidate/ProfilePage.test.jsx`

**Interfaces:**
- Consumes: `getProfile`, `saveProfile`, `uploadResume`, `removeResume`, `RESUME_URL`; `FormField`, `SelectField`, `CheckboxField`, `ErrorSummary`, `useFormErrors`.
- Produces:
  - `<EntryList id legend itemLabel addLabel items onChange max={10} renderFields={(item, index, fieldId, errors) => node} emptyItem errors />`: each item a `<fieldset>` with legend "`${itemLabel} ${n} of ${count}`" and **Remove** (`aria-label` "Remove work experience 2"); **Add work experience** appends `emptyItem`, moves focus to the new entry's first field, and is replaced by "You can add up to 10." at 10; removing moves focus to the next entry's legend (or the Add button).
  - `<ResumeUpload resume onUpload onRemove />`: file name and "Uploaded October 11, 2026", **Open my résumé** (link to `RESUME_URL`, new tab, says "opens in a new tab"), **Replace** and **Remove**; checks "The résumé must be a PDF file." and "The résumé must be smaller than 5 MB." before uploading, like `FileUpload`.
  - Route `/candidate/profile`.

**Page:** one column of sections with `h2`s, each with an `id` for the dashboard's links: Basic information (`profile-basic`: full name, headline, city or municipality, province, contact number, email shown read-only), About me (`profile-about`), Work experience (`profile-experience`), Education (`profile-education`: level select from §4.1, school, course or strand, year finished, "Still studying"), Skills (`profile-skills`, hint "Separate them with commas, such as Microsoft Excel, bookkeeping"), Trainings and certifications (one per line), Languages, Résumé (`profile-resume`: `ResumeUpload` plus a link **View My résumé**), Private (`profile-private`: disability type select with the §7 hint and "Show my disability type to employers I apply to"). **Save profile** saves everything except the résumé (which uploads on its own); success shows and announces "Your profile is saved."; server errors on entries (`experiences.1.started_on`) point at that entry's field.

- [ ] **Step 1: Write the failing tests**: EntryList add/remove with focus and the 10 limit; ResumeUpload refuses a `.txt` and a 6 MB PDF before upload and shows the server message; ProfilePage loads the fixture, edits the headline, adds an education entry, saves the right payload, announces "Your profile is saved.", maps `experiences.0.ended_on` to that field, and passes axe.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass.**

---

### Task 11: My résumé page

**Files:**
- Create: `frontend/src/components/candidate/ResumeView.jsx`, `frontend/src/portals/candidate/ResumePage.jsx`
- Modify: `frontend/src/router.jsx`, `frontend/src/components/layout/PortalLayout.jsx` (`print:hidden` on the header, menu and footer)
- Test: `components/candidate/ResumeView.test.jsx`, `portals/candidate/ResumePage.test.jsx`

**Interfaces:**
- Produces: `<ResumeView profile />` (Phase 4 reuses it for employers): the name as `h1`-level title supplied by the page, then headline; contact line (city, province, contact number, email); About; Work experience (title, company, "June 2023 to now" / "January 2023 to December 2024", description); Education (level label, school, course, "2022" / "Still studying"); Skills; Trainings and certifications; Languages; the disability type only when `show_disability` is on. Empty sections are left out. Route `/candidate/profile/resume`.

**Page:** `PageHeader` with the person's name, an intro "This is how your résumé looks to employers.", **Print or save as PDF** (`window.print()`), **Edit my profile** link; print styles: no buttons, black text, no menu.

- [ ] **Step 1: Write the failing tests**: section order and wording for the fixture; empty sections absent; disability type shown only when allowed; the print button calls `window.print`; axe passes.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass.**

---

### Task 12: Find jobs and the candidate job and employer pages

**Files:**
- Create: `frontend/src/portals/candidate/FindJobsPage.jsx`
- Modify: `frontend/src/portals/public/BrowseJobsPage.jsx`, `frontend/src/portals/public/JobPage.jsx`, `frontend/src/router.jsx`
- Test: `portals/candidate/FindJobsPage.test.jsx`, `portals/public/JobPage.test.jsx` (new case)

**Interfaces:**
- Consumes: Task 7's matching mode, Task 8's components, `getNeeds`.
- Produces:
  - `BrowseJobsPage` gains `title` (default "Browse jobs"), `intro` (node) and `matching` (`{ needsCount }` or `undefined`). With `needsCount > 0`: a fieldset "Show" with radios **Matches my needs** / **All jobs** (`setFilters({ show })`), sort options Best match / Newest / Closing soon, `searchJobs` gets `match: filters.show === 'matches'`, and an empty Matches list says "No open jobs meet your needs yet." with **Show all jobs** (sets `show: 'all'`). With `needsCount === 0`: the public behaviour plus "Tell us what you need to see how well each job fits you." linking **Tell us what you need** to `/candidate/needs`.
  - `FindJobsPage`: `getNeeds()` (active ones counted), then `<BrowseJobsPage title="Find jobs" basePath="/candidate/jobs" matching={{ needsCount }} intro={…} />`, where the intro is "Jobs ranked by how many of your 5 needs they meet." and **Change my needs**. Same `PageHeader` while the needs load.
  - `JobPage` passes `fit={job.match?.needs ? <NeedsFit needs={job.match.needs} /> : null}` to `JobDetails`.
  - Routes `/candidate/jobs`, `/candidate/jobs/:id` (`JobPage basePath="/candidate/jobs" employerBasePath="/candidate/employers"`), `/candidate/employers/:id` (`EmployerPage basePath="/candidate/jobs"`).

- [ ] **Step 1: Write the failing tests**: starts in Matches my needs with `searchJobs` called with `{ …, match: true, sort: 'match', show: 'matches' }`; each job shows its badge; **All jobs** → `?show=all` and `match: false`; the empty Matches text and **Show all jobs**; without needs, the prompt and no Show switch; `restores Matches my needs with Back`; the candidate job page shows "How this job fits your needs" when the job has `match.needs`; axe passes.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass**, plus all of 3A's page tests: `cd frontend && npx vitest run src/portals`.

---

### Task 13: Candidate dashboard

**Files:**
- Modify: `frontend/src/portals/candidate/CandidateDashboard.jsx`
- Test: `frontend/src/portals/candidate/CandidateDashboard.test.jsx`

**Interfaces:**
- Consumes: `getDashboard`, `JobCard`.

**Page:** heading "Welcome, {name}" (as now). Without needs: a primary link **Tell us what you need** (`/candidate/needs`) with "Tick the accommodations you need, and Find jobs ranks jobs by them." With needs: "Your top matches" with up to three `JobCard`s (links to `/candidate/jobs/:id`) and **See all matches** (`/candidate/jobs`), or "No open jobs meet your needs yet." with **Browse all jobs** (`/candidate/jobs?show=all`). Then "Finish your profile" listing the missing sections as links ("Headline", "City or municipality and province", "Contact number", "Education", "Skills" to `/candidate/profile#profile-…`; "Accommodation needs" to `/candidate/needs`), or nothing when none are missing. "My applications" stays a coming-soon tile (Phase 4). A load error shows **Try again**.

- [ ] **Step 1: Write the failing tests** for the three states, the missing-section links and Try again; axe passes.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass.**

---

### Task 14: Checks, walk-through, reviews, docs, commit and push

**Files:**
- Modify: `README.md` (demo logins: `candidate@` and `candidate2@` with their needs and best matches; the candidate pages), `.planning/PHASE_3_PLAN.md` (status line; "Phase 3B build notes")

- [ ] **Step 1: Run every automatic check**: `cd backend && php artisan test && vendor/bin/pint --dirty --test` and `cd frontend && npm run test && npm run lint && npm run build`. Expected: all pass (the bundle-size warning may remain).
- [ ] **Step 2: Walk through C1–C7** on `opendoor_verify` (`migrate:fresh --seed`, as in 3A) at 1024 px and 360 px. Register a new job seeker for C1; use `candidate@` and `candidate2@` for C2–C4 and compare their Find jobs order; upload a real PDF for C5 and open it, then open its address while logged in as `employer@` and `admin@` (C6: 403); retire one of `candidate@`'s needs as admin (C7) and see "no longer offered" and "of 4". Record each result in the build notes.
- [ ] **Step 3: C8**: C1–C5 with the keyboard only at 360 px; check that counts and saves are read out (live region text) and nothing scrolls sideways.
- [ ] **Step 4: Reviews** (spec §4.2): Superpowers code review of the 3B diff from `d008099`, and GSD code review, UI audit and security audit of the changed files against §8's 3B rows. Fix what they find, test-first. Ask a groupmate to run NVDA on Windows through Find jobs (spec §4.2); note the result when it comes.
- [ ] **Step 5: Update the README and build notes, then commit the frontend**

```bash
git add frontend README.md .planning/PHASE_3_PLAN.md
git commit -m "Add My profile, My résumé, My needs, Find jobs matching and the candidate dashboard (Phase 3B)" -m "<bullets>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Push** with `git push origin main` (`ryujiinnn08/opendoor-ipt`). Then tell the user Phase 3 is finished, with screenshots of Find jobs for both demo job seekers.
