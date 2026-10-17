import { useCandidateTour } from '../../onboarding/tourContext.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getFeedbackForm } from '../../api/feedback.js'
import FeedbackForm from '../../components/feedback/FeedbackForm.jsx'
import FeedbackSummary from '../../components/feedback/FeedbackSummary.jsx'
import MascotMessage from '../../components/mascot/MascotMessage.jsx'
import Button from '../../components/ui/Button.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import { NOTHING_TO_RATE, PRIVACY_TEXT, RATE_ACTION, opensOnText, thankYouText } from '../../lib/feedbackText.js'
import { formatDay } from '../../lib/format.js'
import { RECORD_ID } from '../../lib/recordId.js'

const NOT_FOUND = "We couldn't find this application."

const ALREADY_SENT = "You've already sent your ratings."

/**
 * Rating the accommodations after a hire (F7.1, F7.2): the form while it's open, the day it opens
 * before then, and the job seeker's own ratings once sent. After sending, the thank-you takes focus.
 */
export default function FeedbackPage() {
  const tour = useCandidateTour()
  const { id } = useParams()
  const validId = RECORD_ID.test(id)
  const announce = useAnnounce()
  const thanksBox = useRef(null)
  const alreadyBox = useRef(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${id}#${attempt}`
  const [loaded, setLoaded] = useState(null) // { key, form, error }
  const [justSent, setJustSent] = useState(false)
  const [alreadySent, setAlreadySent] = useState(false)
  const current = loaded?.key === requestKey ? loaded : null
  const form = current?.form ?? null
  const loadError = validId ? (current?.error ?? null) : NOT_FOUND

  useEffect(() => {
    if (!validId) return
    let active = true
    getFeedbackForm(id)
      .then((result) => active && setLoaded({ key: requestKey, form: result, error: null }))
      .catch((error) => {
        if (!active) return
        const status = error?.response?.status
        const message = status === 404 ? NOT_FOUND : (generalErrorFrom(error) ?? 'Something went wrong. Please try again.')
        setLoaded({ key: requestKey, form: null, error: { message, retry: status !== 403 && status !== 404 } })
      })
    return () => {
      active = false
    }
  }, [id, validId, requestKey])

  useEffect(() => {
    if (!justSent || !form) return
    announce(thankYouText(form.employer.name))
    thanksBox.current?.focus()
  }, [justSent, form, announce])

  // Sent meanwhile from another tab: once reloaded, focus says so instead of falling to the page.
  const showsAlready = alreadySent && !justSent && form?.state === 'sent'
  useEffect(() => {
    if (showsAlready) alreadyBox.current?.focus()
  }, [showsAlready])

  function sent(updated) {
    setLoaded((previous) => ({ ...previous, form: updated }))
    tour?.markSaved()
    setJustSent(true)
  }

  // Sent meanwhile from another tab: reload to show what was sent.
  function alreadyDone() {
    setAlreadySent(true)
    announce(ALREADY_SENT)
    setAttempt((count) => count + 1)
  }

  const error = loadError === NOT_FOUND ? { message: NOT_FOUND, retry: false } : loadError
  // Once sent, the heading names what's on the page, not an action that's no longer possible.
  const title = !form ? RATE_ACTION : form.state === 'sent' ? `Your ratings for ${form.employer.name}` : `How did ${form.employer.name} do?`

  return (
    <>
      <PageHeader back={{ to: `/candidate/applications/${id}`, label: 'Back to your application' }} title={title} intro={form ? `${form.job.title}, hired ${formatDay(form.hired_at)}` : undefined} />

      {error && (
        <Notice tone={error.retry ? 'error' : 'info'} className="mt-6">
          <p>{error.message}</p>
          {error.retry && (
            <Button variant="secondary" className="mt-3 mr-4" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          )}
          <Link to="/candidate/applications" className={`mt-2 ${TEXT_LINK}`}>
            My applications
          </Link>
        </Notice>
      )}
      {!form && !error && <LoadingMessage>Loading the accommodations…</LoadingMessage>}

      {form?.state === 'open' && (
        <div className="mt-6">
          <div data-tour="feedback-form" className="max-w-prose space-y-2">
            <p>Rate each accommodation they listed when they hired you.</p>
            <p>{PRIVACY_TEXT}</p>
          </div>
          <div className="mt-8">
            <FeedbackForm form={form} onSent={sent} onAlreadySent={alreadyDone} />
          </div>
        </div>
      )}

      {form?.state === 'not_yet' && (
        <Notice className="mt-6">
          <p>{opensOnText(form.opens_on)}</p>
        </Notice>
      )}

      {form?.state === 'nothing_to_rate' && (
        <Notice className="mt-6">
          <p>{NOTHING_TO_RATE}</p>
        </Notice>
      )}

      {form?.state === 'sent' && (
        <div className="mt-6 space-y-8">
          {showsAlready && (
            <div ref={alreadyBox} tabIndex={-1} className="focus:outline-3 focus:outline-offset-4 focus:outline-(--od-focus)">
              <Notice>
                <p>{ALREADY_SENT}</p>
              </Notice>
            </div>
          )}
          {justSent && (
            <div ref={thanksBox} tabIndex={-1} className="focus:outline-3 focus:outline-offset-4 focus:outline-(--od-focus)">
              <MascotMessage mood="happy" title="Thank you!">
                <p>{thankYouText(form.employer.name)}</p>
              </MascotMessage>
            </div>
          )}
          <FeedbackSummary sent={form.sent} title="What you sent" />
        </div>
      )}
    </>
  )
}
