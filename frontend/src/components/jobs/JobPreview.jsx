import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getJob } from '../../api/jobs.js'
import ApplyBox from '../applications/ApplyBox.jsx'
import TrustScoreCard from '../feedback/TrustScoreCard.jsx'
import JobDetails from '../postings/JobDetails.jsx'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import LoadingMessage from '../ui/LoadingMessage.jsx'
import Notice from '../ui/Notice.jsx'
import { TEXT_LINK } from '../ui/buttonLinkStyles.js'
import NeedsFit from './NeedsFit.jsx'

const NOT_OPEN = "This job isn't open any more. It may have closed or been removed."

/**
 * The chosen job beside the list on Find jobs (UI_FEEDBACK_PLAN Q2, LinkedIn's details pane): the
 * same content as the job page, in one column, under an <h2> that takes focus when a job is
 * chosen (`headingRef`). A link opens the full page.
 */
export default function JobPreview({ id, basePath, employerBasePath, headingRef }) {
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${id}#${attempt}`
  const [loaded, setLoaded] = useState(null) // { key, job, error }
  const current = loaded?.key === requestKey ? loaded : null
  const job = current?.job ?? null
  const error = current?.error ?? null

  useEffect(() => {
    let active = true
    getJob(id)
      .then((result) => active && setLoaded({ key: requestKey, job: result, error: null }))
      .catch((loadError) => active && setLoaded({ key: requestKey, job: null, error: loadError?.response?.status === 404 ? NOT_OPEN : generalErrorFrom(loadError) }))
    return () => {
      active = false
    }
  }, [id, requestKey])

  const employerHref = job ? `${employerBasePath}/${job.employer.id}` : null

  return (
    <section aria-labelledby="job-preview-heading" aria-busy={!job && !error} className="min-w-0">
      <h2 id="job-preview-heading" ref={headingRef} tabIndex={-1} className="font-display text-title font-bold outline-none focus-visible:outline-2">
        {job?.title ?? (error ? 'Job not available' : 'Loading the job…')}
      </h2>

      {error && (
        <Notice tone={error === NOT_OPEN ? 'info' : 'error'} className="mt-4">
          <p>{error}</p>
          {error !== NOT_OPEN && (
            <Button variant="secondary" className="mt-3" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          )}
        </Notice>
      )}

      {!job && !error && <LoadingMessage>Loading the job…</LoadingMessage>}

      {job && (
        <>
          <Link to={`${basePath}/${job.id}`} className={TEXT_LINK}>
            Open the full job page
            <Icon name="arrow-up-right" className="size-4" />
          </Link>
          <JobDetails
            posting={job}
            employerHref={employerHref}
            stacked
            fit={
              <>
                <ApplyBox job={job} />
                {job.match?.needs && <NeedsFit match={job.match} />}
                <TrustScoreCard summary={{ score: job.employer.trust_score, responses: job.employer.trust_count }} short employerHref={employerHref} headingLevel={3} headingId="job-preview-trust-heading" />
              </>
            }
          />
        </>
      )}
    </section>
  )
}
