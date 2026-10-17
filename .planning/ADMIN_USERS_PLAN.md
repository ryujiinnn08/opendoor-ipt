# Plan: A better Users page, with Edit

> Status: **BUILT** (2026-10-17). U1–U5 answered "all recommended". Not yet committed or deployed.
> Builds on: [PHASE_6_PLAN.md](PHASE_6_PLAN.md) §4.1 (user list, user page, suspend), Q2 and Q3.
> Calendar: no schema changes from Oct 19 (PHASE_7_PLAN Q7). **This plan needs none**: `account_events.type` is a plain string, so a new event type is code only.

---

## 0. Where we are

**Already built (checked 2026-10-17):**
- `/admin/users`: search by name or email, filter by role and status, 20 a page. Each row is a name link, "Role, email", and "Joined …" (employers also get their company line). Plain text rows, with no picture or badges.
- `/admin/users/:id`: status, applications or employer, last login, history beside it, and **Suspend or Reactivate** with a reason (5–500 characters), which logs the user out at once. Admins can't suspend themselves.
- No way to **edit** an account. The only change an admin can make is a new temporary password for another admin.
- **Phase 6 Q3 (privacy, RA 10173):** admins see a job seeker's *account*, never their profile, needs, disability type, résumé or ratings. The request to show "the user's profile" runs into this decision (U1).

**Asked for:** a better-looking list that shows the person's profile, role and joined date, and lets admins edit and suspend.

---

## 1. Decisions

| # | Question | Recommendation | Why / alternative |
|---|---|---|---|
| U1 | **How much profile to show** for a job seeker | **The card employers already see, minus anything sensitive**: their uploaded photo (or initials), headline, and city and province. *Changed 2026-10-17:* admins see the photo even when "Show my photo to employers" is off, since that setting is about employers. **Never** needs, disability type, résumé, contact number or ratings | Keeps Q3's promise in spirit: nothing about disability. *Alternative A:* initials only, which keeps Q3 exactly. *Alternative B:* the full profile, which reverses Q3 and needs a privacy note in the defense |
| U2 | **What an admin can edit** | **Name and email.** Not the role (switching candidate ↔ employer orphans profiles and companies) and not the password (a temporary password already exists for admins, and everyone else has "Forgot password") | The fields people actually get wrong at sign-up. *Alternative:* name only, the safest option |
| U3 | **What changing an email does** | The new address **needs confirming again** (the email verification banner comes back), the person **stays logged in**, and **both addresses** go into the history | Stops an admin moving an account to an address nobody controls, and keeps a record. *Alternative:* keep it confirmed, which is simpler but unchecked |
| U4 | **Who can be edited** | Any account **except your own**: you change your own details in Account settings. Every edit needs a **short reason** (like suspending) and is recorded in the history | Same rule and the same audit trail as suspending. *Alternative:* no reason for edits |
| U5 | **Where the actions live** | **Both places.** Each list row gets an **Actions menu** (View · Edit · Suspend or Reactivate) that opens the same dialogs. The user page gets **Edit details** next to Suspend | Fast for the admin, with one dialog per action. *Alternative:* actions on the user page only, as now |

---

## 2. What changes

**List (`UsersPage.jsx`), a LinkedIn/Indeed-style row** (keeps the violet, yellow accents and tone):
- Left: avatar (photo or initials; employers use the company mark from `EmployerMark`).
- Middle: **name** (link), a **role badge** (Job seeker / Employer / Administrator) with a **Suspended** badge next to it, then the email, then a muted line: headline · city (job seekers, U1) or company · department (employers), and "Joined Oct 13, 2026" and "Last logged in …".
- Right: **Actions** menu (U5). On phones the row stacks and the menu sits under the name.

**User page (`UserPage.jsx`)**: a profile header card (avatar, name, role badge, email, joined date) above the existing facts and history, with **Edit details** and **Suspend** together.

**Backend**
- `PATCH /api/admin/users/{user}`, `Admin\UserController@update`, with `UpdateUserRequest` (name 2–100, email unique and valid, reason 5–500). Refuses your own account (403).
- `AccountService::updateDetails()` in a transaction: saves, clears `email_verified_at` if the email changed (U3), and writes an `AccountEventType::DetailsEdited` event holding the reason and the old → new values.
- `AdminUserResource` gains `last_login_at` and, for job seekers, `profile: { headline, city, province, photo_url|null }` (U1), eager-loaded so the list doesn't run one query per row.
- `AccountHistory.jsx` learns the new event's wording.

**Tests**: feature tests for update (edit works, own account refused, email re-verify, history written, non-admin 403, duplicate email 422) and for the list fields (no disability or needs keys in the response). Page tests for the row, the menu and the edit dialog.

## 3. Out of scope
Changing roles, deleting accounts, bulk actions, editing a job seeker's profile content.
