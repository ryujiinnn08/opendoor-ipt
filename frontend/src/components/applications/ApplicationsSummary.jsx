import { Link, useLocation } from 'react-router-dom'
import { nextStepText } from '../../lib/applicationText.js'
import { backState } from '../../lib/backState.js'
import { RATE_ACTION } from '../../lib/feedbackText.js'
import { sinceText } from '../../lib/format.js'
import EmployerMark from '../jobs/EmployerMark.jsx'
import IconTile from '../ui/IconTile.jsx'
import { PRIMARY_LINK, TEXT_LINK, buttonClasses } from '../ui/buttonLinkStyles.js'
import ApplicationStatusBadge from './ApplicationStatusBadge.jsx'

const GROUPS = [
  { key: 'waiting', label: 'Waiting for a reply', icon: 'clock', tone: 'sky' },
  { key: 'hired', label: 'Hired', icon: 'check', tone: 'orange' },
  { key: 'closed', label: 'Closed', hint: 'Not selected or withdrawn', icon: 'minus', tone: 'lilac' },
]

/**
 * My applications on the job seeker's dashboard (UI_FEEDBACK_WAVE_B_PLAN B2): first what needs
 * them (accommodations to rate), then the counts as links to the filtered list, then the three
 * most recently changed applications with their next step. With none yet, it points to Find jobs.
 */
export default function ApplicationsSummary({ counts, recent = [], feedbackDue = [] }) {
  const location = useLocation()

  return (
    <section aria-labelledby="my-applications-heading" className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="my-applications-heading" className="text-2xl font-bold">
          My applications
        </h2>
        {counts.all > 0 && (
          <Link to="/candidate/applications" className={TEXT_LINK}>
            See all {counts.all}
          </Link>
        )}
      </div>

      {feedbackDue.length > 0 && (
        <section aria-labelledby="feedback-due-heading" className="mt-4 rounded-lg border border-warning bg-warning-soft p-4">
          <h3 id="feedback-due-heading" className="font-bold text-warning">
            Feedback due
          </h3>
          <ul className="mt-2 grid gap-3">
            {feedbackDue.map((item) => (
              <li key={item.application_id} className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-prose">
                  Rate how {item.employer_name} delivered the accommodations for {item.job_title}.
                </p>
                <Link
                  to={`/candidate/applications/${item.application_id}/feedback`}
                  aria-label={`${RATE_ACTION} for ${item.job_title}`}
                  className={buttonClasses('primary', 'sm')}
                >
                  {RATE_ACTION}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {counts.all === 0 ? (
        <div className="mt-3">
          <p>You haven&apos;t applied for any jobs yet.</p>
          <Link to="/candidate/jobs" className={`mt-3 ${PRIMARY_LINK}`}>
            Find jobs
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {GROUPS.map((group) => (
              <li key={group.key}>
                <Link
                  to={`/candidate/applications?status=${group.key}`}
                  className="flex h-full items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-200 ease-soft hover:border-primary hover:bg-subtle"
                >
                  <IconTile icon={group.icon} tone={group.tone} />
                  <span className="min-w-0">
                    <span className="block font-display text-title font-bold text-text">{counts[group.key]}</span>{' '}
                    <span className="block font-bold text-primary">{group.label}</span>
                    {group.hint && <> <span className="block text-sm text-muted">{group.hint}</span></>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {recent.length > 0 && (
            <>
              <h3 className="mt-6 font-bold">Latest updates</h3>
              <ul className="mt-2 divide-y divide-border">
                {recent.map((application) => (
                  <li key={application.id} className="flex gap-3 py-3">
                    <EmployerMark employer={application.job.employer} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3">
                        <Link
                          to={`/candidate/applications/${application.id}`}
                          state={backState(location)}
                          className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline"
                        >
                          {application.job.title}
                        </Link>
                        <ApplicationStatusBadge status={application.status} />
                      </div>
                      <p className="text-sm text-muted">
                        {application.job.employer.name} · Updated {sinceText(application.updated_at ?? application.applied_at)}
                      </p>
                      <p className="mt-1 text-sm">{nextStepText(application)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}
