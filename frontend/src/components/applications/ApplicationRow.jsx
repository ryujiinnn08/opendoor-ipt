import { Link } from 'react-router-dom'
import { APPLICATION_STATUSES, JOB_STATE_TEXT } from '../../lib/applicationText.js'
import { formatDate } from '../../lib/format.js'
import ApplicationActions from './ApplicationActions.jsx'
import ApplicationStatusBadge from './ApplicationStatusBadge.jsx'

/**
 * One of the job seeker's applications as a ruled row (papers' ApplicationRow): the job title
 * opens the application page; the status, the applied date and the next-step sentence follow.
 * The list decides where focus goes after a change (the row may have left the filter).
 */
export default function ApplicationRow({ application, onChanged, onStale, focusAfter }) {
  const rowId = `application-${application.id}`
  const { job } = application

  return (
    <li id={rowId} className="border-b border-border py-6 first:border-t">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h3 className="text-xl font-bold">
            <Link
              to={`/candidate/applications/${application.id}`}
              className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 hover:no-underline"
            >
              {job.title}
            </Link>
          </h3>
          <p>{job.employer.name}</p>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>
      <p className="mt-2 text-muted">Applied {formatDate(application.applied_at)}</p>
      <p className="mt-1 max-w-prose">{APPLICATION_STATUSES[application.status]?.next}</p>
      {/* A closed job matters only while the application waits; a removed one always. */}
      {(job.state === 'removed' || (job.state === 'not_open' && ['pending', 'reviewed'].includes(application.status))) && (
        <p className="mt-1 text-muted">{JOB_STATE_TEXT[job.state]}</p>
      )}
      <ApplicationActions
        application={application}
        onChanged={onChanged}
        onStale={onStale}
        focusAfter={focusAfter}
      />
    </li>
  )
}
