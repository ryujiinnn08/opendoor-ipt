import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getApplication } from '../../api/applications.js'
import { getFeedbackForm } from '../../api/feedback.js'
import { generalErrorFrom } from '../../api/client.js'
import ApplicationActions from '../../components/applications/ApplicationActions.jsx'
import ApplicationPath from '../../components/applications/ApplicationPath.jsx'
import ApplicationStatusBadge from '../../components/applications/ApplicationStatusBadge.jsx'
import FeedbackStatus from '../../components/feedback/FeedbackStatus.jsx'
import FeedbackSummary from '../../components/feedback/FeedbackSummary.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import VerificationBadge from '../../components/ui/VerificationBadge.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { JOB_STATE_TEXT } from '../../lib/applicationText.js'
import { RECORD_ID } from '../../lib/recordId.js'

const NOT_FOUND = "We couldn't find this application."

/** Accommodations in amber, the colour of the employer's promises, each with its note. */
function AccommodationList({ items }) {
  if (items.length === 0) return <p className="mt-3 text-muted">No accommodations listed.</p>

  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2">
          <span className="mt-1 text-accent">
            <Icon name="check" className="size-5" />
          </span>
          <span>
            <span className="font-bold">{item.name}</span>
            {item.note && <span className="block text-muted">{item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * One of the job seeker's applications (plan PHASE_4 §6.3): the application's path, the job,
 * what they sent and the actions they may take. An action updates the page in place and focus
 * returns to the heading. Every state keeps the same PageHeader.
 */
export default function ApplicationPage() {
  const { id } = useParams()
  const validId = RECORD_ID.test(id)
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${id}#${attempt}`
  const [loaded, setLoaded] = useState(null) // { key, application, error }
  const current = loaded?.key === requestKey ? loaded : null
  const application = current?.application ?? null
  const loadError = validId ? (current?.error ?? null) : NOT_FOUND
  const headingArea = useRef(null)
  const sentFeedback = application?.feedback?.state === 'sent'
  const [ratings, setRatings] = useState(null) // { id, sent } once sent feedback is loaded

  // The job seeker's own ratings, once sent; a failure just leaves them out (the date still shows).
  useEffect(() => {
    if (!sentFeedback) return
    let active = true
    getFeedbackForm(id)
      .then((form) => active && setRatings({ id, sent: form.sent }))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [id, sentFeedback])

  useEffect(() => {
    if (!validId) return
    let active = true
    getApplication(id)
      .then((result) => active && setLoaded({ key: requestKey, application: result, error: null }))
      .catch((error) => {
        if (!active) return
        const status = error?.response?.status
        setLoaded({ key: requestKey, application: null, error: status === 403 || status === 404 ? NOT_FOUND : (generalErrorFrom(error) ?? 'Something went wrong. Please try again.') })
      })
    return () => {
      active = false
    }
  }, [id, validId, requestKey])

  function changed(updated) {
    setLoaded((previous) => ({ ...previous, application: updated }))
  }

  // The application changed elsewhere (another tab, or the employer): show its status now.
  function refresh() {
    getApplication(id)
      .then(changed)
      .catch(() => {})
  }

  const job = application?.job
  const title = job?.title ?? 'Application'

  return (
    <>
      <div ref={headingArea}>
        <PageHeader title={title} />
      </div>

      {loadError && (
        <Notice tone={loadError === NOT_FOUND ? 'info' : 'error'} className="mt-6">
          <p>{loadError}</p>
          {loadError !== NOT_FOUND && (
            <Button variant="secondary" className="mt-3 mr-4" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          )}
          <Link to="/candidate/applications" className={TEXT_LINK}>
            My applications
          </Link>
        </Notice>
      )}
      {!application && !loadError && <LoadingMessage>Loading your application…</LoadingMessage>}

      {application && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-lg font-bold">{job.employer.name}</p>
            {job.employer.type === 'company' && job.employer.is_verified && <VerificationBadge status="verified" />}
            <ApplicationStatusBadge status={application.status} />
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <section aria-labelledby="path-heading">
                <h2 id="path-heading" className="text-2xl font-bold">
                  Your application
                </h2>
                <ApplicationPath application={application} />
                <ApplicationActions
                  application={application}
                  onChanged={changed}
                  onStale={refresh}
                  explainHire
                  focusAfter={() => headingArea.current?.querySelector('h1')?.focus()}
                />
                <FeedbackStatus application={application} className="mt-4 max-w-prose" />
              </section>

              {sentFeedback && ratings?.id === id && ratings.sent && (
                <div className="mt-10">
                  <FeedbackSummary sent={ratings.sent} />
                </div>
              )}

              <section aria-labelledby="sent-heading" className="mt-10">
                <h2 id="sent-heading" className="text-2xl font-bold">
                  What you sent
                </h2>
                <dl className="mt-3 space-y-4">
                  <div>
                    <dt className="font-bold">Cover note</dt>
                    <dd className="max-w-prose whitespace-pre-line">{application.cover_note || <span className="text-muted">Nothing</span>}</dd>
                  </div>
                  <div>
                    <dt className="font-bold">Interview accommodation request</dt>
                    <dd className="max-w-prose whitespace-pre-line">{application.interview_request || <span className="text-muted">Nothing</span>}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <div className="space-y-10">
              {application.hired_accommodations && (
                <section aria-labelledby="hired-heading" className="border-l-4 border-accent pl-5">
                  <h2 id="hired-heading" className="text-2xl font-bold">
                    Accommodations when you were hired
                  </h2>
                  <AccommodationList items={application.hired_accommodations} />
                </section>
              )}
              <section aria-labelledby="job-heading" className="border-l-4 border-accent pl-5">
                <h2 id="job-heading" className="text-2xl font-bold">
                  The job
                </h2>
                {job.state === 'open' ? (
                  <Link to={`/candidate/jobs/${job.id}`} className={`mt-2 ${TEXT_LINK}`}>
                    See the job
                  </Link>
                ) : (
                  <p className="mt-2">{JOB_STATE_TEXT[job.state]}</p>
                )}
                <h3 className="mt-4 text-lg font-bold">Accommodations listed now</h3>
                <AccommodationList items={job.accommodations ?? []} />
              </section>
            </div>
          </div>

          <p className="mt-12">
            <Link to="/candidate/applications" className={TEXT_LINK}>
              Back to My applications
            </Link>
          </p>
        </>
      )}
    </>
  )
}
