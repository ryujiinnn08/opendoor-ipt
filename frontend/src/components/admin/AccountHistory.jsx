import { historySentence } from '../../lib/accountText.js'

/**
 * An account's history as a ruled timeline in plain sentences, in ink (a person's own record),
 * shown where the decision is made (plan PHASE_6 §7). Newest first.
 */
export default function AccountHistory({ history, headingId = 'history-heading' }) {
  return (
    <section aria-labelledby={headingId} className="border-l-4 border-text pl-5">
      <h2 id={headingId} className="text-2xl font-bold">
        History
      </h2>
      {history.length === 0 ? (
        <p className="mt-2 max-w-prose text-muted">
          Nothing yet. Suspensions, reactivations and password changes appear here.
        </p>
      ) : (
        <ol className="mt-3">
          {history.map((event) => (
            <li key={event.id} className="max-w-prose border-b border-border py-3 first:border-t">
              <p>{historySentence(event)}</p>
              {event.reason && <p className="mt-1 whitespace-pre-line pl-4">“{event.reason}”</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
