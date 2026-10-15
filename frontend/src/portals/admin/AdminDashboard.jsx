import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminDashboard } from '../../api/admin.js'
import { useAuth } from '../../auth/authContext.js'
import Button from '../../components/ui/Button.jsx'
import DashboardTile from '../../components/ui/DashboardTile.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

// What waits for an administrator, as sentences (plan PHASE_6 §4.3, §7).
const QUEUES = [
  {
    key: 'companies_waiting_for_verification',
    text: (count) => `${plural(count, 'company', 'companies')} to verify`,
    none: 'Nothing waiting for verification',
    to: '/admin/employers',
    link: 'Review companies',
  },
  {
    key: 'postings_waiting_for_approval',
    text: (count) => `${plural(count, 'posting', 'postings')} to approve`,
    none: 'Nothing waiting for approval',
    to: '/admin/job-postings',
    link: 'Review postings',
  },
  {
    key: 'feedback_comments_last_7_days',
    text: (count) => `${plural(count, 'feedback comment', 'feedback comments')} this week`,
    none: 'Nothing waiting in feedback',
    to: '/admin/feedback',
    link: 'Open feedback',
  },
]

/**
 * The admin dashboard (plan PHASE_6 §4.3, F8.3): what's waiting first, then OpenDoor in numbers,
 * then the shared lists and settings.
 */
export default function AdminDashboard() {
  const { user } = useAuth()
  const [counts, setCounts] = useState(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    getAdminDashboard()
      .then((data) => {
        setCounts(data)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name}`}
        documentTitle="Admin dashboard"
        intro="Keep OpenDoor trustworthy and its shared lists up to date."
      />
      {failed && (
        <Notice tone="error" className="mt-6">
          <p>We couldn't load the numbers on this page.</p>
          <Button variant="link" onClick={load}>
            Try again
          </Button>
        </Notice>
      )}
      {!counts && !failed && <LoadingMessage>Loading what's waiting…</LoadingMessage>}

      {counts && (
        <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-2">
          <section aria-labelledby="waiting-heading">
            <h2 id="waiting-heading" className="text-2xl font-bold">
              Waiting for you
            </h2>
            <ul className="mt-3">
              {QUEUES.map((queue) => {
                const count = counts[queue.key]
                return (
                  <li
                    key={queue.key}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border py-3 first:border-t"
                  >
                    <p className={count > 0 ? 'text-lg font-bold' : 'text-muted'}>{count > 0 ? queue.text(count) : queue.none}</p>
                    <Link to={queue.to} className={TEXT_LINK}>
                      {queue.link}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-labelledby="numbers-heading">
            <h2 id="numbers-heading" className="text-2xl font-bold">
              OpenDoor in numbers
            </h2>
            <dl className="mt-3">
              <NumberRow label="Job seekers" value={counts.job_seekers} />
              {/* Employers are companies and individuals; their accounts include HR officers (review WR-09). */}
              <NumberRow
                label="Employers"
                value={counts.companies + counts.individual_employers}
                detail={`${plural(counts.companies, 'company', 'companies')}, ${plural(counts.individual_employers, 'individual', 'individuals')}`}
              />
              <NumberRow label="Employer accounts" value={counts.employer_accounts} detail="owners and HR officers" />
              <NumberRow label="Administrators" value={counts.administrators} />
              <NumberRow
                label="Suspended accounts"
                value={counts.suspended_accounts}
                link={counts.suspended_accounts > 0 ? { to: '/admin/users?status=suspended', text: 'See who' } : null}
              />
              <NumberRow label="Open jobs" value={counts.open_jobs} />
              <NumberRow label="Applications" value={counts.applications} />
              <NumberRow label="Hires" value={counts.hires} />
              <NumberRow label="Employers with a trust score" value={counts.employers_with_trust_score} />
            </dl>
          </section>
        </div>
      )}

      <section aria-labelledby="lists-heading" className="mt-12">
        <h2 id="lists-heading" className="text-2xl font-bold">
          Shared lists and settings
        </h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DashboardTile title="Categories" count={counts?.categories ?? '–'} to="/admin/categories" linkLabel="Manage categories">
            Job categories used for browsing and filtering.
          </DashboardTile>
          <DashboardTile
            title="Accommodation types"
            count={counts?.active_accommodations ?? '–'}
            to="/admin/accommodations"
            linkLabel="Manage accommodation types"
          >
            Active accommodation types used in profiles, postings and filters.
          </DashboardTile>
          <DashboardTile
            title="HR officers per department"
            count={counts?.hr_per_department_cap ?? '–'}
            to="/admin/settings"
            linkLabel="Change in settings"
          >
            The most HR officers any company department can have.
          </DashboardTile>
        </ul>
      </section>
    </>
  )
}

/** One ruled row: the label, then the number in a column of its own (on phones too). */
function NumberRow({ label, value, detail, link }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] items-baseline gap-x-4 border-b border-border py-2 first:border-t sm:grid-cols-[14rem_1fr]">
      <dt>{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {detail && <span className="text-muted">({detail})</span>}
        {link && (
          <Link to={link.to} className={TEXT_LINK}>
            {link.text}
          </Link>
        )}
      </dd>
    </div>
  )
}
