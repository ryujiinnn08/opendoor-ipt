# OpenDoor

A web-based job matching platform with accommodation-based filtering and post-hire accommodation verification for persons with disabilities.

**Live site:** https://opendoor-ipt.ruzgal.org (API: https://opendoor-api.ruzgal.org, health check at [`/api/health`](https://opendoor-api.ruzgal.org/api/health)). Demo accounts are listed [below](#demo-accounts).

See [.planning/CONCEPT_PLAN.md](.planning/CONCEPT_PLAN.md) for the concept, architecture and build plan. Phase plans: [Phase 1](.planning/PHASE_1_PLAN.md) (accounts and shared lists, done), [Phase 2](.planning/PHASE_2_PLAN.md) (employers, teams and job postings, done), [Phase 3](.planning/PHASE_3_PLAN.md) (public job board, profile, résumé and matching, done), [Phase 4](.planning/PHASE_4_PLAN.md) (applications from Apply to Hired, done), [Phase 5](.planning/PHASE_5_PLAN.md) (post-hire feedback and the trust score, done), [Phase 6](.planning/PHASE_6_PLAN.md) (admin tools and notifications, done), [Phase 7](.planning/PHASE_7_PLAN.md) (going live, accessibility audit and usability tests, in progress).

## Structure

```
OpenDoor/
├── backend/    Laravel 12 REST API (Sanctum SPA cookie auth, MySQL/MariaDB)
├── frontend/   React 19 + Vite SPA (React Router, Axios, Tailwind CSS), deployed to Cloudflare Workers
├── .planning/  Planning documents: concept, phase plans, implementation plans (also GSD's planning folder)
└── API.md      API reference: every endpoint, who may call it, requests, responses and errors
```

The API is documented in [API.md](API.md).

## Requirements

- **XAMPP** (Windows or macOS) for MySQL/MariaDB and phpMyAdmin. Its PHP 8.2 is enough to run the backend.
- **Composer** 2 (Windows: use the Composer-Setup.exe installer and point it at `C:\xampp\php\php.exe`)
- **Node.js 20+** and npm

`backend/composer.json` pins Composer's platform to PHP 8.2, so dependencies stay compatible with XAMPP's PHP even if your machine has a newer PHP.

## Local setup

Database: start **MySQL** in the XAMPP control panel, open http://localhost/phpmyadmin and create a database named `opendoor` (collation `utf8mb4_unicode_ci`). The defaults in `.env.example` (user `root`, empty password, port 3306) match XAMPP.

Backend (http://localhost:8000):

```bash
cd backend
composer install
cp .env.example .env     # Windows: copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=localhost --port=8000
```

Résumé uploads go up to 5 MB, so PHP must accept them: XAMPP's `php.ini` already allows 40 MB. With another PHP (for example Homebrew's, used by `php artisan serve` on a Mac), set `upload_max_filesize = 6M` and `post_max_size = 8M` in the `php.ini` that `php --ini` shows.

`--seed` loads the job categories, the accommodation types, the starting accounts, three demo companies, an individual employer and 17 sample job postings. It is safe to run `php artisan db:seed` again later; nothing is duplicated and no password is reset.

Frontend (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Both apps must run on `localhost` (not `127.0.0.1`) so the Sanctum session cookie is shared between them.

Job seekers get **Find jobs** (`/candidate/jobs`): jobs ranked by how many of their accommodation needs each one meets ("Meets 4 of 5 of your needs", with what's missing), starting with the jobs that meet at least one, and a switch to all jobs. They fill in **My needs**, **My profile** (work experience, education, skills and an optional PDF résumé) and print **My résumé**. Nobody else can see a job seeker's needs, profile, résumé or disability type.

Anyone can open **Browse jobs** (`/jobs`) from the header: keyword search, category and accommodation filters, sort, 12 jobs a page, with the filters kept in the address. Each job has its own page (`/jobs/:id`), and each employer with a published job has one too (`/employers/:id`). Home has a job search box and the three newest jobs.

## Demo accounts

The seeder creates the same demo accounts locally and on the live site.

- **Locally**, when the `SEED_*` settings in `backend/.env` are left blank, the passwords are `Admin_1234` for the administrator and `Demo_1234` for everyone else.
- **On the live site**, the passwords were set by the team when the site was seeded (`SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD`). Ask the team for them. They are never written in this repository, because it is public. The live administrator's email is whatever `SEED_ADMIN_EMAIL` was set to.

| Role | Email | What it shows |
|---|---|---|
| Administrator | `admin@opendoor.test` (local) | The admin dashboard (what's waiting, OpenDoor in numbers), Users (suspend, reactivate, add an administrator), Employer verification, Posting approvals (approve, reject, remove), Feedback (hide, show who wrote it), Categories, Accommodation types, Settings |
| Job seeker | `candidate@opendoor.test` | A wheelchair user with 5 needs (Wheelchair-accessible entrance, Accessible restroom, Elevator or ground-floor workspace, Adjustable workstation, Flexible hours) and a filled-in profile. Find jobs ranks *Data Encoder* and *Customer Support Associate* first. Has four applications, including a **hire at Office Clerk whose feedback form is open** |
| Job seeker | `candidate2@opendoor.test` | A Deaf job seeker with 3 needs (Sign language interpreter, Written or captioned meetings, Flexible hours). The same jobs rank differently: *Chat Support Specialist* and *Front Desk Assistant* come first. Has a waiting application with an interview request |
| Company owner | `employer@opendoor.test` | Owner of the verified **OpenDoor Demo Corp.** (departments Human Resources and IT). Sees every department's postings and applicants, the team, notifications and the trust score (not shown yet: 2 of the 3 responses needed) |
| HR officer | `hr@opendoor.test` | HR officer in OpenDoor Demo Corp.'s Human Resources department. Sees only that department's postings, with a waiting applicant |
| Individual employer | `individual@opendoor.test` | An employer hiring for themselves (no departments), with one open job posting |
| Company owner | `employer2@opendoor.test` | Owner of the verified **Bayanihan Contact Center Inc.** (Cebu City), with six open jobs and a visible trust score: **88%, based on 4 hires**, with a per-accommodation breakdown |
| Company owner | `employer3@opendoor.test` | Owner of **Kalinga Wellness Clinic** (Quezon City), whose verification is still waiting for review. Three open jobs and one past its closing date |
| Job seeker (suspended) | `suspended@opendoor.test` | A suspended account. Logging in shows "This account has been suspended"; its history (on the admin's Users page) says why |
| Administrator | `admin2@opendoor.test` | A second administrator, so the Users list has more than one. Its password is random and known to nobody; it exists only to be seen in the list |

`sample1@` to `sample6@opendoor.test` are the six sample hires whose ratings make the trust scores. They have random passwords and can't log in. Running `php artisan db:seed` again never changes an account that already exists.

### A short demo tour

1. **As a guest:** open **Browse jobs**, filter by an accommodation, and open *Data Encoder*: Bayanihan's trust score (88%) is beside the job. **See how each accommodation was rated** opens the breakdown.
2. **As `candidate@`:** **Find jobs** ranks jobs by how many of the 5 needs each one meets. Apply to a job with an interview request, then open **My applications**. The *Office Clerk* hire has **Rate the accommodations** open.
3. **As `employer@`:** see **Notifications (1)** after the application. Open the applicant, then hire or reject them. The **Trust score** page explains why there's no score yet.
4. **As `candidate@` again:** rate *Office Clerk*'s accommodations. That is the third response for OpenDoor Demo Corp., so its trust score appears at once (about 92%).
5. **As the administrator:** the dashboard shows what's waiting. Verify Kalinga Wellness Clinic, suspend and reactivate `candidate2@` (the history records both), and hide a feedback in **Feedback** to watch the trust score change.

**Things that can only be done once per database. Save them for the live demo:**
- Rating *Office Clerk* (step 4): feedback can't be changed after sending.
- **Removing a posting:** it can't be undone. Practice on the local copy.
- Verifying or rejecting Kalinga Wellness Clinic.

### What the sample data contains

The sample job postings give **Browse jobs** 13 open jobs (two pages) across 8 categories and all 18 accommodation types:

- **OpenDoor Demo Corp.:** *HR Assistant* (open), *Recruitment Coordinator* (waiting for approval) and *Office Clerk* (closed early) in Human Resources; *Junior Web Developer* and *Graphic Designer* (open) and *IT Support Specialist* (draft) in IT.
- **Bayanihan Contact Center Inc.:** *Customer Support Associate*, *Chat Support Specialist*, *Quality Analyst*, *Training Assistant*, *Data Encoder* and *Sales Coordinator* (all open).
- **Kalinga Wellness Clinic:** *Medical Records Clerk*, *Front Desk Assistant* and *Pharmacy Aide* (open), and *Laboratory Aide*, whose closing date has passed.
- The individual employer: *Part-time Home-based Bookkeeper* (open).

The closed, draft, waiting and past-date postings never appear on Browse jobs. Sample postings are only ever added, never changed: a company's set is skipped once it has postings, and Demo Corp.'s *Graphic Designer* and *Office Clerk* are skipped if either one exists (or was deleted).

The sample applications are all to OpenDoor Demo Corp.'s jobs:

- **`candidate@`:** *Junior Web Developer* (Pending, with a cover note), *Graphic Designer* (Reviewed), *HR Assistant* (Rejected) and *Office Clerk* (**Hired 31 days ago**, so the feedback form is open).
- **`candidate2@`:** *HR Assistant* (Pending, asking for a sign language interpreter at the interview, so the HR officer has a waiting applicant) and *Junior Web Developer* (Withdrawn).

The sample feedback gives Bayanihan Contact Center 4 responses (so its score shows) and OpenDoor Demo Corp. 2 (so `candidate@`'s rating makes it appear live).

In production the seeder refuses to run without `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, and creates the demo accounts only when `SEED_DEMO_PASSWORD` is set (see [.planning/PHASE_1_PLAN.md §3.1](.planning/PHASE_1_PLAN.md)).

## Changing the OpenDoor logo

The header logo is a placeholder at `frontend/public/opendoor-logo.svg` (also used as the browser-tab icon). Save the real logo over that file with the same name. If the logo is a PNG, save it as `frontend/public/opendoor-logo.png` and change the two references to it: `frontend/src/components/layout/BrandLink.jsx` and `frontend/index.html`.

## Icons

All icons come from [Lucide](https://lucide.dev) (ISC licence), the set the Figma design uses: 24 px line icons with a 2 px stroke, imported one by one from `lucide-react` in `frontend/src/components/ui/iconImages.js`. They are drawn in the colour of the text around them, so the same icon works for links, badges and the high-contrast theme. To add one, import it there and give it a name; use it with `<Icon name="…" />`.

## Database notes (XAMPP / MariaDB)

XAMPP's MariaDB 10.4 automatically adds "update to the current time" to the first required `timestamp` column of a table. In migrations, use `dateTime()` (not `timestamp()`) for required date columns; nullable timestamps are fine.

## Tests

```bash
cd backend
php artisan test
```

```bash
cd frontend
npm run test
```

Backend tests use a temporary in-memory SQLite database, so they never touch your `opendoor` data. **Windows (XAMPP):** if they fail with a SQLite driver error, open `C:\xampp\php\php.ini`, find `;extension=pdo_sqlite` and remove the `;` at the start.

## Deployment

- **Website:** https://opendoor-ipt.ruzgal.org. Cloudflare Workers static assets (`frontend/wrangler.jsonc`), built from GitHub with `VITE_API_URL=https://opendoor-api.ruzgal.org`.
- **API and MySQL:** https://opendoor-api.ruzgal.org, on Railway.

The production settings, the database steps and the planned hardening are in [.planning/PHASE_7_PLAN.md](.planning/PHASE_7_PLAN.md) (§4 and §8.1). Background: [.planning/CONCEPT_PLAN.md §5.6](.planning/CONCEPT_PLAN.md).

### Team contact inbox

Job seekers and employers can reach the **OpenDoor team** through `/contact` or by emailing **contact-opendoor@ruzgal.org**. This is platform support (account help, accessibility barriers and privacy requests); job applications go through each posting's application page.

Set `CONTACT_TO_EMAIL=contact-opendoor@ruzgal.org` on the deployed API and clear cached configuration after changing it. The contact form sends through the configured mail driver, from OpenDoor's verified sending address, with the visitor's address as Reply-To. The team should monitor the receiving inbox and use Reply to answer the visitor. A sending-domain verification alone does not confirm that the inbox can receive mail; verify delivery to the real inbox after deployment. Local `MAIL_MAILER=log` writes messages to the application log instead of delivering them.
