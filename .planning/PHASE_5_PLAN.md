# Phase 5 Plan: Accommodation Feedback and the Trust Score

> Status: **5A built (2026-10-15)**: demo steps F1–F4 verified in the browser, F5 at 360 px and with the keyboard (build notes at the end); 310 server and 366 page tests pass. APPROVED 2026-10-15 with every recommendation in §3 (Q1–Q10); 5A built from the [5A implementation plan](superpowers/plans/2026-10-15-phase-5a-give-feedback.md). Next: 5B, everyone sees the score. Checked against the proposal papers ([Revised Proposal](papers/REVISED_PROPOSAL.md) §VII-G and §VII-H, [Modules and Features](papers/MODULES_AND_FEATURES.md) M7, M8, §3.1–3.3).
> Part of: [CONCEPT_PLAN.md](CONCEPT_PLAN.md), build phase 5 of 7
> Builds on: [PHASE_4_PLAN.md](PHASE_4_PLAN.md) (applications; a hire already copies the job's accommodations for this phase)
> Method: Superpowers brainstorming (this spec), then Superpowers writing-plans for 5A and 5B; Frontend Design (§7); GSD code review, UI review and security audit before finishing.

---

## 0. Where we are

**Built (Phases 1–4):** accounts, employers and teams, job postings with accommodations, the job board with matching, profiles and résumés, applications from Apply to Hired. 285 server and 341 page tests pass. The API is documented in [API.md](../API.md).

**What's next: Phase 5, post-hire verification.** This is OpenDoor's second contribution (Revised Proposal §I): a hired job seeker confirms, accommodation by accommodation, whether the employer delivered, and the answers become a **trust score** that future applicants see. It answers **SOP 3**. The papers' build order says Phase 5 is done when "a hired candidate submits feedback and the score appears after 3 responses".

**Time.** The road map gives Phase 5 **today, Thu Oct 15**; Phase 6 (admin musts) is Fri Oct 16, going live Sat Oct 17. Phase 4 finished two days early, so there's room, but this plan keeps to what the papers ask for. The per-accommodation breakdown is the sixth and last Should-have in the cut order (§1 of PHASE_3_PLAN); it stays in unless we fall behind.

---

## 1. What Phase 5 delivers

### 5A: The job seeker gives feedback
- **The feedback form** (`/candidate/applications/:id/feedback`): opens **30 days after the hire date**; one row per accommodation **the job advertised when they were hired** (the copy Phase 4 keeps), each rated **Delivered / Partly delivered / Not delivered** (Q1 adds one more choice); an optional comment; sent **once** (F7.1, F7.2).
- **Feedback due:** the dashboard and My applications say when feedback is open and link to it; before day 30 the application page says when it opens (F8.1, F7.6).
- **The trust score is calculated** every time feedback is saved (or later hidden by an admin): `average of all ratings × 100%`, stored on the employer with the number of responses (F7.3).

### 5B: Everyone sees the score
- **Trust score card** on the employer's public page and on every job page: "Accommodation trust score: 86%, based on 5 hires", or "Not enough responses yet" until 3 responses (F7.4).
- **Per-accommodation breakdown**, e.g. "Sign language interpreter: 1 of 3 delivered" (F7.5).
- **Employer's Trust score page** (`/employer/trust-score`) and a dashboard tile: their own score and breakdown, never individual responses (F8.2).
- **Job lists** show the score as one fact on each job (Q6).

---

## 2. The rules (from the papers, unchanged)

| Rule | Source |
|---|---|
| Only an application with status **Hired** can give feedback, **once** (unique per application) | M7; §VII-G |
| It opens **30 days after the hire date** (`FEEDBACK_DELAY_DAYS=30`, a setting so the demo can use a back-dated hire; plan D3) | §VII-E Table 1; Concept D3 |
| It rates **the accommodations advertised at the time of hire**, one row each | M4 rule; F7.1 |
| Delivered = 1, Partially delivered = 0.5, Not delivered = 0 | F7.3; §VII-G |
| **Trust score = (sum of ratings ÷ number of rated items) × 100%**, across all of the employer's non-hidden feedback | §VII-G |
| Shown only after **3 responses**, with the count ("86% · based on 5 hires") | F7.4; §VII-G |
| The breakdown uses the same formula per accommodation type | §VII-G |
| **Employers never see individual responses or who gave them**; only aggregated results after 3 responses | M7; §VII-H |
| Recalculated when feedback is saved or hidden by an admin | M7 |

The score belongs to the **employer** (the whole company, every department), as in the papers' `employers.trust_score`.

---

## 3. Questions for you

| # | Question | Recommendation | Why |
|---|---|---|---|
| Q1 | **An accommodation the person never used** (a Deaf employee asked about the wheelchair ramp) | **Add a fourth choice, "I didn't use this", which doesn't count.** At least one real rating is required to send | Forcing a rating on something they never used would push the score up or down by guesswork. *Alternative:* only the papers' three choices. Either way it's a one-line answer for the panel |
| Q2 | **Who reads the optional comment?** (F7.2 "subject to moderation"; the papers say employers never see individual responses) | **Only OpenDoor admins**, in Phase 6's feedback moderation. The form says so: "Only OpenDoor's administrators read this. Your employer never sees it." | Showing comments, even anonymously, can identify the author in a small company. *Alternative:* show approved comments on the employer page, without names |
| Q3 | **What employers see before 3 responses** | **"Not enough responses yet"**, with **no count** (not "2 of 3") | An employer knows whom they hired and when; watching the count go from 1 to 2 tells them that person just answered |
| Q4 | **Breakdown rows with few ratings** | **Show an accommodation only when 3 or more people rated it**; the others are listed as "Not enough ratings yet" | Same reason as the 3-response rule: one rating on "Sign language interpreter" may point to one person |
| Q5 | **Can feedback be changed after sending?** | **No, it's final** (as the papers say, "submitted once") | Prevents an employer pressuring someone to change it, and keeps the score stable |
| Q6 | **Where the score appears** | **Employer page, job page and as one fact on job lists** ("Trust score: 86% (5 hires)" or "No trust score yet") | It's the papers' differentiator and helps decide before applying. *Alternative:* job and employer pages only |
| Q7 | **The feedback reminder** (F7.6, Should-have) | **On the dashboard and My applications, plus one recorded notification**, created when the window opens is first noticed (no scheduler, plan D7) | The bell comes in Phase 6; the dashboard already shows it today |
| Q8 | **Demo data** | **Bayanihan Contact Center gets 4 responses (a visible score). Demo Corp. gets 2**, so when `candidate@` sends feedback for *Office Clerk* during the defense, Demo Corp.'s score **appears live** at the third response | Shows the threshold working in front of the panel. The 6 sample responses come from 6 sample job seekers created only for this (`sample1@ … sample6@opendoor.test`, never logged into) |
| Q9 | **How the score is written** | **A whole percentage and a sentence**: "86%, based on 5 hires". Breakdown as words: "2 of 3 delivered, 1 partly". No rings, stars or colour-only bars | Concept principle 4; works with screen readers; amber stays "the employer's promises" |
| Q10 | **Confirmed by the job seeker only** (the employer never marked the hire, F6.7) | **Their feedback counts like any other**; the employer was notified of the hire in Phase 4 | The papers allow it. Defense Q&A: 3 responses are needed, and admins can hide feedback (Phase 6) |

---

## 4. What's decided

### 4.1 Giving feedback

| Topic | Decision | Source |
|---|---|---|
| When the form opens | From the hire date + 30 days (Philippine time), with no end date | Table 1; D3 |
| Before it opens | The application page: "You can rate your employer's accommodations from November 12, 2026." (hire date + 30 days) | Decision |
| What's rated | The accommodations copied at the hire (Phase 4), with the employer's notes, grouped as on job pages. Accommodation types retired since are still rated | M4 rule |
| No accommodations were advertised | "This job listed no accommodations, so there's nothing to rate." No form | Decision |
| Comment | Optional, up to 1,000 characters, plain text; read only by admins (Q2) | F7.2 |
| Sending | One confirmation ("Send your ratings? You can't change them afterwards."); then "Thank you. Your ratings now count toward OpenDoor Demo Corp.'s trust score." | Q5 |
| After sending | The application page shows the job seeker's own ratings and the date; nobody else ever sees them | M7 |
| Withdrawn, Rejected, Pending, Reviewed | No form (403 for a hand-made request) | M7 |

### 4.2 The score

| Topic | Decision | Source |
|---|---|---|
| Formula | Average of all non-hidden ratings of the employer, × 100, rounded to a whole percent for display; "I didn't use this" (Q1) is left out | §VII-G |
| Count | Responses, not ratings: "based on 5 hires" = 5 feedback forms | §VII-G |
| Stored | `employers.trust_score` (null until 3 responses) and `employers.feedback_count`, recalculated in one service whenever feedback is saved or hidden | M7; §X |
| Breakdown | Per accommodation type: delivered, partly and not-delivered counts, shown when 3+ people rated it (Q4) | F7.5 |
| Which jobs count | All of the employer's jobs, including closed and deleted ones | M4 rule (deleted postings are kept for feedback) |
| Hidden feedback | `feedback.is_hidden` exists now and is left out of the score; admins hide it in Phase 6 | F10.5 |

### 4.3 Where it shows

| Place | What | Part |
|---|---|---|
| Employer page (public and candidate) | Trust score card with breakdown | 5B |
| Job page (public and candidate) | Trust score card (score and count), linking to the employer page for the breakdown | 5B |
| Browse jobs, Find jobs, dashboard matches | One fact line: "Trust score: 86% (5 hires)" or "No trust score yet" | 5B |
| Candidate dashboard | **Feedback due** section above the matches | 5A |
| My applications and the application page | "Rate the accommodations" action when open; the date it opens otherwise; "You rated them on …" after | 5A |
| Employer dashboard | Trust score tile linking to the Trust score page | 5B |
| Employer **Trust score** page (menu item for owners, HR officers and individual employers) | The card, the full breakdown, and what the score means; before 3 responses, "Not enough responses yet" and how it works | 5B |

---

## 5. How we'll know it's done

### 5A demo

| # | Demo step | Expected result |
|---|---|---|
| F1 | Log in as `candidate@`; open the dashboard | **Feedback due:** *Office Clerk* at OpenDoor Demo Corp. (hired 31 days ago) |
| F2 | Open the feedback form | One row per accommodation advertised when they were hired, with the notes; four choices each; comment hint says only admins read it |
| F3 | Send it with one "I didn't use this" | After confirming, the thank-you; the application page shows their own ratings; the form can't be opened again (and a second request is refused) |
| F4 | Open an application hired today (e.g. after Phase 4's E5, *Graphic Designer*) | "You can rate … from November 12, 2026."; the form address is refused |
| F5 | F1–F3 with the keyboard only, at 360 px and with a screen reader | Every choice reachable; errors read out; no sideways scrolling |

### 5B demo

| # | Demo step | Expected result |
|---|---|---|
| T1 | As a guest, open Bayanihan Contact Center's page | "Accommodation trust score: NN%, based on 4 hires" (the sample ratings decide NN) and the breakdown rows rated 3+ times |
| T2 | Open OpenDoor Demo Corp.'s page **before** F3 | "Not enough responses yet" (no count) |
| T3 | After F3, open it again | The score has appeared, based on 3 hires |
| T4 | Browse jobs | Each job shows its employer's trust score or "No trust score yet" |
| T5 | Log in as `employer@`; dashboard and Trust score page | Their score and breakdown; no names, dates or comments anywhere |
| T6 | As `employer@`, an admin, another job seeker and a guest, ask for a feedback by address | Refused; only aggregated numbers exist in any response |
| T7 | T1–T5 with the keyboard only, at 360 px and with a screen reader | As F5 |

Server tests cover every rule in §2 and §4.2: the formula with all choices, the 3-response threshold, per-accommodation thresholds, hidden feedback, the 30-day window in Philippine time, once per application, only Hired, and that no response ever leaks to an employer.

---

## 6. What gets built

### 6.1 Database changes

| Table | What it holds | Part |
|---|---|---|
| `feedback` (new) | Application (unique), comment, `is_hidden`, timestamps | 5A |
| `feedback_items` (new) | Feedback, accommodation, rating (`delivered`, `partial`, `not_delivered`, `not_used`); unique (feedback, accommodation) | 5A |
| `employers` (two columns) | `trust_score` (decimal, null until 3 responses), `feedback_count` | 5A |
| `notifications` | One "feedback open" record per hire (Q7) | 5A |

### 6.2 Who can see what

| Information | The job seeker who gave it | The employer | Other job seekers and guests | Admins |
|---|---|---|---|---|
| Their own ratings and comment | ✓ | — | — | ✓ (Phase 6, without the name shown to anyone else) |
| The score and count (3+ responses) | ✓ | ✓ | ✓ | ✓ |
| The breakdown (rows rated 3+ times) | ✓ | ✓ | ✓ | ✓ |
| Anything before 3 responses | — | "Not enough responses yet" | Same | ✓ |

### 6.3 Server addresses (as the papers name them)

| Method | Address | Who | Purpose | Part |
|---|---|---|---|---|
| GET | `/api/applications/{id}/feedback-form` | The hired job seeker | The accommodations to rate, when it opens, or their sent ratings | 5A |
| POST | `/api/applications/{id}/feedback` | The hired job seeker, from day 30, once | Send the ratings and comment | 5A |
| GET | `/api/employers/{id}/trust-score` | Anyone | Score, count and breakdown (or `null` before 3) | 5B |
| GET | `/api/employer/trust-score` | Employer (owner, HR, individual) | Their own, same shape | 5B |
| (updated) | `/api/job-postings`, `/api/job-postings/{id}`, `/api/employers/{id}` | Anyone | Add `trust_score` and `trust_count` to the employer | 5B |
| (updated) | `/api/candidate/dashboard`, `/api/applications` | Job seeker | Add feedback due and each application's feedback state | 5A |

### 6.4 Pages and building blocks

| Name | What it is | Part |
|---|---|---|
| `FeedbackPage` (`/candidate/applications/:id/feedback`) | The form | 5A |
| `FeedbackForm` (papers' name) | One fieldset per accommodation with four radio choices, the comment, Send | 5A |
| `TrustScoreCard` (papers' name) | Score sentence, count, breakdown, or "Not enough responses yet" | 5B |
| `TrustScorePage` (`/employer/trust-score`) | The employer's own card and what it means | 5B |
| Updates | Application page, My applications rows, candidate and employer dashboards, `JobCard`, job and employer pages, employer menu, API.md | 5A, 5B |

---

## 7. Look and feel (Frontend Design pass)

**The brief.** Phase 5 asks a newly hired person, possibly still working there, to judge their employer. It has to feel safe and quick, and the result has to be believable to the next job seeker. The design system stays: purple actions, amber for the employer's accommodation promises, ink for the job seeker's own things, Atkinson Hyperlegible, ruled rows.

**The one bold element: the promise kept.** On the feedback form each accommodation is shown exactly as it was promised, in amber with the employer's note, and the person's answer sits right under it. On the trust score card the same accommodations come back as promises checked: "Sign language interpreter: 2 of 3 delivered, 1 partly". The score is a sentence with one bold number, "**86%**, based on 5 hires", never a ring, stars or a colour-only bar. Amber means "what was promised"; the counts say what happened.

```
How did OpenDoor Demo Corp. do?
Rate each accommodation they listed when they hired you.
Only OpenDoor's administrators see your answers with your name. Your employer
sees only totals from 3 or more people.

| Wheelchair-accessible entrance                         <- amber rule
| "Ramp at the main entrance."
|  ( ) Delivered   ( ) Partly delivered   ( ) Not delivered   ( ) I didn't use this

| Flexible hours
|  ...

Comment (optional)
Only OpenDoor's administrators read this. Your employer never sees it.
[                                                        ]

[ Send your ratings ]
```

```
Accommodation trust score
86%, based on 5 hires
From hired employees' ratings of each accommodation this employer listed.

Wheelchair-accessible entrance    4 of 5 delivered, 1 partly
Flexible hours                    5 of 5 delivered
Sign language interpreter         Not enough ratings yet
```

**Choices as large targets:** each answer is a full-width radio row (44 px or more) on phones, in one row on wide screens; the fieldset's legend is the accommodation, so a screen reader hears "Wheelchair-accessible entrance, Delivered, radio button, 1 of 4".

**Words on the screen:**

| Where | Text |
|---|---|
| Dashboard | "**Feedback due.** Rate how OpenDoor Demo Corp. delivered the accommodations for Office Clerk." and **Rate the accommodations** |
| Before it opens | "You can rate your employer's accommodations from November 12, 2026." |
| Missing a rating | "Choose an answer for Flexible hours." |
| All "I didn't use this" | "Rate at least one accommodation you used." |
| Confirm | "Send your ratings? You can't change them afterwards." |
| Thank you | "Thank you. Your ratings now count toward OpenDoor Demo Corp.'s trust score." |
| Not enough yet | "Not enough responses yet. The score appears once 3 hired employees have rated this employer." |
| On job lists | "Trust score: 86% (5 hires)" / "No trust score yet" |

**Accessibility:** fieldsets with legends; the error summary links to each unanswered row; the score sentence is plain text (no `aria-label` tricks); counts never rely on colour; everything at 360 px and 200% zoom.

---

## 8. Privacy and security checks

| Risk | How it's handled | Part |
|---|---|---|
| An employer identifying who rated them | No individual response, date, comment or name ever leaves the server for employers; nothing before 3 responses (not even the count, Q3); breakdown rows only with 3+ ratings (Q4) | 5A, 5B |
| Feedback from someone not hired, or twice | Only Hired, from day 30, unique per application; the ratings must be exactly the hire copy's accommodations | 5A |
| Rating accommodations the job never promised | Refused: only the hire copy's accommodations are accepted | 5A |
| Comments | Plain text, length-limited, shown only to admins (Phase 6) | 5A |
| Changing the score by hand | `trust_score` and `feedback_count` are never fillable; only the score service writes them | 5A |

---

## 9. Order of work

| Step | Work | Done when |
|---|---|---|
| 1 | Server: tables, `FeedbackRating` enum, `Feedback` models, `TrustScore` service, feedback form and send, feedback states on applications and the dashboard, the "feedback open" notification, sample demo responses | 5A server tests pass |
| 2 | `FeedbackForm`, Feedback page, application page and My applications updates, dashboard **Feedback due** | Demo F1–F4 work; I show you 5A and continue unless you stop me |
| 3 | Server: trust score on employer, job and list responses; public and employer trust score endpoints | 5B server tests pass |
| 4 | `TrustScoreCard`, job and employer pages, `JobCard` fact, employer Trust score page, dashboard tile, menu | Demo T1–T6 work |
| 5 | Checks (Superpowers review; GSD code review, UI review, security audit; browser walk-through F5, T7); API.md; build notes; commit and push | Phase 5 finished |

---

## 10. Not in Phase 5

| Feature | Comes in |
|---|---|
| Admin feedback moderation (read comments, hide abusive feedback) | Phase 6, if time allows (F10.5, Should-have); the `is_hidden` column and recalculation exist from Phase 5 |
| Notification bell and list | Phase 6, if time allows |
| Email reminders | After the defense (Could-have) |
| Average trust score in admin analytics | Phase 6 analytics, if time allows (F8.4) |

---

## Phase 5A build notes (2026-10-15)

Walked through in the browser on `opendoor_verify` (XAMPP MariaDB) as `candidate@`: F1 (**Feedback due** for *Office Clerk* on the dashboard), F2 (the form, with the hire copy in amber and four answers each), F3 (one answer missing → the error summary; then **I didn't use this** for the entrance, a comment, the confirmation and the thank-you, all with the keyboard only; focus starts on Cancel and lands on the thank-you), F4 (*Graphic Designer* hired today: "You can rate your employer's accommodations from November 14, 2026."; a hand-made send is refused with 403). F5 at 360 px: no page scrolls sideways and each answer is a 49 px full-width row. After F3, OpenDoor Demo Corp.'s stored score appeared at the third response (**90%**, from 3); Bayanihan Contact Center's is **88%** (87.5) from 4. Not yet done: a screen reader pass (a groupmate with NVDA, as in Phase 3) and the reviews in §9 step 5, which run once 5B is built.

One change to the plan: the "feedback open" reminder (Q7) is recorded once per hire using a new `applications.feedback_reminded_at` column, rather than by searching the notifications' JSON, which SQLite and MariaDB query differently. Two requests at once still record it once.

Found and fixed in the walk-through:
- **"Rate the accommodations" links were read as "accommodationsfor Office Clerk"**: the hidden words lost their space inside the button-shaped link. The spoken name is now "Rate the accommodations for Office Clerk", starting with the visible words so voice control works.
- **A hire still said "About 30 days after your hire date, we'll ask…"** after the form had opened or the ratings were sent. The sentence now follows the feedback: "You can now rate…", "Thank you for rating the accommodations." or, with nothing to rate, "Congratulations on your new job."

Decided (say if you'd like them changed):
- Before day 30 the feedback address shows the date it opens instead of an error; only sending is refused (403).
- After sending, the feedback page and the application page show the job seeker's own ratings and comment ("Only you and OpenDoor's administrators see them.").
- The six sample job seekers (`sample1@` … `sample6@opendoor.test`) can't log in, but their hires show as **Hired** on the employers' Applicants pages for *Office Clerk*, *Customer Support Associate* and *Chat Support Specialist*.

For 5B:
- `employers.trust_score` (null below 3) and `feedback_count` are ready; the breakdown per accommodation (Q4: rows rated by 3 or more) still needs its query.
- No feedback endpoint exists for employers or admins yet; keep it that way, and pin it with a test when the trust score endpoints are added.

