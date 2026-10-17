import { Link } from 'react-router-dom'
import { RATE_ACTION, opensOnText, sentText } from '../../lib/feedbackText.js'
import { PRIMARY_LINK } from '../ui/buttonLinkStyles.js'

/**
 * Where a hire's accommodation feedback stands (F7.6), for My applications and the application
 * page: the link to the form while it's open, the day it opens before then, the day it was sent
 * after. Nothing for other statuses or a job that listed no accommodations.
 */
export default function FeedbackStatus({ application, className = '' }) {
  const feedback = application.feedback

  if (feedback?.state === 'open') {
    return (
      <p className={className}>
        {/* The spoken name starts with the visible words, so voice control can say them. */}
        <Link data-tour-record="feedback" to={`/candidate/applications/${application.id}/feedback`} aria-label={`${RATE_ACTION} for ${application.job.title}`} className={PRIMARY_LINK}>
          {RATE_ACTION}
        </Link>
      </p>
    )
  }
  if (feedback?.state === 'not_yet') return <p className={className}>{opensOnText(feedback.opens_on)}</p>
  if (feedback?.state === 'sent') return <p className={className}>{sentText(feedback.sent_at)}</p>

  return null
}
