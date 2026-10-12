# Phase 4B: Review and Decide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An employer (the owner for the whole company, an HR officer for their own department, or an individual employer) sees each posting's applicants with how well the job meets their needs, opens an applicant (which marks the application Reviewed), reads the interview request, needs, résumé, cover note and contact details, and marks the applicant Hired or Rejected. Every status change is recorded as a notification for the other party.

**Architecture:** 4A's role-aware `/api/applications` endpoints gain the employer branch: `ApplicationPolicy` adds "manages this job" (the same rule as `JobPostingPolicy::manage`), `ApplicantResource` is the employer's shape (never `CandidateApplicationResource`, trimmed after Withdrawn), and `ApplicationWorkflow` adds `markReviewed()` and sends Laravel database notifications after each change. React adds the Applicants and Applicant pages, applicant counts on Job postings, and a "waiting for review" section on the employer dashboard.

**Tech Stack:** Laravel 12 on a PHP 8.2 platform, Sanctum SPA cookies, MySQL 8 / XAMPP MariaDB 10.4 (SQLite in tests); React 19, React Router 7, Tailwind CSS 4, Vitest + Testing Library + vitest-axe, oxlint. Icons only through `Icon`.

**Spec:** `.planning/PHASE_4_PLAN.md` (approved 2026-10-12): §1 (4B), §2, §3 (Q3–Q7, Q9), §4.2–4.3 (employer rows), §5 (E1–E9), §6.1–6.5 (4B rows), §7 (the applicant page), §8 (4B rows), §9 steps 3–5, Appendix A (4B rows), B, C; and the **Phase 4A build notes**, "For 4B".

**Base commit:** `aedda07` plus the commit that adds this plan.

## Global Constraints

- PHP 8.2; `dateTime()` columns; SQLite/MariaDB-safe queries (`withCount`, no `HAVING` without `GROUP BY`).
- Who sees applicants: "The employer's owner (every department) and HR officers (their own department only). Another company never." Job seekers and admins never see someone else's application. Use the same rule as `JobPostingPolicy::manage`, on the posting **with trashed**.
- Table 1 for employers: Pending → Reviewed (opening the applicant page, once, server-side; lists never do), Reviewed → Rejected (final), Reviewed → Hired (hire date = `JobPosting::today()`, `hire_confirmed_by` = employer, hire copy of accommodations). Decisions are allowed on open, closed and waiting postings.
- From the 4A build notes, verbatim: "Employers must get their own applicant shape, never the job seeker's; it leaves out the cover note, interview request and profile after Withdrawn (Q4). Add a test that pins it." and "If `apply()` is ever wrapped in a transaction, its duplicate check must re-read with a lock, or a double submit gets a 500 instead of 'You've already applied'." (4B does not wrap `apply()`; leave it as is.)
- Q4: after Withdrawn the employer sees "Only the name, dates and 'Withdrawn'": no profile, résumé, needs, disability type, contact details or messages.
- Q3: the employer sees the profile, résumé and needs **as they are now**; the cover note and interview request are the application's own.
- Disability type: only when the job seeker ticked "Show my disability type to employers I apply to".
- Q5: deleting a posting while any applicant is Pending or Reviewed is refused: "3 applicants are waiting for your decision. Decide on them or close the posting instead." (one: "1 applicant is waiting for your decision. Decide on them or close the posting instead.").
- Q6: notifications are recorded (Laravel `database` channel only, sent synchronously after the change is committed) for: a new applicant (to the posting's managers: the owner and the HR officers of its department), and every status change (to the other party: the job seeker for Reviewed, Hired, Rejected; the managers for Withdrawn and a job seeker's I was hired). No bell or list in 4B.
- Q7: no reason when rejecting.
- Résumé for employers: only the posting's managers, not after Withdrawn; headers `Content-Security-Policy: sandbox`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`; `inline` with the stored file name.
- Every applicant endpoint sends `Cache-Control: private, no-store` (the 4A `no.store` group).
- Copy (spec §7): match "Your job meets 4 of their 5 needs" (all: "Your job meets all 5 of their needs"; none: "Your job meets none of their 5 needs"; one need: "Your job meets their need" / "Your job doesn't meet their need"), "Missing: …" as in Phase 3; hire dialog "Mark Maria Santos as hired for Junior Web Developer? You can't undo this."; reject dialog "Mark Maria Santos as rejected for Junior Web Developer? You can't undo this. They'll see 'Rejected' on their applications."; withdrawn "Maria Santos withdrew this application on October 15, 2026. Their details are no longer shown."; empty list "No one has applied for this job yet."; job postings row "4 applicants, 2 new" ("1 applicant, 1 new", "No applicants yet"); a job seeker's hire "Confirmed by the applicant".
- Design (spec §7): the applicant page puts the **interview accommodation request first**, in an ink-ruled panel, then "Their needs and your job" (ink rule), Contact, Your decision; the résumé (`ResumeView`) and cover note on the left; on phones, one column in that order with the résumé last. Ruled rows, no photos, no kanban, no new colours or motion; 44 px targets; 360 px with no sideways scroll.
- Seeders never change existing data.
- Two commits on `main`: backend (end of Task 5) and frontend (end of Task 9), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; review fixes in a third; push to `origin`.

## Review Focus

1. **An HR officer from another department, by address.** Opening `/employer/applications/{id}` or the résumé of a different department's applicant is refused and does **not** mark it Reviewed. Test: Task 2 `test_another_department_cannot_open_or_review_it`.
2. **Opening a Pending applicant the job seeker just withdrew.** The page shows Withdrawn (trimmed), never a 409 or 500, and the status stays Withdrawn. Test: Task 2 `test_opening_a_withdrawn_application_changes_nothing`.
3. **The employer and the job seeker deciding at once.** Employer Hired versus job seeker Withdrawn on the same Reviewed application: one wins, the other gets the 4A stale 409; no notification for the refused one. Test: Task 3 `test_a_stale_decision_is_refused_and_not_notified`.
4. **A suspended or need-less applicant.** The list and page still show them; the match line is absent (not "meets 0 of 0"). Test: Task 1 `test_an_applicant_without_active_needs_has_no_match`.
5. **Employer leaves the HR team.** A removed HR officer (no membership) opening an applicant gets 403, not a crash. Test: Task 2 `test_a_user_without_a_membership_is_refused`.

## File map

**Backend (`backend/`)**

| File | Responsibility |
|---|---|
| `app/Policies/ApplicationPolicy.php` | Adds the employer branch (`view`, `actAsEmployer`, `viewResume`) |
| `app/Services/CandidateNeeds.php` | Uses an eager-loaded `needs` relation when present (no query per applicant) |
| `app/Http/Resources/ApplicantResource.php` | The employer's shape (list and detail; trimmed after Withdrawn) |
| `app/Http/Controllers/ApplicationController.php`, `ApplicationStatusController.php`, `ApplicantResumeController.php` | Employer branches; résumé |
| `app/Http/Requests/Candidate/ApplicationListRequest.php`, `ApplicationStatusRequest.php` | Employer filters and statuses |
| `app/Services/ApplicationWorkflow.php` | `markReviewed()`; notifications after commit |
| `app/Notifications/NewApplicant.php`, `ApplicationStatusChanged.php`; `database/migrations/…_create_notifications_table.php` | Recorded notifications |
| `app/Http/Controllers/Employer/JobPostingController.php`, `DashboardController.php`, `app/Http/Resources/JobPostingResource.php` | Delete guard, applicant counts, waiting applicants |
| `routes/api.php` | Résumé route |
| `tests/Feature/Applications/Applicant*Test.php`, `NotificationTest.php`, `tests/Feature/Employer/*` | Tests |

**Frontend (`frontend/src/`)**

| File | Responsibility |
|---|---|
| `api/applications.js`, `api/employer.js` | `listApplicants`, `getApplicantResume`; dashboard shape |
| `lib/applicationText.js`, `lib/matchText.js` | Applicant filters; employer match wording |
| `components/applications/ApplicantRow.jsx`, `ApplicantSummary.jsx`, `EmployerDecision.jsx` | Building blocks |
| `portals/employer/ApplicantsPage.jsx`, `ApplicantPage.jsx` | Pages |
| `portals/employer/postings/PostingListItem.jsx`, `EmployerDashboard.jsx`, `router.jsx` | Counts, waiting section, routes |
| `test/applicantFixture.js` | Applicants in the API shape |

---

### Task 1: Applicants list for a posting

**Files:**
- Create: `app/Http/Resources/ApplicantResource.php`, `tests/Feature/Applications/ApplicantListTest.php`
- Modify: `app/Policies/ApplicationPolicy.php`, `app/Services/CandidateNeeds.php`, `app/Http/Controllers/ApplicationController.php`, `app/Http/Requests/Candidate/ApplicationListRequest.php`

**Interfaces:**
- Consumes: 4A's `Application`, `ApplicationStatus`, `CandidateNeeds::matchFor`, `JobPostingPolicy::manage`.
- Produces:
  - `ApplicationPolicy::managesJob(User $user, Application $application): bool` (public helper): `JobPostingPolicy::manage($user, $application->jobPosting)->allowed()` with the trashed posting; `view()` allows the owning job seeker **or** `managesJob`; message for others stays "This application isn't yours." for job seekers and "You can only see applicants for your own job postings." for employers.
  - `CandidateNeeds::for(?User $user)`: when `$user->relationLoaded('needs')`, filter the loaded collection by `is_active` instead of querying.
  - `GET /api/applications?job_posting={id}&status=all|pending|reviewed|hired|rejected|withdrawn&page=` for employers: `job_posting` required (`integer`, `min:1`) for employers, 422 otherwise; the posting is found `withTrashed`, 404 if missing, `Gate::authorize('manage', $posting)`. Newest first, 12 per page, eager-loaded (`candidate.candidateProfile`, `candidate.needs`). Answers `{ data: ApplicantResource[], meta, counts: { all, pending, reviewed, hired, rejected, withdrawn }, job: { id, title, status (display status), department: {name}|null } }`. Admins still 403.
  - `ApplicantResource` (list shape): `id`, `status`, `status_label`, `applied_at`, `reviewed_at`, `rejected_at`, `withdrawn_at`, `hired_at`, `hire_confirmed_by`, `actions` (employer moves now allowed: `hire`, `reject`), `applicant: { name, headline }`, `has_interview_request: bool`, `match: { needs_total, needs_met, missing } | null`. **After Withdrawn**: `applicant: { name }`, no `headline`, `has_interview_request`, `match`. Task 2 adds the detail fields.

- [ ] **Step 1: Write the failing tests** (`BuildsTeams`; a company with departments IT and HR, owner, HR officer in HR; postings in each)
  - `test_the_owner_lists_a_postings_applicants_with_counts`: three applicants (Pending, Reviewed, Withdrawn) to the IT posting and one to another posting → `data` 3 newest first, `counts` `{all: 3, pending: 1, reviewed: 1, hired: 0, rejected: 0, withdrawn: 1}`, `job.title`; `?status=pending` → 1; `?status=bogus` → 422.
  - `test_each_applicant_shows_how_the_job_meets_their_needs`: job provides Ramp; applicant needs Ramp and Lift → `match` `{needs_total: 2, needs_met: 1, missing: ['Lift']}`, `has_interview_request` true when set, `applicant.headline` from the profile.
  - `test_an_applicant_without_active_needs_has_no_match`: an applicant with no needs and a suspended applicant with needs → `match` null; both listed.
  - `test_withdrawn_applicants_show_only_name_and_dates`: the Withdrawn row has `applicant` exactly `{name}` and no `match`, `has_interview_request` keys.
  - `test_hr_officers_see_only_their_department`: HR officer → HR posting 200, IT posting 403; another company's owner 403; a job seeker or admin with `job_posting` → 403; an employer without `job_posting` → 422; a missing posting → 404.
  - `test_a_deleted_postings_applicants_are_still_listed`: soft-deleted posting with a Hired applicant → 200, `job.status`.
  - `test_the_applicant_list_does_not_query_per_applicant`: 3 versus 10 applicants with needs and profiles → same query count.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=ApplicantListTest`. Expected: FAIL.
- [ ] **Step 3: Implement.** The employer counts use one grouped query (`select status, count(*) … group by status`).
- [ ] **Step 4: Run them and see them pass**: `cd backend && php artisan test --filter='ApplicantListTest|MyApplicationsTest|MatchingTest'`. Expected: PASS.

---

### Task 2: The applicant page marks Reviewed; the résumé for employers

**Files:**
- Create: `app/Http/Controllers/ApplicantResumeController.php`, `tests/Feature/Applications/ApplicantDetailTest.php`
- Modify: `ApplicantResource.php`, `ApplicationController.php`, `ApplicationPolicy.php`, `ApplicationWorkflow.php`, `routes/api.php`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `ApplicationWorkflow::markReviewed(Application $application, User $by): Application`: in a transaction with `lockForUpdate`; only from Pending (sets `reviewed_at`, status Reviewed); any other status returns the application unchanged (no 409). Task 4 adds its notification.
  - `GET /api/applications/{application}` for a manager: `markReviewed` first, then `ApplicantResource::detailed($application)`. Job seekers keep 4A's response.
  - `ApplicantResource::detailed(Application): static`: adds `cover_note`, `interview_request`, `match` with `needs` (`withNeeds: true`), `job: { id, title, interview_format, status, department }`, `profile` in `ResumeView`'s shape (`name, email, headline, city, province, contact_number, about, skills, trainings, languages, experiences, educations`, `disability_type` only when `show_disability`, `show_disability`, `resume: {name, uploaded_at} | null`). **After Withdrawn** none of these: only the list shape's trimmed fields plus `job`.
  - `ApplicationPolicy::viewResume(User, Application): Response`: a manager, and not Withdrawn.
  - `GET /api/applications/{application}/resume` (in the `no.store` group): 404 "This applicant hasn't uploaded a résumé." when none; headers per Global Constraints.

- [ ] **Step 1: Write the failing tests**
  - `test_opening_a_pending_applicant_marks_it_reviewed_once`: owner GET → `data.status` `reviewed`, `reviewed_at` set; a second GET keeps the same `reviewed_at`; the list endpoint never changes a Pending one.
  - `test_the_page_shows_the_interview_request_needs_profile_and_contact`: `interview_request`, `cover_note`, `match.needs[*].provided`, `profile.email`, `profile.contact_number`, `profile.experiences`.
  - `test_the_disability_type_only_when_shown`: `show_disability` false → `profile.disability_type` null; true → the value.
  - `test_opening_a_withdrawn_application_changes_nothing`: Withdrawn → 200, `status` withdrawn, no `profile`, `cover_note`, `interview_request`, `match` keys; still Withdrawn in the database.
  - `test_another_department_cannot_open_or_review_it`: HR officer of another department and another company → 403; the application stays Pending; their résumé request → 403.
  - `test_a_user_without_a_membership_is_refused`: an employer account with no membership → 403.
  - `test_the_resume_for_the_jobs_employer_only`: `Storage::fake('local')`, a stored PDF → owner 200 with `Content-Security-Policy` containing `sandbox`, `X-Content-Type-Options: nosniff`, `Cache-Control` containing `no-store`; after Withdrawn → 403; no file → 404 with the message; job seeker (even the owner of the résumé) on this route → 403.
  - `test_employers_never_get_the_job_seekers_shape`: the employer's detail response has no `actions` value containing `withdraw` or `confirm_hire` and no `hired_accommodations` key; the job seeker's response of the same application has no `profile` key.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=ApplicantDetailTest`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass**: `cd backend && php artisan test --filter='ApplicantDetailTest|ApplicantListTest|MyApplicationsTest'`. Expected: PASS.

---

### Task 3: Hire or reject

**Files:**
- Modify: `ApplicationStatusController.php`, `ApplicationStatusRequest.php`, `ApplicationPolicy.php`
- Test: `tests/Feature/Applications/ApplicantDecisionTest.php`

**Interfaces:**
- Consumes: 4A's `ApplicationWorkflow::changeStatus(…, ApplicationActor::Employer, …)`.
- Produces:
  - `ApplicationPolicy::actAsEmployer(User, Application): Response` (`managesJob`).
  - `PATCH /api/applications/{application}/status`: `status` must be in `withdrawn,hired` for job seekers and `hired,rejected` for employers (422 otherwise); employers answer `ApplicantResource::detailed`, job seekers 4A's resource. Admins 403.

- [ ] **Step 1: Write the failing tests**
  - `test_the_employer_hires_from_reviewed`: freeze `2026-10-12 17:30 UTC` → `hired`, `hired_at` `2026-10-13`, `hire_confirmed_by` `employer`, `decided_by` the owner, hire copy equals the job's accommodations; the job seeker's view says Hired.
  - `test_the_employer_rejects_from_reviewed`: `rejected`, `rejected_at`, no hire copy.
  - `test_pending_must_be_opened_first`: Pending → hired and → rejected by the employer → 422 "This application can't be changed to Hired." / "…Rejected."
  - `test_decisions_on_closed_and_waiting_postings`: posting closed, and posting sent back to pending → both hire 200.
  - `test_wrong_people_and_statuses`: HR of another department 403; job seeker sending `rejected` 422; employer sending `withdrawn` 422; admin 403.
  - `test_a_stale_decision_is_refused_and_not_notified`: application Reviewed, the job seeker withdraws, then the employer sends `hired` with `expected_status: reviewed` → 409 stale; status Withdrawn; (after Task 4) no `ApplicationStatusChanged` notification for the job seeker about Hired.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=ApplicantDecisionTest`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass**: `cd backend && php artisan test --filter='ApplicantDecisionTest|ApplicationStatusChangeTest'`. Expected: PASS.

---

### Task 4: Notifications

**Files:**
- Create: the notifications migration (`php artisan make:notifications-table`, then `dateTime` for `read_at`), `app/Notifications/NewApplicant.php`, `app/Notifications/ApplicationStatusChanged.php`, `tests/Feature/Applications/NotificationTest.php`
- Modify: `ApplicationWorkflow.php`, `app/Models/JobPosting.php`

**Interfaces:**
- Produces:
  - `JobPosting::managers(): Collection<User>`: active users whose membership is in this employer and is the owner or in this posting's department.
  - `NewApplicant(Application $application)` → `toArray`: `{ type: 'new_applicant', application_id, job_posting_id, job_title, applicant_name }`.
  - `ApplicationStatusChanged(Application $application, ApplicationActor $actor)` → `{ type: 'status_changed', application_id, job_posting_id, job_title, employer_name, status, actor }`. Both `via(): ['database']`, not queued.
  - `ApplicationWorkflow` sends them with `DB::afterCommit`: `apply` → `NewApplicant` to `managers()`; `changeStatus`/`markReviewed` by an employer → `ApplicationStatusChanged` to the job seeker; by a job seeker → to `managers()`.

- [ ] **Step 1: Write the failing tests**
  - `test_a_new_application_notifies_the_owner_and_the_departments_hr`: owner and HR of the posting's department get one `NewApplicant`; HR of another department gets none.
  - `test_each_status_change_notifies_the_other_party`: opening (Reviewed), hire and reject notify the job seeker with `status`; a job seeker's withdraw and I was hired notify the managers with `actor: candidate`.
  - `test_nothing_is_recorded_for_a_refused_change`: a 409 and a 422 change record nothing.
  - `test_notifications_carry_no_private_details`: the stored `data` JSON contains neither the cover note nor the interview request nor any need name.
- [ ] **Step 2: Run them and see them fail**: `cd backend && php artisan test --filter=NotificationTest`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass**, plus Task 3's stale test: `cd backend && php artisan test --filter='NotificationTest|ApplicantDecisionTest'`. Expected: PASS.

---

### Task 5: Delete guard, counts, dashboard and the backend commit

**Files:**
- Modify: `app/Http/Controllers/Employer/JobPostingController.php`, `app/Http/Resources/JobPostingResource.php`, `app/Http/Controllers/Employer/DashboardController.php`
- Test: `tests/Feature/Employer/JobPostingTest.php` (or a new `ApplicantCountsTest.php`), `tests/Feature/MasterData/SeederTest.php`

**Interfaces:**
- Produces:
  - `DELETE /api/employer/job-postings/{posting}`: 422 `{ message }` (Global Constraints wording) while Pending or Reviewed applications exist; allowed otherwise.
  - `GET /api/employer/job-postings` items gain `applicants: { total, new }` (`withCount`; `new` = Pending).
  - `GET /api/employer/dashboard` gains `waiting_applicants: { total, postings: [{ id, title, new }] }`: postings visible to the person with Pending applications, most new first, then title; at most 10.

- [ ] **Step 1: Write the failing tests**
  - `test_a_posting_with_waiting_applicants_cannot_be_deleted`: 3 waiting → 422 with "3 applicants are waiting…"; 1 → "1 applicant is waiting…"; after they're Hired/Rejected/Withdrawn → 204.
  - `test_postings_show_applicant_counts`: `applicants` `{total: 4, new: 2}`; a posting with none `{total: 0, new: 0}`.
  - `test_the_dashboard_lists_postings_with_new_applicants`: owner sees both departments' postings; HR only theirs; `total` sums `new`.
  - `SeederTest`: the demo HR officer's dashboard lists *HR Assistant* with 1 new applicant.
- [ ] **Step 2: Run them and see them fail.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole backend suite and Pint**: `cd backend && php artisan test && vendor/bin/pint --dirty --test`. Expected: PASS.
- [ ] **Step 5: Commit the backend** ("Add applicants, review and hiring decisions API (Phase 4B backend)", bullets, co-author line).

---

### Task 6: Frontend data layer, wording and the applicant row

**Files:**
- Create: `components/applications/ApplicantRow.jsx`, `test/applicantFixture.js`
- Modify: `api/applications.js`, `lib/applicationText.js`, `lib/matchText.js`
- Test: `lib/matchText.test.js` (or extend), `components/applications/ApplicantRow.test.jsx`

**Interfaces:**
- Produces:
  - `listApplicants(postingId, { status, page })` → `{ applicants, meta, counts, job }`; `getApplicantResume(id)` → Blob (same Blob-error handling as `getResumeFile`).
  - `APPLICANT_FILTERS`: All, Pending, Reviewed, Hired, Rejected, Withdrawn (values match the API).
  - `employerMatchText(match)`: the Global Constraints wording; `missingText` reused.
  - `ApplicantRow({ applicant })`: ruled `<li>`; `<h3>` name linking to `/employer/applications/:id`; headline; `ApplicationStatusBadge`; "Applied {date}"; match line (bold) and "Missing: …" (muted, open circle) when `match`; "Asked for an interview accommodation" with the chat icon when `has_interview_request`.
- [ ] **Step 1: Write the failing tests** (wording for all/some/none/one need; row with and without match; withdrawn row shows name, badge, dates only; axe).
- [ ] **Step 2–4: fail, implement, pass**: `cd frontend && npx vitest run src/lib src/components/applications`.

---

### Task 7: The Applicants page and Job postings counts

**Files:**
- Create: `portals/employer/ApplicantsPage.jsx`
- Modify: `portals/employer/postings/PostingListItem.jsx`, `router.jsx`
- Test: `portals/employer/ApplicantsPage.test.jsx`, `portals/employer/JobPostingsPage.test.jsx`

**Interfaces:**
- Produces:
  - Route `/employer/job-postings/:id/applicants` (kinds owner, hr, individual). `PageHeader` "Applicants for {title}" ("Applicants" while loading); the posting's status badge and department; `FilterTabs` "Show" with counts and `resetParams={['page']}`; the count heading ("4 applicants", "1 applicant"); rows; `Pagination`; empty "No one has applied for this job yet." (All) or "No applicants here." (a filter); a page past the end: "There are no applicants on this page." with **Go to the first page**; 403/404 → "We couldn't find this job posting." with **Job postings**; **Back to job postings**.
  - `PostingListItem`: a link "4 applicants, 2 new" ("1 applicant, 1 new"; "No applicants yet" as plain text) to the Applicants page, with `aria-label` "Applicants for {title}: 4, 2 new".
- [ ] **Step 1–4**: tests for the list, filters in the address, counts, empty states, not found, the posting row link and wording; `npx vitest run src/portals/employer`.

---

### Task 8: The Applicant page and the decision

**Files:**
- Create: `components/applications/ApplicantSummary.jsx`, `components/applications/EmployerDecision.jsx`, `portals/employer/ApplicantPage.jsx`
- Modify: `router.jsx`
- Test: the three `*.test.jsx`

**Interfaces:**
- Produces:
  - Route `/employer/applications/:id`. `PageHeader` with the applicant's name ("Applicant" while loading or on error); the status badge; "Applied for {job title} on {date}" linking to the posting's applicants page.
  - Layout per spec §7: right column (first on phones) `ApplicantSummary({ applicant })`: **Interview accommodation request** (ink rule; "They didn't ask for anything for the interview." when empty), **Their needs and your job** (ink rule; `employerMatchText` and each need Provided/Missing with the employer's note; "They haven't listed any accommodation needs." when `match` is null), **Contact** (email as a `mailto:` link, contact number as a `tel:` link), then `EmployerDecision`. Left column: **Cover note** (line breaks kept; "No cover note."), `ResumeView` of `profile`, and the uploaded résumé with **Open the uploaded résumé** (Blob in a new tab, as My profile does).
  - `EmployerDecision({ applicant, onChanged, onStale })`: **Mark as hired** (primary) and **Mark as rejected** (secondary) when in `actions`, each with `ConfirmDialog` and the Global Constraints copy; sends `{ status, expected_status }`; 409 → message in the dialog and `onStale`; announces "Marked as hired." / "Marked as rejected."; after Hired or Rejected a sentence instead of buttons ("You marked them as hired on October 13, 2026.", "Confirmed by the applicant" for a job seeker's hire, "You marked them as rejected.").
  - Withdrawn: only the name, badge and "Maria Santos withdrew this application on {date}. Their details are no longer shown."
- [ ] **Step 1–4**: tests for each status (Reviewed with both buttons; Hired by employer and by applicant; Rejected; Withdrawn trimmed), the dialogs and their requests, the 409 path, empty interview request and needs, contact links, résumé button, not found; axe; `npx vitest run src/components/applications src/portals/employer`.

---

### Task 9: Employer dashboard and the frontend commit

**Files:**
- Modify: `portals/employer/EmployerDashboard.jsx`, `api/employer.js`
- Test: `portals/employer/EmployerDashboard.test.jsx`

**Interfaces:**
- Produces: the dashboard loads `getEmployerDashboard()` once and passes it to the postings tile and a new **Applicants waiting for review** section (above the tiles, for owners, HR officers and individual employers): a ruled list "Junior Web Developer: 2 new" linking to each posting's applicants, or "No applicants are waiting for review." The section heading is an `<h2>`.
- [ ] **Step 1–4**: tests (list, empty, load failure with **Try again**, HR sees what the API sends); then `cd frontend && npm run test && npm run lint && npm run build`. Expected: PASS, no new warnings.
- [ ] **Step 5: Commit the frontend** ("Add Applicants, the applicant page and hiring decisions (Phase 4B)", bullets, co-author line).

---

### Task 10: Walk-through, reviews, notes and push

- [ ] **Step 1:** `migrate:fresh --seed` on `opendoor_verify`; walk E1–E8 at 1024 px as `employer@`, `hr@`, `employer2@` and `candidate@` (E5 uses `candidate@`'s Reviewed *Graphic Designer*); E9 at 360 px, 200% text and keyboard only.
- [ ] **Step 2:** Superpowers whole-branch review and GSD code review, UI audit and security audit (4B rows of spec §8), reports in the plan workspace; one fix pass, each fix test-first.
- [ ] **Step 3:** spec status line and **Phase 4B build notes**; commit; `git push origin main`.
