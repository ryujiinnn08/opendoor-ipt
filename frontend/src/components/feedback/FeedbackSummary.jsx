import { formatDate } from '../../lib/format.js'

/**
 * The job seeker's own ratings, once sent (plan PHASE_5 §4.1): each accommodation as it was
 * promised, with their answer under it, and the comment. Only they ever see this.
 */
export default function FeedbackSummary({ sent, headingLevel = 2, title = 'Your ratings' }) {
  const Heading = `h${headingLevel}`

  return (
    <section aria-labelledby="your-ratings-heading" className="border-l-4 border-text pl-5">
      <Heading id="your-ratings-heading" className="text-2xl font-bold">
        {title}
      </Heading>
      <p className="mt-1 text-muted">You sent these on {formatDate(sent.sent_at)}. Only you and OpenDoor's administrators see them.</p>
      <dl className="mt-3">
        {sent.ratings.map((item) => (
          <div key={item.accommodation_id} className="border-b border-border py-3 first:border-t">
            <dt className="font-bold">{item.name}</dt>
            <dd>{item.rating_label}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-4 font-bold">Your comment</h3>
      <p className="max-w-prose whitespace-pre-line">{sent.comment || <span className="text-muted">You didn't add a comment.</span>}</p>
    </section>
  )
}
