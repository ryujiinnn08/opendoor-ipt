import { Link } from 'react-router-dom'
import { NOT_ENOUGH_RATINGS, NOT_ENOUGH_RESPONSES, TRUST_EXPLAINED, TRUST_HEADING, basedOnText, rowText } from '../../lib/trustScoreText.js'
import AccommodationGroupIcon from '../postings/AccommodationGroupIcon.jsx'
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
    ...(summary?.breakdown ?? []).map((row) => ({ ...row, text: rowText(row), scored: true })),
    ...(summary?.not_enough ?? []).map((row) => ({ ...row, text: NOT_ENOUGH_RATINGS, scored: false })),
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
            <ul aria-label="How each accommodation was rated" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {rows.map((row, index) => (
                <AccommodationTile key={row.id} row={row} tone={TONES[index % TONES.length]} />
              ))}
            </ul>
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

// The accent colours, in turn, for the tiles (decoration: Quiet mode makes them all the plain tint).
const TONES = ['bg-lilac', 'bg-orange', 'bg-sky', 'bg-pink']

/**
 * One accommodation as a tile: its group's icon, its name, the ratings in words, and a bar of how
 * many hires said it was delivered (dark) or partly delivered (lighter). The words carry the
 * result; the bar only shows it. Accommodations with fewer than 3 ratings are plain tiles that
 * say so, with no bar and no count.
 */
function AccommodationTile({ row, tone }) {
  const share = (count) => `${row.rated ? (count / row.rated) * 100 : 0}%`

  return (
    <li className={`flex min-w-0 flex-col rounded-lg p-3 text-text sm:p-4 ${row.scored ? `od-tile ${tone}` : 'border border-dashed border-input bg-subtle'}`}>
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent">
        <AccommodationGroupIcon group={row.group_name} className="size-5" />
      </span>
      {/* Whole words wrap (hyphenated where needed), never a word cut in two. */}
      <p className="mt-3 font-display leading-snug font-semibold [overflow-wrap:break-word] hyphens-auto">{row.name}</p>
      <p className={`mt-1 text-sm [overflow-wrap:break-word] ${row.scored ? '' : 'text-muted'}`}>{row.text}</p>
      {row.scored && (
        <div aria-hidden="true" className="mt-auto pt-3">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface/70">
            <span className="h-full bg-text" style={{ width: share(row.delivered) }} />
            <span className="h-full bg-text/40" style={{ width: share(row.partial) }} />
          </div>
        </div>
      )}
    </li>
  )
}
