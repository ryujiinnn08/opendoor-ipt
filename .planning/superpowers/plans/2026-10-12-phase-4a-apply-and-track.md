# Phase 4A: Apply and Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A job seeker applies for an open job with an optional cover note and interview accommodation request, after seeing what the employer will see; follows every application on **My applications** and its own page (the application's path); withdraws while Pending or Reviewed; and confirms **I was hired** from Reviewed. Nobody else can read any of it.

**Architecture:** Laravel gets an `applications` table, an `ApplicationStatus` enum that holds the papers' Table 1 (`canTransitionTo($next, $actor)`), and one `ApplicationWorkflow` service that applies and changes status inside a transaction with a row lock. A hire (here, the job seeker's confirmation) copies the job's accommodations to `application_accommodation` for Phase 5. Role-aware endpoints follow the papers' names (`/api/applications…`); in 4A only job seekers use them, and 4B adds the employer branch. React adds the Apply page, My applications, the application page, an Apply box on both job pages and a dashboard tile.

**Tech Stack:** Laravel 12 on a PHP 8.2 platform, Sanctum SPA cookies, MySQL 8 / XAMPP MariaDB 10.4 (SQLite in tests); React 19, React Router 7, Tailwind CSS 4, Vitest + Testing Library + vitest-axe, oxlint. Icons only through `Icon` (Icons8 Fluency Systems Regular).

**Spec:** `.planning/PHASE_4_PLAN.md` (approved 2026-10-12, every recommendation in §3): §1 (4A), §2, §3, §4.1–4.3 (job seeker rows), §5 (A1–A7), §6.1–6.5 (4A rows), §7, §8 (4A rows), §9 steps 1–2 and the demo data, Appendix A (4A rows), B and C.

**Base commit:** `4422dc7` plus the commit that approves the spec and adds this plan.

## Global Constraints

- PHP must run on 8.2: no typed class constants, no `#[\Override]`, no `json_validate()`.
- Migrations: datetime columns use `dateTime()`, not `timestamp()` (README, MariaDB 10.4). `hired_at` is a `date` in Philippine time (`JobPosting::today()`).
- Table 1, verbatim: "(none) → Pending: Candidate, the posting is open and the candidate has not applied to it before. Pending → Reviewed: Employer opens the application. Pending or Reviewed → Withdrawn: Candidate, before a hiring decision; final. Reviewed → Rejected: Employer, final. Reviewed → Hired: Employer or candidate, hire date recorded; the confirming party is stored." Everything else is refused, including moving backward. Applications are never deleted.
- "One application per job seeker per job, ever (a unique index). Withdrawing doesn't allow applying again."
- Apply needs "an active job seeker, to a job that's open and not past its closing date (the same 'open job' rule as Browse jobs)", i.e. `JobPosting::publiclyVisible()`.
- Text limits: cover note up to 3,000 characters, interview request up to 1,000; both optional plain text. Status, dates and the job seeker are never taken from the request.
- "10 applications a minute per account."
- Nothing is required in the profile before applying (Q1).
- Privacy: an application, its texts and whether someone applied reach only that job seeker in 4A (the employer branch comes in 4B). The server checks every rule.
- Status words and sentences come from spec §7 and live in one place (`lib/applicationText.js`):
  - Pending (purple tint, clock): "Sent. The employer hasn't opened it yet."
  - Reviewed (purple tint, `door`): "The employer has opened your application. If they want to interview you, they'll contact you by email or phone."
  - Hired (green tint, check): "Congratulations. About 30 days after your hire date, we'll ask whether each accommodation was provided."
  - Rejected (grey, minus): "The employer chose other applicants for this job. Your other applications aren't affected."
  - Withdrawn (grey, minus): "You withdrew this application."
- Other copy from spec §7: "Apply for this job"; guests "Log in to apply"; interview hint "This job's interview is online. For example: captions, a chat option or more time." (label marked optional by `FormField`, so the hint doesn't say "Optional" again); "Send application", then "Your application was sent to {employer}."; "You applied on {date}. Status: {label}." with **View your application**; "This job isn't taking applications."; empty list "You haven't applied for any jobs yet." with **Find jobs**; withdraw dialog "Withdraw your application for {title}? You can't undo this or apply for this job again."; hire dialog "Confirm that {employer} hired you for {title}?"; from Pending "If you were hired, ask the employer to open your application on OpenDoor first."; stale "This application changed while you were looking at it. Reload to see its status."
- Design (spec §7): the application's path is the one bold element: an ordered list, filled ink markers for steps passed (with dates), the current step bold with its sentence, steps ahead with the muted open circle (`Icon name="circle"`); state in text ("Done", "Current step", "Not yet"). Rejected and Withdrawn are grey, never red. Ruled rows; no new colours, motion or icons; 44 px targets; no sideways scrolling at 360 px; dialogs focus Cancel first and return focus.
- Accessibility (3A/3B lessons): every state of a page keeps the same `PageHeader`; latest request wins; announcements through `useAnnounce()`; focus moves with effects after render.
- Seeders never change existing data.
- Two commits on `main`: backend (end of Task 5) and frontend (end of Task 10), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push to `origin` (`ryujiinnn08/opendoor-ipt`).

## Review Focus

1. **Racing changes.** The job seeker withdraws in one tab while another tab (or, in 4B, the employer) changes the status: the second request carries a stale `expected_status` and gets 409 with the stale message, never a silent overwrite. Test: Task 4 `test_a_stale_change_is_refused`.
2. **Applying twice at the same moment.** Two quick submits (double click, two tabs) produce one application; the second gets 409 "You've already applied for this job." even when the unique index, not the first check, catches it. Test: Task 2 `test_the_unique_index_answers_like_the_check`.
3. **Jobs that stop being open.** An application whose job was later closed, sent back for approval, or deleted still lists with its title and "This job isn't taking applications right now." or "This job was removed."; applying to any of those is refused. Tests: Task 2 `test_only_open_jobs_take_applications`, Task 3 `test_closed_and_removed_jobs_keep_their_applications`.
4. **Someone else's application.** Another job seeker, an employer, an admin or a guest asking for `/api/applications/{id}` or changing its status is refused, and the job page never tells anyone but the applicant that they applied. Tests: Task 3 `test_only_the_owner_reads_an_application`, Task 5 `PrivacyTest::test_applications_stay_with_their_job_seeker`.
5. **The Apply page after a refusal.** A 409 (already applied) or 404 (job closed meanwhile) while sending keeps the typed text visible and shows the matching message with a link, instead of a generic error. Test: Task 8 `explains when the job closed while writing`.

## File map

**Backend (`backend/`)**

| File | Responsibility |
|---|---|
| `app/Enums/ApplicationStatus.php`, `ApplicationActor.php` | Statuses with labels and Table 1; who acts (candidate, employer) |
| `database/migrations/2026_10_12_100000_create_applications_table.php`, `…100100_create_application_accommodation_table.php` | Tables |
| `app/Models/Application.php`; `JobPosting.php`, `User.php` | Model and relations |
| `app/Services/ApplicationWorkflow.php` | Apply and change status (the only writer of `status`) |
| `app/Policies/ApplicationPolicy.php` | Who may read and act |
| `app/Http/Requests/Candidate/ApplyRequest.php`, `ApplicationListRequest.php`, `ApplicationStatusRequest.php` | Validation |
| `app/Http/Resources/CandidateApplicationResource.php` | The job seeker's view of an application |
| `app/Http/Controllers/ApplicationController.php`, `ApplicationStatusController.php` | Role-aware endpoints (job seeker branch in 4A) |
| `app/Http/Controllers/Public/JobPostingController.php`, `PublicJobPostingResource.php`, `Candidate/DashboardController.php` | `my_application`, dashboard counts |
| `routes/api.php` | Routes |
| `database/seeders/DemoApplicationSeeder.php`, `DatabaseSeeder.php` | Demo applications |
| `tests/Unit/ApplicationStatusTest.php`, `tests/Feature/Applications/*Test.php`, `tests/Feature/Candidate/DashboardTest.php`, `PrivacyTest.php`, `tests/Feature/MasterData/SeederTest.php` | Tests |

**Frontend (`frontend/src/`)**

| File | Responsibility |
|---|---|
| `api/applications.js` | The application endpoints |
| `lib/applicationText.js` | Status labels, tones, icons, sentences, filters, interview hints |
| `components/applications/ApplicationStatusBadge.jsx`, `ApplicationPath.jsx`, `ApplicationActions.jsx`, `ApplicationRow.jsx`, `ApplyBox.jsx`, `WhatEmployersSee.jsx` | Building blocks |
| `portals/candidate/ApplyPage.jsx`, `MyApplicationsPage.jsx`, `ApplicationPage.jsx`, `CandidateDashboard.jsx` | Pages |
| `portals/public/JobPage.jsx` | The Apply box under the needs fit |
| `router.jsx`, `components/layout/portalMenus.js` | Routes and the menu |
| `test/applicationFixture.js` | Applications in the API shape |

---

### Task 1: Statuses, tables and the model

**Files:**
- Create: `app/Enums/ApplicationStatus.php`, `app/Enums/ApplicationActor.php`, the two migrations, `app/Models/Application.php`, `database/factories/ApplicationFactory.php`
- Modify: `app/Models/JobPosting.php`, `app/Models/User.php`
- Test: `tests/Unit/ApplicationStatusTest.php`, `tests/Feature/Applications/ApplicationModelTest.php`

**Interfaces:**
- Produces:
  - `enum ApplicationActor: string { Candidate = 'candidate'; Employer = 'employer'; }` (also the stored `hire_confirmed_by`).
  - `enum ApplicationStatus: string { Pending = 'pending'; Reviewed = 'reviewed'; Hired = 'hired'; Rejected = 'rejected'; Withdrawn = 'withdrawn'; }` with `label(): string` (the five words), `isFinal(): bool` (Hired, Rejected, Withdrawn), `canTransitionTo(self $next, ApplicationActor $actor): bool` (Table 1, nothing else), `static waiting(): list<self>` ([Pending, Reviewed]) and `static closed(): list<self>` ([Rejected, Withdrawn]).
  - `applications`: `id`; `job_posting_id` (restrict); `user_id` (the job seeker, restrict); `status` string(20) default `pending`; `cover_note` text null; `interview_request` text null; `reviewed_at`, `rejected_at`, `withdrawn_at` dateTime null; `hired_at` date null; `hire_confirmed_by` string(20) null; `decided_by` (users, null on delete) null; timestamps; unique (`job_posting_id`, `user_id`); index (`job_posting_id`, `status`); index (`user_id`, `created_at`).
  - `application_accommodation`: `application_id` (cascade), `accommodation_id` (restrict), `note` string(255) null; primary (`application_id`, `accommodation_id`).
  - `Application` model: `$fillable = ['cover_note', 'interview_request']` only; casts `status` → `ApplicationStatus`, `hire_confirmed_by` → `ApplicationActor`, dates. Relations `jobPosting(): BelongsTo` (**withTrashed**), `candidate(): BelongsTo` (User, `user_id`), `hiredAccommodations(): BelongsToMany` (`application_accommodation`, pivot `note`). Scope `inFilter(Builder, string $filter)` for `all|waiting|hired|closed`.
  - `JobPosting::applications(): HasMany`; `User::applications(): HasMany`.
  - `ApplicationFactory` with states `reviewed()`, `hired()`, `rejected()`, `withdrawn()` setting the matching date; default job posting `JobPosting::factory()->open()`, default user a job seeker.

- [ ] **Step 1: Write the failing tests**
  - `ApplicationStatusTest::test_table_1_and_nothing_else`: loop every (from, to, actor) of 5×5×2; allowed exactly these 6: (Pending→Reviewed, Employer), (Pending→Withdrawn, Candidate), (Reviewed→Withdrawn, Candidate), (Reviewed→Rejected, Employer), (Reviewed→Hired, Employer), (Reviewed→Hired, Candidate).
  - `test_final_statuses`: `isFinal()` true only for Hired, Rejected, Withdrawn; `label()` for each.
  - `ApplicationModelTest::test_one_application_per_job_and_job_seeker`: a second row for the same pair throws `UniqueConstraintViolationException`.
  - `test_status_and_dates_are_not_mass_assignable`: `new Application(['status' => 'hired', 'hired_at' => '2026-01-01', 'cover_note' => 'Hi'])` keeps status `Pending`, `hired_at` null, cover note "Hi".
  - `test_a_deleted_job_is_still_reachable`: soft-delete the posting; `$application->fresh()->jobPosting->title` still returns.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter='ApplicationStatusTest|ApplicationModelTest'`. Expected: FAIL (classes missing).
- [ ] **Step 3: Implement** the enums, migrations, model, relations and factory.
- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 2: Apply

**Files:**
- Create: `app/Services/ApplicationWorkflow.php`, `app/Http/Requests/Candidate/ApplyRequest.php`, `app/Http/Controllers/ApplicationController.php`, `app/Http/Resources/CandidateApplicationResource.php`
- Modify: `routes/api.php`, `app/Http/Controllers/Public/JobPostingController.php`, `app/Http/Resources/PublicJobPostingResource.php`, `app/Models/JobPosting.php`
- Test: `tests/Feature/Applications/ApplyTest.php`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `ApplicationWorkflow::apply(User $seeker, int $jobId, ?string $coverNote, ?string $interviewRequest): Application`. Looks the job up with `JobPosting::publiclyVisible()`; missing → `abort(response()->json(['message' => "This job isn't taking applications."], 404))`. Existing application, or `UniqueConstraintViolationException` on insert → 409 `{"message": "You've already applied for this job.", "application_id": <id>}`.
  - `POST /api/job-postings/{id}/applications` (`where id [0-9]{1,18}`) inside `auth:sanctum` → `active` → `role:candidate`, with `throttle:10,1,applications`. `ApplyRequest`: `cover_note` `nullable|string|max:3000`, `interview_request` `nullable|string|max:1000`. Answers 201 with `CandidateApplicationResource`.
  - `CandidateApplicationResource` (the shape every 4A endpoint returns): `id`, `status`, `status_label`, `applied_at` (ISO), `reviewed_at`, `rejected_at`, `withdrawn_at` (ISO or null), `hired_at` (`Y-m-d` or null), `hire_confirmed_by` (`candidate|employer|null`), `cover_note`, `interview_request`, `actions` (list of `withdraw`, `confirm_hire`: what this job seeker may do now), `job`: `{ id, title, interview_format, state: 'open'|'not_open'|'removed', employer: { id, name, type, is_verified } }`. Task 3 adds `job.accommodations` on the detail endpoint.
  - `JobPosting` gains `public ?array $myApplication = null;` and `PublicJobPostingResource` adds `'my_application' => $this->when(… !== null, …)` with `{ id, status, status_label, applied_at }`. `Public\JobPostingController::show()` fills it only for an active job seeker who applied.

- [ ] **Step 1: Write the failing tests** (`RefreshDatabase`; job seeker = `User::factory()->create()`)
  - `test_a_job_seeker_applies_with_optional_texts`: POST with both texts → 201; `data.status` `pending`, `data.cover_note`, `data.interview_request`, `data.actions` `['withdraw']`, `data.job.state` `open`; one row in the database. POST to another job with `{}` → 201 with both texts null; `"   "` is stored as null.
  - `test_only_open_jobs_take_applications`: draft, pending, rejected, closed, expired and soft-deleted postings → 404 with "This job isn't taking applications."; no rows.
  - `test_once_per_job_even_after_withdrawing`: second POST → 409 with the message and `application_id`; a withdrawn application also → 409.
  - `test_the_unique_index_answers_like_the_check`: register `Application::creating(fn () => DB::table('applications')->insert([...same job and job seeker, status 'pending', timestamps]))` once, so the existence check passes and the insert collides; POST → 409 with the same message and the `application_id` of the row that won.
  - `test_texts_are_limited_and_status_cannot_be_sent`: 3,001-character cover note and 1,001-character request → 422 on each field; POST with `status: 'hired'`, `hired_at`, `user_id` of someone else → 201, `pending`, owned by the logged-in job seeker.
  - `test_only_active_job_seekers_apply`: guest 401; employer, admin 403; suspended job seeker 403 (the `active` middleware).
  - `test_applying_is_rate_limited`: the 11th POST within a minute (to 11 different open jobs) → 429.
  - `test_the_job_page_tells_only_the_applicant`: after applying, `GET /api/job-postings/{id}` as the job seeker has `data.my_application.status` `pending`; as another job seeker, an employer, an admin and a guest the key is absent.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=ApplyTest`. Expected: FAIL.
- [ ] **Step 3: Implement.** `ApplicationController::store(ApplyRequest $request, int $id, ApplicationWorkflow $workflow)`. The resource computes `job.state` with `trashed()` → `removed`, else `displayStatus() === Open` → `open`, else `not_open`; `actions` from `ApplicationStatus::canTransitionTo(…, Candidate)` (Withdrawn → `withdraw`, Hired → `confirm_hire`).
- [ ] **Step 4: Run them and see them pass**: `cd backend && php artisan test --filter='ApplyTest|PublicJobSearchTest|MatchingTest'`. Expected: PASS.

---

### Task 3: My applications and one application

**Files:**
- Create: `app/Policies/ApplicationPolicy.php`, `app/Http/Requests/Candidate/ApplicationListRequest.php`
- Modify: `ApplicationController.php`, `CandidateApplicationResource.php`, `routes/api.php`
- Test: `tests/Feature/Applications/MyApplicationsTest.php`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces:
  - `ApplicationPolicy::view(User $user, Application $application): Response` (4A: allow the owning job seeker; deny everyone else with "This application isn't yours."). 4B adds the employer branch here.
  - `GET /api/applications?status=all|waiting|hired|closed&page=` (inside `auth:sanctum` → `active`, no role middleware: the controller branches on role; in 4A a non-job seeker gets 403 "Only job seekers have applications."). Newest first (`created_at` desc, `id` desc), 12 per page, eager-loaded (`jobPosting.employer` with trashed postings). Answers `{ data: CandidateApplicationResource[], meta: { current_page, last_page, per_page, total }, counts: { all, waiting, hired, closed } }`; unknown `status` → 422.
  - `GET /api/applications/{application}` → `CandidateApplicationResource` plus `job.accommodations` (the job's accommodations **as they are now**, display order, `{ id, name, group_name, note }`) and, for Hired, `hired_accommodations` (the copy, same shape).

- [ ] **Step 1: Write the failing tests**
  - `test_lists_own_applications_newest_first_with_counts`: five of the job seeker's applications (one per status) and two of another job seeker's → `data` 5 items newest first, `counts` `{all: 5, waiting: 2, hired: 1, closed: 2}`; `?status=waiting` → the Pending and Reviewed ones; `?status=closed` → Rejected and Withdrawn; `?status=bogus` → 422.
  - `test_pages_of_12`: 13 applications → page 1 has 12, `meta.last_page` 2.
  - `test_closed_and_removed_jobs_keep_their_applications`: jobs closed, sent back to pending, and soft-deleted after applying → still listed with their titles and `job.state` `not_open`, `not_open`, `removed`.
  - `test_only_the_owner_reads_an_application`: owner 200 with `job.accommodations`; another job seeker 403 "This application isn't yours."; employer and admin 403; guest 401; list as employer/admin 403.
  - `test_the_list_does_not_query_per_application`: count queries for 3 and for 10 applications; equal.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=MyApplicationsTest`. Expected: FAIL.
- [ ] **Step 3: Implement** (register the policy if not auto-discovered; `Gate::authorize('view', $application)`).
- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 4: Withdraw and I was hired

**Files:**
- Create: `app/Http/Requests/Candidate/ApplicationStatusRequest.php`, `app/Http/Controllers/ApplicationStatusController.php`
- Modify: `ApplicationWorkflow.php`, `ApplicationPolicy.php`, `routes/api.php`
- Test: `tests/Feature/Applications/ApplicationStatusChangeTest.php`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `ApplicationWorkflow::changeStatus(Application $application, ApplicationStatus $next, ApplicationActor $actor, ApplicationStatus $expected, User $by): Application`. In `DB::transaction`: reload with `lockForUpdate()`; status ≠ `$expected` → 409 with the stale message; `! canTransitionTo` → 422 `{"message": <reason>}` where Hired from Pending by the candidate says "If you were hired, ask the employer to open your application on OpenDoor first." and anything else says "This application can't be changed to {label}."; sets the step's date (`withdrawn_at`/`rejected_at` now, `reviewed_at` now, `hired_at` `JobPosting::today()`), `hire_confirmed_by` for Hired, `decided_by` for Hired/Rejected; for Hired copies the job's current accommodations and notes (`withTrashed` posting) into `hiredAccommodations`. 4B reuses this for employers and hooks notifications here.
  - `ApplicationPolicy::actAsCandidate(User $user, Application $application): Response` (owner only, same message).
  - `PATCH /api/applications/{application}/status` with `status` `required|in:withdrawn,hired` and `expected_status` `required|in:pending,reviewed,hired,rejected,withdrawn` (4B widens `status` for employers). Answers `CandidateApplicationResource`.

- [ ] **Step 1: Write the failing tests**
  - `test_withdraw_from_pending_and_reviewed`: each → 200, `withdrawn`, `withdrawn_at` set, `actions` `[]`.
  - `test_confirm_hire_only_from_reviewed`: Reviewed → 200, `hired`, `hired_at` today in Manila (freeze time at `2026-10-12 17:30 UTC` → `2026-10-13`), `hire_confirmed_by` `candidate`, `hired_accommodations` equals the job's accommodations with notes. Pending → 422 with the "ask the employer" sentence.
  - `test_final_statuses_never_move`: from Withdrawn, Rejected and Hired, both `withdrawn` and `hired` → 422; nothing changes.
  - `test_a_stale_change_is_refused`: application Reviewed, request with `expected_status: pending` → 409 with the stale message; still Reviewed.
  - `test_the_hire_copy_keeps_what_was_advertised`: confirm hire, then the employer edits the posting's accommodations → `hiredAccommodations` unchanged.
  - `test_only_the_owner_changes_it`: another job seeker, employer, admin → 403; guest 401; `status: rejected` or `reviewed` from the job seeker → 422 validation.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=ApplicationStatusChangeTest`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 5: Dashboard counts, demo applications, privacy and the backend commit

**Files:**
- Create: `database/seeders/DemoApplicationSeeder.php`
- Modify: `app/Http/Controllers/Candidate/DashboardController.php`, `database/seeders/DatabaseSeeder.php`, `tests/Feature/Candidate/DashboardTest.php`, `tests/Feature/Candidate/PrivacyTest.php`, `tests/Feature/MasterData/SeederTest.php`, `README.md` (demo accounts table)

**Interfaces:**
- Produces: `GET /api/candidate/dashboard` adds `applications: { all, waiting, hired, closed }` (the same counts as Task 3, one query with conditional sums or the scope).

**The demo applications** (only for a demo job seeker with no applications; jobs found by title within the demo company `UserSeeder::DEMO_EMPLOYER_EMAIL`; a missing job is skipped with a warning):

| Job seeker | Job (department) | Status | Dates and texts |
|---|---|---|---|
| `candidate@` | Junior Web Developer (IT) | Pending | applied 1 day ago; cover note "I build accessible spreadsheets and simple web forms, and I'd like to grow into web development." |
| `candidate@` | Graphic Designer (IT) | Reviewed | applied 4 days ago, opened 2 days ago |
| `candidate@` | HR Assistant (Human Resources) | Rejected | applied 9 days ago, opened 8, rejected 6 |
| `candidate@` | Office Clerk (Human Resources, closed) | Hired, by the employer | applied 45 days ago, opened 40, **hired 31 days ago**; hire copy of the job's accommodations |
| `candidate2@` | HR Assistant (Human Resources) | Pending | applied today; interview request "A sign language interpreter for the interview, please. I can also do a chat-based interview." |
| `candidate2@` | Junior Web Developer (IT) | Withdrawn | applied 6 days ago, withdrawn 3 days ago |

Rows are written directly (status and dates set with `forceFill`), not through the workflow, because they are back-dated.

- [ ] **Step 1: Write the failing tests**
  - `DashboardTest::test_counts_applications_by_filter`: one per status → `applications` `{all: 5, waiting: 2, hired: 1, closed: 2}`; a new job seeker → all zeros.
  - `SeederTest::test_demo_applications`: after `db:seed`, `candidate@` has 4 applications (statuses as above, the Hired one with `hired_at` 31 days before today in Manila and a non-empty hire copy) and `candidate2@` has 2; seeding twice changes nothing.
  - `PrivacyTest::test_applications_stay_with_their_job_seeker`: with the demo data, `/api/applications/{id}` of `candidate@`'s application as `candidate2@`, an employer, an admin → 403; their `/api/job-postings/{id}` responses have no `my_application`; no cover note or interview request text appears in any of their JSON.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter='DashboardTest|SeederTest|PrivacyTest'`. Expected: FAIL.
- [ ] **Step 3: Implement** the counts and the seeder (after `DemoCandidateSeeder` in `DatabaseSeeder`); add the demo applications to the README's demo accounts section.
- [ ] **Step 4: Run the whole backend suite**: `cd backend && php artisan test && vendor/bin/pint --dirty --test`. Expected: PASS.
- [ ] **Step 5: Commit the backend**

```bash
git add backend README.md
git commit -m "Add applications, withdraw and hire confirmation API (Phase 4A backend)" -m "<bullets: applications with Table 1 in ApplicationStatus, apply once per open job, My applications with filters and counts, withdraw, I was hired with the hire copy, stale changes refused, job page and dashboard additions, demo applications, privacy tests, N tests>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Frontend data layer, status text, badge and path

**Files:**
- Create: `api/applications.js`, `lib/applicationText.js`, `components/applications/ApplicationStatusBadge.jsx`, `components/applications/ApplicationPath.jsx`, `test/applicationFixture.js`
- Test: `lib/applicationText.test.js`, `components/applications/ApplicationStatusBadge.test.jsx`, `components/applications/ApplicationPath.test.jsx`

**Interfaces:**
- Consumes: the Task 2–4 response shapes.
- Produces:
  - `api/applications.js`: `applyForJob(jobId, { cover_note, interview_request })` → application; `listApplications({ status, page })` → `{ applications, meta, counts }`; `getApplication(id)` → application; `changeApplicationStatus(id, { status, expected_status })` → application.
  - `lib/applicationText.js`: `APPLICATION_STATUSES` (`{ pending: { label, tone, icon, next }, … }` with the Global Constraints values), `APPLICATION_FILTERS` (`[{ value: 'all', label: 'All' }, { value: 'waiting', label: 'Waiting' }, { value: 'hired', label: 'Hired' }, { value: 'closed', label: 'Closed' }]`), `interviewHint(format)` (`online`: "This job's interview is online. For example: captions, a chat option or more time."; `on_site`: "This job's interview is on-site. For example: a ground-floor room, a sign language interpreter or more time."; `online_or_on_site`: "This job's interview can be online or on-site. Say which you prefer and what you need."), `JOB_STATE_TEXT` (`not_open`: "This job isn't taking applications right now.", `removed`: "This job was removed.").
  - `ApplicationStatusBadge({ status })` on `StatusBadge`.
  - `ApplicationPath({ application })`: an `<ol>` of three steps (Sent, Opened by the employer, Decision); Withdrawn replaces the steps not reached with one **Withdrawn** step; each `<li>` has its date (`formatDate`/`formatDay`) and a visually hidden state ("Done", "Current step", "Not yet"); the current step carries the status sentence; Hired by the job seeker adds "Confirmed by you".
  - `test/applicationFixture.js`: `applicationFixture(overrides)` in the `CandidateApplicationResource` shape (Junior Web Developer, Acme Corp., Pending, `actions: ['withdraw']`).

- [ ] **Step 1: Write the failing tests**: every status renders its label and icon; Rejected and Withdrawn use the neutral tone; `interviewHint` for the three formats and `null` → `null`; the path for Pending (Sent is the Current step with "Sent. The employer hasn't opened it yet."; the other two "Not yet"), Reviewed (Sent Done; Opened by the employer Current, with its sentence; Decision Not yet), Hired by the employer and by the job seeker (all Done; Decision reads "Hired" as Current, with its sentence; the second adds "Confirmed by you"), Rejected (Decision reads "Rejected"), Withdrawn from Pending (Sent Done, then Withdrawn as Current); `axe` passes.
- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/lib/applicationText.test.js src/components/applications`. Expected: FAIL.
- [ ] **Step 3: Implement.** Markers: passed steps `Icon name="check"` in ink on a filled circle, the current step bold, steps ahead `Icon name="circle"` muted; a 2 px ink line on the left joins them (`border-l-2 border-text`), muted after the current step.
- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 7: Actions, rows and My applications

**Files:**
- Create: `components/applications/ApplicationActions.jsx`, `components/applications/ApplicationRow.jsx`, `portals/candidate/MyApplicationsPage.jsx`
- Modify: `router.jsx`, `components/layout/portalMenus.js` (+ `portalMenus.test.js`)
- Test: `components/applications/ApplicationActions.test.jsx`, `portals/candidate/MyApplicationsPage.test.jsx`

**Interfaces:**
- Consumes: Task 6.
- Produces:
  - `ApplicationActions({ application, onChanged })`: **Withdraw application** when `actions` has `withdraw`; **I was hired** when it has `confirm_hire`; for a Pending application, the hint sentence instead of **I was hired**. Each opens `ConfirmDialog` (withdraw `confirmVariant="danger"`, hire `"primary"`) with the Global Constraints copy, sends `changeApplicationStatus(id, { status, expected_status: application.status })`, shows a 409/422 message inside the dialog, and on success calls `onChanged(updated)` and announces "Application withdrawn." or "Marked as hired.". Buttons carry `aria-label`s naming the job ("Withdraw application for Junior Web Developer").
  - `ApplicationRow({ application, onChanged })`: a ruled `<li>`: `<h3>` job title linking to `/candidate/applications/:id`; employer name; `ApplicationStatusBadge`; "Applied {date}"; the status sentence; `JOB_STATE_TEXT` when the job isn't open; `ApplicationActions`.
  - Route `/candidate/applications` → `MyApplicationsPage`; menu **Dashboard · Find jobs · My applications · My needs · My profile** (`end: false` on My applications).
  - `MyApplicationsPage`: `PageHeader` "My applications"; `FilterTabs` label "Show" with counts in the labels ("Waiting (2)"); filter and page in the address (`?status=waiting&page=2`, default `all`, unknown values → `all`); the count heading ("6 applications", "1 application") which takes focus after a page change; rows; `Pagination`; `EmptyState` ("You haven't applied for any jobs yet." with **Find jobs** for `all`; "No applications here." for other filters); a `location.state.sent` notice "Your application was sent to {employer}." shown once and announced; after `onChanged` it reloads the list and counts (latest request wins).

- [ ] **Step 1: Write the failing tests**: actions per status (Pending: Withdraw + hint; Reviewed: both; final: none); withdraw confirm sends `{ status: 'withdrawn', expected_status: 'reviewed' }` and calls `onChanged`; a 409 shows the stale sentence in the dialog; the page lists rows, switches filter through the address, shows counts, shows each empty state, shows and announces the sent notice, reloads after a change; the menu test includes My applications; `axe` passes.
- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/components/applications src/portals/candidate/MyApplicationsPage.test.jsx src/components/layout`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass**: same command. Expected: PASS.

---

### Task 8: Apply box and the Apply page

**Files:**
- Create: `components/applications/ApplyBox.jsx`, `components/applications/WhatEmployersSee.jsx`, `portals/candidate/ApplyPage.jsx`, `lib/profileSections.js`
- Modify: `portals/public/JobPage.jsx`, `router.jsx`, `portals/candidate/CandidateDashboard.jsx` (imports the moved `SECTIONS`)
- Test: `components/applications/ApplyBox.test.jsx`, `components/applications/WhatEmployersSee.test.jsx`, `portals/candidate/ApplyPage.test.jsx`, `portals/public/JobPage.test.jsx`

**Interfaces:**
- Consumes: Tasks 6–7; `getJob`, `getProfile`, `useAuth`.
- Produces:
  - `ApplyBox({ job })` (a `<section>` headed "Apply"): guest → **Log in to apply** (`/login?next=` + encoded `/candidate/jobs/:id/apply`) and "New here? Register as a job seeker" (`/register`); job seeker with `job.my_application` → "You applied on {date}. Status: {label}." and **View your application** (`/candidate/applications/:id`); job seeker → **Apply for this job** (`PRIMARY_LINK` to `/candidate/jobs/:id/apply`); employer or admin → "Job seekers apply from this page.".
  - `JobPage` passes `fit={<>{NeedsFit…}<ApplyBox job={job} /></>}` so the box sits under **How this job fits your needs** on both the public and the candidate job page.
  - Route `/candidate/jobs/:id/apply` → `ApplyPage` (a guest reaching it goes to login and comes back, via `ProtectedRoute`).
  - `WhatEmployersSee({ profile })`: a list: "Your profile and My résumé" (link `/candidate/profile/resume`), "Your uploaded résumé: {name}" if any, "Your accommodation needs" (link `/candidate/needs`), "Your disability type" only if `show_disability` and set, "Your email and contact number"; then, if headline, location, contact number, education or skills are empty, "These parts of your profile are empty:" with links (the dashboard's `SECTIONS` wording and anchors, moved to `lib/profileSections.js` and reused by the dashboard).
  - `ApplyPage`: loads the job and the profile together; `PageHeader` "Apply for {title}" ("Apply for this job" while loading); employer line; **Cover note** (`textarea`, optional, `maxLength` 3000); **Interview accommodation request** (`textarea`, optional, `maxLength` 1000, `interviewHint(job.interview_format)`); `WhatEmployersSee`; **Send application**. Already applied (from `my_application` or a 409) → the Notice "You've already applied for this job." with **View your application**; 404 → "This job isn't taking applications." with **Browse open jobs**; 422 → `ErrorSummary` with field errors. On success → `navigate('/candidate/applications', { state: { sent: employerName } })`.

- [ ] **Step 1: Write the failing tests**: ApplyBox in its four states (and the encoded `next`); WhatEmployersSee with a full profile, an empty one (lists the five links), and the disability line only when shown; ApplyPage sends both texts and navigates with the state; `explains when the job closed while writing` (404 on send keeps the typed text and shows the message); a 409 shows the already-applied notice with the link from `application_id`; 422 shows the summary; the hint follows the interview format; JobPage shows the Apply box for a guest and a job seeker; `axe` passes.
- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/components/applications src/portals/candidate/ApplyPage.test.jsx src/portals/public/JobPage.test.jsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass**: same command, plus `src/portals/candidate/CandidateDashboard.test.jsx` (the moved sections). Expected: PASS.

---

### Task 9: The application page and the dashboard tile

**Files:**
- Create: `portals/candidate/ApplicationPage.jsx`
- Modify: `router.jsx`, `portals/candidate/CandidateDashboard.jsx`
- Test: `portals/candidate/ApplicationPage.test.jsx`, `portals/candidate/CandidateDashboard.test.jsx`

**Interfaces:**
- Consumes: Tasks 6–8; the dashboard's new `applications` counts.
- Produces:
  - Route `/candidate/applications/:id` → `ApplicationPage` (ids checked with `RECORD_ID`, as `JobPage` does). `PageHeader` with the job title ("Application" while loading or on error); employer name and Verified badge; `ApplicationStatusBadge`; **Your application** (`ApplicationPath`); `ApplicationActions` (on change, the page shows the updated application; focus stays on the heading); **The job**: a link to `/candidate/jobs/:id` when `open`, else `JOB_STATE_TEXT`, and the accommodations as listed now (amber, as `JobDetails` lists them); for Hired, "Accommodations when you were hired" from `hired_accommodations`; **What you sent**: a `<dl>` of Cover note and Interview request ("Nothing" when empty; line breaks kept); **Back to My applications**. 403/404 → "We couldn't find this application." with **My applications**; other errors → **Try again**.
  - Dashboard: the coming-soon tile becomes `DashboardTile` "My applications" with `to="/candidate/applications"`, `linkLabel="See my applications"`, lines "2 waiting" and "1 hired" (non-zero only; "You haven't applied for any jobs yet." when all is 0).

- [ ] **Step 1: Write the failing tests**: the page for Pending, Reviewed (both actions), Hired by candidate (the hire copy section, "Confirmed by you"), a removed job (no job link, "This job was removed."), not found, an action updating the page in place; the dashboard tile lines and the empty sentence; `axe` passes.
- [ ] **Step 2: Run them and see them fail**: `cd frontend && npx vitest run src/portals/candidate`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole frontend suite and the build**: `cd frontend && npm run test && npm run lint && npm run build`. Expected: PASS; no new lint warnings.

---

### Task 10: Checks, walk-through, reviews, docs, commit and push

**Files:**
- Modify: `.planning/PHASE_4_PLAN.md` (status line and "Phase 4A build notes"), `README.md` (what's new, if pages are listed there)

- [ ] **Step 1: Walk through A1–A6 in the browser** on a separate copy of the database (`opendoor_verify`, as in Phase 3), at 1024 px and 360 px: guest → Log in to apply → back on the Apply page; send; My applications with the notice; the job page says "You applied on …"; try again by address (already applied); withdraw; closed, waiting and past-date jobs by address; an employer and the admin opening `/candidate/applications`.
- [ ] **Step 2: A7**: A1–A4 with the keyboard only, at 360 px and with large text; check the announcements in the live region.
- [ ] **Step 3: Reviews**: Superpowers code review of the 4A diff; GSD code review, UI review and security audit (4A rows of spec §8). Fix what they find, with tests, and re-run both suites.
- [ ] **Step 4: Docs**: the spec's status line ("4A built …") and **Phase 4A build notes** (what was found and fixed, what's left for 4B or the audit days).
- [ ] **Step 5: Commit the frontend and docs, then push**

```bash
git add frontend .planning/PHASE_4_PLAN.md README.md
git commit -m "Add Apply, My applications and the application page (Phase 4A)" -m "<bullets>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```
