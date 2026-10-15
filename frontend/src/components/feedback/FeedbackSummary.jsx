import { formatDate } from '../../lib/format.js'

/**
 * The job seeker's own ratings, once sent (plan PHASE_5 §4.1): each accommodation as it was
 * promised, with their answer under it, and the comment. Only they ever see this.
 */
export default function FeedbackSummary({ sent, headingLevel = 2, title = 'Your ratings', headingId = 'your-ratings-heading' }) {
  const Heading = `h${headingLevel}`
  const Subheading = `h${headingLevel + 1}`

  return (
    <section aria-labelledby={headingId} className="border-l-4 border-text pl-5">
      <Heading id={headingId} className="text-2xl font-bold">
        {title}
      </Heading>
      <p className="mt-1 text-muted">You sent these on {formatDate(sent.sent_at)}. Only you and OpenDoor's administrators see them.</p>
      {sent.hidden && <p className="mt-2 max-w-prose font-bold">OpenDoor's administrators removed these ratings from the trust score.</p>}
      <dl className="mt-3">
        {sent.ratings.map((item) => (
          <div key={item.accommodation_id} className="border-b border-border py-3 first:border-t">
            <dt className="font-bold">{item.name}</dt>
            <dd>{item.rating_label}</dd>
          </div>
        ))}
      </dl>
      <Subheading className="mt-4 font-bold">Your comment</Subheading>
      <p className="max-w-prose whitespace-pre-line">{sent.comment || <span className="text-muted">You didn't add a comment.</span>}</p>
    </section>
  )
}
