import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getEmployer, searchJobs } from '../../api/jobs.js'
import { getTrustScore } from '../../api/trustScore.js'
import TrustScoreCard from '../../components/feedback/TrustScoreCard.jsx'
import JobCard from '../../components/jobs/JobCard.jsx'
import Button from '../../components/ui/Button.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import VerificationBadge from '../../components/ui/VerificationBadge.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import useJobSearchParams from '../../hooks/useJobSearchParams.js'
import { RECORD_ID } from '../../lib/recordId.js'

const NOT_FOUND = "We couldn't find this employer. They may not have published a job yet."

/**
 * An employer's public page (F3.5): details, Verified badge, the accommodation trust score with
 * its breakdown (F7.4, F7.5) and open jobs. Never the
 * registration number, team or email addresses (the API doesn't send them). Every state
 * renders the same PageHeader first, so the focused <h1> is kept.
 */
export default function EmployerPage({ basePath = '/jobs' }) {
  const { id } = useParams()
  const { filters, hrefForPage } = useJobSearchParams()
  // Anything that isn't an employer number (e.g. "..%2Fme") is never sent to the API.
  const validId = RECORD_ID.test(id)
  const [attempt, setAttempt] = useState(0)
  const [jobsAttempt, setJobsAttempt] = useState(0)
  // Kept with the id (and attempt) it was loaded for, so another employer's address shows "Loading…".
  const requestKey = `${id}#${attempt}`
  const [loaded, setLoaded] = useState(null) // { key, employer, error }
  const current = loaded?.key === requestKey ? loaded : null
  const employer = current?.employer ?? null
  const loadError = validId ? (current?.error ?? null) : NOT_FOUND
  const [loadedResults, setResults] = useState(null) // { employerId, page, jobs, meta }
  const results = loadedResults?.employerId === employer?.id ? loadedResults : null
  const [jobsError, setJobsError] = useState(null)
  const [trust, setTrust] = useState(null) // { employerId, summary, failed }
  const jobsHeading = useRef(null)
  const loadedPage = useRef(null)
  const focusJobsOnLoad = useRef(false)
  const latestRequest = useRef(0)

  useEffect(() => {
    if (!validId) return
    let active = true
    getEmployer(id)
      .then((result) => active && setLoaded({ key: requestKey, employer: result, error: null }))
      .catch((error) => active && setLoaded({ key: requestKey, employer: null, error: error?.response?.status === 404 ? NOT_FOUND : generalErrorFrom(error) }))
    return () => {
      active = false
    }
  }, [id, validId, requestKey])

  // The breakdown loads with the employer; until then (or if it fails) the score from the employer is shown.
  useEffect(() => {
    if (!employer?.id || employer.trust_score == null) return
    let active = true
    getTrustScore(employer.id)
      .then((summary) => active && setTrust({ employerId: employer.id, summary }))
      // Without the breakdown the card still shows the score from the employer.
      .catch(() => active && setTrust({ employerId: employer.id, summary: null }))
    return () => {
      active = false
    }
  }, [employer?.id, employer?.trust_score])

  // Jobs load only once the employer is known, so a bad address never lists other employers' jobs.
  const employerId = employer?.id
  const { page } = filters
  useEffect(() => {
    if (!employerId) return
    const request = ++latestRequest.current
    searchJobs({ employer: employerId, sort: 'newest', page })
      .then(({ jobs, meta }) => {
        if (request !== latestRequest.current) return
        const previousPage = loadedPage.current
        loadedPage.current = page
        setJobsError(null)
        setResults({ employerId, page, jobs, meta })
        // A new page starts at the jobs heading, once it has rendered.
        focusJobsOnLoad.current = previousPage !== null && previousPage !== page
      })
      .catch((error) => {
        if (request === latestRequest.current) setJobsError(generalErrorFrom(error))
      })
  }, [employerId, page, jobsAttempt])

  useEffect(() => {
    if (!focusJobsOnLoad.current) return
    focusJobsOnLoad.current = false
    jobsHeading.current?.focus()
  }, [results])

  const company = employer?.type === 'company'
  const details = employer
    ? company
      ? [
          ['Industry', employer.industry],
          ['Address', employer.address],
          ['About the company', employer.description],
        ]
      : [
          ['City or municipality', employer.address],
          ['About', employer.description],
        ]
    : []

  return (
    <>
      <PageHeader back={{ to: basePath, label: 'Back to jobs' }} title={employer?.name ?? (loadError === NOT_FOUND ? 'Employer not found' : 'Employer')} />

      {loadError && (
        <Notice tone={loadError === NOT_FOUND ? 'info' : 'error'} className="mt-6">
          <p>{loadError}</p>
          {loadError !== NOT_FOUND && (
            <Button variant="secondary" className="mt-3 mr-4" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          )}
          <Link to={basePath} className={TEXT_LINK}>
            Browse jobs
          </Link>
        </Notice>
      )}

      {!employer && !loadError && <LoadingMessage>Loading the employer…</LoadingMessage>}

      {employer && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {employer.logo_url && (
              <img src={employer.logo_url} alt="" className="size-16 rounded-md border border-border bg-surface object-contain" />
            )}
            {company && employer.is_verified && <VerificationBadge status="verified" />}
            {!company && <p className="text-muted">Individual employer</p>}
          </div>

          <dl className="mt-6 grid max-w-3xl gap-x-6 gap-y-3 sm:grid-cols-[max-content_minmax(0,1fr)]">
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="font-bold">{label}</dt>
                  <dd className="max-w-prose whitespace-pre-line">{value}</dd>
                </div>
              ))}
          </dl>

          <div className="mt-10 max-w-3xl">
            <TrustScoreCard
              summary={(trust?.employerId === employer.id && trust.summary) || { score: employer.trust_score, responses: employer.trust_count }}
              loadingBreakdown={employer.trust_score != null && trust?.employerId !== employer.id}
            />
          </div>

          <section aria-labelledby="employer-jobs-heading" className="mt-12">
            {jobsError && (
              <Notice tone="error" className="mb-6">
                <p>{jobsError}</p>
                <Button variant="secondary" className="mt-3" onClick={() => setJobsAttempt((count) => count + 1)}>
                  Try again
                </Button>
              </Notice>
            )}
            {results ? (
              <>
                <h2 id="employer-jobs-heading" ref={jobsHeading} tabIndex={-1} className="text-title font-bold outline-none focus-visible:outline-2">
                  {results.meta.total > 0 ? `Open jobs (${results.meta.total})` : 'No open jobs right now.'}
                </h2>
                {results.jobs.length > 0 && (
                  <ul className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
                    {results.jobs.map((job) => (
                      <JobCard key={job.id} job={job} to={`${basePath}/${job.id}`} showEmployer={false} />
                    ))}
                  </ul>
                )}
                <Pagination page={results.meta.current_page} lastPage={results.meta.last_page} hrefForPage={hrefForPage} label="Pages of open jobs" />
              </>
            ) : (
              !jobsError && <LoadingMessage>Loading open jobs…</LoadingMessage>
            )}
          </section>
        </>
      )}
    </>
  )
}
