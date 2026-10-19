import Icon from '../../components/ui/Icon.jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getApplicantPhoto, getApplicantResume, getApplication } from '../../api/applications.js'
import { generalErrorFrom } from '../../api/client.js'
import ApplicantSummary from '../../components/applications/ApplicantSummary.jsx'
import ApplicationStatusBadge from '../../components/applications/ApplicationStatusBadge.jsx'
import EmployerDecision from '../../components/applications/EmployerDecision.jsx'
import ResumeView from '../../components/candidate/ResumeView.jsx'
import Button from '../../components/ui/Button.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Avatar from '../../components/candidate/Avatar.jsx'
import usePrivateImage from '../../hooks/usePrivateImage.js'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { formatDate } from '../../lib/format.js'
import { openPdfInNewTab } from '../../lib/openPdf.js'
import { RECORD_ID } from '../../lib/recordId.js'

const NOT_FOUND = "We couldn't find this applicant."

/**
 * One applicant (plan PHASE_4 §7). The server marks a Pending application Reviewed when this
 * page loads it. Right column (first on phones): the interview request, their needs and your job,
 * contact and the decision; left: the cover note and the résumé. After Withdrawn only the name
 * and dates are shown (Q4). Every state keeps the same PageHeader.
 */
export default function ApplicantPage() {
  const { id } = useParams()
  const validId = RECORD_ID.test(id)
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${id}#${attempt}`
  const [loaded, setLoaded] = useState(null) // { key, applicant, error }
  const current = loaded?.key === requestKey ? loaded : null
  const applicant = current?.applicant ?? null
  const loadError = validId ? (current?.error ?? null) : NOT_FOUND
  const [resumeError, setResumeError] = useState(null)
  const headingArea = useRef(null)

  useEffect(() => {
    if (!validId) return
    let active = true
    getApplication(id)
      .then((result) => active && setLoaded({ key: requestKey, applicant: result, error: null }))
      .catch((error) => {
        if (!active) return
        const code = error?.response?.status
        setLoaded({ key: requestKey, applicant: null, error: code === 403 || code === 404 ? NOT_FOUND : (generalErrorFrom(error) ?? 'Something went wrong. Please try again.') })
      })
    return () => {
      active = false
    }
  }, [id, validId, requestKey])

  function changed(updated) {
    setLoaded((previous) => ({ ...previous, applicant: updated }))
  }

  function refresh() {
    getApplication(id)
      .then(changed)
      .catch(() => {})
  }

  async function openResume() {
    setResumeError(null)
    try {
      await openPdfInNewTab(() => getApplicantResume(applicant.id))
    } catch (error) {
      setResumeError(generalErrorFrom(error) ?? 'Something went wrong. Please try again.')
    }
  }

  const withdrawn = applicant?.status === 'withdrawn'
  const job = applicant?.job
  // Who this is, under their name (plan PHASE_4 §7), before the panels.
  const place = [applicant?.profile?.city, applicant?.profile?.province].filter(Boolean).join(', ')

  return (
    <>
      <div ref={headingArea}>
        <PageHeader back={job ? { to: `/employer/job-postings/${job.id}/applicants`, label: 'Back to applicants' } : { to: '/employer/job-postings', label: 'Back to job postings' }} title={applicant?.applicant.name ?? 'Applicant'} />
      </div>

      {loadError && (
        <Notice tone={loadError === NOT_FOUND ? 'info' : 'error'} className="mt-6">
          <p>{loadError}</p>
          {loadError !== NOT_FOUND && (
            <Button variant="secondary" className="mt-3 mr-4" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          )}
          <Link to="/employer/job-postings" className={TEXT_LINK}>
            Job postings
          </Link>
        </Notice>
      )}
      {!applicant && !loadError && <LoadingMessage>Loading the applicant…</LoadingMessage>}

      {applicant && (
        <>
          {!withdrawn && applicant.profile.has_photo && <ApplicantPhoto applicationId={applicant.id} name={applicant.applicant.name} version={applicant.profile.photo_version} />}
          {!withdrawn && (applicant.profile.headline || place) && (
            <div className="mt-2">
              {applicant.profile.headline && <p className="text-xl">{applicant.profile.headline}</p>}
              {place && <p className="text-muted">{place}</p>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <ApplicationStatusBadge status={applicant.status} />
            <p>
              Applied for{' '}
              <Link to={`/employer/job-postings/${job.id}/applicants`} className={TEXT_LINK}>
                {job.title}
              </Link>{' '}
              on {formatDate(applicant.applied_at)}
            </p>
          </div>

          {withdrawn ? (
            <p className="mt-8 max-w-prose text-lg">
              {`${applicant.applicant.name} withdrew this application on ${formatDate(applicant.withdrawn_at)}. Their details are no longer shown.`}
            </p>
          ) : (
            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-10 lg:col-start-2 lg:row-start-1">
                <ApplicantSummary applicant={applicant} />
                <EmployerDecision
                  applicant={applicant}
                  onChanged={changed}
                  onStale={refresh}
                  focusAfter={() => headingArea.current?.querySelector('h1')?.focus()}
                />
              </div>

              <div className="lg:col-start-1 lg:row-start-1">
                {applicant.history?.length > 0 && (
                  <section aria-labelledby="history-heading" className="mb-10">
                    <h2 id="history-heading" className="flex items-center gap-2 text-2xl font-bold"><Icon name="clock" className="size-5 text-primary" />Application history</h2>
                    <ol className="mt-4 divide-y divide-border rounded-md border border-border bg-surface px-4">
                      {applicant.history.map((event) => (
                        <li key={event.id} className="flex items-start gap-3 py-4">
                          <Icon name={event.new_status === 'hired' ? 'clipboard-check' : 'clock'} className="mt-0.5 size-5 text-primary" />
                          <div className="min-w-0"><p className="font-bold">
                          {event.action === 'legacy_status_recorded' ? 'Previous record' : event.previous_status ? `${event.previous_status} → ${event.new_status}` : `Submitted as ${event.new_status}`}
                          </p><p className="mt-1 text-sm text-muted"><time dateTime={event.created_at}>{formatDate(event.created_at)}</time>{' · '}{event.actor_name ?? 'Account unavailable'}</p></div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                <section aria-labelledby="cover-heading">
                  <h2 id="cover-heading" className="text-2xl font-bold">
                    Cover note
                  </h2>
                  {applicant.cover_note ? (
                    <p className="mt-2 max-w-prose whitespace-pre-line">{applicant.cover_note}</p>
                  ) : (
                    <p className="mt-2 text-muted">No cover note.</p>
                  )}
                </section>

                <section aria-labelledby="resume-heading" className="mt-10">
                  <h2 id="resume-heading" className="text-2xl font-bold">
                    Résumé
                  </h2>
                  {applicant.profile.resume && (
                    <div className="mt-3">
                      <Button variant="secondary" onClick={openResume}>
                        Open the uploaded résumé
                      </Button>
                      <p className="mt-1 text-muted">{applicant.profile.resume.name}</p>
                      {resumeError && (
                        <p className="mt-2 font-bold text-danger" role="alert">
                          {resumeError}
                        </p>
                      )}
                    </div>
                  )}
                  <ResumeView profile={applicant.profile} />
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

/** The applicant's photo, only when they chose to show it to employers (UI_FEEDBACK_WAVE_B_PLAN B1). */
function ApplicantPhoto({ applicationId, name, version }) {
  const load = useCallback(() => getApplicantPhoto(applicationId), [applicationId])
  const src = usePrivateImage(load, version)
  return src ? <Avatar name={name} src={src} size="xl" className="mt-4" /> : null
}
