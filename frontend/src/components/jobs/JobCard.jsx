import { Link } from 'react-router-dom'
import { formatDay } from '../../lib/format.js'
import { providesParts } from '../../lib/jobText.js'
import { listFact } from '../../lib/trustScoreText.js'
import { EMPLOYMENT_TYPES, optionLabel, WORK_SETUPS } from '../../lib/postingOptions.js'
import MatchBadge from './MatchBadge.jsx'
import { toneFor } from '../../lib/tileTone.js'
import IconTile from '../ui/IconTile.jsx'
import Tag from '../ui/Tag.jsx'
import VerificationBadge from '../ui/VerificationBadge.jsx'

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
 * The Figma JobCard: an icon tile, the title as heading and link, the employer with its badge,
 * a line of facts, how it meets the job seeker's needs, the accommodations as tags, and the trust
 * score with the closing date. Rendered as an <li>, so put it in a <ul>. showEmployer={false}
 * leaves out the employer line where the page is already about that employer.
 */
export default function JobCard({ job, to, showEmployer = true }) {
  const { employer } = job
  const { shown, more } = providesParts(job.accommodations ?? [])
  const facts = [optionLabel(EMPLOYMENT_TYPES, job.employment_type), optionLabel(WORK_SETUPS, job.work_setup), job.location].filter(Boolean)
  const footer = [showEmployer ? listFact(employer) : null, job.closes_on ? `Apply by ${formatDay(job.closes_on)}` : null].filter(Boolean)

  return (
    <li className="flex gap-4 rounded-lg border-2 border-border bg-surface p-5 sm:p-6">
      <IconTile icon="briefcase" tone={toneFor(job.id)} />

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-2xl font-semibold">
          <Link to={to} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 hover:text-primary-hover hover:no-underline">
            {job.title}
          </Link>
        </h3>

        {showEmployer && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-bold">{employer.name}</p>
            {employer.type === 'company' && employer.is_verified && <VerificationBadge status="verified" />}
            {employer.type !== 'company' && <p className="text-sm text-muted">Individual employer</p>}
          </div>
        )}

        {facts.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            <DotList items={facts} />
          </p>
        )}

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

        {footer.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            <DotList items={footer} />
          </p>
        )}
      </div>
    </li>
  )
}
