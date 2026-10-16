# UI Feedback Plan: a more formal OpenDoor, learning from LinkedIn and Indeed

> Status: **APPROVED** (2026-10-16: "The recommendations are OK. Start Wave A."). **Wave A built** (2026-10-16), all of it (§7).
> Builds on [UI_REVAMP_PLAN.md](UI_REVAMP_PLAN.md) (approved; R1 and R2 done) and [NEXT_STEPS_2026-10-16.md](NEXT_STEPS_2026-10-16.md). Where this plan changes a page, it replaces that page's row in UI_REVAMP_PLAN §5. Everything else there still stands.
> Sources: the team's review of the live site (October 16) and screenshots of Indeed (home, job details, account menu) and LinkedIn (profile, Jobs home, job list with the details pane, "About the company").
> Out of scope: LinkedIn's messaging, connections, "who viewed", Premium prompts and the feed.

---

## 0. What stays

We are **not** starting a new design. The OpenDoor principles stay as they are:

- **Accessibility comes first.** That means the utility bar (Text size, High contrast, Quiet mode, Compact menu), the focus ring, the skip link, one H1 per page, the error summary and the announcer. Every page must still work at 360 px, at 200 % zoom and at 200 % text.
- **Accommodations are the main fact about a job**, and the trust score is their proof.
- **Plain words.** Each page has one sentence under its heading.
- **The violet brand and the tokens.** The tokens get a more formal treatment (§3.1), not new colours. The contrast test (`tokens.test.js`) still guards both themes.
- **The current URLs**, so notifications already stored in the database still link to the right pages.

The only things we take from LinkedIn and Indeed are **layout and density**: white cards on a quiet grey page, a two-pane job search, a details pane with "About the job" and "About the company", filter chips that name what they filter, and one-click account menus. Their branding and upsells stay out.

---

## 1. The problems we saw (team review, October 16)

| # | Problem | Area | Where in the code today |
|---|---|---|---|
| P1 | **There is no back button.** Detail pages have only a "Back to jobs" link at the very bottom, and some pages have none | Functionality | `public/JobPage.jsx` (bottom link only), `public/EmployerPage`, `candidate/ApplicationPage`, `employer/ApplicantPage`, `admin/PostingReviewPage`, `admin/UserPage` |
| P2 | **You can't filter by workplace type** (on-site, hybrid, remote). Every job has one, but there is no filter for it | Job search | `posting.work_setup` exists (`WorkSetup` enum); `JobSearchRequest` and `JobSearch` don't accept it |
| P3 | **You can't filter by employment type** (full-time, part-time, contract, internship) | Job search | `posting.employment_type` exists (`EmploymentType` enum); same gap as P2 |
| P4 | **There is no "About the company" section on the job page.** "About the job" exists but sits under a grid of side panels | Job details | `components/postings/JobDetails.jsx`; `employers.description` and `industry` exist but aren't shown on the job page |
| P5 | **Active filters show only a count** ("Filters, 4 on") instead of naming them | Job search | `AccommodationFilterPanel.jsx`, `activeFilterCount` in `useJobSearchParams.js` |
| P6 | **The filter options are cluttered.** Category, every accommodation checkbox, Sort and Show are all open at once, which is too much to take in | Job search | `BrowseJobsPage.jsx`, `AccommodationFilterPanel.jsx` |
| P7 | **The trust score is easy to miss.** It is a sentence in a side panel and isn't on the job cards at all | Trust score | `feedback/TrustScoreCard.jsx`, `jobs/JobCard.jsx` (it is only in the muted footer line) |
| P8 | **The trust card shows too much up front.** The explanation and the breakdown are always visible | Trust score | `TrustScoreCard.jsx` (`TRUST_EXPLAINED` and the breakdown rows) |
| P9 | **"My applications" needs work.** *What exactly is wrong still has to be confirmed (Q9)* | Job seeker | `candidate/MyApplicationsPage.jsx` |
| P10 | **The job seeker's page is cluttered** | Job seeker | `candidate/CandidateDashboard.jsx` (Q10 confirms which page) |
| P11 | **New users get no onboarding or tutorial** | All roles | Nothing exists |
| P12 | **The admin dashboard has no graphs or analytics.** It shows only counters | Admin | `admin/AdminDashboard.jsx`, `Admin/DashboardController.php` (totals only, no history) |
| P13 | **The employer dashboard has no graphs about their job postings** | Employer | `employer/EmployerDashboard.jsx` |
| P14 | **Log in and Create account have no mascot animation.** We want the mascot to walk in | Brand | `home/Mascot.jsx` is used only on Home |
| P15 | **The loading screen is plain text.** We want the mascot running to the door | Brand | `layout/PageLoading.jsx`, `ui/LoadingMessage.jsx` |
| P16 | **Profiles can't be personalised.** For example, there is no profile picture | Job seeker | No photo column; `candidate/ProfilePage.jsx` |
| P17 | **Menus take two clicks where one should do** | Navigation | `layout/SiteHeader.jsx` (compact Menu); "Account" goes to `/account/display` and then a tab |
| P18 | **The site doesn't look formal.** It looks like an iPad app: big pills, big type, colourful tiles and lots of empty space | Look | `styles/tokens.css`, `ui/Button.jsx`, `ui/IconTile.jsx`, `JobCard.jsx`, `PageHeader` |

---

## 2. What we take from LinkedIn and Indeed

| Pattern in the screenshots | Where it's from | Use in OpenDoor | Fixes |
|---|---|---|---|
| A job list on the left and the selected job's details on the right, with the list kept in place | LinkedIn "More jobs for you", Indeed home | **Find jobs as two panes** on wide screens. Choosing a card shows the job on the right and writes `?job=12` into the address, so Back and shared links work. On narrow screens, at large text, or when Compact menu is on, it falls back to today's separate job page (Q2) | P1, P6, P18 |
| A details pane in clear blocks: title, company link, place and type on one line, a row of actions, then **Job details** (pay, type, place with icons), **Full job description** and **About the company** | Indeed, LinkedIn | **The job page and pane**: a heading block, then the actions row (Apply, and Read aloud if it's built), then **How this job fits you** (NeedsFit, like LinkedIn's "match details" box), **Accommodations provided**, **Job details** (icon rows for work setup, employment type, location, interview, apply by, category), **About the job**, and **About the company** (logo, name, verified badge, industry, address, description, trust score, "See all jobs from this employer") | P4, P7 |
| A sticky mini-header with the title and the Apply button once you scroll past the top | LinkedIn | The job pane and job page keep the title and **Apply** visible while you read. The bar is turned off at 150 % text and above, so it can't cover the content (WCAG 2.4.11) | — |
| Filter chips across the top: "Remote ▾", "Full-time ▾", "All filters" | LinkedIn job search | **A chip bar** with Work setup, Employment type, Category, Accommodations and Sort. Each chip names what's picked ("Remote", "Remote +1"); Matches my needs is a toggle chip; then **All filters** and **Clear all** | P2, P3, P5, P6 |
| Small, quiet labels on cards: "Easily apply", "New", "Top-rated employer", "Be an early applicant" | Indeed, LinkedIn | **Card labels made from data we already have**: *New* (approved in the last 3 days), *Closing soon* (closes within 7 days), and **a trust score chip** ("Trust score 92 %", or "New employer, not rated yet") | P7 |
| A left column with your profile card and short links (Preferences, Job tracker) next to a main feed | LinkedIn Jobs home | **The job seeker dashboard**: a profile card on the left (photo, name, headline, needs summary, "Edit profile"); on the right, a setup checklist (until it's done), "Jobs for you", and "Your applications" with the latest few | P10, P11 |
| Dismissable "Get started" cards ("Show recruiters you're open to work") | LinkedIn profile | **Onboarding as a checklist of cards**, not a pop-up tour (Q6) | P11 |
| One avatar button that opens the account menu: email, Profile, Settings, Help, Sign out | Indeed "Account", LinkedIn "Me ▾" | **One account menu** under the initials or photo: your name and email, Profile (job seekers), Notifications, Display settings, Change password, Help (Contact us), and Log out. One click opens it and Escape closes it | P17 |
| Profile header: a photo, a cover band, a headline and a location | LinkedIn profile | **Job seeker profile header**: an optional photo, a headline, the city, and an "Open to" line (work setup and employment types). The cover is a plain brand band, not an upload | P16 |
| Charts that show a company's hiring ("12 % employee growth", applicant levels) | LinkedIn "hiring insights" | **Dashboard charts** for employers and admins, built from our own tables (§3.6) | P12, P13 |
| Formal density: white cards with 8 px corners on a light grey page, 14–16 px meta text, real company logos instead of colour tiles | Both | The **"formal" pass on the tokens** (§3.1) | P18 |

Things we deliberately don't take: salary on cards (we don't store pay, see Q11), "Easily apply" (every OpenDoor application is the same short form), Premium and "who viewed" boxes, and the thumbs-down "not interested" button (Q12).

---

## 3. What we'd build

### 3.1 A more formal look (P18)

This is one pass on the tokens and the shared components, so every page changes together:

- **The page and its cards.** The page background becomes `--od-surface-subtle` (a quiet violet-grey). Content sits in white cards with a 1 px `border` line and **8 px corners** (12 px for dialogs). Cards get no shadow, except a light one on hover.
- **Buttons.** Keep the 44 px touch size, but use **8 px corners instead of pills** for everyday buttons. Primary actions (Apply, Post a job, Search) are filled; the rest are outlined. The orange arrow pill stays only on the Home hero.
- **Type.** H1 goes from 34 to **28 px**, H2 from 22 to **20 px**, and card titles to **18 px** semibold Lexend. Body text stays at 18 px Atkinson in descriptions and drops to **16 px for card meta lines**, which is still the smallest size and still inside the text-size scaling.
- **Colour.** The accents (orange, pink, sky) and the sparkles move **to Home only**. Portal pages use violet, grey and the status colours. Job cards show **the employer's logo**, or a square with their initials, instead of a coloured briefcase tile.
- **Layout.** Pages use **1128 px** width (the LinkedIn grid) with a 12-column grid: a 3 / 6 / 3 split for dashboards and 5 / 7 for Find jobs. Spacing tightens from 40 px to **24 px** between sections.
- **Header.** One slim white bar with a bottom border. The links are icons with labels under them (LinkedIn style) and the logo sits on the left, not centred (Q5). The current page is shown by a 2 px violet underline, not a tinted pill. The utility bar stays above the header, slimmer (32 px).
- **Kept as they are:** the focus ring, the high contrast theme (it inherits the new shapes), Quiet mode, and Reduce motion.

### 3.2 Navigation (P1, P17)

- **`ui/BackLink.jsx`** is a new link at the top of every detail page, above the H1: "← Back to jobs", "← Back to applicants" and so on. It goes back to the list *you came from, with its filters* (`location.state.from`); if you opened the page from a shared link, it goes to the list's default address instead. It is a real link, not `history.back()`, so it behaves the same everywhere and screen readers announce where it leads. Pages: job, employer, application, apply, feedback, applicant, posting edit and preview, posting review, user, and the notification targets. The bottom "Back to jobs" link is removed.
- **The account menu** (§2) replaces the separate "Account" and "Profile" items on the right. Notifications stays its own bell with the count, as on Indeed.
- **Compact Menu** opens the whole list in one click. The account items appear in the same list under a divider, with no second menu inside it.

### 3.3 Find jobs (P2, P3, P5, P6)

- **Backend (no migration).** `JobSearchRequest` accepts `work_setup[]` (`on_site`, `hybrid`, `remote`) and `employment_type[]`. `JobSearch` adds `whereIn` for each. Tests cover each value, mixing filters together, and bad values.
- **Frontend.** `useJobSearchParams` keeps `work_setup=remote,hybrid&type=full_time` in the address, and `activeFilterCount` becomes `activeFilters`, a list of `{ key, label }`.
- **The chip bar** (new `jobs/FilterChips.jsx`) has these chips:
  - Work setup ▾, Employment type ▾, Category ▾: each opens a small panel of checkboxes or radios.
  - Accommodations ▾: opens a dialog with the groups as collapsible sections.
  - Sort ▾.
  - Matches my needs: a toggle (job seekers only).

  Each chip reads what's chosen ("Remote", "Remote +1", "Visual · 2"). It is a button with `aria-expanded` and an `aria-label` that names both the filter and the value ("Work setup: Remote and Hybrid"). **All filters** opens one dialog with every filter for phones. **Clear all** appears only when something is on.
- **The results** have a count line ("24 jobs · Remote, Full-time"). The cards have the new labels (New, Closing soon, the trust score chip). On wide screens, the two panes (Q2).

### 3.4 The job page and pane (P4, P7, P8)

The order is as in §2. The trust score changes like this:

- **Prominent.** A **shield badge with the number** ("**92 %** trust score · 14 ratings") next to the employer's name in the heading block, and the same chip on every job card.
- **Less clutter.** The sentence explaining it and the per-accommodation breakdown move into a `<details>` labelled **"How is this score worked out?"**, closed by default. The full breakdown stays on the employer page.
- **Unrated employers** show a neutral chip: "Not rated yet: fewer than 3 responses". The papers' rule (no count shown below 3) is unchanged.

### 3.5 The job seeker's pages (P9, P10, P16)

- **Dashboard** (§2 layout). The five stat tiles shrink into one line of tabs with counts ("Submitted 3 · Reviewed 1 · Hired 0…") that link to My applications filtered by status.
- **My applications** becomes a **job tracker** (LinkedIn's word), pending Q9. Tabs with counts (Active, Hired, Not selected, Withdrawn) and a card per application: logo, title, employer, status badge, "Updated 2 days ago", the next step ("Waiting for the employer to review"), and "Rate accommodations" when it's open. On a phone it is a list of cards, so no table is needed.
- **Profile.** An optional **photo** (`users.photo_path`, a JPEG or PNG up to 2 MB, cropped to a square, stored like the logos, and removable). Also a **headline** (80 characters), the **city**, and **"Open to"** (work setups and employment types). "Open to" also sets the defaults of the Find jobs chips, and you can turn that off. **Who sees the photo is Q8.**

### 3.6 Dashboards with charts (P12, P13)

These are new **read-only** endpoints that aggregate tables we already have. There is no migration.

| Who | Chart | Data |
|---|---|---|
| Employer | Applications received, by week, last 8 weeks (columns) | `applications.created_at` for the employer's postings |
| Employer | Applicants per open posting by status (stacked bars: Submitted, Reviewed, Hired, Not selected) | `applications.status` grouped by posting |
| Employer | Trust score over time (a line, only once there are 3+ responses) | `feedback` grouped by month |
| Admin | New accounts by week by role (job seekers, employers) | `users.created_at`, `role` |
| Admin | Postings by status now (one bar) and approved per week | `job_postings.status`, `approved_at` |
| Admin | Applications and hires by week | `applications` |
| Admin | Employer verification: waiting, verified, not approved | `employers.verification_status` |

How the charts are built, accessibly:

- **Hand-drawn SVG**, with two components: `ui/charts/BarChart.jsx` and `LineChart.jsx`. We add no chart library, so we fully control contrast, high-contrast mode, and text scaling.
- Each chart has a **title**, a **one-line takeaway** written from the data ("Applications rose from 4 to 11 this week"), the actual values on or next to the bars, and a **"Show as table"** toggle with the same numbers.
- Series are told apart by **pattern and label**, never by colour alone.
- The `dataviz` skill is used for the styling when this is built.
- **No made-up metrics.** We don't record views or clicks, so there are no "views" or "click-through" charts.

### 3.7 Onboarding (P11)

- **A "Get started" checklist card** at the top of each dashboard until it's done or dismissed:
  - Job seeker: Add your accommodation needs, Complete your profile, Upload a résumé, Apply to a job.
  - Employer owner: Complete your company profile, Submit verification, Post your first job, Invite HR.
  - Admin: none.
- Each step is **worked out from the data** (for example, whether needs exist), so it needs no new storage. Dismissing it is saved in the browser (`localStorage`), like the display settings.
- **A short "How OpenDoor works" page** (`/help`), linked from the account menu and from the checklist. It has three illustrated steps per role and explains the trust score.
- **No coach-mark pop-up tour** (Q6).

### 3.8 The mascot (P14, P15)

- **Log in and Create account.** The mascot walks in from the side of the card and stops beside the heading, about 1.2 s, once per visit. It is decorative (`aria-hidden`). With Reduce motion it is shown standing still; in Quiet mode it is hidden; it is never shown on a phone narrower than 640 px.
- **Loading.** `PageLoading` and the longer `LoadingMessage` show the mascot **running towards a door** in a loop. A small sprite strip is made from the existing body and head art, with a CSS `steps()` animation (no canvas script), and it appears only after **400 ms**, so fast loads don't flash it. The words ("Loading the page…") stay and are still announced. With Reduce motion the mascot stands at the door instead.
- The mascot **doesn't appear on working pages** (dashboards, forms, tables). That keeps it from clashing with the formal look.

---

## 4. Questions for you

| # | Question | Recommendation | Why |
|---|---|---|---|
| Q1 | **When does each part land?** Usability tests are Oct 19–20 and participants are booked; the audit is Oct 18; the freeze starts after Saturday's deploy | **Wave A (Sat Oct 17, before the audit and the tests):** §3.1 formal look, §3.2 back links and account menu, §3.3 filters and chips, §3.4 job page and trust score. **Wave B (Oct 21 until your defense slot, after the tests):** §3.5 photo, headline and job tracker; §3.6 charts; §3.7 onboarding; §3.8 mascot. Anything not done goes into the paper as future work | Wave A is what test participants touch (Find jobs → job → Apply) and needs no migration. Wave B adds a column (photo), new endpoints and animation, which shouldn't change between the audit and the tests. The defended interface will then differ a little from the tested one, and the paper says so. *Alternative:* do it all after the tests, so they run on today's interface |
| Q2 | **Find jobs as two panes** (list and details side by side)? | **Yes, at 1024 px and wider, with text at 125 % or less and Compact menu off.** Otherwise keep the separate job page, as today | It's the strongest LinkedIn and Indeed pattern and cuts clicks. At large text the panes get too narrow, so we fall back. Focus moves to the job heading in the pane and the selection is in the address, so Back works. *Cut:* if Saturday runs short, keep the separate page with the new layout |
| Q3 | **Does this replace the remaining R3 work** in UI_REVAMP_PLAN (pills, centred logo, colourful tiles)? | **Yes for the look; no for the tasks.** The R3 wording fixes, the 3-step Create account and the admin Suspend / Reactivate row actions still happen, in the new style | The look changes; the agreed functionality doesn't |
| Q4 | **The pill buttons** | **8 px rounded buttons** everywhere except the Home hero | Pills plus big type are most of the "iPad" feel. Indeed uses 8 px; LinkedIn uses pills but with small, dense type |
| Q5 | **The centred logo in the header** | **Move the logo to the left**, with the role links after it and the account and bell on the right | Every job site in the references does this. A centred logo splits the links into two groups, which reads as an app, not a work tool |
| Q6 | **Onboarding: a checklist, or a pop-up tour?** | **A checklist card plus a help page** (§3.7) | Coach-mark tours trap focus, cover content at 200 % zoom and are hard with NVDA. A checklist is ordinary page content and does the same job |
| Q7 | **Charts: library or hand-drawn?** | **Hand-drawn SVG**, two components (§3.6) | We need only bars and lines; a library adds about 100 kB to a bundle already over 500 kB and is hard to make high-contrast and text-scale aware |
| Q8 | **Who sees the job seeker's photo?** | **Only the job seeker, by default.** A switch "Show my photo to employers I apply to" is off unless they turn it on | OpenDoor exists to reduce bias against PWD applicants. A photo can reveal a disability or other personal details, and RA 10173 treats it as personal data. The papers' "What employers see" box must be updated to match |
| Q9 | **What's wrong with "My applications"?** The note just says "my applications" | **Rebuild it as the job tracker in §3.5** (status tabs with counts, cards with the next step) unless you meant something else | The current page is a table with a Show filter; the tracker answers "what happens next?", which LinkedIn's Job tracker is built around |
| Q10 | **Which page is the "candidate page"** that needs decluttering: the job seeker's dashboard, or the employer's Applicant review page? | **The job seeker's dashboard** (§3.5), and give the Applicant page the same card treatment in Wave A since it's a test task | The dashboard has five tiles and three cards stacked on top of each other |
| Q11 | **Pay on job postings** (Indeed puts it first) | **Not now.** Record it as future work | It needs a migration, form fields and new validation rules, and the papers never ask for it |
| Q12 | **"Not interested" (thumbs down) and Save** | **Leave both out** | Saved jobs was already left out in UI_REVAMP Q1; hiding jobs needs a table. Neither fixes a problem on our list |
| Q13 | **"Menu 2×"**: we read it as "the account items need a second click (Account page → tab)". Is that what you meant? | **One account menu** (§3.2) and **Compact menu in one click** | If it meant something else (for example the Text size panel), tell us which and it moves into Wave A |

---

## 5. Order of work and what gets cut first

| Part | Work | Time |
|---|---|---|
| **A1 Formal tokens** | §3.1 tokens, Button, Card, header layout; contrast test; component tests | Sat, ~2.5 h |
| **A2 Navigation** | BackLink on every detail page, account menu, compact Menu in one click | Sat, ~1.5 h |
| **A3 Filters** | Backend params and tests; chip bar; All filters dialog; named active filters | Sat, ~2.5 h |
| **A4 Job page** | New block order, About the company, trust score chip and `<details>`, card labels, two panes (Q2) | Sat, ~2.5 h |
| **A5 Check and ship** | `php artisan test`, `npm test`, lint, build; 360 px, 200 % zoom, 200 % text, high contrast, keyboard; GSD UI review; deploy | Sat evening, ~1.5 h |
| **B1 Job seeker** | Photo, headline, Open to (migration); dashboard layout; job tracker | After the tests, ~4 h |
| **B2 Charts** | Two chart components; employer and admin aggregate endpoints with tests | ~4 h |
| **B3 Onboarding** | Checklist cards; `/help` page | ~2 h |
| **B4 Mascot** | Walk-in on Log in and Create account; running loader | ~2 h |

**Wave A cut order** (last cut first): the two panes (keep separate pages) → the sticky mini-header → the Closing soon and New labels. **Never cut:** the back links, the work setup and employment type filters, named chips, About the company, and the trust score emphasis.

**Wave B cut order:** mascot loader → mascot walk-in → admin charts → onboarding help page. Whatever isn't built goes into the paper's future work.

---

## 6. How we'll know it's done

| # | Check |
|---|---|
| F1 | Each problem P1–P18 is either fixed or listed as deferred, with the reason, in this file |
| F2 | Every detail page has a Back link at the top that returns to the list with its filters |
| F3 | Find jobs filters by work setup and employment type (API tests included), and every active filter is named on its chip and in the result count line |
| F4 | The job page shows About the job and About the company; the trust score is on every job card and in the job heading, and its explanation is closed by default |
| F5 | The account menu and compact Menu open in one click and close with Escape, which returns focus to the button |
| F6 | The contrast test passes in both themes; every page works at 360 px, 200 % zoom and 200 % text without sideways scrolling |
| F7 | Every chart has a written takeaway and a table view, and doesn't depend on colour alone |
| F8 | The mascot is hidden from screen readers, still with Reduce motion, and gone in Quiet mode; loading text is still announced |
| F9 | No link leads to an unbuilt feature (UI_REVAMP U9) |

---

## 7. Wave A: what was built (2026-10-16)

| Part | Done | Notes |
|---|---|---|
| A1 Formal tokens | Yes | Page canvas `--od-surface-canvas` (in the contrast test), 8 px corners, 48 px buttons and fields, H1 28 px, H2 20 px; header with the logo on the left and the current page underlined |
| A2 Navigation | Yes | `ui/BackLink` on every detail page, keeping the list's filters (`lib/backState.js`); the duplicate bottom links are gone. Account menu (name, email, Profile, Display settings, Change password, Help and contact, Log out); the compact Menu lists all of it in one click. Admin's Feedback and Data moved to the left |
| A3 Filters | Yes | API `work_setup[]` and `employment_type[]` with tests; `jobs/FilterChips` (Matches my needs toggle, Work setup, Employment type, Category, Accommodations dialog, Sort, Clear all); "Showing: Remote, Full-time" under the count; `AccommodationFilterPanel` removed |
| A4 Job page | Mostly | Employer block with logo or initials and the trust badge; Apply first in the side column; Accommodations provided, Job details (icons), About the job, **About the company** (API adds `industry`, `address`, `description` on the job page only); trust card with a large score and "How is this score worked out?" folded; job cards with logo, New / Closing soon labels (`posted_on` added to the API) and the trust badge |
| A4 Two panes (Q2) | Yes | `hooks/useTwoPanes` (1024 px and wider, text at 125 % or less, full menu); `jobs/JobPreview` beside the list, the chosen job in `?job=` (Back returns to the previous one; filters close it); focus moves to the job's heading; a link opens the full page |
| A4 Sticky mini-header | Yes | `jobs/StickyApplyBar` on the job page: the title and Apply once the heading scrolls away; off at 150 % text; adds scroll padding so focus isn't hidden under it |
| A5 Checks | Yes | 427 backend and 569 frontend tests, lint and build pass; checked in the browser at 1280 px and 375 px (no sideways scrolling), the filter chips, Back with filters, the account menu and the compact Menu |

Not yet checked: 200 % zoom, 200 % text, high contrast and keyboard-only on the new chips and menus. These belong to the October 18 audit.

### Added on request: the display settings bar folds away (2026-10-16)

On screens with a mouse, the bar with Text size, High contrast, Quiet mode and Compact menu folds into a thin line ("Text size, contrast and more") until pointed at, like a hidden taskbar, and opens over the header so the page doesn't jump. It also opens whenever anything in it has keyboard focus, so the skip link and every button stay reachable by Tab and by screen readers. **Keep open** (in the bar, or Account → Display → Display settings bar) pins it; phones and tablets always show it. The setting is saved in the browser with the other display settings (`bar: auto | pinned`, `data-bar` on `<html>`).
