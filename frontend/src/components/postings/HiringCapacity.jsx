import Icon from '../ui/Icon.jsx'

/** Counts come from the backend; no client-side hiring decisions. */
export default function HiringCapacity({ posting }) {
  if (posting?.hiring_slots == null) return null
  const filled = posting.closure_reason === 'slots_filled'
  const limitReached = posting.application_limit != null && posting.application_count >= posting.application_limit

  return (
    <section className="mt-4 overflow-hidden rounded-md border border-border bg-surface" aria-label="Hiring capacity">
      <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="flex items-start gap-3 p-4">
          <Icon name="people" className="mt-0.5 size-5 text-primary" />
          <div className="min-w-0">
            <dt className="text-sm text-muted">Hiring slots</dt>
            <dd className="mt-1 font-bold text-text">{posting.hired_count} of {posting.hiring_slots} hired</dd>
            <dd className="mt-1 text-sm text-muted">{posting.remaining_slots} {posting.remaining_slots === 1 ? 'slot' : 'slots'} remaining</dd>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <Icon name="file-text" className="mt-0.5 size-5 text-primary" />
          <div className="min-w-0">
            <dt className="text-sm text-muted">Applications</dt>
            <dd className="mt-1 font-bold text-text">{posting.application_count} {posting.application_count === 1 ? 'application' : 'applications'} received</dd>
            <dd className="mt-1 text-sm text-muted">{posting.application_limit == null ? 'No application limit' : `Limit: ${posting.application_limit}`}</dd>
          </div>
        </div>
      </dl>
      {(filled || limitReached) && (
        <p className="flex items-start gap-2 border-t border-border bg-subtle px-4 py-3 text-sm text-accent">
          <Icon name="lock" className="mt-0.5 size-4" />
          <span>{filled ? <><strong>All hiring slots are filled.</strong> This posting is closed.</> : <><strong>Application limit reached.</strong> No new applications can be received.</>}</span>
        </p>
      )}
    </section>
  )
}
