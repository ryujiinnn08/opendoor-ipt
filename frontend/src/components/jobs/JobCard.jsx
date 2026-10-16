import { Link, useLocation } from 'react-router-dom'
import { backState } from '../../lib/backState.js'
import { formatDay } from '../../lib/format.js'
import { jobLabels, providesParts } from '../../lib/jobText.js'
import { EMPLOYMENT_TYPES, manilaToday, optionLabel, WORK_SETUPS } from '../../lib/postingOptions.js'
import TrustScoreChip from '../feedback/TrustScoreChip.jsx'
import Tag from '../ui/Tag.jsx'
import VerificationBadge from '../ui/VerificationBadge.jsx'
import EmployerMark from './EmployerMark.jsx'
import MatchBadge from './MatchBadge.jsx'

/** Joins short facts with a visible middle dot that screen readers hear as a comma. */
export function DotList({ items }) {
  return items.map((item, index) => (
    <span key={item}>
      {index > 0 && (
        <>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
        </>
      )}
      {item}
    </span>
  ))
}

/**
 * A job in a list (UI_FEEDBACK_PLAN §2–3, after Indeed and LinkedIn): the employer's logo, the
 * title as heading and link, the employer with its badge, a line of facts, the "New" and
 * "Closing soon" labels, the trust score as a badge, how it meets the job seeker's needs, and the
 * accommodations as tags. Rendered as an <li>, so put it in a <ul>. showEmployer={false} leaves
 * out the employer line where the page is already about that employer. With `onSelect` (Find jobs
 * in two panes), a plain click opens the job beside the list instead of on its own page; the
 * link still works for a new tab. `selected` marks the job that is open there.
 */
export default function JobCard({ job, to, showEmployer = true, onSelect, selected = false }) {
  const { employer } = job
  const location = useLocation()
  const { shown, more } = providesParts(job.accommodations ?? [])
  const facts = [optionLabel(WORK_SETUPS, job.work_setup), optionLabel(EMPLOYMENT_TYPES, job.employment_type), job.location].filter(Boolean)
  const labels = jobLabels(job, manilaToday())

  return (
    <li
      className={`flex gap-4 border-b border-border p-5 transition-colors duration-200 ease-soft first:rounded-t-lg last:rounded-b-lg last:border-b-0 sm:p-6 ${
        selected ? 'bg-subtle shadow-[inset_4px_0_0_var(--od-brand-primary)]' : 'bg-surface hover:bg-subtle'
      }`}
    >
      <EmployerMark employer={employer} />

      <div className="min-w-0 flex-1">
        {labels.length > 0 && (
          <ul aria-label="Labels" className="mb-1 flex flex-wrap gap-2">
            {labels.map((label) => (
              <li key={label} className={`rounded-md px-2 py-0.5 text-xs font-bold ${label === 'New' ? 'bg-info-soft text-accent' : 'bg-warning-soft text-warning'}`}>
                {label}
              </li>
            ))}
          </ul>
        )}
        <h3 className="font-display text-lg font-semibold">
          <Link
            to={to}
            state={backState(location)}
            aria-current={selected ? 'true' : undefined}
            onClick={(event) => {
              if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onSelect(job.id)
            }}
            className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:text-primary-hover hover:underline">
            {job.title}
          </Link>
        </h3>

        {showEmployer && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p>{employer.name}</p>
            {employer.type === 'company' && employer.is_verified && <VerificationBadge status="verified" />}
            {employer.type !== 'company' && <p className="text-sm text-muted">Individual employer</p>}
          </div>
        )}

        {facts.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            <DotList items={facts} />
          </p>
        )}

        {showEmployer && <TrustScoreChip employer={employer} className="mt-3" />}

        {job.match && <MatchBadge match={job.match} />}

        {shown.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No accommodations listed.</p>
        ) : (
          <ul aria-label="Accommodations offered" className="mt-3 flex flex-wrap gap-2">
            {shown.map(({ item }) => (
              <Tag key={item.id} as="li">
                {item.name}
              </Tag>
            ))}
            {more > 0 && (
              <Tag as="li">
                <span aria-hidden="true">+{more} more</span>
                <span className="sr-only">and {more} more</span>
              </Tag>
            )}
          </ul>
        )}

        {job.closes_on && <p className="mt-3 text-sm text-muted">Apply by {formatDay(job.closes_on)}</p>}
      </div>
    </li>
  )
}
