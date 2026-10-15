# Phase 5B: Everyone Sees the Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The accommodation trust score (stored in 5A) is shown on employer pages with a per-accommodation breakdown, on job pages, as one fact on every job list, and to the employer on a Trust score page and dashboard tile; nothing before 3 responses, no breakdown row rated by fewer than 3, and never an individual response.

**Architecture:** `TrustScore::summary(Employer): array` builds the one public shape (score, responses, breakdown, rows without enough ratings) from the stored score and one grouped query. Two endpoints return it (public by employer id; the logged-in employer's own); the public job and employer resources add `trust_score` and `trust_count` from the stored columns (no extra query). React adds `TrustScoreCard`, a fact line on `JobCard`, the employer's `TrustScorePage`, a dashboard tile and a menu item.

**Tech Stack:** as 5A.

**Spec:** `.planning/PHASE_5_PLAN.md` (approved 2026-10-15): §1 (5B), §2, §3 (Q3, Q4, Q6, Q9), §4.2, §4.3, §5 (T1–T7), §6.2, §6.3 (5B rows), §6.4 (5B rows), §7, §8; and the **5A build notes**, "For 5B".

**Base commit:** `55bb010` plus the commit that adds this plan.

## Global Constraints

- Shown score: the stored `trust_score` rounded to a whole percent (87.5 → 88); `null` with `responses: null` below 3 responses (Q3: **no count** before 3, for anyone, the employer included).
- Breakdown (Q4): per accommodation type, counts of `delivered`, `partial`, `not_delivered` across the employer's non-hidden feedback (`not_used` never counts); a row only when **3 or more** people rated it; types rated by 1–2 are listed by name only under "Not enough ratings yet". No breakdown at all below 3 responses.
- Never in any trust score response: names, user or application ids, dates, comments, or a per-job split.
- Public endpoint: same visibility as the public employer page (an employer with an approved posting), in the `public-jobs` throttle group. Employer endpoint: every member (owner, HR, individual), their own employer only.
- Copy (spec §7, verbatim): heading "Accommodation trust score"; "**86%**, based on 5 hires"; "From hired employees' ratings of each accommodation this employer listed."; rows "4 of 5 delivered, 1 partly" (", 1 not delivered"; "5 of 5 delivered"); "Not enough ratings yet"; "Not enough responses yet. The score appears once 3 hired employees have rated this employer."; lists "Trust score: 86% (5 hires)" / "No trust score yet".
- Design: a sentence with one bold number; no rings, stars or colour-only bars; amber rule for "what was promised" rows; ruled rows; 360 px with no sideways scroll.
- From the 5A notes: no feedback endpoint for employers or admins; pin it with a test.
- Commits: backend, frontend, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push to `origin` at the end.

## Review Focus

1. **An employer watching the count to identify a responder.** Below 3, `/api/employer/trust-score`, the public endpoint, job lists and the dashboard carry no count. Test: Task 1 `test_nothing_is_counted_below_three`.
2. **One person rating a rare accommodation.** An interpreter rated by 2 never shows its counts, only its name under "Not enough ratings yet". Test: Task 1 `test_rows_need_three_ratings`.
3. **Hidden feedback.** Left out of the breakdown as well as the score. Test: Task 1 `test_hidden_feedback_leaves_the_breakdown`.
4. **A response leaking through a shape.** No trust score response contains a name, comment or date. Test: Task 1 `test_no_response_details_leak`.
5. **Retired accommodation types.** Still listed in the breakdown by name. Test: Task 1 `test_retired_types_are_still_listed`.

## File map

| File | Responsibility |
|---|---|
| `backend/app/Services/TrustScore.php` | `summary(Employer): array` |
| `backend/app/Http/Controllers/Public/TrustScoreController.php`, `Employer/TrustScoreController.php`, `routes/api.php` | The two endpoints |
| `backend/app/Http/Resources/PublicJobPostingResource.php`, `PublicEmployerResource.php`, `Employer/DashboardController.php` | `trust_score`, `trust_count`; the dashboard tile |
| `backend/tests/Feature/Feedback/TrustScoreSummaryTest.php`, `TrustScoreDisplayTest.php` | Tests |
| `frontend/src/api/trustScore.js`, `lib/trustScoreText.js` | Calls and words |
| `frontend/src/components/feedback/TrustScoreCard.jsx` | The card (full and short) |
| `frontend/src/components/jobs/JobCard.jsx`, `portals/public/JobPage.jsx`, `EmployerPage.jsx` | Fact line, cards |
| `frontend/src/portals/employer/TrustScorePage.jsx`, `EmployerDashboard.jsx`, `components/layout/portalMenus.js`, `router.jsx` | Employer's page, tile, menu |

---

### Task 1: The summary and its two endpoints

**Interfaces:**
- Produces: `TrustScore::summary(Employer $employer): array{score: ?int, responses: ?int, breakdown: ?list<array{id: int, name: string, group_name: string, delivered: int, partial: int, not_delivered: int, rated: int}>, not_enough: ?list<array{id: int, name: string, group_name: string}>}` (breakdown and not_enough in `Accommodation::inDisplayOrder`; all four null below 3). `GET /api/employers/{id}/trust-score` → `{ data: { employer: {id, name}, ...summary } }` (404 like the employer page); `GET /api/employer/trust-score` → the same for the member's employer.

- [ ] **Step 1: Tests** (`TrustScoreSummaryTest`): `test_the_score_is_a_whole_percent_with_its_count`; `test_nothing_is_counted_below_three` (2 responses → all null on both endpoints, and the employer's own); `test_rows_need_three_ratings`; `test_not_used_is_not_a_rating`; `test_hidden_feedback_leaves_the_breakdown`; `test_retired_types_are_still_listed`; `test_no_response_details_leak` (response JSON contains no candidate name, comment or `sent_at`); `test_every_member_sees_their_own` (owner, HR, individual; candidate 403; admin 403); `test_employers_and_admins_have_no_feedback_endpoint` (feedback-form and feedback POST 403 for owner, HR, admin); `test_the_public_score_needs_a_public_employer` (404 without an approved posting).
- [ ] **Step 2: Implement** and run. Expected: PASS.

### Task 2: The score on jobs, employers and the dashboard

- [ ] **Step 1: Tests** (`TrustScoreDisplayTest`): job list, job page and employer page carry `employer.trust_score` (88) and `trust_count` (4) for a scored employer and both `null` for one below 3; the list query count doesn't grow with jobs; employer dashboard `trust_score: { score, responses }`.
- [ ] **Step 2: Implement** and run the full server suite. **Commit** (backend).

### Task 3: TrustScoreCard, job lists and the public pages

**Interfaces:** `getTrustScore(employerId)`, `getMyTrustScore()`; `scoreSentence(score, responses)` → "88%, based on 4 hires" parts; `rowText(row)` → "4 of 5 delivered, 1 partly"; `listFact(employer)` → "Trust score: 88% (4 hires)" / "No trust score yet"; `<TrustScoreCard summary employerName? short? employerLink? headingLevel? />`.

- [ ] **Step 1: Tests**: rowText for every mix; TrustScoreCard full (sentence, breakdown rows, not-enough names, axe) and below 3 (the not-enough sentence, no number anywhere); short form links to the employer page; JobCard shows the fact line; JobPage shows the short card; EmployerPage loads the summary and shows the full card.
- [ ] **Step 2: Implement** and run.

### Task 4: The employer's Trust score page, tile and menu

- [ ] **Step 1: Tests**: TrustScorePage with a score (card, "What the score means") and below 3 (how it works, no count); dashboard tile text and link; menu has **Trust score** for owner, HR and individual.
- [ ] **Step 2: Implement**; `npm test`, `npm run lint`. **Commit** (frontend).

### Task 5: Walk-through and notes

- [ ] T1–T7 on `opendoor_verify` in the browser; build notes; API.md; push.
