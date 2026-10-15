import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getJob } from '../../api/jobs.js'
import ApplyBox from '../../components/applications/ApplyBox.jsx'
import TrustScoreCard from '../../components/feedback/TrustScoreCard.jsx'
import NeedsFit from '../../components/jobs/NeedsFit.jsx'
import JobDetails from '../../components/postings/JobDetails.jsx'
import Button from '../../components/ui/Button.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { RECORD_ID } from '../../lib/recordId.js'

const NOT_OPEN = "This job isn't open. It may have closed or been removed."

/**
 * One open job (plan PHASE_3 §6.3): the 2B layout with accommodations first, and the employer
 * linked to their page. Every state renders the same PageHeader first, so the <h1> that
 * RootLayout focused is kept when the job finishes loading.
 */
export default function JobPage({ basePath = '/jobs', employerBasePath = '/employers' }) {
  const { id } = useParams()
  // Anything that isn't a job number (e.g. "..%2Fme") is never sent to the API.
  const validId = RECORD_ID.test(id)
  const [attempt, setAttempt] = useState(0)
  // Kept with the id (and attempt) it was loaded for, so another job's address shows "Loading…".
  const requestKey = `${id}#${attempt}`
  const [loaded, setLoaded] = useState(null) // { key, job, error }
  const current = loaded?.key === requestKey ? loaded : null
  const job = current?.job ?? null
  const loadError = validId ? (current?.error ?? null) : NOT_OPEN

  useEffect(() => {
    if (!validId) return
    let active = true
    getJob(id)
      .then((result) => active && setLoaded({ key: requestKey, job: result, error: null }))
      .catch((error) => active && setLoaded({ key: requestKey, job: null, error: error?.response?.status === 404 ? NOT_OPEN : generalErrorFrom(error) }))
    return () => {
      active = false
    }
  }, [id, validId, requestKey])

  const title = job?.title ?? (loadError === NOT_OPEN ? 'Job not open' : 'Job')

  return (
    <>
      <PageHeader title={title} />

      {loadError && (
        <Notice tone={loadError === NOT_OPEN ? 'info' : 'error'} className="mt-6">
          <p>{loadError}</p>
          {loadError !== NOT_OPEN && (
            <Button variant="secondary" className="mt-3 mr-4" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          )}
          <Link to={basePath} className={TEXT_LINK}>
            Browse open jobs
          </Link>
        </Notice>
      )}

      {!job && !loadError && <LoadingMessage>Loading the job…</LoadingMessage>}

      {job && (
        <>
          <JobDetails
            posting={job}
            employerHref={`${employerBasePath}/${job.employer.id}`}
            fit={
              <>
                {job.match?.needs && <NeedsFit match={job.match} />}
                <ApplyBox job={job} />
                <TrustScoreCard
                  summary={{ score: job.employer.trust_score, responses: job.employer.trust_count }}
                  short
                  employerHref={`${employerBasePath}/${job.employer.id}`}
                />
              </>
            }
          />
          <p className="mt-12">
            <Link to={basePath} className={TEXT_LINK}>
              Back to jobs
            </Link>
          </p>
        </>
      )}
    </>
  )
}
