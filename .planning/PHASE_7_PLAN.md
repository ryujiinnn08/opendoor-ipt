# Phase 7 Plan: Going Live, the Accessibility Audit and the Usability Tests

> Status: **DRAFT, waiting for your answers** (2026-10-15). The questions are in §3, each with a recommendation; "the other recommendations are OK" is enough. **Q1 answered:** the website at `opendoor-ipt.ruzgal.org` and the API at `opendoor-api.ruzgal.org`. A security pass (2026-10-15, §8.1) added **Q17–Q20**, about keeping OpenDoor's login cookies away from the other `ruzgal.org` sites and hardening before go-live. Checked against the proposal papers ([Revised Proposal](papers/REVISED_PROPOSAL.md) §XI Cloud Deployment Plan, §XII-B Accessibility Evaluation, §XII-C Usability Evaluation; [Modules and Features](papers/MODULES_AND_FEATURES.md) §7, phase 7).
> Part of: [CONCEPT_PLAN.md](CONCEPT_PLAN.md), build phase 7 of 7
> Builds on: [PHASE_6_PLAN.md](PHASE_6_PLAN.md) (every feature is built; Phases 1–6 passed their reviews) and the hosting decisions in CONCEPT_PLAN §5.6, D6, D7, D11 and D12
> Method: GSD and Frontend Design only. After approval, a short runbook per part; GSD security audit of the production settings before the usability tests.

---

## 0. Where we are

**Built (Phases 1–6):** every Must-have and the Should-haves we kept: accounts and roles, employers and teams, job postings with approval, the job board with matching, profiles and résumés, applications from Apply to Hired, post-hire feedback and the trust score, user management, posting removal, notifications and feedback moderation. 394 server and 428 page tests pass; everything is on [ryujiinnn08/opendoor-ipt](https://github.com/ryujiinnn08/opendoor-ipt) `main`.

**Not yet done:** nothing is deployed. The frontend has its Cloudflare Workers config (`frontend/wrangler.jsonc`) but the Laravel API has never run outside XAMPP, and three deployment details from Phase 3 (§3 of PHASE_3_PLAN) were never answered: the domain, the backend host and file storage.

**What Phase 7 is for.** The papers' build order says Phase 7 is done when the "system is deployed, audited against WCAG 2.1 AA, and tested with users". It answers **Objective 5** (deploy and validate through live testing) and **SOP 5** (how usable and accessible OpenDoor is).

**Time.** Phase 6 finished a day early (Thu Oct 15 instead of Fri Oct 16), so Phase 7 can start **Fri Oct 16**:

| When (2026) | Work | Done when |
|---|---|---|
| Fri Oct 16 | **7A Go live**: Railway, Cloudflare, production settings, first deploy, migrate, seed, smoke test (§4.1–4.5) | L1–L10 pass on the live site (§5) |
| Sat Oct 17 | Buffer for 7A; start **7B** with the automated pass on every page | The live site is stable; the axe and Lighthouse results are in |
| Sat Oct 17 – Sun Oct 18 | **7B Accessibility audit**: manual WCAG 2.1 AA check, NVDA, fixes, the Phase 2–3 leftovers (§4.6) | The audit report is written and every failure is fixed or explained |
| Mon Oct 19 – Tue Oct 20 | **7C Usability tests**: 5+ PWD and 3+ employer participants on the live site, with SUS (§4.7) | Every session done; SUS and task results computed |
| Wed Oct 21 – Sun Oct 25 | **Defense** | |

**Recruitment is the biggest risk, not code.** §6 lists what I need from you about participants.

---

## 1. What Phase 7 delivers

### 7A Go live (Fri Oct 16)
- **The API on Railway**: the Laravel app and a managed MySQL 8 database, reached only at `opendoor-api.ruzgal.org` through Cloudflare.
- **The website on Cloudflare Workers** at `opendoor-ipt.ruzgal.org`, built from GitHub on every push to `main`, calling `https://opendoor-api.ruzgal.org`.
- **Production settings**: debug off, a fresh application key, host-only secure cookies that never reach the other `ruzgal.org` sites (Q17), CORS for the website only, HTTPS everywhere, the API reachable only through Cloudflare (Q18), and security headers on both (§8.1).
- **The production database**: created by the migrations, which run before every deploy; seeded once with the administrator, the master data and the demo accounts (with a visible trust score, as the papers ask).
- **File storage that survives deploys** for logos and résumés (Q3).
- **The scheduled prune** of notifications older than 90 days (Q5).
- **A runbook** in the README: how to deploy, migrate, seed, back up and roll back.

### 7B Accessibility audit (Sat Oct 17 – Sun Oct 18)
- Every page checked with **axe** and **Lighthouse**, then manually against **WCAG 2.1 Level AA** (keyboard, zoom and reflow, contrast, forms, status messages), and with **NVDA** (a groupmate on Windows).
- **Fixes** for what fails, plus the leftovers from Phases 2–3 (§4.6).
- **An audit report** (`.planning/ACCESSIBILITY_AUDIT.md`): each criterion, how it was checked, pass or fail, and the fix.

### 7C Usability tests (Mon Oct 19 – Tue Oct 20)
- **At least 5 PWD job seekers and 3 employers** do role-specific tasks on the live site (§4.7).
- **Task completion and errors** recorded per task; each participant fills in the **System Usability Scale** (SUS).
- **Results**: the mean SUS (target 68 or more), task success, and the problems found, ranked. Written up for the paper's results chapter (`.planning/USABILITY_RESULTS.md`).

---

## 2. The rules (from the papers, unchanged)

| Rule | Source |
|---|---|
| Cloudflare for the domain, DNS, SSL, edge security and the React frontend; Railway for Laravel and MySQL behind an `api` subdomain; Render with Aiven as the fallback | Revised Proposal §XI; CONCEPT_PLAN D6 |
| Uploaded files (logos and résumés) stored where deploys don't erase them (the papers say Cloudflare R2) | §XI; D12 |
| Sanctum session cookies shared by the website and the API on one parent domain; CORS restricted to the frontend's domain | §VIII, §XI; D11 |
| Production: debug off, a fresh application key, no sensitive data in logs | §IX Security, §XI |
| Demo accounts for every role, including feedback data that produces a visible trust score, are seeded | §XI |
| Both deployment links are documented and submitted before the presentation; the live app is demonstrated end to end | §XI |
| Every page checked with Lighthouse and axe, and manually against WCAG 2.1 AA, including keyboard-only and NVDA; issues fixed **before** usability testing | §XII-B |
| 5+ PWD and 3+ employer participants on the deployed system, role-specific tasks, task completion and errors recorded, SUS for each; mean SUS ≥ 68 is above average | §XII-C |
| Informed consent; disability type optional; no names in the report; the survey form screen-reader friendly and in plain language; an interpreter or text-based session on request | §XII-A |
| No scheduler is assumed: time-based things (auto-close, the feedback reminder) are computed when a page loads | CONCEPT_PLAN D7 |

---

## 3. Questions for you

| # | Question | Recommendation | Why |
|---|---|---|---|
| Q1 | **The domain** on your Cloudflare account | **Answered:** `ruzgal.org`, already hosting the `quiz-me`, `portfolio` and `bakas-ni-rizal` Workers. OpenDoor gets **`opendoor-ipt.ruzgal.org`** (website) and **`opendoor-api.ruzgal.org`** (API) | Both are one level under `ruzgal.org`, so Cloudflare's free Universal SSL covers them, and both share the site `ruzgal.org`, so the session cookie counts as first-party. Adding them doesn't touch the other Workers. How the login cookie is kept away from those sites is Q17 |
| Q2 | **The backend host** | **Railway** (Hobby plan, about US$5 a month after the trial credit), one project with the Laravel service, a MySQL 8 database and (Q3) a volume | It's the papers' first choice; it never sleeps, so the demo and the tests have no cold starts. *Alternative:* Render + Aiven, free, but it sleeps when idle and Aiven's free MySQL is small |
| Q3 | **File storage** for logos and résumés | **A Railway volume** mounted at `storage/app`, so the code stays as it is (the `local` disk) and the papers' §XI wording changes from R2 to "a persistent Railway volume" | No code change on go-live day, and résumés never leave the API's private disk. *Alternative:* Cloudflare R2 as the papers say: the controllers move to a configurable disk (about 1 hour plus tests), R2 needs a payment method on file, and résumés would be streamed through Laravel as now |
| Q4 | **When to go live** | **Fri Oct 16**, using the day Phase 6 saved; Sat Oct 17 stays as a buffer | A problem found on Friday can still be fixed before the audit and well before the tests. *Alternative:* Sat Oct 17 as planned |
| Q5 | **The prune of 90-day-old notifications** | **A Railway cron job**: a second, tiny service from the same repository whose start command is `php artisan notifications:prune`, run daily at 02:00 Manila time (18:00 UTC) | You asked for the scheduler. Railway runs a cron service once per schedule and stops it, so there is no `schedule:run` process to keep alive and it costs almost nothing. Until it runs, older ones are already hidden. *Alternatives:* prune each person's old notifications when they open their list (D7 style, no cron, but inactive accounts keep theirs), or no prune before the defense |
| Q6 | **What goes into the production database** | **Seed the administrator, categories, accommodation types and the demo data** (demo accounts, jobs, applications and the sample hires that give Bayanihan Contact Center a visible trust score), with `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` set as strong secrets known only to the team. The administrator changes their password after first login | The papers require demo accounts and a visible trust score; the seeders already refuse to run in production without these settings and never overwrite an existing account. *Alternative:* no demo data, everything entered live (slow, and no trust score) |
| Q7 | **Migrations and backups once live** | **`php artisan migrate --force` as Railway's pre-deploy command on every deploy** (a failed migration stops the deploy, the old version keeps running). **Back up the database** (Railway's backup, plus a `mysqldump` kept by the team) before any deploy with a migration, before the tests (Oct 19 morning) and before the defense. **No schema changes from Oct 19 until after the defense** unless a critical fix needs one | Migrations are additive so far; a backup makes even a bad one recoverable. A schema freeze keeps the test data and the demo stable |
| Q8 | **The audit's scope and target** | **Every page in all four areas** (public, job seeker, employer, admin): 46 routes plus their dialogs. Target: **no axe violations, Lighthouse accessibility 100** on each page, and every WCAG 2.1 AA criterion either passed, not applicable, or fixed. The NVDA pass follows a written script per role (§4.6) | The papers say "every page"; the vitest-axe checks already cover components, so the live checks find what only a real browser shows (contrast with real fonts, zoom, focus). A script makes the groupmate's NVDA run repeatable |
| Q9 | **How the tests are run** | **In person where possible** (a PDAO, PESO or partner office, with the participant's own device and assistive technology when they have them), **remote by video call** when not; one facilitator and one note-taker; about **35–45 minutes** per session | People test best on their own setup; remote keeps recruitment flexible. The papers allow an interpreter or text-based session on request |
| Q10 | **Accounts for the test tasks** | **Hybrid.** Each job seeker registers a fresh account for the first task (real sign-up), then uses a **prepared account** for tasks that need history (a hire whose feedback form is open). Each employer uses a **prepared, verified company** with a job and two applicants waiting. Prepared accounts come from a `UsabilityTestSeeder` (codes P1–P8 and E1–E4), run once in production on Oct 18 | "Rate the accommodations after hire" can't be reached in a session (it opens 30 days after a hire), and an employer can't hire without applicants. Codes, not names, keep the report anonymous |
| Q11 | **The SUS form** | **Google Forms**, the standard 10 SUS items in **English** (the validated wording), each a five-point scale with labelled buttons, plus the participant code, role and (optional) disability type. The facilitator may explain an item in Filipino | Standard wording keeps the score comparable with the 68 benchmark; Google Forms works with NVDA. *Alternative:* a Filipino SUS translation (not validated) or paper |
| Q12 | **Fixing during the test days** | **Only critical fixes** (a task can't be finished, data leaks, the site is down), deployed between sessions and logged with the session that found them. Everything else goes into the results as a finding | Changing the app mid-study makes sessions incomparable. The log lets the paper say what changed and when |
| Q13 | **The Could-haves** (saved jobs, forgot password, display settings, email notifications) | **Stay out** of Phase 7 | Forgot password and email notifications need an email service that isn't set up; the papers rate them all Could-have, and the days are needed for the audit and tests. They're future work in the paper |
| Q14 | **Cloudflare's extra protection** | **Turn on**: Always Use HTTPS, HSTS, one rate-limiting rule on `/api/login` and `/api/register`. **Leave off**: Bot Fight Mode and Turnstile | Bot Fight Mode can challenge the API's own requests, and a CAPTCHA-like check is an accessibility risk days before testing with screen reader users. Laravel already limits login and registration |
| Q15 | **The JavaScript bundle** (610 kB, Vite warns above 500 kB) | **Split it by page** (route-level `lazy()`) on audit day, only if Lighthouse's performance score on a mid-range phone is below 80 | A smaller first load helps people on prepaid mobile data; it's a small, low-risk change, but not worth doing blind |
| Q17 | **Keeping OpenDoor's login cookies away from the other `ruzgal.org` sites** | **Host-only cookies.** The session cookie stays on `opendoor-api.ruzgal.org` alone (`SESSION_DOMAIN` unset), named `__Host-opendoor-session` so no other subdomain can set or replace it. The page asks the API for its CSRF token (a small `GET /api/csrf-token` that answers only the website, because of CORS) and sends it as a header, instead of reading the `XSRF-TOKEN` cookie. About 1–2 hours with tests | Today the page reads `XSRF-TOKEN` itself, which forces `SESSION_DOMAIN=.ruzgal.org`. Then the session and CSRF cookies are sent to `quiz-me`, `portfolio` and `bakas-ni-rizal` on every visit, and a bug or a future third-party script on any of them could replace OpenDoor's cookies. Host-only cookies remove that for free and change nothing for users. *Alternatives:* (b) serve the API through the website's own address (`opendoor-ipt.ruzgal.org/api/…`) with a proxy Worker, giving no CORS at all, but a second moving part on go-live day; (c) a dedicated `opendoor.ruzgal.org` with `api.opendoor.ruzgal.org`, which needs Cloudflare's Advanced Certificate Manager (about US$10 a month) for the second-level certificate; (d) keep `.ruzgal.org` and only rename the cookies, which avoids a clash but not the exposure |
| Q18 | **Requests that skip Cloudflare** | **Lock the API to Cloudflare.** A Cloudflare Transform Rule adds a secret header to every request for `opendoor-api.ruzgal.org`; in production the API answers 403 without it. Railway's public `*.up.railway.app` address is removed | Otherwise anyone who finds Railway's address bypasses the WAF rule and can fake their IP address (`X-Forwarded-For`) to dodge the login and registration limits. Transform Rules are free; the middleware is small and tested |
| Q19 | **The font** (Atkinson Hyperlegible) | **Serve it from the website itself** (the `@fontsource/atkinson-hyperlegible` package, same font and licence) instead of Google Fonts | Every visit currently sends the visitor's IP address to Google, which matters under RA 10173. It also lets the website's Content-Security-Policy allow its own files only (§8.1). *Alternative:* keep Google Fonts and allow its two hosts in the policy |
| Q20 | **Shared computers** (PESO offices, internet cafés) | **The session ends when the browser closes** (`SESSION_EXPIRE_ON_CLOSE=true`), on top of the 2-hour idle timeout already set | Job seekers may use a shared computer and forget to log out; their disability details and applications are behind that login. The cost: closing the browser means logging in again |
| Q16 | **The test data afterwards** | **Delete the participant accounts and their data within 30 days after the defense**; keep only the anonymous results (codes, task outcomes, SUS answers) | RA 10173 data minimization; consent forms say so |

---

## 4. What's decided

### 4.1 Where things run (7A)

```
Browser ──► Cloudflare (DNS · SSL · cache · WAF rate limit · HSTS)
              │                                  │
   opendoor-ipt.ruzgal.org ▼          opendoor-api.ruzgal.org ▼ (proxied, SSL Full (strict), secret edge header, Q18)
   Workers static assets          Railway project "opendoor"
   React build from GitHub          ├─ api      Laravel (PHP 8.3), pre-deploy: migrate --force,
   (Workers Builds, VITE_API_URL)   │           health check /api/health, volume at storage/app (Q3)
                                    ├─ prune    cron, daily 18:00 UTC: notifications:prune (Q5)
                                    └─ MySQL 8  private network only, backed up (Q7)
```

| Piece | How | Source |
|---|---|---|
| Laravel service | Railway builds `backend/` (root directory set to `backend`) with its built-in PHP support (Railpack: Composer install, PHP 8.3 with `pdo_mysql`), served by its web server on `$PORT`. A small `backend/railway.json` pins the build, the start command, the pre-deploy migration and the health check. No Dockerfile unless Railpack can't serve Laravel correctly (then a FrankenPHP Dockerfile, about an hour) | D6 |
| Database | Railway MySQL 8 in the same project; the API reaches it on Railway's private network (`MYSQLHOST` etc. as reference variables), never a public port | §IX Security |
| Website | Workers Builds connected to `opendoor-ipt`, root `frontend/`, build `npm run build`, deploy `npx wrangler deploy`; `VITE_API_URL=https://opendoor-api.ruzgal.org` as a build variable; custom domain `opendoor-ipt.ruzgal.org` on the Worker (the Worker named `opendoor` serves only that hostname) | §5.6 |
| Pull requests | Workers Builds gives each pull request its own preview URL (frontend only; it calls the production API, so previews are for looking, not testing data changes) | §5.6 |

### 4.2 Production settings (7A)

| Setting | Value | Why |
|---|---|---|
| `APP_ENV` / `APP_DEBUG` | `production` / `false` | No stack traces to visitors (§IX) |
| `APP_KEY` | A fresh key made for production (`php artisan key:generate --show`), stored only in Railway | Never the local key |
| `APP_URL` / `FRONTEND_URL` | `https://opendoor-api.ruzgal.org` / `https://opendoor-ipt.ruzgal.org` | CORS allows only the website |
| `SESSION_DRIVER` / `SESSION_DOMAIN` / `SESSION_COOKIE` | `database` / **unset** (host-only) / `__Host-opendoor-session` | Q17: the cookie stays on the API's own host; ending sessions on suspension needs the database driver |
| `SESSION_SECURE_COOKIE` / `SESSION_ENCRYPT` / `SESSION_EXPIRE_ON_CLOSE` | `true` / `true` / `true` | HTTPS-only cookie (and required by `__Host-`); the session's contents are encrypted in the database; Q20 |
| `SANCTUM_STATEFUL_DOMAINS` | `opendoor-ipt.ruzgal.org` | The website's requests get the session |
| `EDGE_SECRET` | A long random value, also set in the Cloudflare Transform Rule | Q18 |
| `CACHE_STORE` / `QUEUE_CONNECTION` | `database` / `sync` | No Redis or worker to run |
| `LOG_CHANNEL` / `LOG_LEVEL` | `stderr` / `warning` | Railway shows the logs; no request bodies or personal data are logged |
| `DB_*` | Railway's MySQL reference variables (private host) | §4.1 |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD` | Team-chosen secrets (Q6) | The seeders refuse production without them |
| `FEEDBACK_DELAY_DAYS` | `30` | The papers' rule; the demo hires are seeded so their forms are already open |
| Trusted proxies | Already `*` (Cloudflare → Railway) | Real visitor IPs for rate limits; safe only because Q18 makes Cloudflare the only way in |

Nothing secret goes into the repository; `.env.example` gains the production names with placeholder values and a comment per line. **Railway's variables are typed fresh, never copied from `.env.example`**, which still holds local values such as `SESSION_DOMAIN=localhost`. The health check is `/api/health`, not Laravel's `/up`, because it also checks the database.

### 4.3 The production database (7A)

| Step | When | Command (Railway) |
|---|---|---|
| Create the tables | First deploy, then every deploy, before the new version starts | Pre-deploy: `php artisan migrate --force` |
| Seed | **Once**, after the first deploy; again only to add new seeders (safe: seeders never overwrite) | `railway run php artisan db:seed --force` |
| Usability accounts | Once, Sun Oct 18, after the audit fixes (Q10) | `railway run php artisan db:seed --class=UsabilityTestSeeder --force` |
| Back up | Before a deploy with a migration, Mon Oct 19 morning, before the defense (Q7) | Railway backup, plus `mysqldump` through `railway connect` kept off the repository |
| Roll back | A bad deploy: redeploy the previous build in Railway. A bad migration: restore the backup | Runbook in README |

**Checked before go-live:** the full migration set and every seeder run once against a fresh MySQL 8 (Railway's, before the domain points at it), because development used MariaDB and the tests use SQLite. Anything that differs is fixed before L1.

### 4.4 The notification prune (7A)

| Topic | Decision | Source |
|---|---|---|
| What | `php artisan notifications:prune` deletes notifications older than 90 days (built in Phase 6) | PHASE_6 §4.4 |
| How | A Railway **cron service** from the same repository and variables, start command `php artisan notifications:prune`, schedule `0 18 * * *` (02:00 Manila); it exits after one run | Q5 |
| D7 still holds | Nothing the user sees depends on it: the list already hides anything older than 90 days | D7 |
| Checked | The cron service's log shows "Deleted N notifications older than 90 days." after its first run (L9) | §5 |

### 4.5 Cloudflare (7A)

| Setting | Value | Source |
|---|---|---|
| DNS | `opendoor-ipt.ruzgal.org` → the `opendoor` Worker (custom domain); `opendoor-api` → Railway's target, **proxied**; the other `ruzgal.org` records untouched | §5.6 |
| Transform Rule | For `opendoor-api.ruzgal.org`: add the request header `X-OpenDoor-Edge: <EDGE_SECRET>` | Q18 |
| SSL/TLS | **Full (strict)**; Always Use HTTPS; HSTS (6 months, without preload for now) | §5.6; Q14 |
| WAF | One rate-limiting rule on `opendoor-api.ruzgal.org`: `/api/login` and `/api/register`, 20 requests a minute per IP, then block for a minute | §5.6; Q14 |
| Cache | Static assets cached at the edge; `/api/*` never cached (responses already say `no-store` where private) | |
| Off | Bot Fight Mode, Turnstile (Q14) | |

### 4.6 The accessibility audit (7B)

| Part | How | Output |
|---|---|---|
| Pages | Every route in the router (public 10 including Not found, job seeker 11, employer 12, admin 11, account 2) plus every dialog, at desktop and 360 px | The checklist rows |
| Automated | axe DevTools (or `@axe-core` in the browser) and Lighthouse (mobile, accessibility and performance) on the **live** site, logged in as each role | Violations per page, Lighthouse scores |
| Manual WCAG 2.1 AA | All 50 Level A and AA criteria, judged per page group: keyboard (2.1.1, 2.1.2, 2.4.3, 2.4.7), reflow at 320 px and 200% zoom (1.4.4, 1.4.10), text spacing (1.4.12), contrast including focus and non-text (1.4.3, 1.4.11), labels and errors (1.3.1, 3.3.1–3.3.4), status messages (4.1.3), titles, headings and language (2.4.2, 2.4.6, 3.1.1), timing (2.2.1, the session lifetime) | Pass / fail / not applicable, with evidence |
| NVDA | A groupmate on Windows with NVDA and Chrome (or Firefox) follows a script per role: register, set needs, find and apply; post a job and hire; give feedback; suspend and remove as admin. Phase 3, 5 and 6's open screen reader passes are covered by this | Problems heard, with the page and step |
| Leftovers to fix | Phase 2: Team's "Create invite link" and same-day "Revoke" names, lists capped at 200 rows without saying so. Phase 3: **Try again** not clearing old messages and load errors not announced (My profile, My needs, dashboard), no focus ring on the entry focused after **Remove**, page titles at 32 px on phones, the bundle (Q15) | Fixed or explained |
| Report | `.planning/ACCESSIBILITY_AUDIT.md`: method, tools and versions, the criteria table, the issues and fixes, what remains and why. Exported to Word for the paper | §XII-B |

The audit's fixes are done and deployed **before** the tests (§XII-B: "issues found will be fixed before usability testing").

### 4.7 The usability tests (7C)

**Participants:** at least **5 PWD job seekers** (a mix of disabilities where possible: low vision or blind with a screen reader, deaf or hard of hearing, physical or mobility, intellectual or learning, psychosocial) and **at least 3 employers or HR staff**. Recruited through a PDAO, PESO or PWD organization (§XII-A). Codes P1… and E1…, never names.

**Each session (35–45 minutes):**

| Step | What happens | Minutes |
|---|---|---|
| 1 | Welcome, what OpenDoor is, consent (read aloud or in text; signed or recorded verbally), the right to stop at any time | 5 |
| 2 | Background: device, assistive technology, experience with job sites; disability type optional | 3 |
| 3 | Tasks (below), one at a time, thinking aloud; the facilitator doesn't help unless the participant is stuck for 2 minutes or asks to move on | 20–30 |
| 4 | SUS (Google Forms, Q11) | 5 |
| 5 | Two open questions: what was hardest, what would make you trust or use OpenDoor | 3 |

**Tasks for job seekers** (P):

| # | Task (as read to the participant) | Done when |
|---|---|---|
| T1 | "Create an account as a job seeker." | Lands on their dashboard |
| T2 | "Tell OpenDoor which accommodations you need at work." | Needs saved |
| T3 | "Find a job that meets your needs and open it." | A job page with "Meets … of your needs" |
| T4 | "Apply to that job, and ask for something you need during the interview." | Application sent with an interview request |
| T5 | (Prepared account) "You were hired at OpenDoor Demo Corp. Rate whether each accommodation they promised was provided." | Feedback sent |
| T6 | "Check what happened to your applications." | Reads a status correctly |

**Tasks for employers** (E, prepared verified company):

| # | Task | Done when |
|---|---|---|
| E1 | "Post a job for a Data Encoder that offers flexible hours and screen-reader-compatible tools." | Sent for approval (the facilitator's admin approves it) |
| E2 | "See who applied to Customer Service Associate, open one applicant, and hire them." | Status Hired |
| E3 | "Reject the other applicant." | Status Rejected |
| E4 | "Find out what job seekers say about your accommodations." | Reads the trust score page |

**Recorded per task:** success (completed / with help / not completed), errors (wrong turns, wrong submissions), and notes; time only as a rough note. **SUS** scored the standard way (odd items: score − 1; even items: 5 − score; sum × 2.5), mean and range per role and overall; target **mean ≥ 68**.

**Results** (`.planning/USABILITY_RESULTS.md`): participants (codes, role, assistive technology, optional disability type), task success table, SUS per participant and means, problems found ranked by severity (blocks a task / slows / cosmetic) with the fix or why not, and the critical-fix log (Q12).

---

## 5. How we'll know it's done

### 7A go-live checks (on the live site)

| # | Check | Expected |
|---|---|---|
| L1 | Open `https://opendoor-ipt.ruzgal.org` and `https://opendoor-api.ruzgal.org/api/health` | The home page; `"status": "ok"` with `"database": "ok"` |
| L2 | `http://` addresses | Redirect to `https://` |
| L3 | Log in as each demo role; reload; log out | Stays logged in across reloads; logout ends it; the session cookie is `__Host-opendoor-session`, `Secure`, `HttpOnly`, `SameSite=Lax`, **with no `Domain`**; visiting `portfolio.ruzgal.org` sends no OpenDoor cookie (Q17) |
| L4 | Browse jobs as a guest; Bayanihan Contact Center's page | Jobs listed; "**88%**, based on 4 hires" |
| L5 | As `candidate@`: upload a PDF résumé; as `employer@`: open it from the applicant page; then redeploy the API and open it again | The file survives the redeploy (Q3) |
| L6 | Upload a company logo; redeploy; reload | Still there |
| L7 | A request that fails (e.g., `/api/nope`) | A plain JSON message, no stack trace (debug off) |
| L8 | From another website's origin (a quick `fetch` in its console) to `/api/me` | Refused by CORS |
| L9 | Run the cron service once by hand | Its log says "Deleted 0 notifications older than 90 days." |
| L10 | Phase 6 demo A1, A3, B1 and B3 on the live site | Same results as on `opendoor_verify` |
| L11 | A request straight to Railway's address, or with the wrong `X-OpenDoor-Edge` | 403 (Q18) |
| L12 | The response headers of the website and of `/api/health` (e.g., securityheaders.com) | The headers in §8.1 are present; no `X-Powered-By` |

### 7B and 7C

| # | Check | Expected |
|---|---|---|
| X1 | axe on every page as every role | No violations (or each explained in the report) |
| X2 | Lighthouse accessibility, mobile | 100 on every page, or the gap explained |
| X3 | The WCAG 2.1 AA table | Every criterion pass or not applicable after fixes |
| X4 | NVDA scripts | Every task completed with NVDA alone |
| U1 | Sessions | ≥ 5 PWD, ≥ 3 employers, each with consent and a SUS |
| U2 | Results | SUS means computed; task table; problems ranked; written up |

The GSD security audit (production settings: §4.2, §4.5, §8) runs after L1–L10 and before the tests.

---

## 6. What I need from you

| What | By | Why |
|---|---|---|
| Access to the Cloudflare account for `ruzgal.org` (or you click through the steps I write) | Fri Oct 16 morning | DNS, the Worker's custom domain, the Transform Rule (Q18) and the WAF rule |
| **A Railway account** on the Hobby plan (a payment method for the trial and the ~US$5) | Fri Oct 16 morning | Q2 |
| The **production secrets**: the admin email, strong passwords for the admin and the demo accounts, the `APP_KEY` and the `EDGE_SECRET` (set them yourselves in Railway's and Cloudflare's settings; don't send them to me) | Fri Oct 16 | Q6, Q18; I never see them |
| **How many participants are confirmed**, where and when (in person or remote), and whether any need an interpreter | Sat Oct 17 | §4.7; the schedule and the prepared accounts depend on it |
| A groupmate with **Windows and NVDA** for the audit | Sat Oct 17 – Sun Oct 18 | §4.6 |
| Who **facilitates** and who **takes notes** in each session | Sun Oct 18 | §4.7 |

Things only you can do, which I won't do for you: creating accounts on Cloudflare or Railway, entering payment details, and choosing or typing production passwords.

---

## 7. What gets built

### 7.1 Files

| File | What | Part |
|---|---|---|
| `backend/railway.json` | Build and deploy settings: root, start command, pre-deploy `php artisan migrate --force`, health check `/api/health` | 7A |
| `backend/.env.example` | The production variable names with placeholders and comments (§4.2) | 7A |
| `backend/config/session.php`, `cors.php` (only if needed) | Read `SESSION_SECURE_COOKIE` and the frontend URL from the environment (mostly there already) | 7A |
| `README.md` | **Deployment runbook**: first setup, deploy, migrate, seed, back up, restore, roll back, the cron service, the dependency check, the checks L1–L12 | 7A |
| `backend/routes/api.php`, `frontend/src/api/client.js` | `GET /api/csrf-token`; the client keeps the token in memory and sends it as `X-CSRF-TOKEN` (fetching it on start, after login and logout, and on a 419), instead of reading the `XSRF-TOKEN` cookie (S1) | 7A |
| `backend/app/Http/Middleware/SecurityHeaders.php`, `EnsureRequestFromEdge.php` | S3 and S2, registered globally (the edge check only when `EDGE_SECRET` is set, so local development is unchanged) | 7A |
| `backend/bootstrap/app.php`, `config/filesystems.php`, `app/Providers/AppServiceProvider.php` | The middleware, the general rate limit (S7), `'serve' => false` (S6), `uncompromised()` (S9) | 7A |
| `frontend/public/_headers`, `frontend/index.html`, `frontend/package.json` | Website headers (S4); the self-hosted font replaces the Google Fonts links (S5) | 7A |
| `backend/database/seeders/UsabilityTestSeeder.php` | Prepared accounts P1–P8 (each with a hire at OpenDoor Demo Corp. whose feedback form is open) and E1–E4 (verified companies, each with a job and two applicants); never part of `DatabaseSeeder`; refuses to run twice | 7C |
| Accessibility fixes | Whatever 7B finds, plus the §4.6 leftovers; each with a page test | 7B |
| `.planning/ACCESSIBILITY_AUDIT.md`, `.planning/USABILITY_RESULTS.md`, `.planning/USABILITY_TEST_KIT.md` | The audit report, the results, and the kit (consent text, script, tasks, SUS items, note sheet) | 7B, 7C |

No database changes are planned (Q7's freeze).

### 7.2 Server tests added

- `UsabilityTestSeeder` creates the prepared accounts once, with open feedback forms and waiting applicants, and refuses a second run.
- The production seeding guard (already tested) and `notifications:prune` (deletes only older than 90 days).

---

## 8. Privacy and security checks

| Risk | How it's handled | Part |
|---|---|---|
| Debug pages leaking code or data | `APP_DEBUG=false`; L7 | 7A |
| Secrets in the repository | Only placeholders in `.env.example`; secrets in Railway and Cloudflare variables; the GSD security audit checks the repository | 7A |
| The database reachable from the internet | Private network only; no public MySQL port | 7A |
| Weak or shared admin password | Set by the team as a strong secret; changed after first login (Change password, Phase 6) | 7A |
| Session cookies sent over plain HTTP or to the other `ruzgal.org` sites | Host-only `__Host-` cookie on `opendoor-api.ruzgal.org`, `Secure`, `HttpOnly`, `SameSite=Lax`, HTTPS only, HSTS; the CSRF token comes from the API, not a shared cookie (Q17); L3 | 7A |
| The API reached around Cloudflare | Secret edge header required in production; Railway's public address removed (Q18); L11 | 7A |
| Other websites calling the API with the visitor's cookie | CORS and Sanctum's stateful domains limited to `opendoor-ipt.ruzgal.org`; L8 | 7A |
| Résumés exposed by a public URL | They stay on the API's private disk and are served only to their owner and that job's employer (Phase 4), with `no-store` and a sandbox header | 7A |
| Losing data in a bad deploy | Pre-deploy migrations stop a failing deploy; backups before risky moments (Q7) | 7A |
| Brute-force login | Laravel's per-email limit, plus Cloudflare's rate-limiting rule (Q14) | 7A |
| Participants identifiable in the results | Codes only; disability type optional; recordings (if any) kept off the repository and deleted after analysis; accounts deleted within 30 days after the defense (Q16) | 7C |
| Consent | Read or shown before anything else, in plain language, with the right to stop; recorded per participant | 7C |

### 8.1 Security pass before go-live (2026-10-15)

What was checked in the code, and what to add. **Already in place:** every address comes from environment variables (nothing hard-coded to a host); CORS allows only `FRONTEND_URL` with credentials; `APP_ENV` defaults to `production` and `APP_DEBUG` to `false` when unset; no `.env` file or application key was ever committed (the `Admin_1234`/`Demo_1234` passwords in the seeder are refused in production); `composer audit` and `npm audit` report **0 vulnerabilities**; no `dangerouslySetInnerHTML`, `eval` or browser storage in the frontend; no raw SQL built from input (every raw fragment uses bindings or fixed values); uploads are checked by content (PDF only, 5 MB; PNG/JPG/WebP only, no SVG, 2 MB) and served with `nosniff` (résumés also `Content-Security-Policy: sandbox` and `no-store`); passwords are hashed with bcrypt and need 8+ characters with upper and lower case, a number and a symbol; login, registration, invites, applying, feedback and password changes are rate-limited; sessions are regenerated at login and ended on logout, suspension and password change; private responses send `no-store`; every Phase 1–6 security audit closed its threats.

| # | Measure | Why | Effort | Part |
|---|---|---|---|---|
| S1 | **Host-only, `__Host-` session cookie and a CSRF token from `GET /api/csrf-token`** (Q17) | Keeps OpenDoor's login away from `quiz-me`, `portfolio`, `bakas-ni-rizal` and any future `ruzgal.org` site | 1–2 h with tests | 7A |
| S2 | **API locked to Cloudflare** with a secret edge header; Railway's public address removed (Q18) | The WAF and the IP-based limits can't be bypassed; `X-Forwarded-For` can't be faked | 1 h with tests | 7A |
| S3 | **Security headers on every API response**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` (file responses keep their own), `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and no `X-Powered-By` | Nothing from the API can be framed, sniffed or turned into a page | 30 min with a test | 7A |
| S4 | **Security headers on the website** (a `frontend/public/_headers` file, which Workers static assets serve): a Content-Security-Policy (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://opendoor-api.ruzgal.org; connect-src 'self' https://opendoor-api.ruzgal.org; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`), `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` as above. HSTS comes from Cloudflare (Q14) | If a script ever got in (a dependency, a bug), it couldn't load code or send data anywhere else; the site can't be framed for clickjacking. Styles allow `'unsafe-inline'` because the dialogs' scroll lock (Radix) adds a small `<style>` element; scripts stay strict | 1 h, checked on every page in the audit | 7A |
| S5 | **Self-hosted font** (Q19) | No visitor IPs to Google; lets S4 stay `'self'` only | 20 min | 7A |
| S6 | **`'serve' => false`** on the private disk (`config/filesystems.php`) | Removes Laravel's unused `/storage/…` route for private files (a Phase 3 leftover); résumés are served only through their own checked addresses | 5 min with a test | 7A |
| S7 | **A general limit for signed-in requests** (e.g., 300 a minute per account, 120 per IP for guests) on top of the per-action limits | A stolen session or a script can't hammer search, lists or admin pages | 30 min with a test | 7A |
| S8 | **Session hardening**: `SESSION_ENCRYPT=true`, `SESSION_EXPIRE_ON_CLOSE=true` (Q20), 120-minute idle timeout kept | Session contents unreadable in the database; shared computers log out on close | Settings only | 7A |
| S9 | **Reject breached passwords** (`Password::defaults()->uncompromised()`, a k-anonymity check against Have I Been Pwned: only 5 characters of the password's hash leave the server) for registration, invites and password changes | Stops the most common stolen passwords, admins included | 20 min; needs outbound HTTPS from Railway | 7A |
| S10 | **Dependency check before each deploy**: `composer audit` and `npm audit` in the runbook | Catches a newly published vulnerability | Runbook line | 7A |
| S11 | **GSD security audit of the production settings** after L1–L12 (already in §5) | An independent check of all of the above, live | Agent run | 7A |

Not recommended now: Bot Fight Mode or Turnstile (Q14, accessibility); two-factor login for admins (no email or authenticator setup before the defense; after it); a separate staging environment (§10).

---

## 9. Order of work

| Step | When | Work | Done when |
|---|---|---|---|
| 1 | Fri Oct 16 AM | Security pass S1–S9 with tests (§8.1); `railway.json`, `.env.example`, README runbook; the full migration and seeding run against a fresh MySQL 8 | Committed; all tests pass; MySQL run clean |
| 2 | Fri Oct 16 | You: Railway project, MySQL, volume, variables; Cloudflare DNS and Worker domain. Me: the steps written out, checked with you | Both services deployed |
| 3 | Fri Oct 16 PM | First deploy, migrate, seed; cron service; the Transform Rule (S2); L1–L12; GSD security audit of production (S11) | All pass; links sent to you for submission |
| 4 | Sat Oct 17 | GSD security audit of production; automated axe and Lighthouse on every page | Results logged |
| 5 | Sat Oct 17 – Sun Oct 18 | Manual WCAG check, NVDA scripts (groupmate), fixes and leftovers, each deployed; `UsabilityTestSeeder` and the test kit; audit report | X1–X4; kit ready; prepared accounts seeded Sun evening |
| 6 | Mon Oct 19 AM | Backup; schema freeze; a dry-run session with a groupmate | Kit works end to end |
| 7 | Mon Oct 19 – Tue Oct 20 | Sessions (U1); critical fixes only (Q12) | Every session done |
| 8 | Tue Oct 20 PM | SUS and task analysis; results write-up; backup before the defense | U2 |

---

## 10. Not in Phase 7

| Feature | Comes in |
|---|---|
| Saved jobs, display settings page, forgot password, email notifications (Could-haves, Q13) | After the defense |
| Report a posting, admin analytics (cut in Phase 6) | After the defense |
| Account deletion request (F1.8) | After the defense; test accounts are deleted by the team (Q16) |
| A staging environment separate from production | After the defense; pull request previews cover the frontend |
| Moving files to Cloudflare R2 (if Q3 picks the volume) | After the defense, if needed |
