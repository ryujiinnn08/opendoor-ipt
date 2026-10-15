# OpenDoor API reference

The REST API behind the OpenDoor web app (Laravel 12, `backend/`). Every endpoint the React app (`frontend/src/api/*.js`) uses is listed here, with who may call it, what to send and what comes back. The examples are real responses captured from the demo data (long lists are shortened with `…`).

Phases covered: 1–4 (accounts, employers and teams, job postings, the job board and matching, profiles, applications). Feedback and the trust score (Phase 5) will be added when they're built.

**Where the contract lives in the code:** each request's rules are a Form Request in `backend/app/Http/Requests/`, each response shape is an API Resource in `backend/app/Http/Resources/`, and the server tests in `backend/tests/Feature/` check the shapes and the permissions. If this page and the code ever disagree, the code and its tests win; please update this page.

---

## Contents

1. [Basics](#1-basics): addresses, logging in, headers, dates
2. [Errors and limits](#2-errors-and-limits)
3. [Shared shapes](#3-shared-shapes)
4. [Endpoints](#4-endpoints)
   - [4.1 Health and shared lists](#41-health-and-shared-lists)
   - [4.2 Accounts](#42-accounts)
   - [4.3 Job board (public)](#43-job-board-public)
   - [4.4 Job seeker](#44-job-seeker)
   - [4.5 Applications](#45-applications)
   - [4.6 Employer: profile, verification, team](#46-employer-profile-verification-team)
   - [4.7 Employer: job postings](#47-employer-job-postings)
   - [4.8 Invites](#48-invites)
   - [4.9 Admin](#49-admin)
5. [Who can see what](#5-who-can-see-what)

---

## 1. Basics

| | |
|---|---|
| **Base address** | Local: `http://localhost:8000/api`. Live: `https://api.<domain>/api`. The React app reads it from `VITE_API_URL`. |
| **Format** | JSON in and out (`Content-Type: application/json`, `Accept: application/json`). File uploads (résumé, logo) use `multipart/form-data`. |
| **Successful responses** | One item: `{ "data": { … } }`. A list: `{ "data": [ … ] }`. Paged lists add Laravel's `links` and `meta` (`current_page`, `last_page`, `per_page`, `total`, …), and some add more top-level keys (`counts`, `job`). `204 No Content` has no body. |
| **Dates** | Moments are ISO 8601 in UTC (`"2026-10-13T02:00:00+00:00"`). Whole days are `YYYY-MM-DD` and count in Philippine time (`closes_on`, `hired_at`). Months are `YYYY-MM` (work experience). |
| **Ids** | Positive whole numbers of at most 18 digits; anything else in an address is "not found". |

### Logging in (Laravel Sanctum, session cookies)

OpenDoor uses Sanctum's **SPA cookie** authentication, not tokens: the website and the API share one domain, the session lives in a secure, http-only cookie, and no token is ever stored in the browser.

1. `GET /sanctum/csrf-cookie` (outside `/api`): sets the `XSRF-TOKEN` cookie.
2. Every request that changes something (`POST`, `PUT`, `PATCH`, `DELETE`) sends that cookie's value back in the `X-XSRF-TOKEN` header. Axios does this by itself (`withCredentials: true`, `withXSRFToken: true` in `frontend/src/api/client.js`).
3. `POST /api/login` starts the session; `POST /api/logout` ends it.
4. The browser must send cookies (`credentials: 'include'`) and an `Origin` that the API trusts (`SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`).

A suspended account is logged out on its next request (403). An expired CSRF token answers 419; the app fetches a new one and retries once.

**Trying the API by hand:** log in through the website, then use the browser's developer tools (or `fetch(…, { credentials: 'include' })` in its console) so the session cookie is sent. Public `GET` endpoints work from anywhere, e.g. `curl http://localhost:8000/api/job-postings`.

### Roles

| Role | Who | Notes |
|---|---|---|
| `candidate` | A job seeker | Registers on their own |
| `employer` | A company owner, an HR officer or an individual employer | Registers on their own, then sets up a profile; HR officers join through an invite. Most employer endpoints need that profile first (otherwise 403 with `"code": "employer_profile_required"`) |
| `admin` | An OpenDoor administrator | Created by the seeder; never through registration |

"Owner" below means the owner of a company or an individual employer; "HR" is an HR officer, who sees only their own department.

---

## 2. Errors and limits

Every error is JSON with at least a `message` written for people (the app shows it as is). Production never includes debugging details.

| Status | When | Body |
|---|---|---|
| **401** | Not logged in | `{ "message": "Unauthenticated." }` |
| **403** | Logged in but not allowed (wrong role, someone else's record, another department, a suspended account) | `{ "message": "You can only see applicants for your own job postings." }` |
| **404** | Doesn't exist, was deleted, or isn't public (e.g. a draft posting) | `{ "message": "We couldn't find that. It may have been deleted." }` (some endpoints have their own, e.g. "This job isn't taking applications.") |
| **409** | It changed meanwhile, or it already exists | `{ "message": "This application changed while you were looking at it. Reload to see its status." }`; applying twice adds `"application_id"` |
| **419** | The CSRF token expired | Laravel's default; get a new cookie and retry |
| **422** | The input was refused | `{ "message": "…", "errors": { "field": ["…"] } }` — one or more messages per field, e.g. `{"errors":{"sort":["The selected sort is invalid."]}}`; rule refusals without a field (e.g. "1 applicant is waiting for your decision…") have only `message` |
| **429** | Too many requests | `{ "message": "Too Many Attempts." }` |

**Rate limits**

| What | Limit |
|---|---|
| Login | 5 failed attempts per email, then a wait (the message says how long) |
| Register | 10 a minute per IP address |
| Job board (`/job-postings`, `/employers/{id}`) | 120 a minute per IP address, counted separately |
| Apply | 10 a minute per account |
| Open an invite / accept it | 30 / 10 a minute per IP address |

**Caching:** responses with private details (applications, applicants, résumés) send `Cache-Control: private, no-store`, so a browser never keeps them on disk.

---

## 3. Shared shapes

The same objects appear in several endpoints. Field lists are complete; examples are shortened.

### User (`UserResource`)

```json
{ "id": 4, "name": "Demo Employer", "email": "employer@opendoor.test", "role": "employer",
  "membership": { "role": "owner", "department": null,
    "employer": { "id": 1, "type": "company", "name": "OpenDoor Demo Corp.", "logo_url": null,
                  "is_verified": true, "verification_status": "verified" } } }
```

`membership` appears for employers only (`null` before setup); HR officers have `"role": "hr"` and their `department` (`{ "id", "name" }`).

### Accommodation

`{ "id": 2, "name": "Accessible restroom", "group_name": "Physical access", "description": "…", "is_active": true }`. On a job posting each one also has the employer's `note` (or `null`). Retired types (`is_active: false`) stay on records that already use them.

### Job posting, public (`PublicJobPostingResource`)

What anyone sees of an **open** posting. It never includes the author, status, rejection reason, approval dates or registration details.

```json
{ "id": 3, "title": "Junior Web Developer", "description": "Build and maintain accessible web pages…",
  "location": "Anywhere in the Philippines", "employment_type": "full_time", "work_setup": "remote",
  "interview_format": "online", "closes_on": "2026-11-12",
  "category": { "id": 1, "name": "Information Technology" }, "department": { "name": "IT" },
  "employer": { "id": 1, "type": "company", "name": "OpenDoor Demo Corp.", "logo_url": null, "is_verified": true },
  "accommodations": [ { "id": 6, "name": "Written or captioned meetings", "group_name": "Communication", "note": null }, "…" ] }
```

For a **logged-in job seeker with needs**, two more keys:

- `match`: how the job meets their needs. `{ "needs_total": 5, "needs_met": 1, "missing": ["Accessible restroom", "…"] }`; the single-job endpoint adds `needs`, each `{ "id", "name", "group_name", "provided": true|false, "note" }`. A need counts as met only when the posting lists that accommodation.
- `my_application` (single job only, when they applied): `{ "id": 1, "status": "pending", "status_label": "Pending", "applied_at": "…" }`.

Values: `employment_type` `full_time|part_time|contract|internship`; `work_setup` `on_site|hybrid|remote`; `interview_format` `online|on_site|online_or_on_site`.

### Job posting, employer and admin (`JobPostingResource`)

The public fields plus: `status` (the status people see: `draft|pending|open|rejected|closed`; an open posting past its date is `closed`), `closed_automatically`, `rejection_reason`, `changed_after_approval`, `submitted_at`, `approved_at`, `updated_at`, `department` (`{ "id", "name" }`), `employer.verification_status`, `created_by` (`{ "name" }`), each accommodation's `is_active`, and for employers:

- `actions`: what this person may do now, from `edit`, `close`, `reopen`, `change_closing_date`, `delete`.
- `applicants` (on the list): `{ "total": 4, "new": 2 }` (`new` = not opened yet).

### Application, the job seeker's view (`CandidateApplicationResource`)

```json
{ "id": 7, "status": "pending", "status_label": "Pending",
  "applied_at": "2026-10-13T02:00:00+00:00", "reviewed_at": null, "rejected_at": null, "withdrawn_at": null,
  "hired_at": null, "hire_confirmed_by": null,
  "cover_note": "I encoded delivery records for two years.",
  "interview_request": "A ground-floor interview room, please.",
  "actions": ["withdraw"],
  "job": { "id": 12, "title": "Data Encoder", "interview_format": "on_site", "state": "open",
           "employer": { "id": 3, "name": "Bayanihan Contact Center Inc.", "type": "company", "is_verified": true } } }
```

- `status`: `pending|reviewed|hired|rejected|withdrawn` (the proposal's Table 1).
- `actions`: from `withdraw` (Pending or Reviewed) and `confirm_hire` (Reviewed only).
- `hire_confirmed_by`: `employer|candidate` once Hired; `hired_at` is a day.
- `job.state`: `open`, `not_open` (closed, past its date, or waiting for approval again) or `removed` (deleted). The application stays either way.
- The single-application endpoint adds `job.accommodations` (as listed now) and `hired_accommodations` (as advertised on the hire date; `null` unless Hired).
- `feedback` (5A): `null` unless Hired; else `{ "state", "opens_on", "sent_at" }` with `state` = `not_yet` (before `opens_on`, the hire date + 30 days in Philippine time), `open`, `sent`, or `nothing_to_rate` (the job listed no accommodations).

### Applicant, the employer's view (`ApplicantResource`)

Never the job seeker's shape. In a list:

```json
{ "id": 1, "status": "pending", "status_label": "Pending", "applied_at": "…", "reviewed_at": null,
  "rejected_at": null, "withdrawn_at": null, "hired_at": null, "hire_confirmed_by": null,
  "actions": [],
  "applicant": { "name": "Demo Candidate", "headline": "Data encoder with 2 years of experience" },
  "has_interview_request": false,
  "match": { "needs_total": 2, "needs_met": 0, "missing": ["Accessible restroom", "Wheelchair-accessible entrance"] } }
```

- `actions`: from `hire` and `reject` (Reviewed only).
- `match` is `null` when the applicant lists no active needs.
- The single-applicant endpoint adds `job` (`{ "id", "title", "interview_format", "status", "department" }`), `cover_note`, `interview_request`, `match.needs`, and `profile` (the Profile shape below, with `disability_type` only if the job seeker chose to show it, and `resume` `{ "name", "uploaded_at" }` or `null`).
- **After Withdrawn** only the dates, `status`, `actions` (empty) and `applicant: { "name" }` remain (plus `job` on the single endpoint): no headline, needs, profile, contact details or messages.

### Profile (`CandidateProfileResource`)

```json
{ "name": "Demo Candidate", "email": "candidate@opendoor.test", "headline": "Data encoder with 2 years of experience",
  "city": "Quezon City", "province": "Metro Manila", "contact_number": "0917 555 0101",
  "about": "…", "skills": "Microsoft Excel, data entry, customer service", "trainings": null, "languages": "Filipino, English",
  "disability_type": "physical", "show_disability": false,
  "experiences": [ { "job_title": "Data Encoder", "company": "Bayani Logistics", "started_on": "2023-01",
                     "ended_on": "2024-12", "is_current": false, "description": "…" } ],
  "educations": [ { "level": "college", "school": "Technological University of the Philippines",
                    "course": "BS Information Technology", "year_finished": 2022, "is_studying": false } ],
  "resume": { "name": "ana-resume.pdf", "uploaded_at": "…" } }
```

`disability_type`: `deaf_or_hard_of_hearing|intellectual|learning|mental|physical|psychosocial|speech_and_language|visual|cancer|rare_disease|prefer_not_to_say` or `null`. `level`: `elementary|junior_high|senior_high|als|vocational|college|postgraduate`.

### Employer (`EmployerResource`)

```json
{ "id": 1, "type": "company", "name": "OpenDoor Demo Corp.", "industry": "Information Technology",
  "address": "Ayala Avenue, Makati City, Metro Manila", "description": "…", "logo_url": null,
  "is_verified": true, "verification_status": "verified",
  "verification": { "status": "verified", "registration_type": "sec", "business_reg_no": "DEMO-2026-0001",
                    "submitted_at": "…", "verified_at": "…", "rejection_reason": null } }
```

`type`: `company|individual`. `verification_status`: `not_submitted|pending|verified|rejected`. `registration_type`: `dti|sec|cda`. The **public** employer shape (`PublicEmployerResource`) keeps only `id, type, name, industry, address, description, logo_url, is_verified`: never the registration number, team or emails.

---

## 4. Endpoints

**Who:** "Anyone" needs no login (a logged-in session is still read, e.g. for `match`); every other row needs a login, and the role shown. Rows marked with a phase number arrived in that phase.

### 4.1 Health and shared lists

| Method | Address | Who | Returns |
|---|---|---|---|
| GET | `/health` | Anyone | `{ "status": "ok", "app": "OpenDoor", "database": "ok"\|"unavailable", "time": "…" }` (no `data` wrapper; for deploy checks) |
| GET | `/categories` | Anyone | `{ "data": [ { "id", "name" } ] }`, by name |
| GET | `/accommodations` | Anyone | Active types grouped for checklists: `{ "data": [ { "group": "Physical access", "accommodations": [Accommodation, …] }, … ] }` |

### 4.2 Accounts

| Method | Address | Who | Send | Returns |
|---|---|---|---|---|
| POST | `/register` | Anyone | `role` (`candidate`\|`employer`), `name` (≤255), `email` (lowercase, unique), `password` + `password_confirmation` (8+ characters with upper and lower case, a number and a symbol), `consent` (must be `true`) | 201, User; also logs in |
| POST | `/login` | Anyone | `email`, `password` | 200, User. Wrong details: 422 on `email` ("These details do not match our records. Check your email and password.") |
| POST | `/logout` | Logged in | — | 204 |
| GET | `/me` | Logged in | — | User (the app calls it on load to restore the session) |

### 4.3 Job board (public)

#### `GET /job-postings` — open jobs (Anyone)

| Query | Rules | Meaning |
|---|---|---|
| `q` | ≤100 characters, ≤8 words | Every word must appear in the title, description, location or employer name |
| `category` | category id | One category |
| `accommodations[]` | ≤50 ids | The job must provide **every** one |
| `employer` | id | One employer's open jobs |
| `sort` | `newest` (default), `closing`, `match` | `match` needs a job seeker with needs; otherwise it falls back to `newest` |
| `match` | `1`/`0` | Job seekers with needs: only jobs meeting at least one need ("Matches my needs"); ignored for anyone else |
| `page`, `per_page` | per page 1–12 (default 12) | |

Returns a paged list of public job postings (with `match` for a job seeker with needs).

#### Other public endpoints

| Method | Address | Who | Returns |
|---|---|---|---|
| GET | `/job-postings/{id}` | Anyone | One **open** job (public shape; `match` with `needs` and `my_application` for its job seeker). Anything else: 404 |
| GET | `/employers/{id}` | Anyone | Public employer (only one with an approved posting); its jobs come from `/job-postings?employer={id}` |
| GET | `/employers/{id}/logo` | Anyone | The logo image |

### 4.4 Job seeker

All `candidate` only; each reads and changes **only the logged-in job seeker's own** data.

| Method | Address | Send | Returns |
|---|---|---|---|
| GET | `/candidate/profile` | — | Profile (empty fields as `null` until first saved) |
| PUT | `/candidate/profile` | Profile fields: `name` (required), `headline` (≤150), `city`, `province` (≤100), `contact_number` (7–30 digits, spaces, `+()-`), `about` (≤2000), `skills` (≤1000), `trainings` (≤2000), `languages` (≤255), `disability_type`, `show_disability`, `experiences` (≤10; each `job_title`, `company`, `started_on` required), `educations` (≤10; each `level`, `school` required) | Profile. Entries are replaced in the order sent |
| GET | `/candidate/accommodations` | — | `{ "data": [Accommodation, …] }`, the needs in display order (retired ones stay, marked `is_active: false`) |
| PUT | `/candidate/accommodations` | `accommodations`: ids (≤50, present even if empty); retired types can be kept but not added | The new list |
| GET | `/candidate/resume` | — | The uploaded PDF (`application/pdf`, inline) or 404 |
| POST | `/candidate/resume` | `resume`: PDF only, ≤5 MB (multipart) | Profile with the new `resume`; the old file is deleted |
| DELETE | `/candidate/resume` | — | Profile with `resume: null` |
| GET | `/candidate/dashboard` | — | `{ "needs_count": 5, "applications": { "all": 4, "waiting": 2, "hired": 1, "closed": 1 }, "feedback_due": [{ "application_id": 4, "job_title": "Office Clerk", "employer_name": "OpenDoor Demo Corp." }], "top_matches": [public jobs with match, ≤3], "missing_sections": ["headline", …] }` — sections from `headline, location, contact_number, education, skills, needs` |

### 4.5 Applications

One set of addresses for both sides (as the papers name them); the server answers by role. Every response here is `no-store`. Statuses follow the proposal's Table 1: Pending → Reviewed (the employer opens it) → Hired or Rejected; Withdrawn by the job seeker from Pending or Reviewed; **I was hired** by the job seeker from Reviewed. Nothing moves backward; applications are never deleted.

#### `POST /job-postings/{id}/applications` — apply (candidate) · 4A

```json
{ "cover_note": "I encoded delivery records for two years.", "interview_request": "A ground-floor interview room, please." }
```

Both optional plain text (≤3000 and ≤1000 characters; text that isn't valid UTF-8 is refused). Status, dates and owner are never taken from the request. **201** with the job seeker's Application.

- 404 `"This job isn't taking applications."` — not open (draft, waiting, rejected, closed, past its date, deleted)
- 409 `{ "message": "You've already applied for this job.", "application_id": 7 }` — once per job, even after withdrawing
- 422 `"We couldn't read your application. Please try again."` — a body that isn't valid JSON
- 429 after 10 a minute

#### `GET /applications` — list · 4A / 4B

| Caller | Query | Returns |
|---|---|---|
| Job seeker | `status` = `all` (default) \| `waiting` (Pending + Reviewed) \| `hired` \| `closed` (Rejected + Withdrawn); `page` | Their applications, newest first, 12 a page, plus `"counts": { "all", "waiting", "hired", "closed" }` |
| Employer (owner, or HR of the posting's department) | `job_posting` (**required**), `status` = `all` \| `pending` \| `reviewed` \| `hired` \| `rejected` \| `withdrawn`; `page` | That posting's applicants (Applicant list shape), newest first, 12 a page, plus `"counts": { "all", "pending", "reviewed", "hired", "rejected", "withdrawn" }` and `"job": { "id", "title", "status", "department" }`. Works for deleted postings too. Listing never marks anyone Reviewed |
| Admin | — | 403 |

#### `GET /applications/{id}` — one application · 4A / 4B

- **Its job seeker:** the Application with `job.accommodations` and `hired_accommodations`.
- **The job's employer:** the single Applicant shape. **Opening a Pending application marks it Reviewed** (once; a withdrawn one is left as it is and shown trimmed).
- Anyone else: 403 (`"This application isn't yours."` / `"You can only see applicants for your own job postings."`).

#### `PATCH /applications/{id}/status` — change status · 4A / 4B

```json
{ "status": "hired", "expected_status": "reviewed" }
```

| Caller | `status` may be | From |
|---|---|---|
| Job seeker | `withdrawn` | Pending, Reviewed |
| Job seeker | `hired` ("I was hired") | Reviewed |
| Employer | `hired`, `rejected` | Reviewed |

`expected_status` is the status the person saw. Returns the caller's shape of the updated application.

- 409 `"This application changed while you were looking at it. Reload to see its status."` — it's no longer `expected_status` (the other side acted first)
- 422 `"If you were hired, ask the employer to open your application on OpenDoor first."` — a job seeker's hire from Pending
- 422 `"This application can't be changed to Hired."` (or Rejected, Withdrawn) — any other move Table 1 doesn't allow
- 422 on `status` — a value this role may not send

A hire records `hired_at` (today in Philippine time), who confirmed it, and copies the job's accommodations and notes as advertised that day (for Phase 5's feedback).

#### `GET /applications/{id}/resume` — the applicant's PDF (employer) · 4B

The job's employer only, and not after Withdrawn. Sent with `Content-Security-Policy: sandbox`, `X-Content-Type-Options: nosniff`, `no-store`. 404 `"This applicant hasn't uploaded a résumé."`.

#### `GET /applications/{id}/feedback-form` — the feedback form (the hired job seeker) · 5A

```json
{ "application_id": 4, "job": { "id": 9, "title": "Office Clerk" }, "employer": { "id": 1, "name": "OpenDoor Demo Corp." },
  "hired_at": "2026-09-14", "state": "open", "opens_on": "2026-10-14",
  "accommodations": [{ "id": 1, "name": "Wheelchair-accessible entrance", "group_name": "Physical access", "note": null }],
  "sent": null }
```

`accommodations` are the ones copied at the hire, whatever the posting says now. Once sent, `sent` is `{ "sent_at", "comment", "ratings": [{ "accommodation_id", "name", "group_name", "note", "rating", "rating_label" }] }`. Only the application's own job seeker, only Hired; anyone else 403.

#### `POST /applications/{id}/feedback` — rate the accommodations (the hired job seeker) · 5A

```json
{ "ratings": { "1": "delivered", "2": "not_used" }, "comment": "The ramp was blocked on Mondays." }
```

`ratings` maps **every** accommodation of the hire copy to `delivered` (1), `partial` (0.5), `not_delivered` (0) or `not_used` (not counted); at least one must be used. `comment` is optional plain text, ≤1000 characters, read only by OpenDoor's administrators. Once only; it can't be changed. **201** with the form, now `sent`. Each save recalculates the employer's trust score (`employers.trust_score`, shown once 3 responses count; 5B shows it).

- 403 `"You can rate your employer's accommodations from November 14, 2026."` — before the form opens
- 409 `"You've already sent your ratings."`
- 422 `"This job listed no accommodations, so there's nothing to rate."`
- 422 on `ratings.{id}`: `"Choose an answer for Flexible hours."`; on `ratings`: `"You can only rate the accommodations listed when you were hired."`, `"Rate at least one accommodation you used."`
- 429 after 10 a minute

#### Notifications (recorded, not yet shown) · 4B

Each change is stored with Laravel's database notifications (table `notifications`) for the other party: `new_applicant` to the posting's owner and the HR officers of its department; `status_changed` (`status`, `actor`) to the job seeker when the employer acts, and to the managers when the job seeker withdraws or confirms a hire. Phase 5 adds `feedback_open` (application id, job title, employer name) for the job seeker, once per hire, the first time the dashboard or My applications is opened after the form opens. They hold ids, the job title and names only, never needs, messages or ratings. The endpoints to read them (`GET /notifications`, mark as read) come in Phase 6.

### 4.6 Employer: profile, verification, team

`employer` only. Before setup, every endpoint except `/employer/setup` answers 403 with `"code": "employer_profile_required"`.

| Method | Address | Who | Send | Returns |
|---|---|---|---|---|
| POST | `/employer/setup` | Employer without a profile | `type` (`company`\|`individual`), `name` (≤200), `industry` (required for companies), `address` (≤255) | 201, User with `membership`; a company gets one department. 409 if already set up |
| GET | `/employer/profile` | Owner or HR | — | Employer (HR officers see their company) |
| PUT | `/employer/profile` | Owner | `name`, `industry` (companies), `address`, `description` (≤2000) | Employer |
| POST, DELETE | `/employer/profile/logo` | Owner | `logo`: PNG, JPG or WebP, ≤2 MB (multipart) | Employer |
| POST | `/employer/verification` | Company owner | `registration_type` (`dti`\|`sec`\|`cda`), `business_reg_no` (5–20 of `A–Z 0–9 -`) | Employer, verification `pending`. Changing the number later removes the Verified badge until checked again |
| GET | `/employer/dashboard` | Owner or HR | — | `{ "postings": { "draft", "pending", "open", "rejected", "closed" }, "waiting_applicants": { "total": 2, "postings": [ { "id", "title", "new" } ] } }` (≤10, most first; HR: their department) |
| GET | `/employer/departments` | Company owner | — | Departments with `member_limit`, `effective_limit`, `places_used`, `has_free_place`, `hr_officers` (`id, name, email, joined_at`), `open_invites`; `meta: { "cap", "default_limit" }` |
| POST | `/employer/departments` | Company owner | `name` (unique in the company), `member_limit` (≤ the admin's cap) | 201, Department |
| PUT | `/employer/departments/{id}` | Company owner | Same | Department |
| DELETE | `/employer/departments/{id}` | Company owner | — | 204. 422 on `department` while it has HR officers, if any posting (even a deleted one) uses it, or if it's the company's last department |
| POST | `/employer/departments/{id}/invites` | Company owner | — | 201, `{ "id", "department_id", "url": ".../join/<code>", "expires_at" }` (valid 7 days; only a hash is stored, so the link is shown once) |
| DELETE | `/employer/invites/{id}` | Company owner | — | 204 (revoked) |
| PATCH | `/employer/members/{id}` | Company owner | `department_id` | `{ "id", "department_id" }`; refused if that department is full |
| DELETE | `/employer/members/{id}` | Company owner | — | 204; the account stays, without the company |

### 4.7 Employer: job postings

`employer` only. Owners manage every department's postings, HR officers only their own department's, individual employers their own.

| Method | Address | Send | Returns |
|---|---|---|---|
| GET | `/employer/job-postings` | `status` (`all`\|`draft`\|`pending`\|`open`\|`rejected`\|`closed`), `department` (owners) | Employer job postings with `applicants` and `actions`, newest change first (≤200) |
| POST | `/employer/job-postings` | See below | 201, the posting (Draft, or Waiting for approval with `submit: true`) |
| GET | `/employer/job-postings/{id}` | — | The posting |
| PUT | `/employer/job-postings/{id}` | See below | The posting. Saving an open or closed posting sends it back for approval |
| DELETE | `/employer/job-postings/{id}` | — | 204 (hidden, kept for its applications). **422** while applicants are waiting: `"1 applicant is waiting for your decision. Decide on them or close the posting instead."` |
| PATCH | `/employer/job-postings/{id}/status` | `action`: `close` \| `reopen` \| `change_closing_date`, and `closes_on` for the last two | The posting. Reopening and changing the date need no new approval |

Posting fields (when submitting, all are required; a draft needs only `title`):

```json
{ "title": "Bookkeeping Clerk", "department_id": 2, "category_id": 4, "description": "Keep our books in order.",
  "location": "Quezon City", "employment_type": "full_time", "work_setup": "hybrid", "interview_format": "online",
  "closes_on": "2026-11-30", "accommodations": [ { "id": 1, "note": "Ramp at the side door" } ], "submit": true }
```

Limits: `title`, `location` ≤150; `description` ≤5000; `closes_on` from tomorrow to 6 months ahead (Philippine time); 1–50 accommodations, each note ≤255, no retired types added; `department_id` only from company owners (HR officers' postings always go to their department).

### 4.8 Invites

| Method | Address | Who | Send | Returns |
|---|---|---|---|---|
| GET | `/invites/{code}` | Anyone | — | `{ "company", "department", "expires_at", "available": true\|false, "reason", "message" }` |
| POST | `/invites/{code}/accept` | A guest (with account fields), or a logged-in employer without a company | Guests: `name`, `email`, `password` + `password_confirmation`, `consent` | 201, User; joins the department as an HR officer. 409 if the logged-in account can't join |

### 4.9 Admin

`admin` only.

| Method | Address | Send | Returns |
|---|---|---|---|
| GET | `/admin/dashboard` | — | `{ "categories", "active_accommodations", "companies_waiting_for_verification", "postings_waiting_for_approval", "hr_per_department_cap" }` |
| POST | `/admin/categories` | `name` (≤100, unique) | 201, `{ "id", "name" }` |
| PUT | `/admin/categories/{id}` | `name` | The category |
| DELETE | `/admin/categories/{id}` | — | 204; 422 on `category` if any posting (even a deleted one) uses it: "… Rename it instead." |
| GET | `/admin/accommodations` | — | Every type, active and retired |
| POST | `/admin/accommodations` | `name` (≤150, unique), `group_name` (≤50), `description` (≤500) | 201, Accommodation |
| PUT | `/admin/accommodations/{id}` | Same | Accommodation |
| PATCH | `/admin/accommodations/{id}/status` | `is_active` (`false` retires it) | Accommodation |
| GET | `/admin/employers` | `verification`: `pending` (default, oldest first) \| `verified` \| `rejected` | Companies with `verification`, `owner` (`name`, `email`), `departments_count`, `hr_officers_count` |
| PATCH | `/admin/employers/{id}/verify` | `decision`: `approve` \| `reject`, `reason` (required to reject, ≤500) | The company. Only a company waiting for verification |
| GET | `/admin/job-postings` | `status`: `pending` (default, oldest first) \| `open` \| `rejected` | Postings |
| GET | `/admin/job-postings/{id}` | — | One posting (drafts: 404) |
| PATCH | `/admin/job-postings/{id}/approve` | `decision`, `reason` (to reject), and `updated_at` of the version reviewed | The posting. 409 `"This posting changed while you were reviewing it. Reload the page to see the latest version."`; 422 `"Reload the page and review the posting again."` without `updated_at` |
| GET | `/admin/settings` | — | `{ "hr_per_department_cap": 10 }` |
| PUT | `/admin/settings` | `hr_per_department_cap` (1–100) | The settings |

Admins see no applications (`/applications` answers 403); user management comes in Phase 6.

---

## 5. Who can see what

The server checks every rule (Laravel policies and resources); hiding something in React is only for convenience.

| Information | Guest | The job seeker themself | Other job seekers | The job's employer (owner, or HR of its department) | Other employers | Admin |
|---|---|---|---|---|---|---|
| Open jobs, public employer pages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Drafts, waiting and rejected postings | — | — | — | ✓ (their own) | — | ✓ (not drafts) |
| Profile, needs, résumé | — | ✓ | — | ✓ through an application (not after Withdrawn) | — | — |
| Disability type | — | ✓ | — | Only if the job seeker chose to show it | — | — |
| "Meets 4 of 5 of your needs" | — | ✓ | — | As "Your job meets 4 of their 5 needs" on applicants | — | — |
| An application, its cover note and interview request | — | ✓ | — | ✓ (not after Withdrawn) | — | — |
| Whom else someone applied to | — | ✓ | — | — | — | — |
| Their accommodation ratings and comment | — | ✓ | — | — (never, only totals from 3+ responses) | — | ✓ (Phase 6) |
| Registration number, team, emails | — | — | — | Their own company | — | ✓ |
