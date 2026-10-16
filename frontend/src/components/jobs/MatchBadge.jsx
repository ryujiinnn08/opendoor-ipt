import { matchCountText, missingText } from '../../lib/matchText.js'
import StatusBadge from '../ui/StatusBadge.jsx'

/**
 * How a job meets the job seeker's needs (plan PHASE_3 §7; the Figma "Match and trust" badge):
 * green with a check when it meets them all, violet with an open circle otherwise, then what's
 * missing in muted text. Never red, never a percentage.
 */
export default function MatchBadge({ match }) {
  const missing = missingText(match.missing)
  const meetsAll = match.needs_met === match.needs_total

  return (
    <div className="mt-3">
      <StatusBadge tone={meetsAll ? 'success' : 'info'} icon={meetsAll ? 'check' : 'circle'}>
        {matchCountText(match)}
      </StatusBadge>
      {missing && <p className="mt-1 text-sm text-muted">{missing}</p>}
    </div>
  )
}
