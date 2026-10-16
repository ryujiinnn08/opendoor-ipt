import { Link, useLocation } from 'react-router-dom'
import { backState } from '../../lib/backState.js'
import { JOB_STATE_TEXT, nextStepText } from '../../lib/applicationText.js'
import { formatDate, sinceText } from '../../lib/format.js'
import FeedbackStatus from '../feedback/FeedbackStatus.jsx'
import EmployerMark from '../jobs/EmployerMark.jsx'
import ApplicationActions from './ApplicationActions.jsx'
import ApplicationStatusBadge from './ApplicationStatusBadge.jsx'

/**
 * One of the job seeker's applications as a card in the job tracker (papers' ApplicationRow,
 * UI_FEEDBACK_WAVE_B_PLAN B2): the employer's mark, the job title opening the application page,
 * the status, when it was sent and last changed, and the next-step sentence.
 * The list decides where focus goes after a change (the row may have left the filter).
 */
export default function ApplicationRow({ application, onChanged, onStale, focusAfter }) {
  const location = useLocation()
  const rowId = `application-${application.id}`
  const { job } = application

  return (
    <li id={rowId} className="flex gap-4 border-b border-border bg-surface p-5 last:border-b-0 sm:p-6">
      <EmployerMark employer={job.employer} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div>
            <h3 className="font-display text-lg font-semibold">
              <Link
                to={`/candidate/applications/${application.id}`}
                state={backState(location)}
                className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline"
              >
                {job.title}
              </Link>
            </h3>
            <p>{job.employer.name}</p>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          Applied {formatDate(application.applied_at)}
          {application.updated_at && <> · Updated {sinceText(application.updated_at)}</>}
        </p>
        <p className="mt-2 max-w-prose">{nextStepText(application)}</p>
        <FeedbackStatus application={application} className="mt-2 max-w-prose" />
        {/* A closed job matters only while the application waits; a removed one always. */}
        {(job.state === 'removed' || (job.state === 'not_open' && ['pending', 'reviewed'].includes(application.status))) && (
          <p className="mt-1 text-muted">{JOB_STATE_TEXT[job.state]}</p>
        )}
        <ApplicationActions application={application} onChanged={onChanged} onStale={onStale} focusAfter={focusAfter} />
      </div>
    </li>
  )
}
