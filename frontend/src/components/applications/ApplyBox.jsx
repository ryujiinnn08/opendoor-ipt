import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/authContext.js'
import { formatDate } from '../../lib/format.js'
import { PRIMARY_LINK, TEXT_LINK } from '../ui/buttonLinkStyles.js'

/**
 * The Apply area on a job page (plan PHASE_4 §4.1), first in its side column (UI_FEEDBACK_PLAN §3.4).
 * Guests log in and come back to the Apply page; a job seeker who applied is sent to their
 * application; employers and admins are told who applies.
 */
export default function ApplyBox({ job }) {
  const { role } = useAuth()
  const applyPath = `/candidate/jobs/${job.id}/apply`
  const applied = job.my_application

  return (
    <section aria-labelledby="apply-heading" className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <h2 id="apply-heading" className="text-2xl font-bold">
        Apply
      </h2>
      {!applied && job.accepting_applications === false && <p className="mt-3">This job has reached its hiring or application limit.</p>}
      {!role && job.accepting_applications !== false && (
        <>
          <Link to={`/login?next=${encodeURIComponent(applyPath)}`} className={`mt-3 ${PRIMARY_LINK}`}>
            Log in to apply
          </Link>
          <p className="mt-3">
            New here?{' '}
            <Link to="/register" className={TEXT_LINK}>
              Register as a job seeker
            </Link>
          </p>
        </>
      )}
      {role === 'candidate' && applied && (
        <>
          <p className="mt-2">{`You applied on ${formatDate(applied.applied_at)}. Status: ${applied.status_label}.`}</p>
          <Link to={`/candidate/applications/${applied.id}`} className={`mt-1 ${TEXT_LINK}`}>
            View your application
          </Link>
        </>
      )}
      {role === 'candidate' && !applied && job.accepting_applications !== false && (
        <Link data-tour-record="apply" to={applyPath} className={`mt-3 ${PRIMARY_LINK}`}>
          Apply for this job
        </Link>
      )}
      {role && role !== 'candidate' && <p className="mt-2 text-muted">Job seekers apply from this page.</p>}
    </section>
  )
}
