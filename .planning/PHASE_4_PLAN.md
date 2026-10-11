# Phase 4 Plan: Apply and Track

> Status: **DRAFT, waiting for your answers** (2026-10-12). The ten questions are in §3, each with a recommendation; "the other recommendations are OK" is enough. Checked against the proposal papers ([Revised Proposal](papers/REVISED_PROPOSAL.md) §VII-E and Table 1, [Modules and Features](papers/MODULES_AND_FEATURES.md) M6, M2, M8, M9 and §5). The "(tracked changes)" Word files you attached are the redline from the original papers to the revised ones; their accepted text is what `.planning/papers/` already holds, so nothing changes here.
> Part of: [CONCEPT_PLAN.md](CONCEPT_PLAN.md), build phase 4 of 7
> Builds on: [PHASE_3_PLAN.md](PHASE_3_PLAN.md) (profile, résumé, needs and matching)
> Method: Superpowers brainstorming (this spec, for your review), then Superpowers writing-plans for 4A and 4B; Frontend Design (§7); GSD code review, UI review and security audit before finishing (§9, step 5).

---

## 0. Where we are

**Built (Phases 1–3):** accounts and roles, employers with departments and HR officers, job postings with accommodations and approval, the public job board, profiles, résumés, needs and matching. 223 server tests and 260 page tests pass.

**What's next: Phase 4, applications.** The papers' build order (Modules and Features §7, step 4) says Phase 4 is done when "a candidate applies and an employer moves the application through every status". This answers **SOP 2** (a clear status workflow) and is what Phase 5's feedback and trust score are built on: only a Hired application can give feedback.

**Time.** The road map (PHASE_3_PLAN §1) gives Phase 4 **Tue Oct 13 – Wed Oct 14**. Phase 5 starts Thu Oct 15. The interview accommodation request is the fifth Should-have in the cut order, so it stays in unless we fall behind.

---

## 1. What Phase 4 delivers

### 4A: The job seeker applies and tracks (Tue Oct 13)
- **Apply** from any job page: an optional **cover note** and an optional **interview accommodation request**, with a preview of what the employer will see (F6.1, F6.2).
- **My applications** (`/candidate/applications`): every application with its status, dates and the next step (F6.3).
- **One application page** (`/candidate/applications/:id`): the application's path, what you sent, and the actions you may take.
- **Withdraw** while Pending or Reviewed; it's final (F6.4).
- **I was hired**: confirm a hire the employer hasn't marked (F6.7).
- **Dashboard:** applications by status replace the "coming soon" tile (F8.1).

### 4B: The employer reviews and decides (Wed Oct 14)
- **Applicants** for each posting (`/employer/job-postings/:id/applicants`): status filter and how many of each applicant's needs the job meets.
- **Applicant page** (`/employer/applications/:id`): the interview request first, then needs, profile, résumé, cover note and contact details. **Opening it marks the application Reviewed** (F6.5).
- **Mark as hired** or **Mark as rejected**; the hire date is recorded (F6.6).
- **Job postings** rows show the applicant count; the **dashboard** shows applicants waiting for review (F8.2).
- HR officers see only their own department's applicants; the owner sees the whole company's.

---

## 2. The status rules (from the papers, unchanged)

```
                 ┌──────────────► Withdrawn   (job seeker; final)
                 │                    ▲
 Apply ──► Pending ──employer opens──► Reviewed ──► Hired      (employer, or the job seeker confirms)
                                           └──────► Rejected   (employer; final)
```

| From | To | Who | Condition |
|---|---|---|---|
| (none) | Pending | Job seeker | The job is open and they haven't applied to it before |
| Pending | Reviewed | Employer | Opening the applicant page |
| Pending or Reviewed | Withdrawn | Job seeker | Before a decision; final |
| Reviewed | Rejected | Employer | Final |
| Reviewed | Hired | Employer or job seeker | The hire date and who confirmed it are stored |

Anything else is refused by the server, including moving backward. Applications are never deleted.

---

## 3. Questions for you

Each has a recommendation. Answer only the ones you'd change.

| # | Question | Recommendation | Why |
|---|---|---|---|
| Q1 | **What must be filled in before applying?** (PHASE_3 §4.1 left this to Phase 4) | **Nothing beyond the account.** The Apply page shows what the employer will see and lists the empty profile sections with links, as a gentle warning, not a block | The papers only ask for an optional cover note. Blocking a PWD job seeker at Apply adds a barrier; telling them what's missing lets them choose. *Alternative:* require headline and contact number |
| Q2 | **Concept plan D8: a job seeker can only confirm "I was hired" from Reviewed.** If the employer never opens the application, it stays Pending | **Keep the papers' rule** (Table 1), with the hint "If you were hired, ask the employer to open your application on OpenDoor first." | The panel has read Table 1; changing it means changing the papers. *Alternative:* allow Pending → Hired by the job seeker |
| Q3 | **Does the employer see the profile as it is now, or as it was when the person applied?** | **As it is now** (profile, résumé, needs). The cover note and interview request are kept with the application | One profile to keep up to date; a job seeker who improves their profile helps every application. *Alternative:* a copy at the moment of applying (more tables, and a stale résumé) |
| Q4 | **What does the employer still see after someone withdraws?** | **Only the name, dates and "Withdrawn".** The profile, résumé, needs, disability type, contact details and messages are no longer shown | Withdrawing should take the person's information back. Data Privacy Act: keep only what's still needed |
| Q5 | **Deleting a posting that has applicants** (today any posting can be deleted) | **Refused while any applicant is Pending or Reviewed:** "3 applicants are waiting for your decision. Decide on them or close the posting instead." Allowed otherwise; the applicants still see their application with "This job was removed." | Otherwise a waiting application disappears from the employer's view and can never be decided |
| Q6 | **Notifications** (M9, Should-have, planned for Phase 6) | **Record them now, show them in Phase 6.** Each event (new applicant, status change, hire confirmed by the job seeker) is saved with Laravel's database notifications; the bell and list come in Phase 6 if time allows. The status itself is always visible on My applications and the dashboards | The papers say every status change notifies the other party; recording now costs about an hour and makes that true. *Alternatives:* build the bell now (+half a day), or skip until Phase 6 |
| Q7 | **A reason when rejecting?** | **No reason.** The job seeker sees "Rejected" with a kind next-step line | The papers have none, and a written reason could record discrimination. Employers can still contact applicants directly |
| Q8 | **Status names on screen** | **The papers' names everywhere** (Pending, Reviewed, Hired, Rejected, Withdrawn), with one plain sentence under each for the job seeker (§7) | The panel knows these words; the sentence carries the kindness |
| Q9 | **The hire date** | **The day it's marked Hired**, in Philippine time (no date picker). Phase 5's feedback opens 30 days later | Simple and matches "hire date recorded". *Alternative:* the employer enters the start date |
| Q10 | **The interview accommodation request** | **Free text, optional, up to 1,000 characters**, with examples that fit the job's interview format ("Online: captions or a chat option; On-site: a ground-floor room"). It's the first thing on the applicant page | Interview needs vary too much for a checklist, and the papers say "states what they need" |

**Worth knowing for the defense Q&A.** Because the job seeker can confirm a hire (F6.7), someone could falsely claim a hire to rate an employer. The safeguards: confirming needs the employer to have opened the application first (Q2), the employer is notified, the score needs 3 responses, and administrators can hide feedback (F10.5). Flagging a disputed hire is a possible improvement after the defense.

---

## 4. What's decided

### 4.1 Applying

| Topic | Decision | Source |
|---|---|---|
| Who can apply | An active job seeker, to a job that's open and not past its closing date (the same "open job" rule as Browse jobs) | Table 1; PHASE_3 §4.2 |
| Where | **Apply for this job** on the job page, in Find jobs and on the public job page when logged in as a job seeker. It opens the Apply page (`/candidate/jobs/:id/apply`), not a pop-up, so it works at 360 px and with a screen reader | Decision |
| Guests | **Log in to apply** (and "New here? Register as a job seeker"); after logging in they come back to the Apply page | Modules and Features §3.1 |
| Employers and admins | No Apply button; a line says "Job seekers apply from this page." | Decision |
| Already applied | The job page shows "You applied on October 13, 2026. Status: Reviewed" and **View your application** instead of the button | F6.1 |
| Once per job | One application per job seeker per job, ever (a unique index). Withdrawing doesn't allow applying again | F6.1; papers' database section |
| What's sent | Cover note (optional, up to 3,000 characters) and interview accommodation request (optional, Q10). Both plain text | F6.1, F6.2 |
| What the employer will see | The Apply page lists it: your profile and résumé (and uploaded PDF if any), your accommodation needs, your disability type only if you chose to show it, your email and contact number | M2 rules; Revised Proposal §VII-H |
| After applying | My applications opens with "Your application was sent to OpenDoor Demo Corp." read out | Decision |

### 4.2 Tracking, deciding and seeing

| Topic | Decision | Source |
|---|---|---|
| My applications | Newest first; filter **All · Waiting · Hired · Closed** (Waiting = Pending or Reviewed; Closed = Rejected or Withdrawn) with counts; 12 per page | F6.3 |
| Each row | Job title (link to the application page), employer, status, applied date and the next step; **Withdraw** and **I was hired** where allowed | F6.3; ApplicationRow |
| Jobs that closed or were removed | The application stays. The job title is still shown; "This job is closed" or "This job was removed" replaces the link to the job | F4.4 |
| The application page (job seeker) | The path (§7), the job's accommodations as they are now, what you sent, and the actions | Decision |
| Withdraw | A confirmation: "Withdraw your application for Junior Web Developer? You can't undo this or apply for this job again." | F6.4 |
| I was hired | Only from Reviewed (Q2). A confirmation: "Confirm that OpenDoor Demo Corp. hired you for Junior Web Developer?" | F6.7 |
| Who sees applicants | The employer's owner (every department) and HR officers (their own department only). Another company never | Revised Proposal §X (employer_members); §5 permission matrix |
| Opening marks Reviewed | Opening a Pending applicant's page marks it Reviewed, on the server, once. Lists don't | F6.5 |
| Hire or reject | Buttons on the applicant page, each with a confirmation. Allowed on open, closed and waiting postings (closing stops new applications, not decisions) | F6.6; F4.3 |
| At hire | The job's accommodations and notes **at that moment** are copied to the application, because Phase 5 rates "the accommodations advertised at the time of hire" | M4 rule |
| Match for the employer | "Your job meets 4 of their 5 needs" and "Missing: Sign language interpreter", using Phase 3's one match calculation | Modules and Features §3.3 |
| Disability type | Shown to the employer only if the job seeker ticked "Show my disability type to employers I apply to" | F2.3; PHASE_3 §4.1 |
| Contact details | Email and contact number are on the applicant page, so employers can arrange interviews outside OpenDoor | Decision (no messaging in the papers) |
| Admins | No admin view of applications in Phase 4; user management comes in Phase 6 | Roadmap |
| Two people at once | If the job seeker withdraws while the employer marks Hired, the second change is refused: "This application changed while you were looking at it. Reload to see its status." | Decision |

### 4.3 Dashboards

| Dashboard | Phase 4 adds | Source |
|---|---|---|
| Job seeker | **My applications** tile: "2 waiting, 1 hired" with **See my applications**; the "coming soon" tile goes | F8.1 |
| Employer | **Applicants waiting for review**: each posting with Pending applicants ("Junior Web Developer: 2 new"), linking to its applicants. HR officers see their department's | F8.2 |
| Job postings list | Each row: "4 applicants, 2 new" linking to the applicants page | Modules and Features §3.3 |

---

## 5. How we'll know it's done

### 4A demo

| # | Demo step | Expected result |
|---|---|---|
| A1 | As a guest, open a job and choose **Log in to apply**; log in as `candidate@opendoor.test` | Back on the Apply page for that job |
| A2 | Write a cover note and an interview request; **Send application** | My applications shows it first, Pending, with the next step; the count is read out. The job page now says "You applied on …" |
| A3 | Open the job's Apply page again (and send the same request by hand) | "You've already applied for this job." with **View your application**; the server refuses the request |
| A4 | Withdraw it | After the confirmation it's Withdrawn and has no more actions; the path shows where it stopped |
| A5 | Try a closed job, a waiting job and a past-date job by address | No Apply button; the server refuses all three |
| A6 | Log in as the employer and the admin and open `/candidate/applications` | Sent to their own dashboards (and the server refuses them) |
| A7 | A1–A4 with the keyboard only, at 360 px and with a screen reader | Every change is read out; nothing needs a mouse; no sideways scrolling |

### 4B demo

| # | Demo step | Expected result |
|---|---|---|
| E1 | Log in as the Demo Corp. owner | The dashboard lists applicants waiting for review; Job postings shows "4 applicants, 2 new" |
| E2 | Open a posting's applicants; filter **Pending** | Each applicant with status, applied date and "Your job meets 4 of their 5 needs" |
| E3 | Open a Pending applicant | The interview request comes first, then needs, résumé, cover note and contact details. The status is now Reviewed, and the job seeker's My applications says so |
| E4 | **Mark as hired** one applicant and **Mark as rejected** another | Hired with today's date; Rejected. The job seeker sees both. The hired application keeps a copy of the job's accommodations |
| E5 | As the job seeker, choose **I was hired** on a Reviewed application | Hired, "Confirmed by you"; the employer sees "Confirmed by the applicant" |
| E6 | Log in as an HR officer of another department, then as another company, and open the applicant's address and résumé | Refused with a clear message; nothing about the applicant is sent |
| E7 | Open a Withdrawn applicant as the employer | Only the name, dates and "Withdrawn" (Q4) |
| E8 | Try to delete a posting with a waiting applicant | Refused with the message from Q5 |
| E9 | E1–E5 with the keyboard only, at 360 px and with a screen reader | As in A7 |

Every forbidden move in §2 (for example Rejected → Hired, Pending → Rejected, an employer withdrawing, a job seeker rejecting) is refused by the server and covered by tests.

---

## 6. What gets built

### 6.1 Database changes

| Table | What it holds | Part |
|---|---|---|
| `applications` (new) | Job posting, job seeker (user), status, cover note, interview request, **reviewed_at, hired_at, rejected_at, withdrawn_at**, hire confirmed by (employer or candidate), who decided, timestamps. Unique (job posting, job seeker); indexes on (job posting, status) and (job seeker, created) | 4A |
| `application_accommodation` (new) | The job's accommodations and notes copied at the moment of hire (application, accommodation, note) | 4B |
| `notifications` (Laravel's table, Q6) | The recorded events | 4B |

The papers' `applications.candidate_profile_id` becomes the job seeker's **user id**, because a profile row only exists once it's first saved (the same choice Phase 3 made for needs). The dates of each step are kept so the path can show them.

### 6.2 Who can see what

| Information | The job seeker | That job's employer (owner, or HR in its department) | Other employers, other job seekers, guests | Admins |
|---|---|---|---|---|
| The application, its status and dates | ✓ | ✓ | — | — (Phase 6) |
| Cover note and interview request | ✓ | ✓ (not after Withdrawn) | — | — |
| Profile, résumé, needs, contact details | ✓ | ✓ (not after Withdrawn) | — | — |
| Disability type | ✓ | Only if the job seeker allows it (not after Withdrawn) | — | — |
| Whom else they applied to | ✓ | — | — | — |

The server checks every rule (an `ApplicationPolicy`); hiding something in React is only for convenience.

### 6.3 Pages

**Job seeker:**

| Page | What's on it | Part |
|---|---|---|
| Job page (updated, both portal and public) | An **Apply** box under "How this job fits your needs": the button, or "You applied on …", or "This job isn't taking applications" | 4A |
| Apply (`/candidate/jobs/:id/apply`) | The job title and employer; **Cover note**; **Interview accommodation request** with the job's interview format; **What the employer will see** with links to fix empty sections; **Send application** | 4A |
| My applications (`/candidate/applications`) | Filter tabs, the count, application rows, page numbers | 4A |
| Application (`/candidate/applications/:id`) | The path, the job (link if open), what you sent, **Withdraw** / **I was hired** | 4A |
| Dashboard (updated) | The My applications tile | 4A |

The candidate menu becomes **Dashboard · Find jobs · My applications · My needs · My profile**.

**Employer:**

| Page | What's on it | Part |
|---|---|---|
| Job postings (updated) | "4 applicants, 2 new" on each row, linking to Applicants | 4B |
| Applicants (`/employer/job-postings/:id/applicants`) | The posting's title and status; filter tabs with counts; applicant rows | 4B |
| Applicant (`/employer/applications/:id`) | §7 layout; **Mark as hired**, **Mark as rejected** | 4B |
| Dashboard (updated) | **Applicants waiting for review** | 4B |

### 6.4 New building blocks (names from the papers' component list)

| Building block | What it does for users | Part |
|---|---|---|
| `ApplicationStatusBadge` | The five statuses on `StatusBadge`, each with an icon and text | 4A |
| `ApplicationPath` | The application's path with dates (§7) | 4A |
| `ApplicationRow` | One application as a ruled row, with the actions for the person's role (papers' ApplicationRow) | 4A, 4B |
| `ApplyBox` | The Apply area on the job page for guests, job seekers and others | 4A |
| `WhatEmployersSee` | The Apply page's preview of what's shared | 4A |
| `ApplicantSummary` | The interview request, needs fit and contact details on the applicant page | 4B |

Reused: `ResumeView` (the employer reads the same résumé page the job seeker sees), `NeedsFit` (worded for the employer), `FilterTabs`, `Pagination`, `ConfirmDialog`, `EmptyState`, `DashboardTile`, `Announcer`.

### 6.5 Tests

**4A server tests:**
- Apply: only an active job seeker, only an open job (not waiting, closed, past date, deleted or a draft); once per job (also after withdrawing); text limits; text that isn't valid UTF-8 is refused; status, dates and job seeker can't be sent in the request.
- The status rules: every allowed move in §2 for the right person, and every other move refused (a full table test), including from final statuses.
- Withdraw and **I was hired** only by the application's own job seeker; I was hired only from Reviewed, storing the date and "candidate".
- My applications: only one's own, filters and counts, closed and removed jobs still listed with their title.
- The job page tells a job seeker whether they've applied; nobody else learns it.
- Seeding twice changes nothing.

**4B server tests:**
- The applicants list and applicant page: owner (every department), HR officer (own department only), another department, another company, job seekers and admins refused.
- Opening a Pending applicant marks it Reviewed once; opening a Reviewed one changes nothing; the list never does.
- Hire and reject by the employer; the hire copies the job's accommodations and notes; a change racing another is refused.
- Résumé: the employer of an application (not after Withdrawn) can open it, with headers that stop it running scripts; nobody else can.
- Withdrawn applicants show only the name, dates and status; disability type only if allowed.
- Deleting a posting with Pending or Reviewed applicants is refused.
- Counts on the job postings list and dashboard; notifications are recorded for each event (Q6).
- No extra database queries per row in the lists.

**Page tests:** the Apply box in every state (guest, job seeker, applied, not open, employer); Apply errors and the "already applied" case; My applications filters, rows and actions; confirmation dialogs; the path for each status; the applicant page for each status, including Withdrawn; Mark as hired and Mark as rejected; announcements; automatic accessibility checks on every new page.

---

## 7. Look and feel (Frontend Design pass)

**The brief.** Phase 4 is where a job seeker hands over their information and then waits. Waiting is the hard part: most job boards show a bare status word, and the person refreshes and wonders. The Phase 2–3 direction stays: purple for actions, amber only for the employer's accommodation promises, ink for the job seeker's own needs, Atkinson Hyperlegible, ruled rows rather than cards, everything left-aligned.

**The one bold element: the application's path.** On the application page, a vertical line with one stop per step: **Sent** (date), **Opened by the employer** (date), **Decision** (Hired or Rejected, date), or a branch to **Withdrawn**. Steps already passed have a filled ink marker and their date; the current step is bold and has the one-sentence next step under it; steps still ahead have the muted open circle that Phase 3 uses for "Missing". This is a real sequence, so a stepped track is information, not decoration. On My applications the path collapses to the status badge and the same next-step sentence, so the list stays calm.

```
Junior Web Developer
OpenDoor Demo Corp.   (check) Verified company

Your application
 ●  Sent                              October 13, 2026
 │
 ●  Opened by the employer            October 14, 2026
 │  They have your application. If they want to interview you,
 │  they'll contact you by email or phone.
 │
 ○  Decision                          Not yet

[ I was hired ]   [ Withdraw application ]

What you sent
Cover note            I have three years of bookkeeping ...
Interview request     Online interview with captions, please.
```

**The applicant page (employer, wide):**

```
Maria Santos                                         (Reviewed)
Bookkeeper with 3 years of experience
Quezon City, Metro Manila
Applied for Junior Web Developer on October 13, 2026

Résumé (the same My résumé layout)       | Interview accommodation request   <- ink rule
Work experience ...                       | "Online interview with captions, please."
Education ...                             |
Skills ...                                | Their needs and your job           <- ink rule
                                          | Your job meets 4 of their 5 needs
Cover note                                | (check) Flexible hours
"I have three years ..."                  | (o) Adjustable workstation: missing
                                          |
Uploaded résumé: resume.pdf  [Open]       | Contact
                                          | maria@example.com
                                          | 0917 …
                                          |
                                          | Your decision
                                          | [ Mark as hired ]  [ Mark as rejected ]
```

On phones, one column in this order: name and status, interview request, needs, contact, decision, then the résumé. The decision buttons don't appear on Withdrawn, Hired or Rejected applicants; a sentence says what happened instead.

**Status badges** (always an icon and the word):

| Status | Look | Job seeker's next-step sentence |
|---|---|---|
| Pending | Purple tint, clock | "Sent. The employer hasn't opened it yet." |
| Reviewed | Purple tint, open eye | "The employer has opened your application. If they want to interview you, they'll contact you by email or phone." |
| Hired | Green tint, check | "Congratulations. About 30 days after your hire date, we'll ask whether each accommodation was provided." |
| Rejected | Grey tint, minus | "The employer chose other applicants for this job. Your other applications aren't affected." |
| Withdrawn | Grey tint, minus | "You withdrew this application." |

Rejected is grey, not red: it isn't the person's error. Phase 3 made the same choice for "Missing" (a muted circle, not a red cross).

**Checked against generic job-board defaults:**

| The generic default | Our choice | Why |
|---|---|---|
| A one-click "Easy apply" | An Apply page that shows exactly what the employer will see | Informed consent before sharing disability-related needs |
| A horizontal progress bar with percentages | A vertical path with dates and one sentence | Reads in order with a screen reader; fits 360 px; says what happens next |
| A kanban board of applicants | Ruled rows with filter tabs | Drag and drop fails keyboard and screen reader users; Table 1 decides moves, not columns |
| A red "Rejected" pill | Grey, with a kind sentence | Not the person's error |
| Applicant cards with photos | Name, headline and the needs fit; no photos | OpenDoor matches on needs, not appearance |
| The interview request buried in a "notes" field | First thing on the applicant page, with its own ink rule | It's the accommodation the employer must act on first |

**Words on the screen:**

| Where | Text |
|---|---|
| Apply button | "Apply for this job"; for guests "Log in to apply" |
| Apply page hint (interview) | "Optional. This job's interview is online. For example: captions, a chat option or more time." |
| Send | "Send application"; then "Your application was sent to OpenDoor Demo Corp." |
| Already applied | "You applied on October 13, 2026. Status: Pending." and **View your application** |
| Not open | "This job isn't taking applications." |
| Empty My applications | "You haven't applied for any jobs yet." and **Find jobs** |
| Empty applicants | "No one has applied for this job yet." |
| Mark as hired dialog | "Mark Maria Santos as hired for Junior Web Developer? You can't undo this." |
| Mark as rejected dialog | "Mark Maria Santos as rejected for Junior Web Developer? You can't undo this. They'll see 'Rejected' on their applications." |
| Withdrawn (employer) | "Maria Santos withdrew this application on October 15, 2026. Their details are no longer shown." |
| I was hired, from Pending (Q2) | "If you were hired, ask the employer to open your application on OpenDoor first." |

**Accessibility:** the path is an ordered list; each step's state is in its text ("Done", "Current step", "Not yet"), not only its marker. Dialogs keep focus and return it to the button. After an action, the new status is read out and focus stays on the page heading. Long cover notes keep their line breaks. Everything is checked at 360 px and 200% zoom. No new motion.

---

## 8. Privacy and security checks

| Risk | How it's handled | Part |
|---|---|---|
| An employer reading another company's or department's applicants | `ApplicationPolicy` through the posting's employer and department, the same rule as postings (decision 3c); tested for every role | 4B |
| Status moved by the wrong person or backward | One `ApplicationStatus::canTransitionTo($next, $actor)` (papers' enum), checked inside a database transaction that locks the row | 4A |
| Applying twice, or to a job that isn't open | The unique index plus a friendly check; the same "open job" rule as the public pages | 4A |
| Status, dates or job seeker set by a hand-made request | Never fillable; set only by the workflow service | 4A |
| Résumé of an applicant | Served only to that job's employer, with `Content-Security-Policy: sandbox`, `X-Content-Type-Options: nosniff` and `no-store` (the 3B leftover) | 4B |
| Withdrawn applicants' data | Removed from the employer's view (Q4) | 4B |
| Spam applications | 10 applications a minute per account; cover note and request length limits | 4A |
| Learning who applied where | Only the job seeker and that job's employer see an application; the job page tells only the job seeker | 4A |

---

## 9. Order of work

| Step | Work | Done when |
|---|---|---|
| 1 | Server: `applications` table, `ApplicationStatus`, `Application` model, `ApplicationPolicy`, `ApplicationWorkflow` service, apply, list, show, withdraw, I was hired; job page and dashboard additions; demo applications | 4A server tests pass |
| 2 | `ApplicationStatusBadge`, `ApplicationPath`, `ApplicationRow`, `ApplyBox`, `WhatEmployersSee`; Apply, My applications, Application pages; dashboard tile; menu | Demo A1–A6 work; I show you 4A and continue unless you stop me |
| 3 | Server: applicants list and page (marks Reviewed), hire and reject, hire copy of accommodations, résumé for employers, counts, dashboard, delete guard, notifications | 4B server tests pass |
| 4 | Applicants and Applicant pages; Job postings counts; employer dashboard | Demo E1–E8 work |
| 5 | Checks (as in PHASE_3 §4.2: Superpowers code review; GSD code review, UI review and security audit; browser walk-through); A7 and E9; README; build notes; commit and push | Phase 4 finished (target: Wed Oct 14) |

**Demo data.** `candidate@opendoor.test` gets four applications to Demo Corp. jobs (Pending, Reviewed, Rejected, and **Hired 31 days ago**, so Phase 5's feedback form is open during the demo); `candidate2@opendoor.test` gets a Pending one with an interview request ("A sign language interpreter for the interview") and a Withdrawn one. The demo HR officer's department gets one waiting applicant, so the department rule can be shown. Seeding twice changes nothing.

---

## 10. Not in Phase 4

| Feature | Comes in |
|---|---|
| Feedback form, trust score, 3-response minimum, per-accommodation breakdown | Phase 5 (Oct 15) |
| Notification bell and list (recorded from Phase 4, Q6) | Phase 6, if time allows |
| Admin view of applications; user management | Phase 6 (Oct 16) |
| Report a posting, saved jobs, email notifications | Phase 6 if time allows / after the defense |
| Messaging between employer and applicant; interview scheduling | Not in the papers |
| Flagging a disputed hire | After the defense (§3, Q&A note) |

---

## Appendix: technical reference

### A. Server addresses (named as in Modules and Features M6)

| Method | Address | Who | Purpose | Part |
|---|---|---|---|---|
| POST | `/api/job-postings/{id}/applications` | Job seeker | Apply (`cover_note`, `interview_request`) | 4A |
| GET | `/api/applications?status=&page=` | Job seeker | Own applications, 12 per page, with counts per filter | 4A |
| GET | `/api/applications?job_posting={id}&status=&page=` | Employer | One posting's applicants, with counts per status | 4B |
| GET | `/api/applications/{id}` | Job seeker (own) or that job's employer | Details; the employer's first opening marks Pending → Reviewed | 4A, 4B |
| PATCH | `/api/applications/{id}/status` | Job seeker: `withdrawn`, `hired`; employer: `hired`, `rejected` | Change status (Table 1); sends `expected_status` so a stale page is refused | 4A, 4B |
| GET | `/api/applications/{id}/resume` | That job's employer | The applicant's uploaded PDF | 4B |
| GET | `/api/job-postings/{id}` (updated) | Logged-in job seeker | Adds `my_application` (id, status, applied date) | 4A |
| GET | `/api/candidate/dashboard` (updated) | Job seeker | Adds application counts | 4A |
| GET | `/api/employer/dashboard`, `/api/employer/job-postings` (updated) | Employer | Adds waiting applicants and applicant counts | 4B |
| DELETE | `/api/employer/job-postings/{posting}` (updated) | Employer | Refused while applicants wait (Q5) | 4B |

### B. Main files

**Backend (`backend/`)**
- Migrations: `applications`, `application_accommodation`, `notifications`
- Enum `ApplicationStatus` (pending, reviewed, hired, rejected, withdrawn) with `canTransitionTo($next, $actor)` and labels
- Model `Application` (`jobPosting()` with trashed postings, `candidate()`, `hiredAccommodations()`); `JobPosting::applications()`, `User::applications()`
- Service `ApplicationWorkflow` (apply, markReviewed, withdraw, confirmHire, hire, reject; transactions and row locks; the hire copy; notifications)
- Policy `ApplicationPolicy` (view, act as job seeker, act as employer, view résumé)
- Requests `ApplyRequest`, `ApplicationStatusRequest`, `ApplicationListRequest`
- Resources `CandidateApplicationResource`, `ApplicantResource` (the employer's shape; trimmed after Withdrawn)
- Controllers `ApplicationController`, `ApplicationStatusController`, `ApplicantResumeController`
- Notifications `NewApplicant`, `ApplicationStatusChanged`, `HireConfirmedByCandidate` (database channel only)
- Seeder `DemoApplicationSeeder`

**Frontend (`frontend/src/`)**
- Pages: `portals/candidate/ApplyPage`, `MyApplicationsPage`, `ApplicationPage`, `CandidateDashboard` (updated); `portals/employer/ApplicantsPage`, `ApplicantPage`, `EmployerDashboard` and `PostingListItem` (updated); `portals/public/JobPage` (updated)
- Components: `components/applications/ApplicationStatusBadge`, `ApplicationPath`, `ApplicationRow`, `ApplyBox`, `WhatEmployersSee`, `ApplicantSummary`
- API and text: `api/applications.js`, `lib/applicationText.js` (status labels and next-step sentences in one place)
- Router and menus: the new routes; **My applications** in the candidate menu; login returns to the Apply page

### C. Things to get right

1. **One transition check.** `ApplicationStatus::canTransitionTo` is the only place Table 1 lives; the workflow service calls it inside `DB::transaction` with `lockForUpdate`, and compares `expected_status`.
2. **Trashed postings.** `Application::jobPosting()` uses `withTrashed()`, so removed jobs still show their title; applying still uses the strict open-job rule.
3. **Reviewed on open, once.** Only an employer member allowed by the policy triggers it, only from Pending, and the response already says Reviewed.
4. **Same match calculation.** The employer's "meets 4 of their 5 needs" calls `CandidateNeeds::for($applicant)->matchFor($posting)`, eager-loaded for the list (no query per row).
5. **Withdrawn trims the resource**, not just the page.
6. **Philippine dates** for hire dates (`JobPosting::today()` logic), and SQLite/MariaDB-safe queries (`withCount`, no `HAVING` without `GROUP BY`), as in Phase 3.
