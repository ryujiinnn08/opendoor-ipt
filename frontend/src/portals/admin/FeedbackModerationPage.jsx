import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFeedbackForModeration, revealFeedbackAuthor, setFeedbackHidden } from '../../api/admin.js'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import AccountHistory from '../../components/admin/AccountHistory.jsx'
import Button from '../../components/ui/Button.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import FilterTabs from '../../components/ui/FilterTabs.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import ReasonDialog from '../../components/ui/ReasonDialog.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import { feedbackHistorySentence } from '../../lib/accountText.js'
import { formatDate } from '../../lib/format.js'

const FILTERS = [
  { value: 'comments', label: 'With comments' },
  { value: 'all', label: 'All' },
  { value: 'hidden', label: 'Hidden' },
]

const EMPTY = {
  comments: 'No feedback has a comment yet.',
  all: 'No feedback has been sent yet.',
  hidden: 'No feedback is hidden.',
}

/**
 * /admin/feedback (plan PHASE_6 §4.5, F10.5): read what hired job seekers wrote, hide feedback
 * from the trust score with a reason, and see who wrote one only on purpose (Q9), which is
 * recorded in its history.
 */
export default function FeedbackModerationPage() {
  const announce = useAnnounce()
  const [searchParams] = useSearchParams()
  const filter = FILTERS.some((item) => item.value === searchParams.get('filter')) ? searchParams.get('filter') : 'comments'
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1)

  const [result, setResult] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [message, setMessage] = useState(null)
  const [authors, setAuthors] = useState({}) // feedback id => { name, email } | { error }
  const [acting, setActing] = useState(null) // { feedback, hide, open, busy, error, done }
  const [revealing, setRevealing] = useState(null) // feedback id being looked up
  const messageRef = useRef(null)
  const latest = useRef(0)
  const lookingUp = useRef(false)

  // Only the latest filter's answer is shown (review WR-08).
  const load = useCallback(() => {
    const request = ++latest.current
    getFeedbackForModeration(filter, page)
      .then((data) => {
        if (request !== latest.current) return
        setResult(data)
        setLoadError(null)
      })
      .catch((error) => {
        if (request === latest.current) setLoadError(generalErrorFrom(error))
      })
  }, [filter, page])

  useEffect(() => {
    load()
  }, [load])

  function replace(updated) {
    setResult((current) => ({ ...current, data: current.data.map((item) => (item.id === updated.id ? updated : item)) }))
  }

  // One look at a time, so a double click records one look, not two (review WR-04).
  async function revealAuthor(feedback) {
    // A ref, not state: two clicks before a re-render must not both pass.
    if (lookingUp.current) return
    lookingUp.current = true
    setRevealing(feedback.id)
    try {
      const author = await revealFeedbackAuthor(feedback.id)
      setAuthors((current) => ({ ...current, [feedback.id]: author }))
      announce(`Written by ${author.name}.`)
      // The look is now in the history; if reloading it fails, the page keeps what it shows.
      getFeedbackForModeration(filter, page)
        .then((data) => {
          const fresh = data.data.find((item) => item.id === feedback.id)
          if (fresh) replace(fresh)
        })
        .catch(() => {})
    } catch (error) {
      setAuthors((current) => ({ ...current, [feedback.id]: { error: generalErrorFrom(error) } }))
    } finally {
      lookingUp.current = false
      setRevealing(null)
    }
  }

  async function act(reason) {
    const { feedback, hide } = acting
    setActing((current) => ({ ...current, busy: true, error: null }))
    try {
      const updated = await setFeedbackHidden(feedback.id, hide, reason)
      replace(updated)
      const text = hide
        ? `The feedback on ${updated.employer.name} is hidden. Its trust score was recalculated.`
        : `The feedback on ${updated.employer.name} counts in its trust score again.`
      setMessage(text)
      announce(text)
      setActing((current) => ({ ...current, busy: false, open: false, done: true }))
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error)
      setActing((current) => current && { ...current, busy: false, error: Object.values(fieldErrors)[0] ?? generalErrorFrom(error) })
    }
  }

  function closeDialog(open) {
    if (!open) setActing((current) => (current && !current.busy ? { ...current, open: false } : current))
  }

  function afterClose(event) {
    if (!acting?.done) return
    event.preventDefault()
    messageRef.current?.focus()
    setActing(null)
  }

  const heading = FILTERS.find((item) => item.value === filter).label

  return (
    <>
      <PageHeader
        title="Feedback"
        intro="What hired job seekers said about the accommodations they were promised. Hide feedback that's abusive or not genuine: it leaves the employer's trust score at once. You don't see who wrote it unless you ask, and asking is recorded."
      />

      <div className="mt-6">
        <FilterTabs label="Which feedback" items={FILTERS} current={filter} param="filter" resetParams={['page']} />
      </div>

      {message && (
        <div ref={messageRef} tabIndex={-1} className="mt-6 outline-none focus-visible:ring-4 focus-visible:ring-primary">
          <Notice tone="success">{message}</Notice>
        </div>
      )}

      <h2 className="mt-8 text-2xl font-bold">
        {heading}
        {result ? ` (${result.meta.total})` : ''}
      </h2>

      {loadError && (
        <Notice tone="error" className="mt-4">
          <p>{loadError}</p>
          <Button variant="link" onClick={load}>
            Try again
          </Button>
        </Notice>
      )}
      {!result && !loadError && <LoadingMessage>Loading feedback…</LoadingMessage>}
      {result?.data.length === 0 && <p className="mt-4">{EMPTY[filter]}</p>}

      {result?.data.length > 0 && (
        <ul className="mt-4">
          {result.data.map((feedback) => (
            <FeedbackRow
              key={feedback.id}
              feedback={feedback}
              author={authors[feedback.id]}
              revealing={revealing === feedback.id}
              onReveal={() => revealAuthor(feedback)}
              onHide={() => setActing({ feedback, hide: true, open: true })}
              onShow={() => setActing({ feedback, hide: false, open: true })}
            />
          ))}
        </ul>
      )}

      {result && (
        <Pagination
          page={result.meta.current_page}
          lastPage={result.meta.last_page}
          hrefForPage={(next) => `?filter=${filter}${next > 1 ? `&page=${next}` : ''}`}
          label="Pages of feedback"
        />
      )}

      <ReasonDialog
        open={Boolean(acting?.open && acting.hide)}
        onOpenChange={closeDialog}
        title={acting ? `Hide this feedback on ${acting.feedback.employer.name}?` : ''}
        description="Its ratings leave the trust score now, and the job seeker is told OpenDoor removed them. You can show it again later."
        label="Why (only administrators see this)"
        hint="It stays in the feedback's history, e.g., Abusive language, or the hire wasn't real."
        confirmLabel="Hide feedback"
        confirmVariant="primary"
        minLength={5}
        onConfirm={act}
        busy={acting?.busy}
        error={acting?.error}
        onCloseAutoFocus={afterClose}
      />
      <ConfirmDialog
        open={Boolean(acting?.open && acting.hide === false)}
        onOpenChange={closeDialog}
        title={acting ? `Count this feedback on ${acting.feedback.employer.name} again?` : ''}
        description="Its ratings go back into the trust score now. This is recorded in its history."
        confirmLabel="Count it again"
        confirmVariant="primary"
        onConfirm={() => act()}
        busy={acting?.busy}
        error={acting?.error}
        onCloseAutoFocus={afterClose}
      />
    </>
  )
}

function FeedbackRow({ feedback, author, revealing, onReveal, onHide, onShow }) {
  const headingId = `feedback-${feedback.id}`

  return (
    <li className="border-b border-border py-6 first:border-t">
      <article aria-labelledby={headingId}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <h3 id={headingId} className="text-xl font-bold">
            {feedback.employer.name}, {feedback.job.title}
          </h3>
          {feedback.is_hidden && (
            <StatusBadge tone="neutral" icon="minus">
              Hidden from the trust score
            </StatusBadge>
          )}
        </div>
        <p className="mt-1 text-muted">Sent {formatDate(feedback.sent_at)}</p>

        {feedback.comment ? (
          <blockquote className="mt-4 max-w-prose whitespace-pre-line text-lg">“{feedback.comment}”</blockquote>
        ) : (
          <p className="mt-4 text-muted">No comment.</p>
        )}

        <dl className="mt-4 grid max-w-prose gap-x-6 gap-y-1 sm:grid-cols-[1fr_auto]">
          {feedback.ratings.map((item) => (
            <div key={item.name} className="contents">
              <dt>{item.name}</dt>
              <dd className="font-bold">{item.rating_label}</dd>
            </div>
          ))}
        </dl>

        {feedback.is_hidden && feedback.hidden_reason && (
          <p className="mt-4 max-w-prose">
            <span className="font-bold">Why it's hidden:</span> {feedback.hidden_reason}
          </p>
        )}

        <div className="mt-4">
          {author?.name ? (
            <p>
              Written by <span className="font-bold">{author.name}</span> ({author.email}).
            </p>
          ) : (
            <>
              <Button variant="link" onClick={onReveal} loading={revealing} loadingText="Looking up…">
                Show who wrote this
              </Button>
              {author?.error && (
                <p role="alert" className="font-bold text-danger">
                  {author.error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {feedback.is_hidden ? (
            <Button variant="secondary" aria-label={`Count it again: feedback on ${feedback.employer.name}`} onClick={onShow}>
              Count it again
            </Button>
          ) : (
            <Button variant="secondary" aria-label={`Hide this feedback on ${feedback.employer.name}`} onClick={onHide}>
              Hide this feedback
            </Button>
          )}
        </div>

        {feedback.history.length > 0 && (
          <div className="mt-6">
            <AccountHistory
              history={feedback.history}
              headingId={`${headingId}-history`}
              headingLevel={4}
              describe={feedbackHistorySentence}
            />
          </div>
        )}
      </article>
    </li>
  )
}
