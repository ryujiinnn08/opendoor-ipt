# OpenDoor — What happens next

Updated: October 16, 2026 · All dates use Philippine time.

## Current position

The contact-email setup is complete **as reported by the project owner**. Cloudflare's routing rule was shown as Active:

`contact-opendoor@ruzgal.org` → the project's Gmail inbox

The website's contact links, local configuration and deployment documentation now use `contact-opendoor@ruzgal.org`. Railway's recipient setting is:

```env
CONTACT_TO_EMAIL=contact-opendoor@ruzgal.org
```

The audit's P1–P12 fixes are implemented locally. P13's recommended admin/employer page splitting is also implemented; the main JavaScript file is about 532 kB, and the build still warns that it exceeds 500 kB. See [the audit follow-up](AUDIT_2026-10-16.md#9-fix-follow-up--october-16-2026) for details.

Previously recorded checks: 421 backend tests and 551 frontend tests passed, plus frontend lint and the production build. These are results from the earlier fix pass, not checks performed while writing this handoff.

**The next development priority is the remaining R3 interface work, followed by a release check and the October 18 accessibility audit.** Email setup does not need to be repeated.

## 1. Confirm what is in the release

The working folder still contains modified files and new, untracked application files. The owner's email-setup completion report does not establish which application revision is deployed.

- [ ] Compare the deployed frontend and backend revisions with the intended audit/contact changes.
- [ ] Review and commit the intended application changes, including new contact-form files and regression tests, if they are not yet in the release branch.
- [ ] Include relevant documentation; keep local `.env` files and unrelated tool/skill folders out of the commit.
- [ ] Deploy any missing changes after the remaining release work is ready. Record the frontend and backend revision identifiers.

**Done when:** the deployed versions are known and the intended code is recoverable from version control.

## 2. Finish the remaining R3 interface work — October 16–17

Use [UI_REVAMP_PLAN.md](UI_REVAMP_PLAN.md), especially §5–7, as the design reference. Prioritize the screens participants will use.

- [ ] Make public job-board wording consistent: use **Find jobs** where the page and navigation refer to the same board.
- [ ] Replace job-seeker registration calls to action with **Create account**, keeping the correct registration type in the link.
- [ ] Use **Not selected** for rejected candidate applications on employer screens. Keep posting-approval rejection wording distinct; the application status stored by the API can remain unchanged.
- [ ] Finish the planned three-step Create account flow while preserving field values, validation, consent, keyboard focus and email-verification instructions.
- [ ] Review the main candidate journey: needs/profile → Find jobs → job details → Apply → Applications → feedback.
- [ ] Review the employer journey: posting → applicants → applicant review → decision.
- [ ] Finish the planned Suspend / Reactivate actions on admin user-list rows, preserving the existing confirmation, reason and permission rules.
- [ ] Check each completed page against its design frame and record any deliberate differences.

**Done when:** the required participant journeys match the agreed interface and their actions remain accessible.

## 3. Only then consider R4 extras — October 17

The revamp plan treats these as lower priority than the core flows and release checks:

- Post a job as a four-step form.
- Read aloud on the job and application pages.
- Tables displayed as cards on phones.
- Home-page category tiles, where still outstanding.

If time runs short, follow the plan's cut order: defer Read aloud first, then stepped job posting, then phone table cards, then category tiles. Record what is deferred so the presentation and documentation match the delivered system.

The remaining bundle-size warning is an optimization follow-up. The original “less than 60 kB growth” target cannot be certified without a comparable baseline; do not describe that target as passed.

## 4. Check and release — October 17 evening

- [ ] Run the relevant frontend/backend checks after the final implementation changes, plus frontend lint and the production build.
- [ ] Walk through the main pages at 360 px width, 200% browser zoom and enlarged text.
- [ ] Check keyboard navigation, visible focus, error summaries, compact-menu behavior, high contrast, Quiet mode and reduced motion.
- [ ] Check the home animation on a real phone for horizontal scrolling.
- [ ] Have the team review the published privacy and accessibility text; removing the draft label did not itself constitute team approval.
- [ ] Deploy the final frontend and backend release.
- [ ] Run the live checks **L1–L12** in [PHASE_7_PLAN.md §5](PHASE_7_PLAN.md#5-how-well-know-its-done), including session behavior, upload persistence, scheduled cleanup and production access protections.
- [ ] Include the updated contact links and form in the release check. Reuse any successful delivery evidence already obtained during setup; check again if the deployment changes mail behavior.
- [ ] Check a real email-verification journey: register, receive the link, confirm, return to the app and apply or post successfully.
- [ ] Record failures with their page, role, reproduction steps and resolution.

**Done when:** the final live release passes its checks and the release identifiers are recorded. After this release, follow the existing freeze: audit fixes and critical issues only until testing is complete.

## 5. Accessibility audit — October 18

The revised revamp schedule reserves October 18 for the accessibility audit.

- [ ] Complete the planned automated accessibility checks and explain any unresolved findings.
- [ ] Run the manual WCAG checklist, including keyboard-only use, contrast, zoom and screen-reader announcements.
- [ ] Complete the NVDA tasks on Windows, including registration/email verification and form errors.
- [ ] Fix failures and recheck the affected flows.
- [ ] Save an audit report with evidence, outcomes and any limitations.

Use PHASE_7's X1–X4 as the completion criteria. Automated test results alone do not establish that the manual accessibility audit is finished.

## 6. Prepare and run usability sessions — October 18–20

### Before sessions

- [ ] Prepare the consent material, task scripts, SUS questionnaire and anonymous results sheet.
- [ ] Confirm at least five PWD participants and three employer participants, as specified in PHASE_7.
- [ ] Assign a facilitator and note-taker for each session.
- [ ] Prepare accounts with the history required by the tasks: a hire eligible for feedback, and an employer with applicants to review.
- [ ] Implement or locate the planned `UsabilityTestSeeder` before relying on its command. No file with that name was found in `backend/database/seeders` when this handoff was written.
- [ ] Confirm prepared demonstration/test accounts have the intended verified-email state; fresh registration tasks must include access to a real inbox. Follow [EMAIL_VERIFICATION_PLAN.md §4](EMAIL_VERIFICATION_PLAN.md#4-production-steps-one-time) for the scoped production procedure.
- [ ] Back up the database before preparing production test data and before sessions begin.
- [ ] Run a complete practice session with a groupmate on October 19 morning.

### October 19–20

- [ ] Run the sessions on the final live interface and collect consent and SUS responses.
- [ ] Record task success, time, assistance required and usability problems using participant codes.
- [ ] Keep the planned schema freeze; make only critical fixes during the sessions and record any version changes.
- [ ] Calculate SUS results, summarize task outcomes and rank the observed problems.

**Done when:** PHASE_7 U1–U2 are met and the findings are written up.

## 7. Prepare the defense materials

- [ ] Update screenshots and feature descriptions to match the released interface.
- [ ] Include the accessibility findings, usability results and remaining limitations.
- [ ] Prepare the demo accounts and rehearse the complete demo.
- [ ] Assign a team member to monitor the contact inbox and respond to requests.
- [ ] Record future work separately: saved jobs, reports, forgot password, email notifications, analytics and other intentionally deferred features from the original audit.

## Suggested next work request

> Continue OpenDoor's remaining R3 interface work using UI_REVAMP_PLAN.md and NEXT_STEPS_2026-10-16.md. Start with consistent wording and the required participant journeys, then complete the planned registration steps and admin user-list actions. Preserve the audit fixes and contact-opendoor@ruzgal.org setup. Check the current code before assuming any listed item is still unfinished, and record deliberate deferrals before the October 18 audit.
