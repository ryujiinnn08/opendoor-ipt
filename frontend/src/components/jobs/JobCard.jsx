import { Link } from 'react-router-dom'
import { formatDay } from '../../lib/format.js'
import { providesParts } from '../../lib/jobText.js'
import { listFact } from '../../lib/trustScoreText.js'
import { EMPLOYMENT_TYPES, optionLabel, WORK_SETUPS } from '../../lib/postingOptions.js'
import AccommodationGroupIcon from '../postings/AccommodationGroupIcon.jsx'
import MatchBadge from './MatchBadge.jsx'
import Icon from '../ui/Icon.jsx'
import VerificationBadge from '../ui/VerificationBadge.jsx'

const INLINE_ICON = 'inline-block size-5 align-[-0.2em] text-accent'

/**
 * One open job as a ruled row (plan PHASE_3 §6.4): the title as heading and link, the employer
 * with its badge, labelled facts, and the accommodations it provides, each with its group icon.
 * Rendered as an <li>, so put it in a <ul>. showEmployer={false} leaves out the employer line
 * where the page is already about that employer.
 */
export default function JobCard({ job, to, showEmployer = true }) {
  const { employer } = job
  const { shown, more } = providesParts(job.accommodations ?? [])
  const facts = [
    ['Work setup', optionLabel(WORK_SETUPS, job.work_setup)],
    ['Employment type', optionLabel(EMPLOYMENT_TYPES, job.employment_type)],
    ['Location', job.location],
    ['Apply by', formatDay(job.closes_on)],
  ].filter(([, value]) => value)

  return (
    <li className="border-b border-border py-6 first:border-t">
      <h3 className="text-[1.3125rem] font-bold">
        <Link to={to} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 hover:no-underline">
          {job.title}
        </Link>
      </h3>

      {showEmployer && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="font-bold">{employer.name}</p>
          {employer.type === 'company' && employer.is_verified && <VerificationBadge status="verified" />}
          {employer.type !== 'company' && <p className="text-muted">Individual employer</p>}
        </div>
      )}

      {job.match && <MatchBadge match={job.match} />}

      {/* On phones each fact gets its own line (spec PHASE_3 §7). */}
      <ul className="mt-2 flex flex-col gap-y-1 text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
        {facts.map(([label, value]) => (
          <li key={label}>{`${label}: ${value}`}</li>
        ))}
        {/* The employer's accommodation trust score (Phase 5, Q6); not repeated on its own page. */}
        {showEmployer && <li>{listFact(employer)}</li>}
      </ul>

      {shown.length === 0 ? (
        <p className="mt-3 text-muted">No accommodations listed.</p>
      ) : (
        <p className="mt-3 max-w-prose">
          <Icon name="check" className={`${INLINE_ICON} mr-1`} />
          Provides{' '}
          {shown.map(({ item, before }) => {
            // The icon stays with the first word; the rest of a long name may wrap.
            const [firstWord, ...rest] = item.name.split(' ')
            return (
              <span key={item.id}>
                {before}
                <span className="whitespace-nowrap">
                  <AccommodationGroupIcon group={item.group_name} className={`${INLINE_ICON} mr-1`} />
                  {firstWord}
                </span>
                {rest.length > 0 && ` ${rest.join(' ')}`}
              </span>
            )
          })}
          {more > 0 && ` and ${more} more`}
        </p>
      )}
    </li>
  )
}
