# Phase 6 Plan: Admin Tools and Notifications

> Status: **APPROVED 2026-10-15** with every recommendation in §3 (Q1–Q10). **6A built** (§9 steps 1–2): server and pages, demo steps A1–A7 checked in the browser at desktop and 360 px; A8's keyboard and screen reader pass is still open. **6B notifications and feedback moderation built** (§9 step 3), demo steps B1–B3 checked in the browser; report a posting and analytics are left for Friday if time allows (Q1). Checked against the proposal papers ([Modules and Features](papers/MODULES_AND_FEATURES.md) §3.4, M1, M4, M7, M8, M9, M10).
> Part of: [CONCEPT_PLAN.md](CONCEPT_PLAN.md), build phase 6 of 7
> Builds on: [PHASE_5_PLAN.md](PHASE_5_PLAN.md) (feedback and the trust score; `feedback.is_hidden` and the recalculation already exist) and [PHASE_4_PLAN.md](PHASE_4_PLAN.md) (notifications are already recorded)
> Method: GSD and Frontend Design only (§7). After approval, an implementation plan per part; GSD code review, UI review and security audit before finishing.

---

## 0. Where we are

**Built (Phases 1–5):** accounts, employers and teams, job postings with approval, the job board with matching, profiles and résumés, applications from Apply to Hired, and post-hire feedback with the trust score. 327 server and 384 page tests pass; everything is pushed to [ryujiinnn08/opendoor-ipt](https://github.com/ryujiinnn08/opendoor-ipt).

**What's next: Phase 6, the admin side.** It answers **SOP 4** (keeping the platform trustworthy) and finishes the dashboards. The papers' build order (Modules and Features §7) says Phase 6 is done when "Admin can verify, moderate and view analytics; users receive notifications". Their priority tables, though, rate analytics and notifications Should-have, and the road map's cut order drops them first, so this plan treats them as 6B (Q1).

**Already done from M8, M10 and M11:** the candidate dashboard (F8.1: applications, matches, feedback due, profile) and the employer dashboard (F8.2: verification, postings with applicant counts, applicants waiting, trust score); posting approval and rejection (part of F10.2); employer verification; categories and accommodation types. What's left is below.

**Time.** The road map gives Phase 6 **one day, Fri Oct 16**; going live is **Sat Oct 17**, the accessibility audit Oct 17–18, usability tests Oct 19–20, the defense from **Oct 21**. So 6A (the Must-haves) is the day's work, and 6B (Should-haves) is built only as far as time allows, in the order of §1. The papers' cut order (PHASE_3_PLAN §1) drops admin analytics first, then report a posting, then feedback moderation, then notifications.

---

## 1. What Phase 6 delivers

### 6A: Must-haves (Fri Oct 16)
- **Users** (`/admin/users`): every account, searchable by name or email, filtered by role and status, 20 a page (F10.1).
- **A user's page** (`/admin/users/:id`): the account, what it's connected to (company and role, or applications and hires), and its history; **Suspend** with a reason, **Reactivate** (F10.1, M1 rule).
- **Add an administrator** (`/admin/users/new`): name and email; OpenDoor creates a temporary password shown once (Q4) (F10.1, M1 rule).
- **Remove a posting** from the admin posting page, with a reason the employer sees (F10.2).
- **Change password** for every portal, needed by new administrators (F1.6, Q5).
- **Admin dashboard** (`/admin/dashboard`): what's waiting first, then the platform in numbers (F8.3).

### 6B: Should-haves, in this order (Fri Oct 16, then the morning of Sat Oct 17 at the latest)
1. **Notifications** (`/notifications`, F9.1, F9.2): a "Notifications" link with the unread count in the candidate and employer headers, the list, mark as read. The events are already recorded since Phase 4; three more are added (verification result, posting approval result, posting removed).
2. **Feedback moderation** (`/admin/feedback`, F10.5): read feedback comments and hide or show feedback, which recalculates the trust score. Closes Phase 5's accepted risk T-5-13 (fake hires).
3. **Report a posting** (F10.3, F10.4): a job seeker reports misleading accommodation claims with a reason; admins dismiss the report or remove the posting.
4. **Admin analytics** (F8.4): applications and hires per month, most-needed accommodations, average trust score.

Q1 asks how far to go.

---

## 2. The rules (from the papers, unchanged)

| Rule | Source |
|---|---|
| Only job seekers and employers can register; **administrators are created by a seeder or another administrator** | M1 |
| A **suspended account (`is_active = false`) can't log in, and its sessions are ended** | M1 |
| Admins **approve, reject with reason, or remove** postings | F10.2 |
| A removed posting is **hidden from lists but kept** for its applications and feedback | F4.4, M4 rule |
| Feedback moderation **hides abusive content without revealing the author** to employers; a hidden response leaves the trust score | F10.5, M7 |
| Admin dashboard: **users by role, pending queues** (verification, postings, reports, feedback) | F8.3 |
| Notifications for: new applicant, status change, hire confirmed by the job seeker, feedback window open, **verification result, posting approval result** | M9 |

---

## 3. Questions for you

| # | Question | Recommendation | Why |
|---|---|---|---|
| Q1 | **How much of 6B** | **Notifications and feedback moderation; report a posting and analytics only if Friday goes well**, otherwise they're cut (they're first in the papers' cut order). If analytics is cut, the panel's "view analytics" is answered by the dashboard's numbers (§4.3) | Notifications are mostly built (recorded since Phase 4) and the papers list them for every status change; feedback moderation is small (the hide flag and the recalculation exist) and answers the panel's likely "what about fake reviews?". *Alternative:* all four, risking the go-live on Saturday |
| Q2 | **What suspending does** to a person's content | **Suspending only stops the account** (no login, sessions ended). Their jobs, applications and feedback stay as they are; if a job should go too, the admin removes it (one click from the user's page) | Simple to explain and to undo: Reactivate restores everything exactly. *Alternative:* suspending an employer owner also hides all their company's open jobs, which then need a rule for reactivating |
| Q3 | **What admins see about a job seeker** | **The account only**: name, email, joined date, status and history, and how many applications and hires. **Not** their profile, needs, disability type, résumé or ratings | Data minimization (RA 10173): suspending an account doesn't need someone's disability details. Feedback comments are read in feedback moderation (6B), where they're needed. *Alternative:* the full profile and résumé, as employers see them |
| Q4 | **New administrators' first password** | **OpenDoor makes a temporary password, shown once** to the admin who created the account ("Give it to Ana privately; she changes it after logging in"). The new admin is asked to change it on first login | Email isn't set up (forgot password is a Could-have), so a link can't be sent. A generated password is never typed by the creator or stored in plain text. *Alternative:* the creating admin types the password |
| Q5 | **Change password** (F1.6, Should-have) | **Include it in 6A for every portal**: current password, new password, confirm. It's half an hour and Q4 needs it | Without it a new admin keeps a password someone else has seen. *Alternative:* admins only |
| Q6 | **A suspension reason** | **Required, and kept in the account's history for admins only.** The person sees the same message as today: "This account has been suspended. Contact the OpenDoor administrators for help." | A reason makes the record defensible ("Posted fake jobs, reported by 3 job seekers"); not showing it avoids arguing with someone trying to evade it. *Alternative:* show the reason at login |
| Q7 | **Removing a posting that has applicants waiting** | **Allowed**, unlike an employer's own delete (Phase 4 Q5). Applicants see "This job was removed."; the employer still sees the applicants and can decide on them; the employer sees the posting as **Removed by OpenDoor** with the reason, and can't edit or reopen it | Moderation can't wait for the employer. Applications and hires stay valid for feedback (M4 rule). *Alternative:* refuse, like the employer's delete |
| Q8 | **Notifications: the bell** (F9.1) | **A text link "Notifications" with the unread count**, e.g. "Notifications (3)", in the header next to the user's name, with the bell icon beside the word. No pop-up: it opens the list page. Counted when a page loads (no live updates) | A word is what voice control users say and screen readers read; a pop-up menu is the hardest widget to make accessible. *Alternative:* an icon-only bell with a drop-down |
| Q9 | **Who reads feedback comments** (6B) | **Admins see the comment, the ratings, the employer and the job, but not the author's name** unless they open "Show who wrote this", which is recorded in the history | Phase 5 Q2 said admins see answers with the name; showing it only on purpose keeps moderation about the content. *Alternative:* show the name always |
| Q10 | **The demo** | **Seed one suspended job seeker** (a new `suspended@opendoor.test`, with a history line; the Phase 5 sample hires stay active) **and a second administrator** (`admin2@opendoor.test`), so user management has something to show before the panel acts live | The panel sees the list with real states; the live demo then suspends and reactivates `candidate2@` and removes one posting |

---

## 4. What's decided

### 4.1 Users and accounts (6A)

| Topic | Decision | Source |
|---|---|---|
| The list | Name, email, role ("Job seeker", "Employer", "Administrator"), for employers the company and their role in it, status ("Active", "Suspended"), joined date; newest first; 20 a page; search matches name or email; filters role and status kept in the address | F10.1 |
| A user's page | The account; for employers the company, its verification and their department; for job seekers the number of applications and hires; the **history** (§7); Suspend or Reactivate | F10.1; Q3 |
| Suspend | Reason required (5–500 characters); `is_active` false; every session of that user is deleted (sessions are stored in the database), so they're logged out at once; recorded in the history with who and when | M1; Q2, Q6 |
| Reactivate | No reason needed; recorded in the history | Decision |
| Guards | An admin can't suspend themself; the last active administrator can't be suspended; administrators can be suspended by another administrator | Decision |
| Add an administrator | Name and email (unique); a 16-character temporary password generated and shown once; `must_change_password` set; the new admin goes straight to Change password after logging in | M1; Q4 |
| Change password | Current password, new password (the registration rules), confirm; every other session of that user ends; "Your password was changed." | F1.6; Q5 |

### 4.2 Removing a posting (6A)

| Topic | Decision | Source |
|---|---|---|
| Where | The admin posting page (`/admin/job-postings/:id`), for postings waiting, open, rejected or closed; and from a user's page, their company's postings link there | F10.2 |
| How | **Remove posting** → reason required (shown to the employer) → confirm "Remove Junior Web Developer? Job seekers won't see it again, and the employer can't edit or reopen it. You can't undo this." | Q7 |
| Stored | Soft-deleted as today, plus `removed_by` (admin), `removed_at`, `removal_reason` | F4.4 |
| The employer | Sees it in Job postings under a **Removed** filter: "Removed by OpenDoor on October 16, 2026: Accommodations listed aren't available at this site." Applicants are still reachable; no edit, reopen or delete | Q7 |
| Applicants | "This job was removed." as for an employer's delete; applications keep their status; hires keep their feedback | M4 rule |
| Notification | The employer's managers get "posting removed" (6B notifications) | M9 |

### 4.3 Admin dashboard (6A)

| Topic | Decision | Source |
|---|---|---|
| Waiting for you (first) | Companies to verify, postings to approve; with 6B, feedback to check and reports to review. Each row says the count in a sentence and links to its queue; a queue at 0 says "Nothing waiting" | F8.3 |
| OpenDoor in numbers | Job seekers, employers (companies and individuals), administrators, suspended accounts; open jobs; applications; hires; employers with a trust score | F8.3 |
| Kept | The existing tiles for categories, accommodation types and the HR cap, below | Phase 2 |

### 4.4 Notifications (6B)

| Topic | Decision | Source |
|---|---|---|
| Who | Job seekers and employers (admins have their queues) | M9 |
| Events | New applicant, status change, hire confirmed by the job seeker, feedback open (recorded since Phases 4–5); **new:** verification result (to the company's owner), posting approved or rejected (to its creator and the department's managers), posting removed (to the managers) | M9 |
| The list | Newest first, 20 a page; each one a sentence with a link ("Maria Santos applied for Junior Web Developer." → the applicant); unread ones in bold with the word "New"; **Mark all as read** | F9.1, F9.2 |
| Opening one | Marks it read and opens its page | F9.2 |
| Count | `GET /api/notifications/unread-count` on each page change; "Notifications (3)"; no number at 0 | Q8 |
| Kept | 90 days | Decision |

### 4.5 Feedback moderation (6B)

| Topic | Decision | Source |
|---|---|---|
| The list | Every feedback with a comment, newest first; filter "With comments" (default), "All", "Hidden"; each shows the employer, the job, the ratings, the comment and the date | F10.5 |
| The author | Hidden behind "Show who wrote this", which is recorded in that feedback's history | Q9 |
| Hide | Reason required; `is_hidden` true; the trust score is recalculated at once; the job seeker's application page says "OpenDoor's administrators removed these ratings from the trust score." | F10.5; M7 |
| Show again | Recorded; recalculated | Decision |

### 4.6 Report a posting and analytics (6B, only if Q1 allows)

| Topic | Decision | Source |
|---|---|---|
| Report | On a job page, for logged-in job seekers: **Report this job**, a reason from a short list ("An accommodation isn't really provided", "The job isn't real", "Something else") and details; once per job seeker per job | F10.3 |
| Review | `/admin/reports`: open reports with the posting; **Dismiss** or **Remove posting** (§4.2); the reporter is never shown to the employer | F10.4 |
| Analytics | On the admin dashboard: applications and hires per month (the last 6) as a table, the 10 most-needed accommodations, the average trust score of employers that have one. Tables, not charts (Q9 of Phase 5: words and numbers) | F8.4 |

---

## 5. How we'll know it's done

### 6A demo

| # | Demo step | Expected result |
|---|---|---|
| A1 | Log in as `admin@`; open the dashboard | **Waiting for you** first (companies to verify, postings to approve), then the numbers |
| A2 | Users; search "candidate", filter Job seekers | Both demo job seekers, with status |
| A3 | Open `candidate2@`; Suspend with a reason | The page says Suspended with the history line; `candidate2@` logged in elsewhere is logged out on their next click; logging in shows the suspended message |
| A4 | Reactivate `candidate2@` | Active again; can log in; history shows both |
| A5 | Try to suspend yourself | Not offered; a hand-made request is refused |
| A6 | Add an administrator | The temporary password is shown once; logging in with it goes straight to Change password |
| A7 | Open an open posting; Remove with a reason | Gone from Browse jobs; the applicant sees "This job was removed."; `employer@` sees it under Removed with the reason |
| A8 | A1–A7 with the keyboard only, at 360 px and with a screen reader | Everything reachable; no sideways scrolling; dialogs return focus |

### 6B demo

| # | Demo step | Expected result |
|---|---|---|
| B1 | As `employer@` after a new application | "Notifications (1)"; the list says who applied; opening it goes to the applicant and the count drops |
| B2 | As `candidate@` after the employer hires them | "Notifications (1)": "You were hired for Graphic Designer at OpenDoor Demo Corp." |
| B3 | As `admin@`, Feedback; hide one of Bayanihan's with a reason | Bayanihan's score changes on its page at once; the author's name was never shown until asked |
| B4 | (If built) report a job as `candidate2@`; dismiss or remove as `admin@` | The report appears in the queue and the dashboard count; removal works as A7 |

Server tests cover every rule in §2 and §4: suspension ends sessions and blocks login, the self and last-admin guards, admin-only creation, temporary password and forced change, removal keeps applications and hides the job, the removal reason reaches only that employer, notification ownership (nobody reads another's), hiding recalculates, and the author's name only on request.

---

## 6. What gets built

### 6.1 Database changes

| Table | What it holds | Part |
|---|---|---|
| `users` (two columns) | `must_change_password`, `last_login_at` | 6A |
| `account_events` (new) | User, type (`suspended`, `reactivated`, `admin_created`, `password_changed`), reason, by (admin), when: the history | 6A |
| `job_postings` (three columns) | `removed_by`, `removed_at`, `removal_reason` | 6A |
| `feedback` (two columns) and `feedback_events` (new) | `hidden_reason`, `hidden_by`; history of hide, show and "show who wrote this" | 6B |
| `reports` (new) | Job posting, reporter, reason, details, status (`open`, `dismissed`, `acted`), decided by and when | 6B |

### 6.2 Who can see what

| Information | The person themself | Employers | Other job seekers and guests | Admins |
|---|---|---|---|---|
| Account status and suspension reason | Status only (the login message) | — | — | ✓ |
| An account's history | — | — | — | ✓ |
| A job seeker's profile, needs, disability type, résumé | ✓ | Through an application (Phase 4) | — | — (Q3) |
| A removal reason | — | ✓ (that employer) | — | ✓ |
| Notifications | ✓ (own only) | ✓ (own only) | — | — |
| Feedback comments and ratings | ✓ (own) | — | — | ✓ (6B); the author's name only on request (Q9) |
| A report and who sent it | ✓ (own) | — | — | ✓ |

### 6.3 Server addresses (as the papers name them)

| Method | Address | Who | Purpose | Part |
|---|---|---|---|---|
| GET | `/api/admin/users?q=&role=&status=&page=` | Admin | The list | 6A |
| GET | `/api/admin/users/{id}` | Admin | One account, its connections and history | 6A |
| PATCH | `/api/admin/users/{id}/suspend` | Admin | `{ suspended: true, reason }` or `{ suspended: false }` | 6A |
| POST | `/api/admin/users` | Admin | Add an administrator; returns the temporary password once | 6A |
| PUT | `/api/me/password` | Anyone logged in | Change password | 6A |
| DELETE | `/api/admin/job-postings/{id}` | Admin | Remove with `reason` | 6A |
| GET | `/api/admin/dashboard` (updated) | Admin | Queues and numbers | 6A |
| GET | `/api/notifications`, `/api/notifications/unread-count` | Job seeker, employer | List and count | 6B |
| PATCH | `/api/notifications/{id}/read`, `/api/notifications/read-all` | Job seeker, employer | Mark as read | 6B |
| GET, PATCH | `/api/admin/feedback`, `/api/admin/feedback/{id}/hide` | Admin | Moderation | 6B |
| POST | `/api/job-postings/{id}/reports` | Job seeker | Report | 6B |
| GET, PATCH | `/api/admin/reports`, `/api/admin/reports/{id}` | Admin | Review | 6B |

### 6.4 Pages and building blocks

| Name | What it is | Part |
|---|---|---|
| `UsersPage`, `UserPage`, `AddAdminPage` | `/admin/users`, `/admin/users/:id`, `/admin/users/new` | 6A |
| `AccountHistory` | The ruled history list (§7) | 6A |
| `ChangePasswordPage` | `/account/password` in every portal, linked from the header's name | 6A |
| `RemovePostingDialog` | Reason and confirmation, on the admin posting page | 6A |
| `AdminDashboard` (updated) | Waiting for you, numbers, tiles | 6A |
| `NotificationsLink`, `NotificationsPage` | Header link with count; `/notifications` | 6B |
| `FeedbackModerationPage`, `ReportsPage`, `ReportJobDialog` | 6B pages | 6B |
| Updates | Admin menu (Users, Feedback, Reports), employer Job postings (Removed filter), candidate application page (hidden feedback sentence), API.md | 6A, 6B |

---

## 7. Look and feel (Frontend Design pass)

**The brief.** Admins act on other people's accounts and livelihoods: a suspended job seeker can't apply, a removed posting loses its applicants. The admin portal has to make every such action deliberate and explainable later, and stay calm to use. The people using it are OpenDoor's own staff, possibly PWDs themselves, so it gets the same accessibility as the rest. The design system stays: purple actions, amber for the employer's accommodation promises, ink for a person's own record, Atkinson Hyperlegible, ruled rows, no new colours.

**What I set aside.** The usual admin console is a dense data table with icon buttons, coloured status pills and a row of big-number cards. The current admin dashboard already leans that way (a grid of number tiles). Number tiles say how many, not what to do; icon-only row actions fail voice control. So the dashboard leads with a sentence list of what's waiting, and lists stay ruled rows with words.

**The one bold element: the record.** Every action an admin takes leaves a line with a reason, and the record is shown where the decision is made. On a user's page, the account's **history** sits beside the action, in ink (a person's own record), as a ruled timeline in plain sentences: "Suspended on October 16, 2026 by Ana Cruz: Posted fake jobs, reported by 3 job seekers." "Reactivated on October 18, 2026 by Ana Cruz." Before an admin suspends someone, they see what was done before. The same idea carries to removed postings (the employer reads the reason) and hidden feedback (the history of who looked at the author). Nothing else on these pages is decorated.

```
Maria Santos                                     [ Suspend Maria Santos ]
Job seeker, maria@example.com                (secondary button; the dialog's confirm is primary)
Active since October 2, 2026. 4 applications, 1 hire.

| History                                         <- ink rule
| Suspended on October 16, 2026 by Ana Cruz:
|   "Posted fake jobs, reported by 3 job seekers."
| Reactivated on October 18, 2026 by Ana Cruz.
```

```
Waiting for you
2 companies to verify                                  Review companies
5 postings to approve                                  Review postings
Nothing waiting in feedback                            Open feedback
------------------------------------------------------------------------
OpenDoor in numbers
Job seekers        42
Employers           9   (7 companies, 2 individuals)
Administrators      2
Suspended accounts  1
```
(A definition list: label and number on one ruled row, the number right after the label on phones.)

**Colour carries consequence, not decoration.** Suspending can be undone, so **Suspend account** is a secondary button and its confirm is primary; **Remove posting** can't, so its confirm is red, like Withdraw and Reject in Phase 4. "Suspended" uses the neutral grey status badge (not the person's error); "Removed by OpenDoor" uses grey with the reason in a sentence.

**Notifications as a word.** The header gets "Notifications (3)" with the bell icon before the word, at 44 px, between the name and Log out; unread items in the list are bold with "New" as text, never colour alone.

**Words on the screen:**

| Where | Text |
|---|---|
| Suspend dialog | "Suspend Maria Santos? She can't log in until you reactivate the account, and she's logged out now. Her applications stay as they are." Reason label: "Why (only administrators see this)" |
| After suspending | "Maria Santos's account is suspended." |
| Can't suspend | "You can't suspend your own account." / "OpenDoor needs at least one active administrator." |
| Temporary password | "Ana Cruz can now log in with this temporary password. Copy it and give it to her privately; it won't be shown again. She'll be asked to change it." |
| Remove dialog | "Remove Junior Web Developer? Job seekers won't see it again, and the employer can't edit or reopen it. You can't undo this." Reason label: "Reason (the employer sees this)" |
| Employer's removed posting | "Removed by OpenDoor on October 16, 2026: Accommodations listed aren't available at this site." |
| Empty queue | "Nothing waiting." |
| Notifications empty | "No notifications yet. We'll tell you here when something changes on your applications." (job seeker) / "…on your job postings." (employer) |
| Hidden feedback (job seeker) | "OpenDoor's administrators removed these ratings from the trust score." |

**Accessibility:** lists are ruled `<ul>`s with headings, not tables, except the analytics tables (with captions and header cells); every action is a text button naming its target ("Suspend Maria Santos"); the temporary password is in a read-only field with **Copy password** (the Phase 2 `CopyLinkBox`), announced when copied; dialogs return focus; 360 px and 200% zoom.

---

## 8. Privacy and security checks

| Risk | How it's handled | Part |
|---|---|---|
| A non-admin using admin addresses | `role:admin` on every `/api/admin/*` route; tests per role | 6A |
| A suspended person staying logged in | Their sessions are deleted at suspension; the `active` middleware stays as the backstop | 6A |
| Locking everyone out | No self-suspension; the last active admin can't be suspended | 6A |
| Admin accounts created by anyone else | Only `POST /api/admin/users` (admin only) or the seeder; registration still refuses the admin role | 6A |
| The temporary password | Generated server-side (16 characters), returned once, stored hashed; forced change on first login; not logged | 6A |
| Admins reading more than they need | Job seekers' profile, needs, disability type and résumé are not in admin responses (Q3); the feedback author only on request, recorded (Q9) | 6A, 6B |
| Reading someone else's notifications | Every notification query is scoped to the logged-in user; ids from others answer 404 | 6B |
| A removal or suspension without a trail | Reason required; every action recorded with who and when | 6A |
| Reports used to harass an employer | One report per job seeker per job; the reporter is never shown to the employer; removal stays an admin decision | 6B |

---

## 9. Order of work

| Step | Work | Done when |
|---|---|---|
| 1 | Server: account events, suspend and reactivate (ending sessions), add admin, change password, admin user list and page, posting removal, dashboard numbers, demo data (Q10) | 6A server tests pass |
| 2 | Users, user page, add admin, change password, remove posting dialog, employer Removed filter, dashboard | Demo A1–A7 work; I show you 6A and continue unless you stop me |
| 3 | 6B in the order of §1, each server then pages, as far as Q1 says | Its B step works |
| 4 | Checks (GSD code review, UI review, security audit; browser walk-through A8); API.md; build notes; commit and push | Phase 6 finished, ready to go live Sat Oct 17 |

---

## 10. Not in Phase 6

| Feature | Comes in |
|---|---|
| Email notifications, forgot password (Could-have) | After the defense |
| Account deletion request (F1.8, Could-have) | After the defense |
| Saved jobs (M12), display settings (M13 settings page, Could-have) | After the defense |
| Report a posting, admin analytics | Only if Q1 allows; otherwise after the defense |
| Going live, accessibility audit, usability tests | Phase 7 (Oct 17–20) |
