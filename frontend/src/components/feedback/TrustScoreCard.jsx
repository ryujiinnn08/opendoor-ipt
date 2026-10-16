import { Link } from 'react-router-dom'
import { NOT_ENOUGH_RATINGS, NOT_ENOUGH_RESPONSES, TRUST_EXPLAINED, TRUST_HEADING, basedOnText, rowText } from '../../lib/trustScoreText.js'
import Icon from '../ui/Icon.jsx'
import LoadingMessage from '../ui/LoadingMessage.jsx'
import { TEXT_LINK } from '../ui/buttonLinkStyles.js'

/**
 * The accommodation trust score (papers' TrustScoreCard, F7.4, F7.5): one large number in a
 * sentence, then each accommodation as a promise checked ("4 of 5 delivered, 1 partly"). How the
 * score is worked out is folded away until asked for (UI_FEEDBACK_PLAN §3.4). Below 3 responses
 * only "Not enough responses yet", with no count. `short` (job pages) leaves out the breakdown
 * and links to `employerHref` for it.
 */
export default function TrustScoreCard({ summary, short = false, loadingBreakdown = false, employerHref, headingLevel = 2, headingId = 'trust-score-heading' }) {
  const Heading = `h${headingLevel}`
  const scored = summary?.score != null
  const rows = [
    ...(summary?.breakdown ?? []).map((row) => ({ id: row.id, name: row.name, text: rowText(row) })),
    ...(summary?.not_enough ?? []).map((row) => ({ id: row.id, name: row.name, text: NOT_ENOUGH_RATINGS })),
  ]

  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <Heading id={headingId} className="text-2xl font-bold">
        {TRUST_HEADING}
      </Heading>
      {scored ? (
        <>
          <p className="mt-3 flex items-center gap-2">
            <Icon name="shield-check" className="size-7 text-success" />
            <span className="text-lg">
              <strong className="font-display text-stat text-success">{summary.score}%</strong>
              {basedOnText(summary.responses)}
            </span>
          </p>
          <details className="mt-2">
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold text-primary underline-offset-4 hover:underline">
              How is this score worked out?
            </summary>
            <p className="max-w-prose text-muted">{TRUST_EXPLAINED}</p>
          </details>
          {!short && loadingBreakdown && <LoadingMessage>Loading the ratings for each accommodation…</LoadingMessage>}
          {!short && rows.length > 0 && (
            <dl className="mt-4">
              {rows.map((row) => (
                <div key={row.id} className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-border py-3 first:border-t">
                  <dt className="font-bold">{row.name}</dt>
                  <dd>{row.text}</dd>
                </div>
              ))}
            </dl>
          )}
          {short && employerHref && (
            <Link to={employerHref} className={`mt-2 ${TEXT_LINK}`}>
              See how each accommodation was rated
            </Link>
          )}
        </>
      ) : (
        <p className="mt-2 max-w-prose">{NOT_ENOUGH_RESPONSES}</p>
      )}
    </section>
  )
}
