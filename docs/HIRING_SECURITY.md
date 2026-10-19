# Hiring security implementation

The API uses the existing Sanctum session authentication, CSRF protection, active-account checks, verified-email gates for applying/posting, and employer ownership policies. Company owners manage company postings; HR officers manage only their own department. Administrators retain moderation permissions and cannot hire applicants. Applicants can view their own status but cannot change it, including withdrawal and self-confirmation of hiring.

## Data integrity

- Company identity is `(LOWER(TRIM(name)), LOWER(TRIM(address)))`. Generated database columns enforce a unique pair for companies; individual employers receive NULL keys. Database collation determines additional Unicode/case/accent equivalence. Street abbreviations and internal whitespace are not treated as equivalent. The API checks registration and profile updates, and translates concurrent unique violations into a field error.
- Applications retain the unique `(job_posting_id, user_id)` constraint for all historical statuses. Duplicate requests return HTTP 409 with `You have already applied for this job. Please wait for confirmation.` and the applicant's existing application ID.
- Hiring slots default to 1; employers may set 1–1,000,000. Application limits are optional (NULL means unlimited), otherwise 1–1,000,000. All accepted submissions count toward the application limit, including rejected and historically withdrawn records.
- Counts are derived from applications, never accepted from client input. Capacity cannot be reduced below current totals. The UI displays counts, but only backend checks authorize an operation.
- Apply, review, hiring decisions, capacity changes, closing, reopening, approval and deletion lock the same parent posting first. Hiring also locks the application and checks its expected status. A final hire closes the posting with `closure_reason=slots_filled` in the same transaction. Existing applications can still be rejected after closure.
- Reaching the application limit stops new submissions without marking applicants hired or stopping decisions. Reopening/approval checks capacity. Editing a posting follows the existing approval workflow.
- Database constraints protect uniqueness, foreign keys, positive capacity and allowed statuses. These constraints do not authenticate web users or independently enforce the aggregate number of hires. All application writers must continue to use the locked workflow; direct database administration is a separate privilege.

## Audit history

`hiring_events` records submissions, review/hiring decisions, posting creation/edits, approval/rejection, closure/reopening, capacity snapshots and deletion/removal. Events commit with the business change; notifications run after commit. Authorized employers see the latest 100 application events on the applicant detail page. No application endpoint edits or deletes events. Historical rows carry `legacy_status_recorded`; a `requires_review` detail flags hires previously confirmed by an applicant or without employer provenance. Historical decisions are preserved, not relabeled as employer-approved.

Use a separate migration account and a restricted runtime database account in production. The runtime account needs SELECT/INSERT on hiring_events, not UPDATE/DELETE or schema privileges. Keep audit retention and backups under administrative control. Configure HTTPS, secure HttpOnly cookies, trusted Sanctum domains and CORS origins through the existing deployment configuration. Never expose database credentials to the frontend.

## Rollout

1. Back up the database, then use maintenance mode while deploying the backend and frontend together.
2. Resolve existing duplicate companies before migrating. The first migration stops without deleting or merging records if duplicate normalized identities exist. Locate them with:
   ```sql
   SELECT LOWER(TRIM(name)), LOWER(TRIM(address)), GROUP_CONCAT(id), COUNT(*)
   FROM employers WHERE type = 'company'
   GROUP BY LOWER(TRIM(name)), LOWER(TRIM(address)) HAVING COUNT(*) > 1;
   ```
3. Ensure existing company names/addresses are nonempty and application/posting statuses are valid. Run `php artisan migrate --force` from backend using the migration account.
4. Existing postings with hires receive slots equal to their existing hire count and become closed; postings without hires start with one slot. Employers must increase capacity and follow the normal approval workflow if more hires are needed. Application limits start unlimited. This conservative backfill never frees a slot based on an unverified historical hire.
5. Review historical applicant-confirmed hires using the audit details before relying on them as verified hiring decisions. Existing feedback and accommodation snapshots remain intact.
6. Exit maintenance mode after verifying a company registration, an application, and an employer decision.

The three security migrations were also applied to the configured local `opendoor` database on 2026-10-19 after a SQL backup. Production rollout remains separate. Rolling back schema does not restore posting statuses changed by the capacity backfill, and dropping the audit table loses its history. Use the backup for a full data rollback.

## Verification

- Default suites: `cd backend && php artisan test`; `cd frontend && npm test`; `npm run lint`; `npm run build`.
- Real concurrency test: create an empty, disposable MySQL database named `opendoor_security_test` (or that prefix). Set `APP_ENV=testing`, `DB_CONNECTION=mysql`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_URL=''`, and the connection host/port or `DB_SOCKET`. Run `php tests/Concurrency/run.php` from backend. It refuses other database names, recreates its tables, and uses two independent PHP processes blocked on the same posting lock to test duplicate applications, the final application place, and the final hiring slot.
- Use a MySQL version that enforces CHECK constraints (8.0.16+) with InnoDB. SQLite tests use equivalent triggers for checks because SQLite cannot add table CHECK constraints with ALTER TABLE. Validate deployment-specific collation and migration behavior on the production database version before rollout.
