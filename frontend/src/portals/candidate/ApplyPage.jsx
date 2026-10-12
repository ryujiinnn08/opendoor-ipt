import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { applyForJob } from '../../api/applications.js'
import { getProfile } from '../../api/candidate.js'
import { generalErrorFrom } from '../../api/client.js'
import { getJob } from '../../api/jobs.js'
import WhatEmployersSee from '../../components/applications/WhatEmployersSee.jsx'
import Button from '../../components/ui/Button.jsx'
import ErrorSummary from '../../components/ui/ErrorSummary.jsx'
import FormField from '../../components/ui/FormField.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import useFormErrors from '../../hooks/useFormErrors.js'
import { interviewHint } from '../../lib/applicationText.js'
import { summaryFrom } from '../../lib/errorSummary.js'
import { RECORD_ID } from '../../lib/recordId.js'

const NOT_TAKING = "This job isn't taking applications."
const ALREADY = "You've already applied for this job."

/**
 * Apply for one job (F6.1, F6.2): an optional cover note and interview accommodation request,
 * and what the employer will see. A refusal while sending keeps the typed text on the page.
 */
export default function ApplyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const refusalBox = useRef(null)
  const validId = RECORD_ID.test(id)
  const [job, setJob] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileState, setProfileState] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState(validId ? null : NOT_TAKING)
  const [attempt, setAttempt] = useState(0)
  const [values, setValues] = useState({ cover_note: '', interview_request: '' })
  const [sending, setSending] = useState(false)
  const [refusal, setRefusal] = useState(null) // { kind: 'already', applicationId } | { kind: 'closed' }
  const { errors, generalError, focusKey, showApiError, clear } = useFormErrors()

  useEffect(() => {
    if (!validId) return
    let active = true
    getJob(id)
      .then((loaded) => {
        if (!active) return
        setJob(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (active) setLoadError(error?.response?.status === 404 ? NOT_TAKING : (generalErrorFrom(error) ?? 'Something went wrong. Please try again.'))
      })
    // The preview of what's shared is a help, not a requirement: applying works without it.
    getProfile()
      .then((loaded) => {
        if (!active) return
        setProfile(loaded)
        setProfileState('ready')
      })
      .catch(() => active && setProfileState('error'))
    return () => {
      active = false
    }
  }, [id, validId, attempt])

  // A refusal is read out and takes focus, so nobody presses Send again without knowing why.
  useEffect(() => {
    if (!refusal) return
    announce(refusal.kind === 'already' ? ALREADY : NOT_TAKING)
    refusalBox.current?.focus()
  }, [refusal, announce])

  async function handleSubmit(event) {
    event.preventDefault()
    clear()
    setRefusal(null)
    setSending(true)
    try {
      await applyForJob(id, values)
      navigate('/candidate/applications', { state: { sent: job.employer.name } })
    } catch (error) {
      const status = error?.response?.status
      if (status === 409) setRefusal({ kind: 'already', applicationId: error.response.data?.application_id })
      else if (status === 404) setRefusal({ kind: 'closed' })
      else showApiError(error)
      setSending(false)
    }
  }

  const change = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  const title = job ? `Apply for ${job.title}` : 'Apply for this job'
  const applied = job?.my_application

  return (
    <>
      <PageHeader title={title} intro={job ? job.employer.name : undefined} />

      {loadError && (
        <Notice tone={loadError === NOT_TAKING ? 'info' : 'error'} className="mt-6">
          <p>{loadError}</p>
          {loadError !== NOT_TAKING && (
            <Button variant="secondary" className="mt-3 mr-4" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          )}
          <Link to="/candidate/jobs" className={TEXT_LINK}>
            Browse open jobs
          </Link>
        </Notice>
      )}
      {!job && !loadError && <LoadingMessage>Loading the job…</LoadingMessage>}

      {applied && (
        <Notice tone="info" className="mt-6">
          <p>{ALREADY}</p>
          <Link to={`/candidate/applications/${applied.id}`} className={TEXT_LINK}>
            View your application
          </Link>
        </Notice>
      )}

      {job && !applied && (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form onSubmit={handleSubmit} noValidate className="max-w-prose">
            {refusal && (
              <div ref={refusalBox} tabIndex={-1} className="mb-6 outline-offset-4">
                <Notice tone="info">
                  <p>{refusal.kind === 'already' ? ALREADY : NOT_TAKING}</p>
                  {refusal.kind === 'already' && refusal.applicationId && (
                    <Link to={`/candidate/applications/${refusal.applicationId}`} className={TEXT_LINK}>
                      View your application
                    </Link>
                  )}
                  {refusal.kind === 'closed' && (
                    <Link to="/candidate/jobs" className={TEXT_LINK}>
                      Browse open jobs
                    </Link>
                  )}
                </Notice>
              </div>
            )}
            <ErrorSummary errors={summaryFrom(errors, ['cover_note', 'interview_request'], generalError)} focusKey={focusKey} />
            <FormField
              id="cover_note"
              as="textarea"
              label="Cover note"
              optional
              hint="Tell the employer why you'd like this job, in your own words."
              rows={8}
              maxLength={3000}
              inputClassName="w-full"
              value={values.cover_note}
              onChange={change('cover_note')}
              error={errors.cover_note}
            />
            <FormField
              id="interview_request"
              as="textarea"
              label="Interview accommodation request"
              optional
              hint={interviewHint(job.interview_format)}
              rows={4}
              maxLength={1000}
              inputClassName="w-full"
              value={values.interview_request}
              onChange={change('interview_request')}
              error={errors.interview_request}
            />
            {/* After a refusal, sending again can only fail the same way; the text stays to copy. */}
            {!refusal && (
              <Button type="submit" loading={sending} loadingText="Sending…">
                Send application
              </Button>
            )}
          </form>
          <WhatEmployersSee profile={profile} loadState={profileState} />
        </div>
      )}
    </>
  )
}
