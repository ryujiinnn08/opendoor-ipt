# Plan: Email Verification

> Status: **BUILT locally, not deployed** (2026-10-16). A Could-have from Phase 7 (PHASE_7_PLAN Q13). D1 built as recommended (**gated**); see §8 for what differs from the steps below and what is left.
> Part of: [CONCEPT_PLAN.md](CONCEPT_PLAN.md), after build phase 7
> Builds on: [PHASE_7_PLAN.md](PHASE_7_PLAN.md) (the live site on Railway, Cloudflare and `ruzgal.org`)
> Nothing secret is written in this file. The Resend API key lives only in Railway.

---

## 0. Where we are

**Already true in the code (checked 2026-10-16):**
- `backend/app/Models/User.php` already casts `email_verified_at`, and the `MustVerifyEmail` import is commented out. The users table is Laravel's default one, so **no new migration is expected** (this matters because Phase 7 freezes schema changes from Oct 19).
- `AuthController::register` creates the user, logs them in and the React register page sends them straight to their dashboard. That flow stays.
- `UserSeeder::createAccount` does **not** set `email_verified_at`, and `UserResource` does not expose it.
- No mail package is installed, and `MAIL_MAILER` defaults to `log`.
- Routes live in `backend/routes/api.php` in `auth:sanctum` groups with the `active` and `password.changed` middleware.

**Already done outside the code:**
- Resend account created, `ruzgal.org` added (Tokyo region) and the DNS records added in Cloudflare through Resend's auto-configure (`send`, `rsend` CNAMEs and the `resend._domainkey` TXT, all DNS only). Status was **Pending** and should become **Verified**; check it before building.
- Railway variables added to the `opendoor-ipt` service: `MAIL_MAILER=resend`, `RESEND_API_KEY` (hidden), `MAIL_FROM_ADDRESS=no-reply@ruzgal.org`, `MAIL_FROM_NAME=OpenDoor`. **Do not click Deploy until the code is pushed.**

---

## 1. Decisions

| # | Question | Recommendation | Why |
|---|---|---|---|
| D1 | **What can an unverified user do?** (built: **gated**; to switch to soft, remove the two `verified` middleware entries in `routes/api.php`) | **Gated:** browse, log in and edit the profile; but **no applying and no posting a job** until verified. *Alternative, soft:* banner and email only, nothing blocked | Gated is the real feature and touches two routes only. Soft costs less and does not disturb the usability tests |
| D2 | Email service | **Resend** (HTTP API), sender `no-reply@ruzgal.org` | Free plan (checked on resend.com/pricing, 2026-10-16): 3,000 emails a month, 100 a day, 3 domains. Railway likely blocks outbound SMTP on trial/Hobby plans (recheck its docs), so an HTTP API provider is the safe choice |
| D3 | The link | A **signed API link** that verifies the account and **redirects to the website** (`/?verified=1`) | No token handling or new page in React, nothing new for the accessibility audit, works in any browser without needing a session |
| D4 | When | **After the defense** (listed as future work), or **before Oct 17** if the panel expects it. **Not between Oct 17 and Oct 20** | The audit is Oct 17–18 and the usability tests Oct 19–20. Changing sign-up mid-study makes sessions incomparable |

---

## 2. Backend steps

1. `composer require resend/resend-php` (Laravel 12 has a built-in `resend` mailer). Confirm `config/mail.php` has the `resend` entry and reads `RESEND_API_KEY`.
2. `User` implements `MustVerifyEmail`.
3. `AuthController::register`: fire `event(new Registered($user))` so the verification email is sent. The user is still logged in as today.
4. Routes (inside the right groups):
   - `GET /email/verify/{id}/{hash}` with `signed` middleware, **no auth required**. It finds the user, checks the hash, marks the email verified (`markEmailAsVerified()`), and redirects to `FRONTEND_URL` + `/?verified=1`. Invalid or expired links redirect to `/?verified=0`.
   - `POST /email/verification-notification` (auth, `throttle:6,1`): resend.
5. Customize the notification (`VerifyEmail::createUrlUsing`) so the link uses the API's public address, and set the email's wording to plain, short language (the app serves PWD users).
6. `UserResource`: add `email_verified` (boolean).
7. **Gate (if D1 = gated):** add the `verified` middleware to
   - `POST job-postings/{id}/applications` (candidate apply, around line 97 of `routes/api.php`)
   - `POST employer/job-postings` (employer post, around line 126)
   Confirm the exact status and message Laravel returns for JSON requests (expect 403 with "Your email address is not verified."), and make the frontend handle it.
8. `UserSeeder::createAccount`: set `email_verified_at` for the seeded admin and demo accounts.
9. `.env.example`: add the four mail variable names with placeholders and a comment each.

## 3. Frontend steps

1. `AuthProvider` / user object: read `email_verified`.
2. A **banner** component (shown in the public and portal layouts while `email_verified` is false): "Please verify your email. We sent a link to <email>." with a **Resend** button, a visible success or error message, `role="status"` so screen readers announce it, and keyboard focus handling. Keep contrast and focus outlines to the Phase 7B audit standard.
3. On `/?verified=1`, show a short success message once (dismissible); on `?verified=0`, show how to resend.
4. Apply and Post buttons: if the API returns the not-verified error, show a clear message with the Resend action instead of a generic failure.
5. Register page: after sign-up, add a line that the email was sent. Do not change the redirect.

## 4. Production steps (one time)

- Mark the existing seeded accounts as verified so nobody is locked out: in Railway's service **Console**, run `php artisan tinker`, then update `email_verified_at` for the admin and the demo accounts (`*@opendoor.test`) **only**.
- Check the Resend domain shows **Verified** and the API key has **sending access** only.
- Then click **Deploy** in Railway (after the code is on `main`).

## 5. Tests

- Backend feature tests: register sends the notification (`Notification::fake()`); the signed link verifies and redirects; a tampered or expired link does not verify; resend is throttled; (gated) an unverified user gets the error on apply and post while a verified one does not; `email_verified` appears in `UserResource`.
- Most existing tests use the user factory, which already sets verified, so they should keep passing. Run the whole server suite (394 at last count) and page suite (428) before pushing.
- Frontend tests: the banner shows only when unverified, Resend calls the API, the verified message appears, and the Apply and Post error is shown.
- Manual check on the live site with a real inbox: register, receive the email, click the link, return to the site, apply or post.

## 6. Risks and notes

- **100 emails a day** is the free plan's cap. A live demo with many sign-ups on one day could hit it.
- **Test participants** who register a fresh account need a real inbox to apply or post afterward (gated version). The prepared accounts (P1–P8, E1–E4) should be created as verified.
- **Screen reader users:** the email link and the banner are part of the sign-up flow, so include them in the accessibility audit and the NVDA script.
- **Spam folders:** a brand-new sending domain can land in spam at first. Tell participants to check it.
- The verification link depends on `APP_URL=https://opendoor-api.ruzgal.org` and trusted proxies (already `*`); a wrong `APP_URL` would produce invalid signed links.
- Resend's free-plan limits and Railway's SMTP policy were checked or recalled on 2026-10-16 and can change.

## 7. Done when

- [x] D1 decided (gated, the recommendation)
- [ ] Resend domain **Verified**
- [ ] Code on `main` (server 411 and page 528 tests passing locally; committed 2026-10-16, not pushed)
- [ ] Railway **Deployed** with the mail variables
- [ ] Seeded accounts marked verified in production
- [ ] A real registration on the live site delivers the email, the link verifies, and (gated) apply and post work afterward
- [ ] Accessibility checks of the banner and flow added to the audit report

## 8. Build notes (2026-10-16)

**Built as planned:** Resend package, `User implements MustVerifyEmail`, the signed link redirecting to `/?verified=1|0`, the resend endpoint (6 a minute), `email_verified` in `UserResource`, the `verified` gate on apply and on creating a posting, seeded accounts confirmed, `.env.example`, the banner in both layouts, the result message on Home, the Apply and Post refusals with a resend button, and a line on the Register page and in its announcement.

**Different from the steps, and why:**
- The email is sent directly instead of through `event(new Registered)`, inside a try/catch: a Resend outage logs the error and the account is still created (the person can ask for a new link). Asking again answers **503** if sending fails.
- The link is signed **without the host** (relative signature) and prefixed with `APP_URL`, so Cloudflare and Railway's proxy can't break it. The `signed` middleware isn't used, because it answers 403 JSON instead of redirecting to `/?verified=0`.
- Laravel's `verified` alias is replaced by `EnsureEmailIsVerified`, which adds `"code": "email_unverified"` (like `employer_profile_required`) so the website can show the resend button.
- The link works for **24 hours** (`config/auth.php`, `verification.expire`), not Laravel's 60 minutes, for people who read their email later.
- HR officers who join through an invite also get the email (invite links are shared by hand, so the address isn't proven).
- Administrators are never shown the reminder and aren't gated.
- Screen readers hear results through the app's one live region (`useAnnounce`), the codebase's pattern, instead of a second `role="status"` in the banner. A refused Apply moves focus to the message; a refused Post shows the error summary (focused) and the reminder.

**Still to do:** the production steps in §4 (mark existing seeded accounts verified with tinker, check Resend shows Verified, deploy), the live check with a real inbox, and the accessibility audit and NVDA script entries for the banner and the link. The sender address uses Laravel's default mail layout; its header links to `APP_URL` (the API), not the website.
