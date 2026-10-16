# Wave B Plan: profiles, the job tracker, charts, onboarding and the mascot

> Status: **DRAFT, waiting for your answers in §3** (written 2026-10-16).
> Part of [UI_FEEDBACK_PLAN.md](UI_FEEDBACK_PLAN.md) (approved; Wave A built and committed in `5749f79` and `216953a`). That plan's §3.5–3.8 sketched Wave B. This document turns the sketch into tasks, files, endpoints and tests, based on the current code.
> It covers these problems from the October 16 review: P9 My applications, P10 a cluttered job seeker page, P11 no onboarding, P12 no admin analytics, P13 no employer analytics, P14 no mascot on Log in / Create account, P15 a plain loading screen, and P16 limited profile customisation.

---

## 0. When

The usability tests run on **Oct 19–20**, with participants booked, and the accessibility audit is on **Oct 18**. Both have to run on one fixed interface. UI_FEEDBACK_PLAN Q1 therefore puts Wave B **after the tests: Oct 21 up to your defense slot** (Oct 21–25). Anything not finished goes into the paper as future work.

| Day (2026) | Work |
|---|---|
| Sat Oct 17 – Tue Oct 20 | No Wave B code. Freeze: only audit fixes and critical fixes |
| Wed Oct 21 | **B1** profile photo and Open to; **B2** dashboard and job tracker |
| Thu Oct 22 | **B3** charts (employer, then admin) |
| Fri Oct 23 | **B4** onboarding; **B5** mascot; check and deploy |
| Before your slot | Update the screenshots and the paper's "what changed after testing" note |

If your slot is Oct 21 or 22, do B2 and B3 only (see the cut order in §5).

**Decided (2026-10-16): OpenDoor's own design comes first.** We borrow **layouts and patterns** from LinkedIn and Indeed: a two-pane job search, filter chips, an account menu, job pages in blocks, a dashboard with a profile card, and a job tracker. We do **not** copy their look. OpenDoor's design principles stay: accessibility first, the violet palette with the orange, pink and sky accents, Lexend and Atkinson Hyperlegible, a friendly plain-word tone, the Home hero, and the mascot. Each Wave B screen is built in OpenDoor's style, not as a LinkedIn or Indeed clone.

---

## 1. What already exists (so we don't build it twice)

| Need | Already in the code |
|---|---|
| Headline and city on the profile | `candidate_profiles.headline` (150 characters) and `city`, `province`, edited on `/candidate/profile`. Employers already see the headline (`ApplicantRow`) |
| "Finish your profile" | The candidate dashboard API returns `missing_sections`, and the page lists them under "Finish your profile" |
| Application counts | The dashboard returns waiting / hired / closed counts; My applications filters on `all`, `waiting`, `hired` and `closed` (`Application::FILTERS`) |
| Private uploads | Logos (`Employer\LogoController`, `local` disk, served by a controller) and résumés. A photo can follow the logo pattern exactly |
| The mascot art | `src/assets/mascot/` (body, head, eye mask, shines) and `home/Mascot.jsx` (the waving hero, which already respects Reduce motion and Quiet mode) |
| Dashboard data | Employer: posting counts by status, waiting applicants, trust score. Admin: totals only (`Admin\DashboardController`). **No history by week anywhere** |

---

## 2. The work

### B1 Profile photo and "Open to" (P16)

**Backend**
- Migration `add_photo_and_open_to_to_candidate_profiles`: `photo_path` (string, nullable), `show_photo_to_employers` (bool, default `false`), `open_to_work_setups` (json, nullable), `open_to_employment_types` (json, nullable).
- `POST /api/candidate/profile/photo` and `DELETE /api/candidate/profile/photo`. These follow `LogoController`: a JPEG or PNG up to 2 MB, at least 200 × 200, stored on the `local` disk under `photos/`, with the old file deleted.
- `GET /api/candidate/profile/photo` serves the job seeker's own photo.
- `GET /api/applications/{id}/applicant-photo` serves the photo to that application's employer, **only if** `show_photo_to_employers` is on (otherwise 404).
- `ProfileRequest` accepts `show_photo_to_employers`, `open_to_work_setups[]` and `open_to_employment_types[]` (the `WorkSetup` and `EmploymentType` enums).
- Tests: upload, replace, delete, type and size refused, another user's photo refused, the employer gets a 404 unless shared, and the admin "delete user" path removes the file.

**Frontend**
- `/candidate/profile` gets a profile header card, like LinkedIn's: the photo (or initials) in a circle, the name, headline and city, and "Change photo" / "Remove photo". The upload reuses `ui/FileUpload`. There is no cropper: the image is shown with `object-cover` in a circle.
- A new "Open to" fieldset with checkboxes for work setup and employment type, and a "Show my photo to employers I apply to" checkbox. Its hint says why this is off by default (Q8).
- The account menu and the dashboard card use the photo instead of initials. The photo is `alt=""` because the name is always next to it.
- Find jobs: when the job seeker set "Open to" and the address has no work setup or type, the chips start with those values. A line explains it ("Using your Open to choices · Show all"), and Clear all turns them off for that visit. **This is Q3.**
- **What employers see** (`WhatEmployersSee`) adds "Your photo", but only when it is shared.

### B2 The job seeker dashboard and the job tracker (P9, P10)

**Dashboard** (`CandidateDashboard`), laid out like LinkedIn's Jobs home:
- **Left column (sticky on wide screens):** a profile card (photo, name, headline, city), "Your needs: 5 selected · Change", and links to Profile, Applications and Display settings.
- **Right column:**
  1. The **Get started** checklist (B4) until it's done.
  2. **Ratings to give** (already there).
  3. **Jobs for you** (top matches, already there, as job cards).
  4. **Your applications**: the 3 most recently updated, each as a one-line card with a status badge, and "See all".
- The application counts become one line of links ("2 waiting · 1 hired · 3 closed"), each opening My applications with that filter. This replaces the separate count section.

**My applications → Job tracker** (P9). Same URL (`/candidate/applications`) and same API:
- Tabs with counts: **Active** (pending and reviewed), **Hired**, **Closed** (not selected and withdrawn), **All**. These map onto the existing `waiting`, `hired` and `closed` filters, so there is no API change.
- One card per application: the employer's mark, the job title (linking to the application), the employer, a status badge, "Applied October 12 · Updated 2 days ago", the **next step** sentence from `applicationText.nextStepText` (already written), and "Rate the accommodations" when the form is open.
- The current table goes away, so phones get the same cards and need no table. The page keeps its focus and announcement behaviour after Withdraw.
- The API adds `updated_at` to `CandidateApplicationResource` if it isn't already there (a test covers it).

### B3 Charts (P12, P13)

**Two chart components** (Q7 of the main plan: hand-drawn SVG, no library), designed with the `dataviz` skill:

- `ui/charts/BarChart.jsx`: vertical bars, optionally stacked. Each bar has its value in text, axis labels, and up to 4 series told apart by **pattern and a legend with words**, not colour alone.
- `ui/charts/LineChart.jsx`: one or two lines with a point and a value label on each point.
- Both components share these rules:
  - They take `{ title, summary, data, series }`.
  - They render a `<figure>` with the SVG marked `aria-hidden`, a `<figcaption>` holding the title and the one-line summary, and a **Show as table** disclosure with the same numbers in a real `<table>`.
  - The SVG scales with the text size (sizes in `rem`, `viewBox` width from the container) and uses token colours, so high contrast works.

**Endpoints** (read-only, no migration; every one covered by a feature test with fixed data):

| Endpoint | Returns | Built from |
|---|---|---|
| `GET /api/employer/dashboard/activity?weeks=8` | `applications_by_week` (8 Manila weeks); `applicants_by_posting` (open postings × status counts, top 6) | `applications.created_at`, `status`, scoped to `JobPosting::visibleTo($user)` so HR members see only their department |
| `GET /api/admin/dashboard/activity?weeks=8` | `accounts_by_week` (job seekers, employers); `postings_approved_by_week`; `applications_by_week` and `hires_by_week`; `verification` (waiting, verified, not approved) | `users.created_at` and `role`, `job_postings.approved_at`, `applications`, `employers.verification_status` |

- Weeks start on Monday in `Asia/Manila`, and weeks with nothing in them are returned as 0, so a chart never skips a week.
- The employer's **trust score over time** is left out (Q4).

**Pages**
- **Employer dashboard:** the posting tiles stay. Under them, an "Applications received" column chart (8 weeks) and an "Applicants per open job" stacked bar chart, each with its summary ("11 applications this week, up from 4").
- **Admin dashboard:** the "Waiting for you" tiles stay at the top. Under them, a 2 × 2 grid: new accounts per week, postings approved per week, applications and hires per week, and employer verification.
- The summaries are written by small tested functions in `lib/chartText.js` (for example: up, down, the same, or no data yet).

### B4 Onboarding (P11)

- A **Get started** card (`components/onboarding/GetStarted.jsx`) at the top of the job seeker and employer-owner dashboards. Each step is a link with a done or not-done icon and the words "Done" or "To do", plus "2 of 4 done".
  - Job seeker steps, worked out from data already returned (`missing_sections`, needs count, applications count): Add your accommodation needs → Complete your profile → Upload a résumé → Apply to a job.
  - Employer owner steps, from the employer dashboard and profile: Complete your company profile → Submit verification → Post your first job → Invite HR (owners with departments only).
- **Hide this** stores the dismissal in `localStorage` under the user's id (like the display settings); the card also hides itself once every step is done. Account → Display gets "Show the Get started card again".
- A new **`/help` page, "How OpenDoor works"**, public and in the footer and account menu. It has three short sections (job seekers, employers, the trust score), each with numbered steps and a plain illustration, plus a link to Contact us. The text is taken from the papers' wording.
- **No pop-up tour** (main plan Q6).

### B5 The mascot (P14, P15)

- **Log in and Create account:** beside the centred card, on screens 1024 px and wider, the mascot walks in from the right (about 1.2 s, once per visit to the page), stops, and waves once. This is a new `home/MascotWalkIn.jsx` reusing the three mascot images with CSS keyframes. It is `aria-hidden`, standing still with Reduce motion, hidden in Quiet mode and below 1024 px, and never covers the form. This is **Q5**.
- **Loading:** `PageLoading` and the long waits of `LoadingMessage` show a small mascot running towards an open door, in a loop.
  - It appears only after **400 ms**, so quick loads don't flash.
  - The words ("Loading the page…") stay as the `role="status"` text.
  - With Reduce motion, the mascot stands in the doorway.
  - It is hidden in Quiet mode.

  This needs a 6-frame run cycle drawn from the existing art. That is the only new artwork; see **Q6**.
- The mascot appears **only** on Home, Log in, Create account and loading screens, never on working pages (main plan §3.8).

---

## 3. Questions for you

| # | Question | Recommendation | Why |
|---|---|---|---|
| Q1 | **Start Wave B before the tests anyway?** | **No: start on Oct 21**, as the main plan's Q1 says | The audit (Oct 18) and the SUS tests (Oct 19–20) must describe the interface we defend. B1 adds a migration and a file upload a day before the audit. *Alternative:* build B3 charts only (read-only, no migration) on Oct 17 if Wave A's audit prep is done |
| Q2 | **Who sees the photo** (main plan Q8, approved) | **Only the job seeker by default**; a "Show my photo to employers I apply to" switch, off by default, and shown in What employers see when on | OpenDoor exists to reduce bias against PWD applicants, and a photo is personal data under RA 10173 |
| Q3 | **Should "Open to" pre-fill the Find jobs filters?** | **Yes, with a visible line and a one-click "Show all"** | It saves the same three clicks every visit, and the line makes it clear why the list is shorter. *Alternative:* use Open to only on the dashboard's "Jobs for you" |
| Q4 | **The employer's trust score over time** | **Leave it out** | Most employers have fewer than 3 ratings, so the line would usually be empty, and showing a trend below the papers' 3-response rule would leak counts |
| Q5 | **The mascot on Log in and Create account: a walk-in, or standing and waving?** | **Walk in once, then stand.** No loop | A loop beside a form distracts, especially for people with attention or vestibular disabilities; once per visit is enough to be friendly |
| Q6 | **The running mascot needs a 6-frame run cycle.** Who draws it? | **I make the frames from the existing body and head art** (legs and arms as simple separate shapes, like the current eye mask), and you replace them later if the team's artist has time | It uses no outside service, and the current mascot is already built from separate pieces |
| Q7 | **The `/help` page wording** | **I draft it from the papers' words**; the team reviews it with the privacy and accessibility text | Same review step the other public pages had |
| Q8 | **Show the Get started card to employers' HR members?** | **No.** Only to owners and individual employers | HR members don't set up the company or verification |

---

## 4. Tests and checks

- **Backend:** feature tests for the photo endpoints (B1), the profile fields, `updated_at`, and both activity endpoints with fixed dates around a Manila week boundary (B3). The aim is no change to existing tests other than the new fields.
- **Frontend:** component tests for `BarChart` and `LineChart` (the table holds the same numbers, the summary is in the caption, the SVG is `aria-hidden`), `chartText`, `GetStarted` (steps from data, dismiss, all-done), the job tracker tabs and cards, the photo upload, and `MascotWalkIn` / the loading mascot (hidden with Reduce motion and Quiet mode). Run vitest-axe on each new page.
- **By hand:** 360 px, 200 % zoom, 200 % text, high contrast and keyboard only on the dashboards, the tracker and Log in. Charts must stay readable in high contrast. Reduce motion must stop every mascot animation.
- `php artisan test`, `npm test`, `npm run lint` and `npm run build` must pass, then deploy and smoke-test the live site (PHASE_7 L-checks for uploads, since photos are a new upload).

---

## 5. Order and what gets cut first

| Part | Time | Depends on |
|---|---|---|
| B2 Dashboard and job tracker | ~3 h | Nothing |
| B3 Charts (components, employer, admin) | ~4 h | Nothing |
| B1 Photo and Open to | ~3 h | Nothing (B2's profile card shows initials until B1 lands) |
| B4 Get started and `/help` | ~2.5 h | B2's dashboard layout |
| B5 Mascot walk-in and loading | ~2.5 h | Q6's frames |

**Cut order** (last cut first): loading mascot → Log in / Create account walk-in → `/help` page → "Open to" pre-filling Find jobs → admin charts. **Never cut:** the job tracker (P9), the dashboard declutter (P10), the employer charts (P13) and the Get started card (P11). Each of these answers a review problem directly with no new data.

## 6. How we'll know it's done

| # | Check |
|---|---|
| W1 | P9–P16 are each fixed, or listed as deferred with a reason in UI_FEEDBACK_PLAN §7 |
| W2 | No employer sees a job seeker's photo unless that job seeker turned the switch on (backend test) |
| W3 | Every chart has a caption with a written summary and a table with the same numbers; nothing depends on colour alone |
| W4 | The activity endpoints return every week, including empty ones, in Manila time, and HR members see only their department |
| W5 | The Get started card is worked out from data, can be hidden, and comes back from Account → Display |
| W6 | Every mascot animation is hidden from screen readers, still with Reduce motion, and gone in Quiet mode; loading text is still announced |
| W7 | All tests, lint and build pass; the live site passes its smoke test after deploy |
