# OpenDoor

A web-based job matching platform with accommodation-based filtering and post-hire accommodation verification for persons with disabilities.

See [.planning/CONCEPT_PLAN.md](.planning/CONCEPT_PLAN.md) for the concept, architecture and build plan. Phase plans: [Phase 1](.planning/PHASE_1_PLAN.md) (accounts and shared lists, done), [Phase 2](.planning/PHASE_2_PLAN.md) (employers, teams and job postings, done), [Phase 3](.planning/PHASE_3_PLAN.md) (candidate side: public job board, profile, résumé and matching, done).

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

## Demo logins (local only)

When the `SEED_*` settings in `backend/.env` are left blank, the seeder creates these accounts:

| Role | Email | Password | What it shows |
|---|---|---|---|
| Administrator | `admin@opendoor.test` | `Admin_1234` | Employer verification, posting approvals, settings, shared lists |
| Job seeker | `candidate@opendoor.test` | `Demo_1234` | A wheelchair user with 5 needs (Wheelchair-accessible entrance, Accessible restroom, Elevator or ground-floor workspace, Adjustable workstation, Flexible hours) and a filled-in profile; Find jobs ranks *Data Encoder* and *Customer Support Associate* first |
| Job seeker | `candidate2@opendoor.test` | `Demo_1234` | A Deaf job seeker with 3 needs (Sign language interpreter, Written or captioned meetings, Flexible hours); the same jobs rank differently: *Chat Support Specialist* and *Front Desk Assistant* first |
| Company owner | `employer@opendoor.test` | `Demo_1234` | Owner of the verified **OpenDoor Demo Corp.** (departments Human Resources and IT); sees and manages every department's job postings |
| HR officer | `hr@opendoor.test` | `Demo_1234` | HR officer in OpenDoor Demo Corp.'s Human Resources department; sees only that department's job postings |
| Individual employer | `individual@opendoor.test` | `Demo_1234` | Employer hiring for themselves (no departments), with one open job posting |
| Company owner | `employer2@opendoor.test` | `Demo_1234` | Owner of the verified **Bayanihan Contact Center Inc.** (Cebu City, department Operations) with six open jobs |
| Company owner | `employer3@opendoor.test` | `Demo_1234` | Owner of **Kalinga Wellness Clinic** (Quezon City, department Front Office), whose verification is still waiting for review; three open jobs and one past its closing date |

The sample job postings give **Browse jobs** 13 open jobs (two pages) across 8 categories and all 18 accommodation types:

- **OpenDoor Demo Corp.:** *HR Assistant* (open), *Recruitment Coordinator* (waiting for approval) and *Office Clerk* (closed early) in Human Resources; *Junior Web Developer* and *Graphic Designer* (open) and *IT Support Specialist* (draft) in IT.
- **Bayanihan Contact Center Inc.:** *Customer Support Associate*, *Chat Support Specialist*, *Quality Analyst*, *Training Assistant*, *Data Encoder* and *Sales Coordinator* (all open).
- **Kalinga Wellness Clinic:** *Medical Records Clerk*, *Front Desk Assistant* and *Pharmacy Aide* (open), and *Laboratory Aide*, whose closing date has passed.
- The individual employer: *Part-time Home-based Bookkeeper* (open).

The closed, draft, waiting and past-date postings never appear on Browse jobs. Sample postings are only ever added, never changed: a company's set is skipped once it has postings, and Demo Corp.'s *Graphic Designer* and *Office Clerk* are skipped if either one exists (or was deleted). A database seeded in Phase 2 therefore gets the full set from `php artisan db:seed`.

The sample applications (Phase 4) are all to OpenDoor Demo Corp.'s jobs:

- **`candidate@`:** *Junior Web Developer* (Pending, with a cover note), *Graphic Designer* (Reviewed), *HR Assistant* (Rejected) and *Office Clerk* (**Hired 31 days ago**, so the Phase 5 feedback form is open during the demo).
- **`candidate2@`:** *HR Assistant* (Pending, asking for a sign language interpreter at the interview, so the HR officer has a waiting applicant) and *Junior Web Developer* (Withdrawn).

They're added only for a demo job seeker who hasn't applied anywhere yet.

These defaults exist only outside production. On the live site the admin email and password must be set in the server's environment, and demo accounts are created only when `SEED_DEMO_PASSWORD` is set (see [.planning/PHASE_1_PLAN.md §3.1](.planning/PHASE_1_PLAN.md)). Running `php artisan db:seed` again never changes an account that already exists.

## Changing the OpenDoor logo

The header logo is a placeholder at `frontend/public/opendoor-logo.svg` (also used as the browser-tab icon). Save the real logo over that file with the same name. If the logo is a PNG, save it as `frontend/public/opendoor-logo.png` and change the two references to it: `frontend/src/components/layout/BrandLink.jsx` and `frontend/index.html`.

## Icons

All icons come from [Icons8](https://icons8.com) in one style, **Fluency Systems Regular**, saved as 96 px PNGs in `frontend/src/assets/icons/` and listed in `frontend/src/components/ui/iconImages.js`. They are drawn in the colour of the text around them, so the same file works for purple links, amber accommodations and the high-contrast theme. We use the free Icons8 licence, which requires the "Icons by Icons8" link in the footer; keep it. To add an icon, download it from icons8.com in the same style (PNG, 96 px), save it in that folder and add it to `iconImages.js`.

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

- Frontend: Cloudflare Workers static assets (`frontend/wrangler.jsonc`), built from GitHub with `VITE_API_URL=https://api.<domain>`.
- Backend + MySQL: Railway, served at `api.<domain>` through Cloudflare (SSL mode Full (strict)).

Details: [.planning/CONCEPT_PLAN.md §5.6](.planning/CONCEPT_PLAN.md).
