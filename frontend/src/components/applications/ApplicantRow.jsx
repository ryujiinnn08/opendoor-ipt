import { Link, useLocation } from 'react-router-dom'
import { backState } from '../../lib/backState.js'
import { formatDate } from '../../lib/format.js'
import { employerMatchText, missingText } from '../../lib/matchText.js'
import Icon from '../ui/Icon.jsx'
import ApplicationStatusBadge from './ApplicationStatusBadge.jsx'

/**
 * One applicant as a ruled row on the Applicants page (papers' ApplicationRow, employer side):
 * name (opens the applicant page), headline, status, applied date, how the job meets their needs
 * and whether they asked for an interview accommodation. No photos (plan PHASE_4 §7).
 */
export default function ApplicantRow({ applicant }) {
  const location = useLocation()
  const { match } = applicant
  const missing = match ? missingText(match.missing) : null

  return (
    <li id={`applicant-${applicant.id}`} className="border-b border-border py-6 first:border-t">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h3 className="text-xl font-bold">
            <Link
              to={`/employer/applications/${applicant.id}`}
              state={backState(location)}
              className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 hover:no-underline"
            >
              {applicant.applicant.name}
            </Link>
          </h3>
          {applicant.applicant.headline && <p>{applicant.applicant.headline}</p>}
        </div>
        <ApplicationStatusBadge status={applicant.status} />
      </div>
      <p className="mt-2 text-muted">Applied {formatDate(applicant.applied_at)}</p>
      {match && (
        <div className="mt-2">
          <p className="font-bold">{employerMatchText(match)}</p>
          {missing && (
            <p className="flex items-center gap-2 text-muted">
              <Icon name="circle" className="size-4" />
              {missing}
            </p>
          )}
        </div>
      )}
      {applicant.has_interview_request && (
        <p className="mt-2 flex items-center gap-2">
          <Icon name="chat" className="size-5" />
          Asked for an interview accommodation
        </p>
      )}
    </li>
  )
}
