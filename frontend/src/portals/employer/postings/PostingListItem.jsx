import { Link } from 'react-router-dom'
import PostingStatusBadge from '../../../components/postings/PostingStatusBadge.jsx'
import Button from '../../../components/ui/Button.jsx'
import { SECONDARY_LINK } from '../../../components/ui/buttonLinkStyles.js'
import { formatDate, formatDay } from '../../../lib/format.js'

const BUTTONS = [
  { action: 'change_closing_date', label: 'Change closing date' },
  { action: 'close', label: 'Close' },
  { action: 'reopen', label: 'Reopen' },
  { action: 'delete', label: 'Delete' },
]

/** "4 applicants, 2 new" linking to the posting's applicants, or plain "No applicants yet". */
function applicantsLink(posting) {
  const { total, new: fresh } = posting.applicants
  if (total === 0) return 'No applicants yet'
  const text = `${total === 1 ? '1 applicant' : `${total} applicants`}${fresh > 0 ? `, ${fresh} new` : ''}`

  // The spoken name starts with the visible words (WCAG 2.5.3), then names the posting.
  return (
    <Link
      to={`/employer/job-postings/${posting.id}/applicants`}
      className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 hover:no-underline"
    >
      {text}{' '}
      <span className="sr-only">for {posting.title}</span>
    </Link>
  )
}

/**
 * One posting in the Job postings list, as a ruled row (plan PHASE_2 §4.10). The buttons are
 * the posting's `actions`, which the server decides (decision 34). The title opens the preview.
 */
export default function PostingListItem({ posting, showDepartment, showCreator, onAction }) {
  const count = posting.accommodations.length
  const removal = posting.removal

  return (
    <li id={`posting-${posting.id}`} className="border-b border-border py-6 first:border-t">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <h3 className="text-xl font-bold">
          {removal ? (
            // A removed posting can't be opened, edited or reopened (plan PHASE_6 Q7).
            <span className="inline-flex min-h-11 items-center">{posting.title}</span>
          ) : (
            <Link to={`/employer/job-postings/${posting.id}`} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 hover:no-underline">
              {posting.title}
            </Link>
          )}
        </h3>
        <PostingStatusBadge status={removal ? 'removed' : posting.status} />
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-muted">
        {showDepartment && posting.department && <li>Department: {posting.department.name}</li>}
        {!removal && <li>{posting.closes_on ? `Closing date: ${formatDay(posting.closes_on)}` : 'No closing date yet'}</li>}
        <li>{count === 1 ? '1 accommodation' : `${count} accommodations`}</li>
        {showCreator && posting.created_by && <li>Created by {posting.created_by.name}</li>}
        {posting.applicants && <li>{applicantsLink(posting)}</li>}
      </ul>

      {removal && (
        <p className="mt-3 max-w-prose border-l-4 border-text pl-4">
          Removed by OpenDoor on {formatDate(removal.removed_at)}: {removal.reason}
        </p>
      )}
      {!removal && posting.status === 'rejected' && posting.rejection_reason && (
        <p className="mt-3 max-w-prose">
          <span className="font-bold">Reason it was rejected:</span> {posting.rejection_reason}
        </p>
      )}
      {!removal && posting.closed_automatically && (
        <p className="mt-3">The closing date passed on {formatDay(posting.closes_on)}. Reopen it to choose a new one.</p>
      )}

      {posting.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {posting.actions.includes('edit') && (
            <Link to={`/employer/job-postings/${posting.id}/edit`} aria-label={`Edit ${posting.title}`} className={SECONDARY_LINK}>
              Edit
            </Link>
          )}
          {BUTTONS.filter(({ action }) => posting.actions.includes(action)).map(({ action, label }) => (
            <Button
              key={action}
              variant="secondary"
              aria-label={`${label} ${posting.title}`}
              onClick={() => onAction(action, posting)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </li>
  )
}
