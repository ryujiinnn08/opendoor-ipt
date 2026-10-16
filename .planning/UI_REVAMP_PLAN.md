# UI Revamp Plan: the violet OpenDoor design

> Status: **APPROVED** (2026-10-16: "The recommendations are OK"), with Log in, Create account and Page not found centred (§5.1). **R1 Foundations done** (2026-10-16): tokens with a contrast test, self-hosted fonts, Lucide icons, and every component in §4.2 except the header and footer (R2).
> Part of: [PHASE_7_PLAN.md](PHASE_7_PLAN.md). It slots in **after 7A (go live, done) and before 7B (the accessibility audit)**, because the audit and the usability tests have to run on the interface we defend.
> Sources: the design set in `~/Downloads/OpenDoor - Integ Ver/` (00 Design foundations, 01 Guest, 02 Job seeker, 03 Employer, 04 Administrator, 05 Shared and states) and the Figma file [OpenDoor — SIA UI](https://www.figma.com/design/qWZDnximz7Tc47qu0WXSG5/) (page "Foundations & Components": colour variables, type styles, 38 icons and the components). The 98-page `OpenDoor-UI-Reference.pdf` was **not read** (see Q16); the design set says it was built from it and checked against the running system on October 12.
> Method: GSD and Frontend Design only. After approval, build in the order of §6; GSD UI review (`gsd-ui-review`) and the test suite before deploying.

---

## 0. Where we are

**Built and live:** every feature from Phases 1–6, on `opendoor-ipt.ruzgal.org` since 7A. 428 page tests pass. The interface is the Phase 2 look: dark purple `#5b21b6`, Atkinson Hyperlegible only, square-ish buttons, a two-row header with a portal name ("Candidate portal") and a tab bar, PNG icons, and a black-and-yellow high-contrast theme that has no switch yet.

**The new design** keeps every page, field and rule but changes the look and the frame around it: a soft violet palette with orange, pink and sky accents; Lexend headings; pill buttons; a utility bar (Text size, High contrast, Quiet mode, Compact menu) on every page; links on both sides of a centred logo; stat tiles with colour icon tiles; job cards with an icon tile; long forms split into steps.

**Why now.** The papers say the audit and the SUS tests run on the deployed system (§XII-B, §XII-C). If the revamp lands after them, the audit report and the SUS score describe an interface we no longer show. It also changes markup on every page, so it must land **before** the axe and Lighthouse pass, not during it.

**Time.** Defense Oct 21–25; tests Oct 19–20 can't move (participants are booked). The revamp therefore has about **a day and a half**, and the audit shrinks from two days to one (Q2):

| When (2026) | Work | Done when |
|---|---|---|
| Fri Oct 16 (rest of day) | **R1 Foundations** and **R2 Frame** (§6) | Tokens, fonts, icons and every shared component in the new style; the new header, utility bar and footer on every page; tests pass |
| Sat Oct 17 | **R3 Pages** by role, then **R4** extras if time allows | Every page matches its design frame (or §5's note for it); tests pass; deployed Sat evening |
| Sun Oct 18 | **7B Accessibility audit**, one day, on the revamped site | As PHASE_7 §5 |
| Mon Oct 19 – Tue Oct 20 | **7C Usability tests** (unchanged) | As PHASE_7 §5 |

---

## 1. What the design asks for

### 1.1 Foundations (00 Design foundations, Figma variables)

| Area | Design | Today |
|---|---|---|
| Colour | Text `#241B3A`, muted `#4E4568`, primary `#6A4C9C`, primary dark `#47306F`, tint `#EBE3F7`, current page `#DCCFF1`, subtle surface `#F5F1FC`, card border `#DDD5EE`, input border `#6F5F94`; status danger/success/warning/info with their own backgrounds; accents orange `#FDBA5A`, pink `#F8B5D1`, sky `#9ADFF0`, lilac `#D4C4EF` (decoration only) | One purple `#5b21b6`, page background `#f8f7fb`, one border colour for cards and inputs, no warning tone |
| High contrast | The same light theme, darker: text `#000`, muted `#1E1B2E`, primary `#3B2466`, borders `#000` (Figma lists every pair under `[data-contrast="high"]`) | Black background with yellow (`data-theme="high-contrast"`), no switch in the interface |
| Type | **Lexend** for headings, buttons and numbers (H1 34/42, H2 22/30, H3 18/26, stat 38/44, score 56/64, display 60/68); **Atkinson Hyperlegible** for body (18/26 reading, 16/22 hints and the smallest size), lines at most about 70 characters | Atkinson only, 17 px base, from Google Fonts |
| Text size | Standard 100 %, Large 125 %, Extra large 150 % | Standard and one large size (`data-text="large"`), no switch |
| Shape | 8 px grid; radius 12 / 16 / 20 / pill; buttons are pills at least 44 px tall (MD 52, SM 44) | `rounded-md` everywhere, 44 px buttons |
| Focus | A dark ring with a white gap | A 3 px blue outline |
| Icons | Lucide, 24 px, 2 px stroke; 38 named icons in Figma | PNG icons in `src/assets/icons/` |
| Decoration | Sparkles and the orange arrow pill; `aria-hidden`, gone in Quiet mode | None |

### 1.2 The frame on every page (05 Shared, pages 4–5)

- **Utility bar** above the header: "Skip to main content" on the left; **Text size**, **High contrast**, **Quiet mode** and **Compact menu** (or "Show all links") on the right.
- **Header**: role links left of a centred logo, account links right of it. The current page is a tinted pill with a border.
  - Guest: Home, Find jobs · Log in, Create account.
  - Job seeker: Dashboard, Find jobs, Applications, Saved jobs · Profile, Notifications (count), Account (initials), Log out.
  - Employer: Dashboard, Job postings, Company, Trust score · Notifications (count), Account, Log out.
  - Administrator: Dashboard, Employers, Postings, Users · Reports, Feedback, Data, Account, Log out.
  - **Compact**: the logo and one **Menu** button that opens a short list with icons; Escape closes it. On a phone (390 px) the header is always compact.
- **Footer**: Privacy, Accessibility statement, Contact us, on every page.

### 1.3 Shared components (00 page 4, Figma "Components")

Figma maps one component to one code component: `Button(style, size, icon)`, `Badge(tone)`, `Alert(tone)`, `Field(Input/Select/Textarea)`, `Checkbox`, `Radio`, `Tag`, `IconTile`, `NavItem`, `Header(role)`, `Footer`, `StatTile`, `JobCard`, `Pagination`. Badges are always icon + word + colour. Alerts are announced without moving focus. Dialogs: confirm, reason, form, voice notice (05 page 7). States: error summary, load error with a reference, warning, loading, empty with "Clear filters", success (05 page 8).

### 1.4 The screens (01–05)

36 frames: 7 guest, 8 job seeker, 7 employer, 8 administrator, 6 shared. §5 maps each one to the page that exists today.

---

## 2. The gap: what the design shows that the system doesn't do

Most of the design is a new look for pages we already have. Some frames show features that **don't exist in the system** (they were "Could-haves" the papers and PHASE_7 Q13 left out, or new ideas from the design). These need a decision (Q1), because building them means new API endpoints, migrations and tests days before the audit.

| Feature in the design | Where | What it would take | Kind |
|---|---|---|---|
| New palette, fonts, shapes, icons, focus ring | Everywhere | Tokens and shared components | **Look** |
| Utility bar, header with centred logo, compact menu, footer on every page | Every page | Layouts, a small display-settings provider | **Look + small front-end feature** |
| Text size 100/125/150 %, high contrast, reduced motion, quiet mode switches | Utility bar, Account → Display | The provider and attributes on `<html>`; saving to the account needs a column and an endpoint (Q5) | **Front-end** (or **backend**, Q5) |
| Create account in 3 steps; Post a new job in 4 steps | 3.6, 5.4 | Splitting two long forms; same fields and API | **Front-end** |
| Profile and needs as one page with tabs | 4.2 | Tabs linking the existing Needs, Profile and Résumé pages | **Front-end** |
| Master data: categories and accommodation types on one page | 6.8 | Both existing pages side by side | **Front-end** |
| Read this job / application aloud | 3.3, 4.4, 4.6 | Browser `speechSynthesis`; nothing leaves the device | **Front-end** |
| Speak (voice typing) and the "Before you speak" notice | 3.2, 4.4, 4.7, 8.5 | Browser speech recognition (Chrome and Edge send audio to Google or Microsoft) | **Front-end, privacy risk** |
| Apply form on the job page | 4.4 | Moving the Apply page into the job page's side column | **Front-end** |
| **Saved jobs** (save, list, remove, undo) | 4.4, 4.8 | Table, 3 endpoints, tests | **Backend** |
| **Report this job** and the admin **Reports** queue | 4.4, 6.1, 6.6 | Table, 4 endpoints, notifications, tests | **Backend** |
| **Business registry check** (Active, registered name, name match) | 6.3 | An external registry we have no access to | **Backend + outside service** |
| **Email notifications** tab | 7.2 / "9 Planned" | An email service (PHASE_7 Q13 left it out) | **Backend + outside service** |
| **Workplace Accessibility Snapshot** | 3.3, 4.4 | Not specified anywhere | **Unknown** |
| **Forgot your password?** | Figma notes | An email service | **Backend + outside service** |
| Distances ("427 m away"), OpenStreetMap and PSGC footer credit | 00 page 5, Figma notes | Location data we don't store | **Backend** |

---

## 3. Questions for you

| # | Question | Recommendation | Why |
|---|---|---|---|
| Q1 | **How much of the design to build before the audit** | **The look, the frame and the front-end features** (§2 rows marked Look and Front-end, minus Speak, Q7). **Leave out every backend feature**: saved jobs, reports, the registry check, email notifications, the accessibility snapshot, forgot password and distances. They go into the paper as future work, and their frames stay in the design appendix marked "Planned" | A day and a half is enough to restyle 46 routes and add the frame, not to build, test and secure new features. A half-built feature in front of a test participant is worse than none. *Alternative:* also build **Saved jobs** (about 3 hours with tests; the most visible one in the job seeker's design) if R3 finishes early on Saturday |
| Q2 | **The schedule** | **Revamp Fri Oct 16 – Sat Oct 17, deploy Saturday evening; audit on Sun Oct 18 only; tests unchanged** | The tests can't move and must run on the final interface. The audit loses a day, but the revamp keeps the Phase 2–6 accessibility patterns (skip link, focus on the heading, error summary, announcer), and vitest-axe runs on every component during the build, so Sunday has less to find. *Alternative:* skip the revamp until after the defense (the paper then shows the design as "proposed") |
| Q3 | **Page addresses** | **Keep today's URLs** (`/employer/job-postings`, `/admin/categories`, `/candidate/needs`…). The design's addresses (`/employer/jobs`, `/admin/master-data`, `/account`) are only labels on the frames | Notifications already stored in the database link to today's URLs; the tests and the README use them. Where the design merges pages (Q4) the old addresses stay and become tabs |
| Q4 | **The menus** | **Use the design's menus, adapted to what exists:** Job seeker: Dashboard, Find jobs, Applications · Profile, Notifications, Account, Log out (no Saved jobs, Q1). "Profile" opens a page with three tabs: Accommodations you need (`/candidate/needs`), About you (`/candidate/profile`), Résumé (`/candidate/profile/resume`). Employer: Dashboard, Job postings, Company, **Team** (owners only; the design forgot it), Trust score · Notifications, Account, Log out; HR members and individual employers keep their shorter menus. Admin: Dashboard, Employers, Postings, Users · Feedback, Data, Account, Log out (no Reports, Q1); "Data" is categories and accommodation types side by side; **Settings** becomes a tab of Data | Fewer, plainer links, as the design wants, without hiding anything that works today. "Account" opens Account with Display and Password tabs (`/account/password` stays) |
| Q5 | **Where display settings are saved** (text size, contrast, motion, quiet, compact menu) | **In the browser (`localStorage`)**, applied before the first paint so the page doesn't flash, and the wording says "saved on this device" instead of "saved to your account" | No migration, endpoint or tests on the server, and it works for guests too (the utility bar is on public pages). Display settings aren't personal data, so a shared computer (PHASE_7 Q20) only keeps someone's text size. *Alternative:* save to the account (a `display_settings` column, `PATCH /api/me/display`, about 2 hours), as the design's wording says |
| Q6 | **What the utility bar buttons do** | **Text size** cycles Standard → Large → Extra large → Standard and announces the new size; **High contrast**, **Quiet mode** and **Compact menu** are toggle buttons (`aria-pressed`). Reduced motion follows the operating system and can be set on Account → Display | One click each, as the design says ("one click away at the top of every page"), and each says its state to screen readers |
| Q7 | **Read aloud and Speak** | **Build Read aloud** (job page, application page): browser `speechSynthesis`, shown only if the browser supports it, never starts by itself, with a Stop button. **Leave out Speak** (voice typing) and its notice | Read aloud keeps everything on the device. Speak sends the voice to Google or Microsoft (RA 10173 consent), works only in Chrome and Edge, and can clash with NVDA during the tests. Both are extras beyond the papers |
| Q8 | **Steps for the long forms** | **Create account in 3 steps** (Your role · Your details · Privacy and consent) and **Post a new job in 4 steps** (Job basics · Description · Accommodations · Review), each step checked before Next, the error summary per step, the progress bar with "Step 2 of 4 · Description" as text, and **Save as draft** on every step of the job form. Same fields, same API calls | Registering is the first test task for job seekers and posting a job for employers, so the shorter steps help where it counts. *Cut order:* if Saturday runs short, Post a new job stays one page in the new style |
| Q9 | **Apply on the job page** | **Keep the separate Apply page** (`/candidate/jobs/:id/apply`). The job page's side column gets the design's "Apply for this job" card with the trust score above it and one button that opens the Apply page | The Apply page already shows "What employers see", the needs that are missing and the interview request, with tests. Moving the form into a side column squeezes it at 150 % text |
| Q10 | **Tables on a phone** (My applications, Applicants, Job postings, Users, Master data) | **Each row becomes a small card below 640 px** (the column names become labels), instead of a table that scrolls sideways | Works at 360 px and 200 % zoom without sideways scrolling (WCAG 1.4.10), and keeps reading order for screen readers |
| Q11 | **When the full header doesn't fit** | **Switch to the compact header automatically** when the links don't fit on one line (below about 1100 px at standard text, wider at 125 % and 150 %), whatever the Compact menu setting says | At Large and Extra large text the centred-logo header wraps into three lines. The design already does this at phone width |
| Q12 | **Icons** | **`lucide-react`** (the set the Figma file uses), imported one by one so only the 30 or so icons we use are bundled; the PNG icons are removed | Same icons as the design, crisp at 150 % text and in high contrast (they take the text colour), and smaller than the PNGs |
| Q13 | **Fonts** | **Serve Lexend and Atkinson Hyperlegible from the website** (`@fontsource/lexend`, `@fontsource/atkinson-hyperlegible`, only the weights used: 400 and 700 for Atkinson, 600 and 700 for Lexend) | Closes PHASE_7 Q19 at the same time (no visitor IPs sent to Google, a tighter Content-Security-Policy) |
| Q14 | **Wording** | **Use the design's words where they differ:** "Job seeker" for "Candidate", "Create account" for "Register", "Find jobs" for "Browse jobs", "Not selected", "Waiting for approval", each page's one plain sentence under the heading. No "Candidate portal" label in the header | The design's wording is plainer and was checked against the system; it matches the papers' "job seeker". Tests that look for the old words are updated with the page |
| Q15 | **Unbuilt features in the interface** | **Don't show them at all** in the live site: no "Planned" badges, no Saved jobs link, no Report button, no Email notifications tab, no registry check button | A test participant who finds a dead end records an error that isn't about the system we're testing |
| Q16 | **The 98-page UI Reference PDF** | **Not needed for the build**: the six design files and the Figma file cover every screen and component. If you want me to read it anyway, it needs `poppler` (`brew install poppler`) to turn its pages into images | The design set was built from it and checked against the system; reading it costs time we don't have |

---

## 4. What's decided (if the recommendations stand)

### 4.1 Tokens

`frontend/src/styles/tokens.css` takes the Figma variable names (Figma: "Variables use Web code syntax, e.g. `brand/primary` → `var(--od-brand-primary)`"). The Tailwind names in `index.css` stay where they can, so most class names in the pages don't change; only their colours do.

| Tailwind name (kept) | New variable | Standard | High contrast |
|---|---|---|---|
| `bg` | `--od-surface-page` | `#FFFFFF` | `#FFFFFF` |
| `surface` | `--od-surface-page` | `#FFFFFF` | `#FFFFFF` |
| `subtle` *(new)* | `--od-surface-subtle` | `#F5F1FC` | `#FFFFFF` |
| `primary-soft` | `--od-surface-tint` | `#EBE3F7` | `#EBE3F7` |
| `current` *(new)* | `--od-surface-current` | `#DCCFF1` | `#DCCFF1` |
| `text` | `--od-text-default` | `#241B3A` | `#000000` |
| `muted` | `--od-text-muted` | `#4E4568` | `#1E1B2E` |
| `accent` | `--od-text-accent` | `#47306F` | `#2A1850` |
| `primary` | `--od-brand-primary` | `#6A4C9C` | `#3B2466` |
| `primary-hover` | `--od-brand-primary-dark` | `#47306F` | `#2A1850` |
| `on-primary` | `--od-text-on-primary` | `#FFFFFF` | `#FFFFFF` |
| `border` | `--od-border-subtle` (cards, dividers) | `#DDD5EE` | `#241B3A` |
| `input` *(new)* | `--od-border-input` (fields, outline buttons; 3:1) | `#6F5F94` | `#000000` |
| `focus` *(new)* | `--od-border-focus` | `#241B3A` | `#000000` |
| `success` / `success-soft` | `--od-status-success` / `-bg` | `#116329` / `#EEF8F0` | `#0B4A1D` / `#FFFFFF` |
| `danger` / `danger-soft` | `--od-status-danger` / `-bg` | `#B42318` / `#FEF1F1` | `#8A1209` / `#FFFFFF` |
| `warning` / `warning-soft` *(new)* | `--od-status-warning` / `-bg` | `#7A4300` / `#FFF6E1` | `#5A3100` / `#FFFFFF` |
| `info` / `info-soft` *(new)* | `--od-status-info` / `-bg` | `#47306F` / `#F5F1FC` | `#2A1850` / `#FFFFFF` |
| `neutral-soft` | `--od-surface-tint` | `#EBE3F7` | `#EBE3F7` |
| `orange`, `pink`, `sky`, `lilac` *(new)* | `--od-accent-*` | `#FDBA5A`, `#F8B5D1`, `#9ADFF0`, `#D4C4EF` | same |

- Switches on `<html>`: `data-contrast="high"` (replaces `data-theme="high-contrast"`), `data-text="large|xlarge"`, `data-motion="reduce"`, `data-quiet`, `data-menu="compact"`.
- `html { font-size }` is 100 %, 125 % or 150 %; every size is in `rem`, so everything scales together. Body text is 1.125 rem (18 px), hints 1 rem (16 px), nothing smaller.
- The focus ring: `outline: 3px solid var(--od-border-focus); outline-offset: 2px; box-shadow: 0 0 0 2px #fff` (the white gap), on every focusable element.
- Every pair is checked with a small contrast test (`tokens.test.js`) that fails the build if any text pair drops below 4.5:1 or a border below 3:1, in both themes.
- The print styles stay (black on white).

### 4.2 Components

| Figma component | Code | Change |
|---|---|---|
| Button (Primary, Secondary, Danger, Danger outline, Link; MD, SM; optional icon and the orange arrow) | `ui/Button.jsx`, `ui/buttonLinkStyles.js` | Pills, Lexend SemiBold, MD 52 px and SM 44 px; new `danger-outline` variant; `icon` prop; the arrow pill only on the hero and "Create account" (decoration, `aria-hidden`, gone in Quiet mode). "Saving…" labels and `aria-disabled` kept |
| Badge (Success, Danger, Warning, Info, Neutral) | `ui/StatusBadge.jsx` and the badges built on it (`ApplicationStatusBadge`, `PostingStatusBadge`, `VerificationBadge`, `MatchBadge`) | Pill with a Lucide icon (check, x, alert-triangle, circle, minus) + word + colour; one `tone` prop |
| Alert (four tones) | `ui/Notice.jsx`, `ui/ErrorSummary.jsx` | Rounded 16, 2 px border in the tone colour, icon on the left, bold title |
| Field: Input, Select, Textarea | `ui/FormField.jsx`, `SelectField.jsx`, `PasswordField.jsx`, `fieldStyles.js` | 52 px tall, radius 12, `input` border; hint and error between the label and the field (already so); error border in danger |
| Checkbox, Radio | `ui/CheckboxField.jsx`, `ui/RadioCardGroup.jsx` | 26 px custom boxes drawn over the real input (still native, still keyboard-operable) |
| Tag | new `ui/Tag.jsx` | Tint pill for accommodations; "+1 more" |
| IconTile (Orange, Pink, Sky, Lilac; MD 44, LG 80) | new `ui/IconTile.jsx` | Decorative, `aria-hidden`; plain tint in Quiet mode |
| StatTile | `ui/DashboardTile.jsx` | Icon tile, the number in Lexend 38, label, "View" link |
| JobCard | `jobs/JobCard.jsx` | Icon tile left, title as a Lexend link, employer and verified badge, meta line, match badge, tags, trust score and closing date line |
| NavItem, Header(role), Footer | `layout/*` (§4.3) | New |
| Pagination | `ui/Pagination.jsx` | Restyled; "Page 1 of 1" kept |
| Dialogs | `ui/Modal.jsx`, `ConfirmDialog.jsx`, `ReasonDialog.jsx` | Radius 20, violet backdrop, buttons right-aligned, danger dialogs start on Cancel (already so) |
| Icon | `ui/Icon.jsx`, `ui/iconImages.js` | Lucide instead of PNGs (Q12); same names where they exist |

### 4.3 The frame

- `components/layout/UtilityBar.jsx` (new): skip link and the four buttons (Q6).
- `components/layout/SiteHeader.jsx` (new) replaces the two headers in `PublicLayout` and `PortalLayout`: left links, centred `BrandLink`, right links; current page pill with `aria-current="page"`; notification count as a red pill with the number in words for screen readers ("Notifications, 2 unread"); account initials. Compact mode: logo and a **Menu** disclosure button (`aria-expanded`) opening a list with icons; Escape and a click outside close it and return focus to the button.
- `portalMenus.js` gets the left/right split and the icons (Q4).
- `display/DisplaySettingsProvider.jsx` (new): reads and writes `localStorage` (Q5), sets the attributes on `<html>`; a tiny inline script in `index.html` applies them before React loads.
- `SiteFooter.jsx`: Privacy, Accessibility statement, Contact us, on every page (it is already on every page).
- Landmarks stay: skip link first, then the header (banner), `main` with `id="main"`, footer.


### 4.4 Motion and the text size slider (your change, 2026-10-16)

You asked for a smoother, more polished feel. Motion stays short and soft, and **Reduce motion turns all of it off** (the system setting or Account → Display; transitions also lose their delays).

| Where | What moves | Timing |
|---|---|---|
| Every new page | The page content rises 12 px and fades in (keyed on the address, so filters and searches don't replay it) | 420 ms, soft ease-out |
| High contrast, Quiet mode | Colours cross-fade instead of flashing; a class on `<html>` only for the moment of the switch | 450 ms |
| Text size, compact Menu | The panel fades and settles from just above; closing is quicker; menu items arrive one after another; the Menu bars turn into a cross | 220–320 ms open, 160 ms close, 28 ms per item |
| Full ↔ compact header | The header fades into its new form | 240 ms |
| Dialogs | The backdrop fades; the dialog rises and scales up slightly, and leaves faster | 320 ms in, 180 ms out |
| Buttons, links, nav pills | Colours ease; buttons press in slightly; the orange arrow nudges toward where it points | 200–300 ms |
| Job cards | The border warms to lilac with a soft shadow on hover | 300 ms |
| Alerts and the error summary | Settle in from just above when they appear | 220 ms |

**Text size is now a slider** (replacing three clicks of one button): 100 % to 200 % in 5 % steps, the page resizing live as it moves, with **Smaller** and **Larger** buttons for people who find dragging hard, and Standard (100 %), Large (125 %) and Extra large (150 %) as quick picks. It opens from **Text size** in the utility bar and sits at the top of Account → Display. The setting is stored as a number; sizes saved under the old names still load. 200 % is the WCAG 1.4.4 resize target.

---

## 5. Page by page

Every page also gets the design's page head: one H1 and one plain sentence under it. "Same" means the content stays and only the shared components change it.

| Design frame | Page today | What changes |
|---|---|---|
| 3.1 Home | `public/HomePage` | Hero with the highlighted "how you work", Browse jobs and Create an account, four category tiles (Physical access, Communication, Work setup, Assistive tech) linking to Find jobs filtered by that group, "How it works" with worded links ("Set your needs", "Browse jobs", "How trust scores work"); sparkles hidden in Quiet mode |
| 3.2 Find jobs (guest), 4.3 (job seeker) | `public/BrowseJobsPage`, `candidate/FindJobsPage` | Filter panel on the left (tinted card): Matches my needs (job seeker), Keyword, Category, Sort by, the accommodation filter as a disclosure; results count; job cards; "Clear filters" in the empty state; results still update as you type |
| 3.3, 4.4 Job details | `public/JobPage` | Two columns: Details and Accommodations offered cards on the left; Trust score card and the "Interested?" (guest) or "Apply for this job" (job seeker, Q9) card on the right; match badge and "Not mentioned in this posting" notice; Read aloud (Q7). No Save, Report or Snapshot (Q1) |
| 3.4 Employer page | `public/EmployerPage` | Trust score card with the per-accommodation table on the left, open jobs on the right |
| 3.5 Log in | `public/LoginPage` | **Centred** (a change from the frame, §5.1): the heading, its sentence and the card form in one column in the middle of the page; "Show password" already in `PasswordField`; no "Forgot your password?" (Q1) |
| 3.6 Create account | `public/RegisterPage` | **Centred** (§5.1): the heading, the step label, the progress bar and each step's fields in one column in the middle; 3 steps (Q8) |
| 3.7 Page not found | `public/NotFoundPage` | **Centred** (§5.1): the heading, the sentence and "Go to the home page" in the middle of the page |
| — Privacy, Accessibility, Join | `PrivacyPage`, `AccessibilityPage`, `JoinPage`, `InfoPage` | Same; the accessibility statement adds the display settings |
| 4.1 Job seeker dashboard | `candidate/CandidateDashboard` | Five stat tiles (Submitted, Reviewed, Hired, Not selected, Withdrawn); "Jobs for you" card; "Ratings to give" card; "Your needs" summary with a change link |
| 4.2 Profile and needs | `candidate/NeedsPage`, `ProfilePage`, `ResumePage` | One page head with three tab links (Q4); needs in a two-column grouped checklist with "3 selected." and Save |
| 4.5 My applications | `candidate/MyApplicationsPage` | Show filter, count, table (cards on a phone, Q10), pagination |
| 4.6 Application details | `candidate/ApplicationPage` | Details card; the existing status steps (`ApplicationPath`) restyled as the design's timeline; I was hired and Withdraw application; Read aloud |
| 4.7 Rate your accommodations | `candidate/FeedbackPage` | One card per accommodation with three radios; comments |
| — Apply | `candidate/ApplyPage` | Same content, new style |
| 4.8 Saved jobs | — | **Not built** (Q1) |
| 5.1 Employer dashboard | `employer/EmployerDashboard` | Postings tiles (Draft, Waiting for approval, Open, Closed) with View links; Applications received tiles; trust score card; a notice when a job waits for approval |
| 5.2 Company profile | `employer/CompanyPage` | Verified notice; two-column form; "More details: about the company and logo" disclosure |
| 5.3 Job postings | `employer/JobPostingsPage` | Show filter, count, "Post a new job", table with status badges, applicants count link, Close/Edit/Delete |
| 5.4 Post a new job | `employer/JobPostingFormPage` | 4 steps (Q8); the warning "List only what you really provide" |
| 5.5 Applicants | `employer/ApplicantsPage` | Back link, filter, table |
| 5.6 Application review | `employer/ApplicantPage` | Status badge and line; interview request as a warning notice; needs as success/warning badges ("offered in your posting", "not listed in your posting"); About the applicant; Mark as hired, Not selected |
| 5.7 Trust score | `employer/TrustScorePage` | Score card, "How it works" info notice, per-accommodation table, tip |
| — Setup, Team, My profile, Preview | `SetupPage`, `TeamPage`, `IndividualProfilePage`, `JobPostingPreviewPage` | No frame in the design: new components and page head only |
| 6.1 Administration | `admin/AdminDashboard` | "Waiting for you" queue tiles (building, clipboard icons; no reports tile), Users tiles, "Verification after hire" tiles |
| 6.2 Employers | `admin/EmployerVerificationPage` | Show filter, search, table |
| 6.3 Employer verification | (inside `EmployerVerificationPage` today) | Company card and Approve / Do not approve; **no registry check** (Q1) |
| 6.4 Postings | `admin/PostingApprovalsPage`, `PostingReviewPage` | Cards with badges, "Description and accommodations" disclosure, Approve / Do not approve / Remove |
| 6.5 Users | `admin/UsersPage`, `UserPage`, `AddAdminPage` | Role filter, search, table with status badges and Suspend / Reactivate, "This is you" |
| 6.6 Reports | — | **Not built** (Q1) |
| 6.7 Feedback | `admin/FeedbackModerationPage` | Info notice; response cards with rating tags and the quote; Hide response |
| 6.8 Master data | `admin/CategoriesPage`, `AccommodationsPage`, `SettingsPage` | "Data" with tabs: Categories and accommodation types side by side (Q4), Settings |
| 7.1 Notifications | `account/NotificationsPage` | Unread count, Mark all as read, cards with a "New" badge |
| 7.2 Account → Display | new `account/DisplayPage` (`/account/display`) | Text size, Colours, Motion, Decoration, Top menu radios; applied at once and announced |
| — Account → Password | `account/ChangePasswordPage` | Second tab of Account |
| 9 Email notifications | — | **Not built** (Q1, Q15) |
| 8.1–8.5 Dialogs and states | `ui/*` | §4.2; the voice notice is not built (Q7) |

### 5.1 Centred pages (your change, 2026-10-16)

The design puts Log in (3.5), Create account (3.6) and Page not found (3.7) against the left edge with empty space on the right. These three are **centred** instead:

- **One centred column**: `mx-auto` with a reading width (about 480 px for Log in and Page not found, about 640 px for Create account, whose radio cards and consent box need more room). At 360 px the column is simply the page width.
- **Heading and sentence centred** above the column (`text-center`), so the page reads as one block in the middle.
- **Inside the forms, everything stays left-aligned**: labels, hints, errors, fields, radio cards, the consent checkbox and the step label. Centred form text is harder to scan and moves the label away from where the field starts, especially at 150 % text and with screen magnifiers.
- **Buttons**: Log in stays full width inside its card; Create account's Back / Next / Create account sit together at the left of the column, as in the frame; Page not found's button is centred under the sentence.
- Nothing else moves: one H1, focus on the heading after the page opens, the error summary at the top of the column.

Other pages keep the design's layout.

---

## 6. Order of work and what gets cut first

| Part | Work | Time |
|---|---|---|
| **R1 Foundations** | Tokens and the contrast test (§4.1); fonts (Q13); `lucide-react` and `Icon` (Q12); every component in §4.2; vitest-axe and the component tests updated | Fri, ~4 h |
| **R2 Frame** | Display settings provider and the pre-paint script; utility bar; header (full, compact, auto-compact, Menu); footer; menus (Q4); Account with Display and Password tabs | Fri evening, ~3 h |
| **R3 Pages** | §5, by role: guest → job seeker → employer → admin → shared, so the test tasks are done first; Register steps with the guest pages; page tests updated as each page is done | Sat, ~7 h |
| **R4 Extras** | Post a new job in steps; Read aloud; tables as cards on a phone | Sat, what's left |
| **R5 Check and ship** | `npm test`, `npm run lint`, `npm run build`; manual pass at 360 px, 200 % zoom, 150 % text, high contrast, keyboard only; GSD UI review; deploy; smoke test the live site | Sat evening, ~1.5 h |

**Cut order** if Saturday runs short (last cut first): Read aloud → Post a new job in steps (stays one page, new style) → tables as phone cards (they scroll sideways inside their own region instead) → home page category tiles. R1, R2, the test-task pages (Register, Find jobs, Job, Apply, Application, Feedback; Post a job, Applicants, Applicant review) and R5 are never cut.

**Freeze:** after Saturday's deploy, only audit fixes and PHASE_7 Q12 critical fixes until after the tests.

---

## 7. How we'll know it's done

| # | Check |
|---|---|
| U1 | Every page in §5 (except the "Not built" rows) matches its design frame at 1280 px, or the difference is written in §5; Log in, Create account and Page not found are centred as in §5.1 |
| U2 | All page and component tests pass, including vitest-axe; lint and build pass; the bundle grows by less than 60 kB (fonts excluded) |
| U3 | The contrast test passes for both themes: text ≥ 4.5:1, borders and focus ring ≥ 3:1 |
| U4 | Each page works at 360 px wide, at 200 % browser zoom and at Extra large text without sideways scrolling (tables excepted only if R4's cards are cut) |
| U5 | The utility bar's four buttons work by keyboard, say their state, and survive a reload; the settings apply before the first paint (no flash) |
| U6 | The compact menu opens and closes by keyboard, Escape returns focus to Menu, and the header switches to compact when it doesn't fit |
| U7 | Quiet mode removes sparkles, the arrow pills and the colour tiles; reduced motion removes all animation |
| U8 | Status is never colour alone: every badge has an icon and a word |
| U9 | No link, button or menu item leads to an unbuilt feature (Q15) |
| U10 | The live site passes the PHASE_7 7A smoke test again after the deploy |

---

## 8. Not in the revamp

- Saved jobs, Report this job, the Reports queue, the business registry check, email notifications, forgot password, the Workplace Accessibility Snapshot, distances and maps (Q1): future work in the paper.
- Speak (voice typing) and its notice (Q7).
- Display settings saved to the account (Q5), unless chosen.
- Any change to the API, the database or the rules.
