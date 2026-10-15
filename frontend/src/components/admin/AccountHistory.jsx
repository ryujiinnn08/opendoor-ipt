import { historySentence } from '../../lib/accountText.js'

/**
 * A record's history as a ruled timeline in plain sentences, in ink (a person's own record),
 * shown where the decision is made (plan PHASE_6 §7). Newest first. Accounts by default;
 * feedback passes its own `describe` and `empty` text.
 */
export default function AccountHistory({
  history,
  headingId = 'history-heading',
  headingLevel = 2,
  describe = historySentence,
  empty = 'Nothing yet. Suspensions, reactivations and password changes appear here.',
}) {
  const Heading = `h${headingLevel}`

  return (
    <section aria-labelledby={headingId} className="border-l-4 border-text pl-5">
      <Heading id={headingId} className={headingLevel === 2 ? 'text-2xl font-bold' : 'text-lg font-bold'}>
        History
      </Heading>
      {history.length === 0 ? (
        <p className="mt-2 max-w-prose text-muted">{empty}</p>
      ) : (
        <ol className="mt-3">
          {history.map((event) => (
            <li key={event.id} className="max-w-prose border-b border-border py-3 first:border-t">
              <p>{describe(event)}</p>
              {event.reason && <p className="mt-1 whitespace-pre-line pl-4">“{event.reason}”</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
