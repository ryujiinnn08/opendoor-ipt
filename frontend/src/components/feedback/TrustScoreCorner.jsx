import Icon from '../ui/Icon.jsx'

/**
 * The trust score in the top right corner of a job card: a shield, the number large, and the
 * number of ratings under it, so it is the first thing seen after the title. Below 3 responses
 * the papers' rule holds: no number and no count, only "Not rated yet". Screen readers hear
 * "Trust score: 88%, 4 ratings". Icon + words, never colour alone.
 */
export default function TrustScoreCorner({ employer }) {
  const scored = employer?.trust_score != null

  return (
    <div
      className={`flex w-24 shrink-0 flex-col items-center rounded-lg border px-2 py-2 text-center ${
        scored ? 'border-success bg-success-soft' : 'border-border bg-subtle'
      }`}
    >
      <Icon name="shield-check" className={`size-5 ${scored ? 'text-success' : 'text-muted'}`} />
      {scored ? (
        <>
          <p className="mt-0.5 font-display text-lg leading-tight font-bold text-success">
            <span className="sr-only">Trust score: </span>
            {employer.trust_score}%
          </p>
          <p className="text-xs leading-tight text-text">
            <span aria-hidden="true">trust · </span>
            {employer.trust_count === 1 ? '1 rating' : `${employer.trust_count} ratings`}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs leading-tight font-bold text-muted">
          <span className="sr-only">Trust score: </span>Not rated yet
        </p>
      )}
    </div>
  )
}
