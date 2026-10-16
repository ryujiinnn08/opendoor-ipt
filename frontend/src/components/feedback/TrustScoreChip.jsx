import Icon from '../ui/Icon.jsx'

/**
 * The accommodation trust score as a small badge (UI_FEEDBACK_PLAN §3.4), on job cards and in a
 * job's heading, so it is seen at a glance: "92% trust score · 14 ratings". Below 3 responses
 * the papers' rule holds: no number and no count, only "Not rated yet". Icon + words, never
 * colour alone.
 */
export default function TrustScoreChip({ employer, className = '' }) {
  const scored = employer?.trust_score != null

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm ${
        scored ? 'border-success bg-success-soft text-success' : 'border-border bg-subtle text-muted'
      } ${className}`}
    >
      <Icon name="shield-check" className="size-4" />
      {scored ? (
        <span>
          <strong>{employer.trust_score}%</strong> trust score
          <span className="text-text"> · {employer.trust_count === 1 ? '1 rating' : `${employer.trust_count} ratings`}</span>
        </span>
      ) : (
        <span>Trust score: not rated yet</span>
      )}
    </span>
  )
}
