import { matchCountText, missingText } from '../../lib/matchText.js'
import Icon from '../ui/Icon.jsx'

/**
 * How a job meets the job seeker's needs (plan PHASE_3 §7, the one bold element): the count in
 * bold ink with an amber check, then what's missing in muted text with an open circle. Plain
 * text, read in order after the job's title; never red, never a percentage.
 */
export default function MatchBadge({ match }) {
  const missing = missingText(match.missing)
  // Amber is for needs a job meets, so "Meets none" gets the muted circle instead.
  const meetsSome = match.needs_met > 0

  return (
    <div className="mt-2">
      <p className="flex items-start gap-2 font-bold">
        <span className={`mt-0.5 ${meetsSome ? 'text-accent' : 'text-muted'}`}>
          <Icon name={meetsSome ? 'check' : 'circle'} className="size-5" />
        </span>
        {matchCountText(match)}
      </p>
      {missing && (
        <p className="mt-1 flex items-start gap-2 text-muted">
          <Icon name="circle" className="mt-0.5 size-5" />
          {missing}
        </p>
      )}
    </div>
  )
}
