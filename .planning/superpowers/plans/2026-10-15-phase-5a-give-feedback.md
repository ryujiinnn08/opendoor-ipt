# Phase 5A: Give Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hired job seeker, from 30 days after the hire date, rates each accommodation the job advertised when they were hired (Delivered, Partly delivered, Not delivered, I didn't use this) with an optional comment, once; every saved feedback recalculates the employer's stored trust score; the dashboard, My applications and the application page say when feedback is due, open or sent.

**Architecture:** New `feedback` and `feedback_items` tables, a `FeedbackRating` enum, and two services: `FeedbackService` (the only writer of feedback; checks Hired, the window, once, and the exact hire copy) and `TrustScore` (the only writer of `employers.trust_score` and `feedback_count`). Feedback has its own controller under the existing `no.store` application routes. React adds `FeedbackForm`, `FeedbackPage` and `FeedbackSummary`, and reads a `feedback` block added to each hired application.

**Tech Stack:** Laravel 12 on PHP 8.2, Sanctum SPA cookies, MySQL 8 / XAMPP MariaDB 10.4 (SQLite in tests); React 19, React Router 7, Tailwind CSS 4, Vitest + Testing Library + vitest-axe, oxlint. Icons only through `Icon`.

**Spec:** `.planning/PHASE_5_PLAN.md` (approved 2026-10-15 with every recommendation): §1 (5A), §2, §3 (Q1, Q2, Q5, Q7, Q8, Q10), §4.1, §4.2, §5 (F1–F5), §6.1, §6.3 (5A rows), §6.4 (5A rows), §7, §8.

**Base commit:** `84da53b` plus the commit that adds this plan.

## Global Constraints

- PHP 8.2; `dateTime()` columns; SQLite/MariaDB-safe queries (no JSON-path `where`, no `HAVING` without `GROUP BY`).
- Ratings: `delivered` = 1, `partial` = 0.5, `not_delivered` = 0, `not_used` = not counted (Q1). At least one rating other than `not_used`.
- Trust score = average of every non-hidden, counted rating across all of the employer's feedback (all jobs, closed and deleted included) × 100, stored with 2 decimals; `null` until **3** feedback forms (`opendoor.feedback.min_responses`); `feedback_count` = number of non-hidden feedback forms.
- Window: opens on `hired_at + opendoor.feedback.delay_days` (env `FEEDBACK_DELAY_DAYS`, default 30), compared with `JobPosting::today()` (Philippine time); no end date.
- Only the application's own job seeker, only status Hired, once (unique `application_id`), only the hire copy's accommodations, exactly all of them.
- Comment: optional, plain text, at most 1,000 characters; never sent to employers (Q2).
- No change after sending (Q5). Employers never get any feedback endpoint in 5A; 403 for them, admins and other job seekers.
- `trust_score` and `feedback_count` are never fillable; only `TrustScore::recalculate()` writes them.
- Feedback responses send `Cache-Control: private, no-store` (inside the `no.store` group).
- Copy (spec §7, verbatim): dashboard "**Feedback due.** Rate how OpenDoor Demo Corp. delivered the accommodations for Office Clerk." with **Rate the accommodations**; "You can rate your employer's accommodations from November 12, 2026."; "Choose an answer for Flexible hours."; "Rate at least one accommodation you used."; "Send your ratings? You can't change them afterwards."; "Thank you. Your ratings now count toward OpenDoor Demo Corp.'s trust score."; comment hint "Only OpenDoor's administrators read this. Your employer never sees it."; intro "Only OpenDoor's administrators see your answers with your name. Your employer sees only totals from 3 or more people."; no accommodations "This job listed no accommodations, so there's nothing to rate."
- Design (spec §7): each accommodation in an amber-ruled fieldset (legend = name, the employer's note under it), four radio rows, 44 px targets, full width on phones and one row on wide screens; ink for the job seeker's own answers; no new colours, rings or stars.
- Seeders never change existing data. Two commits on `main` (backend, frontend), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The employer edits the posting after the hire.** A removed or added accommodation must not change what's rated; a rating for an accommodation not in the hire copy is refused. Test: Task 2 `test_only_the_hire_copy_can_be_rated`.
2. **Double send (two tabs, double click).** The second gets 409 "You've already sent your ratings.", never a 500, and the score counts once. Test: Task 2 `test_feedback_is_sent_once`.
3. **The day boundary.** Hired 29 days ago in Manila is refused even if UTC already says day 30. Test: Task 2 `test_the_window_opens_on_day_30_in_manila`.
4. **A hire with no accommodations.** The form says there's nothing to rate, nothing can be sent, and it never shows as Feedback due. Test: Task 2 `test_a_hire_without_accommodations_has_nothing_to_rate`.
5. **Hidden feedback and the threshold.** Hiding one of 3 drops the score back to `null` and the count to 2. Test: Task 1 `test_hidden_feedback_is_left_out`.

## File map

**Backend (`backend/`)**

| File | Responsibility |
|---|---|
| `config/opendoor.php`, `.env.example` | `feedback.delay_days`, `feedback.min_responses` |
| `database/migrations/2026_10_15_100000_create_feedback_tables.php` | `feedback`, `feedback_items`; `employers.trust_score`, `feedback_count`; `applications.feedback_reminded_at` |
| `app/Enums/FeedbackRating.php` | Values, labels, `score(): ?float` |
| `app/Models/Feedback.php`, `FeedbackItem.php`; `Application.php` | Relations; `Application::feedbackOpensOn()`, `feedbackState()` |
| `app/Services/TrustScore.php` | `recalculate(Employer)` |
| `app/Services/FeedbackService.php` | `submit()`, `remindDue()` |
| `app/Policies/ApplicationPolicy.php` | `giveFeedback` |
| `app/Http/Requests/Candidate/FeedbackRequest.php`, `app/Http/Controllers/FeedbackController.php`, `app/Http/Resources/FeedbackFormResource.php` | Form and send |
| `app/Http/Resources/CandidateApplicationResource.php`, `ApplicationController.php`, `Candidate/DashboardController.php` | `feedback` block; `feedback_due`; reminders |
| `app/Notifications/FeedbackOpen.php` | Recorded reminder (Q7) |
| `database/seeders/DemoFeedbackSeeder.php`, `DatabaseSeeder.php` | Q8 demo data |
| `tests/Feature/Feedback/*Test.php` | Tests |

**Frontend (`frontend/src/`)**

| File | Responsibility |
|---|---|
| `api/feedback.js` | `getFeedbackForm`, `sendFeedback` |
| `lib/feedbackText.js` | Choices, labels, sentences |
| `components/feedback/FeedbackForm.jsx`, `FeedbackSummary.jsx`, `FeedbackStatus.jsx` | Form; own ratings; the one-line state for rows and the application page |
| `portals/candidate/FeedbackPage.jsx` | The page |
| `portals/candidate/ApplicationPage.jsx`, `components/applications/ApplicationRow.jsx`, `portals/candidate/CandidateDashboard.jsx`, `router.jsx` | Updates |
| `test/feedbackFixture.js` | Form in the API shape |

---

### Task 1: Tables, rating enum and the trust score

**Files:**
- Create: migration, `app/Enums/FeedbackRating.php`, `app/Models/Feedback.php`, `app/Models/FeedbackItem.php`, `app/Services/TrustScore.php`, `database/factories/FeedbackFactory.php`, `tests/Feature/Feedback/TrustScoreTest.php`
- Modify: `config/opendoor.php`, `.env.example`, `app/Models/Application.php` (`feedback(): HasOne`), `app/Models/Employer.php` (casts `trust_score` → `float`, `feedback_count` → `integer`; not fillable)

**Interfaces:**
- Produces: `FeedbackRating::{Delivered, Partial, NotDelivered, NotUsed}` with `label(): string` ("Delivered", "Partly delivered", "Not delivered", "I didn't use this") and `score(): ?float`; `Feedback` (`application()`, `items()`; casts `is_hidden` bool; fillable `comment` only); `FeedbackItem` (`feedback()`, `accommodation()`; `rating` cast); `TrustScore::recalculate(Employer $employer): void`; `Feedback::factory()->for($application)->rated([accId => 'delivered', ...])`.

- [x] **Step 1: Write `TrustScoreTest`**: `test_the_score_is_null_until_three_responses` (2 forms → `trust_score` null, `feedback_count` 2; 3rd → not null, 3); `test_the_formula_counts_partial_as_half_and_skips_not_used` (ratings delivered, partial, not_delivered, not_used across 3 forms → `(1 + 0.5 + 0) / 3 × 100` = 50.00); `test_every_job_of_the_employer_counts_including_deleted_ones`; `test_another_employers_feedback_is_not_counted`; `test_hidden_feedback_is_left_out` (3 forms, hide one, recalculate → null and 2); `test_trust_score_is_not_fillable` (`Employer::create([... 'trust_score' => 99])` leaves null).
- [x] **Step 2: Run** `php artisan test --filter=TrustScoreTest`. Expected: FAIL (classes missing).
- [x] **Step 3: Implement.** Migration: `feedback` (id, `application_id` unique FK restrictOnDelete, `comment` text nullable, `is_hidden` bool default false, timestamps); `feedback_items` (id, `feedback_id` FK cascade, `accommodation_id` FK restrictOnDelete, `rating` string 20, unique pair); `employers.trust_score` decimal(5,2) nullable, `feedback_count` unsigned int default 0; `applications.feedback_reminded_at` dateTime nullable. `TrustScore::recalculate` locks the employer row, then one aggregate query joining `feedback_items → feedback → applications → job_postings` (raw join, so deleted postings count) where `job_postings.employer_id`, `feedback.is_hidden = false`, `rating <> 'not_used'`, summing `CASE rating` scores; a second `COUNT(*)` of non-hidden feedback; `forceFill` and save.
- [x] **Step 4: Run** the test. Expected: PASS.

### Task 2: Feedback form and send

**Files:**
- Create: `app/Services/FeedbackService.php`, `app/Http/Requests/Candidate/FeedbackRequest.php`, `app/Http/Controllers/FeedbackController.php`, `app/Http/Resources/FeedbackFormResource.php`, `tests/Feature/Feedback/GiveFeedbackTest.php`
- Modify: `app/Models/Application.php`, `app/Policies/ApplicationPolicy.php`, `routes/api.php`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `Application::feedbackOpensOn(): ?string` (Y-m-d; null unless Hired) and `Application::feedbackState(): ?string` — null unless Hired; else `sent` (feedback exists), `nothing_to_rate` (no hire copy), `not_yet` (today < opens on), `open`. Uses loaded `feedback` and `hired_accommodations_count` when present.
  - `ApplicationPolicy::giveFeedback(User, Application): Response` — own and Hired, else 403 "Only a hired job seeker can rate this employer's accommodations." (other users get `NOT_YOURS`).
  - `GET /api/applications/{application}/feedback-form` → `{ data: { application_id, job: {id, title}, employer: {id, name}, hired_at, state, opens_on, accommodations: [{id, name, group_name, note}], sent: null | { sent_at, comment, ratings: [{accommodation_id, name, group_name, note, rating, rating_label}] } } }` (accommodations in `Accommodation::inDisplayOrder`).
  - `POST /api/applications/{application}/feedback` with `{ ratings: { "<accommodation id>": "delivered|partial|not_delivered|not_used" }, comment }` → 201 with the same shape as the GET (state `sent`). Errors: 403 not yet open (message = the "You can rate … from …" sentence with the date as "November 12, 2026"); 409 "You've already sent your ratings."; 422 nothing to rate; 422 field `ratings.<id>` "Choose an answer for <name>."; 422 field `ratings` "You can only rate the accommodations listed when you were hired." / "Rate at least one accommodation you used."; 422 `comment` over 1,000.
  - `FeedbackService::submit(Application, array<int, FeedbackRating> $ratings, ?string $comment): Feedback` — transaction, locks the application, re-checks state, creates feedback and items, `TrustScore::recalculate` for the job's employer; a unique-index race becomes the 409.

- [x] **Step 1: Write `GiveFeedbackTest`**: `test_the_form_lists_the_hire_copy_with_notes`; `test_feedback_is_saved_and_the_score_recalculated`; `test_only_the_hire_copy_can_be_rated` (posting gains an accommodation after the hire → rating it is 422 on `ratings`; posting loses one → it's still on the form); `test_every_accommodation_needs_an_answer` (`ratings.<id>` "Choose an answer for Flexible hours."); `test_at_least_one_real_rating_is_needed`; `test_feedback_is_sent_once` (second POST 409; `feedback_count` 1); `test_the_window_opens_on_day_30_in_manila` (travel to 2026-11-11 20:00 UTC = Nov 12 04:00 Manila with `hired_at` 2026-10-13 → open; `hired_at` 2026-10-14 → 403 "You can rate your employer's accommodations from November 13, 2026."); `test_the_delay_is_a_setting` (`config(['opendoor.feedback.delay_days' => 0])` opens on the hire day); `test_a_hire_without_accommodations_has_nothing_to_rate`; `test_only_the_hired_job_seeker_can_give_feedback` (pending, reviewed, rejected, withdrawn → 403; another job seeker, the employer owner, an admin → 403 on GET and POST); `test_the_comment_is_limited_to_1000_characters`; `test_no_store_is_sent`.
- [x] **Step 2: Run** `php artisan test --filter=GiveFeedbackTest`. Expected: FAIL.
- [x] **Step 3: Implement** the interfaces above; routes inside the `no.store` group with `role:candidate` and the `[0-9]{1,18}` constraint; the window check and nothing-to-rate live in `FeedbackService` (also used by the request's `after()` for the exact-set rule).
- [x] **Step 4: Run** the test and the full suite. Expected: PASS.

### Task 3: Feedback state on applications, dashboard and the reminder

**Files:**
- Create: `app/Notifications/FeedbackOpen.php`, `tests/Feature/Feedback/FeedbackDueTest.php`
- Modify: `CandidateApplicationResource.php`, `ApplicationController.php`, `Candidate/DashboardController.php`, `FeedbackService.php`

**Interfaces:**
- Produces: each application in `/api/applications` and `/api/applications/{id}` (job seeker) gains `feedback: null | { state, opens_on, sent_at }`; `/api/candidate/dashboard` gains `feedback_due: [{ application_id, job_title, employer_name }]` (state `open`, oldest hire first); `FeedbackService::remindDue(User $seeker): void` records one `FeedbackOpen` notification (`type: feedback_open`, application id, job title, employer name) per open hire, guarded by an atomic `update ... where feedback_reminded_at is null`.

- [x] **Step 1: Write `FeedbackDueTest`**: `test_applications_show_each_feedback_state` (not_yet with `opens_on`, open, sent with `sent_at`, nothing_to_rate, null for pending); `test_the_dashboard_lists_feedback_due`; `test_the_reminder_is_recorded_once` (dashboard twice + list → 1 notification); `test_no_reminder_before_the_window_or_after_sending`; `test_the_list_does_not_query_per_application` (query count with 1 vs 5 hired applications is equal).
- [x] **Step 2: Run** `php artisan test --filter=FeedbackDueTest`. Expected: FAIL.
- [x] **Step 3: Implement**: add `feedback` to both `RELATIONS` lists and `withCount('hiredAccommodations')` where the list loads; the dashboard and the job seeker list call `remindDue` first.
- [x] **Step 4: Run** it. Expected: PASS.

### Task 4: Demo data (Q8)

**Files:**
- Create: `database/seeders/DemoFeedbackSeeder.php`, `tests/Feature/Feedback/DemoFeedbackSeederTest.php`
- Modify: `database/seeders/DatabaseSeeder.php`

- [x] **Step 1: Write the test**: after `$this->seed()`, Bayanihan Contact Center has `feedback_count` 4 and a `trust_score`; OpenDoor Demo Corp. has 2 and `null`; `candidate@`'s *Office Clerk* state is `open`; seeding again changes nothing.
- [x] **Step 2: Implement**: six job seekers `sample1@ … sample6@opendoor.test` ("Sample Hire 1" …), random password, a one-line profile; runs only when `sample1@` doesn't exist and both companies do. Demo Corp: sample1–2 hired for *Office Clerk* 60 and 50 days ago. Bayanihan: sample3–5 for *Customer Support Associate*, sample6 for *Chat Support Specialist*, 40–90 days ago. Hire copy synced from each job; feedback through `FeedbackService::submit` (so the score is calculated the real way), mostly Delivered with a few Partly and one Not delivered.
- [x] **Step 3: Run** the test and the full server suite. Expected: PASS. **Commit** (backend).

### Task 5: Feedback form and page

**Files:**
- Create: `api/feedback.js`, `lib/feedbackText.js`, `components/feedback/FeedbackForm.jsx` (+ test), `components/feedback/FeedbackSummary.jsx` (+ test), `portals/candidate/FeedbackPage.jsx` (+ test), `test/feedbackFixture.js`
- Modify: `router.jsx` (`/candidate/applications/:id/feedback`)

**Interfaces:**
- Produces: `getFeedbackForm(id)`, `sendFeedback(id, { ratings, comment })` → the form object; `RATING_CHOICES` (`[{ value, label }]` in the order delivered, partial, not_delivered, not_used); `opensOnText(day)`; `<FeedbackForm form onSent />` (radio ids `rating-<accId>-<value>`, fieldset id `rating-<accId>` focusable for the error summary); `<FeedbackSummary sent />` (own ratings as a ruled list, "You sent these on October 15, 2026.", the comment if any).

- [x] **Step 1: Write tests**: FeedbackForm — renders a fieldset per accommodation with the note and four choices; Send with one missing shows "Choose an answer for Flexible hours." linked to that row, no request; all "I didn't use this" shows "Rate at least one accommodation you used."; Send opens "Send your ratings? You can't change them afterwards."; confirming posts `{ ratings, comment }`; a 409 or 422 from the server is shown; no axe violations. FeedbackPage — `not_yet` shows the date sentence and no form; `nothing_to_rate`; `sent` shows `FeedbackSummary`; after sending, the thank-you sentence takes focus and is announced.
- [x] **Step 2: Run** `npx vitest run src/components/feedback src/portals/candidate/FeedbackPage.test.jsx`. Expected: FAIL.
- [x] **Step 3: Implement** per spec §7 (intro, amber-ruled fieldsets, radio rows `min-h-11`, comment with the hint and a 1,000 limit, primary **Send your ratings**; `ConfirmDialog` with `confirmVariant="primary"`).
- [x] **Step 4: Run** them. Expected: PASS.

### Task 6: Feedback due on the dashboard, My applications and the application page

**Files:**
- Create: `components/feedback/FeedbackStatus.jsx` (+ test)
- Modify: `ApplicationPage.jsx`, `ApplicationRow.jsx`, `CandidateDashboard.jsx` and their tests; fixtures

**Interfaces:**
- Consumes: the `feedback` block (Task 3), `opensOnText`, `FeedbackSummary`.
- Produces: `<FeedbackStatus application />`: `open` → link **Rate the accommodations** to the feedback page; `not_yet` → the date sentence; `sent` → "You rated the accommodations on October 15, 2026." with a link to the application page's ratings; `nothing_to_rate` and null → nothing.

- [x] **Step 1: Write tests**: each state in `FeedbackStatus`; the dashboard shows **Feedback due** above the matches with the spec's sentence and link, and nothing when `feedback_due` is empty; the application page of a sent feedback shows "Your ratings" (`FeedbackSummary`, fetched from the form endpoint).
- [x] **Step 2: Run** them. Expected: FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** `npm test` and `npm run lint`. Expected: PASS. **Commit** (frontend).

### Task 7: Walk-through

- [x] Fresh `migrate:fresh --seed` on the verify database; F1–F4 as `candidate@` in the browser; F5 with the keyboard at 360 px; fix what's found.
