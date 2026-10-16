import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { listApplicants } from '../../api/applications.js'
import { generalErrorFrom } from '../../api/client.js'
import ApplicantRow from '../../components/applications/ApplicantRow.jsx'
import PostingStatusBadge from '../../components/postings/PostingStatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import FilterTabs from '../../components/ui/FilterTabs.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { APPLICANT_FILTERS } from '../../lib/applicationText.js'
import { RECORD_ID } from '../../lib/recordId.js'

const NOT_FOUND = "We couldn't find this job posting."

function countText(total) {
  return total === 1 ? '1 applicant' : `${total} applicants`
}

/**
 * One posting's applicants (plan PHASE_4 §6.3): status filter with counts and the page in the
 * address, newest first, each with how the job meets their needs. Lists never mark anyone
 * Reviewed; opening an applicant does.
 */
export default function ApplicantsPage() {
  const { id } = useParams()
  const validId = RECORD_ID.test(id)
  const [searchParams] = useSearchParams()
  const status = APPLICANT_FILTERS.some((item) => item.value === searchParams.get('status')) ? searchParams.get('status') : 'all'
  const pageParam = Number(searchParams.get('page'))
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1

  const key = `${id}|${status}|${page}`
  const [list, setList] = useState(null) // { key, applicants, meta, counts, job }
  const current = list?.key === key ? list : null
  const [job, setJob] = useState(null)
  const [counts, setCounts] = useState(null)
  const [loadError, setLoadError] = useState(validId ? null : NOT_FOUND)
  const latestRequest = useRef(0)
  const listHeading = useRef(null)
  const shownPage = useRef(null)

  const load = useCallback(() => {
    if (!validId) return Promise.resolve()
    const request = ++latestRequest.current
    return listApplicants(id, { status, page })
      .then((result) => {
        if (request !== latestRequest.current) return
        setList({ key, ...result })
        setJob(result.job)
        setCounts(result.counts)
        setLoadError(null)
      })
      .catch((error) => {
        if (request !== latestRequest.current) return
        const code = error?.response?.status
        setLoadError(code === 403 || code === 404 ? NOT_FOUND : (generalErrorFrom(error) ?? 'Something went wrong. Please try again.'))
      })
  }, [id, validId, status, page, key])

  useEffect(() => {
    load()
  }, [load])

  // After moving to another page, focus goes to the count heading.
  useEffect(() => {
    if (!current) return
    if (shownPage.current !== null && shownPage.current !== page) listHeading.current?.focus()
    shownPage.current = page
  }, [current, page])

  function hrefForPage(number) {
    const next = new URLSearchParams(searchParams)
    if (number > 1) next.set('page', String(number))
    else next.delete('page')
    return `?${next}`
  }

  const tabs = APPLICANT_FILTERS.map((item) => ({ ...item, label: counts ? `${item.label} (${counts[item.value]})` : item.label }))
  const title = job ? `Applicants for ${job.title}` : 'Applicants'

  return (
    <>
      <PageHeader back={{ to: '/employer/job-postings', label: 'Back to job postings' }} title={title} />

      {loadError && (
        <Notice tone={loadError === NOT_FOUND ? 'info' : 'error'} className="mt-6">
          <p>{loadError}</p>
          {loadError !== NOT_FOUND && (
            <Button variant="secondary" className="mt-3 mr-4" onClick={load}>
              Try again
            </Button>
          )}
          <Link to="/employer/job-postings" className={TEXT_LINK}>
            Job postings
          </Link>
        </Notice>
      )}

      {job && !loadError && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <PostingStatusBadge status={job.status} />
            {job.department && <p>Department: {job.department.name}</p>}
          </div>
          <div className="mt-8">
            <FilterTabs label="Show" items={tabs} current={status} resetParams={['page']} />
          </div>
        </>
      )}

      {!current && !loadError && <LoadingMessage>Loading the applicants…</LoadingMessage>}

      {current && !loadError && (
        <section aria-labelledby="applicants-count" className="mt-8">
          <h2 id="applicants-count" ref={listHeading} tabIndex={-1} className="text-2xl font-bold">
            {countText(current.meta.total)}
          </h2>
          {current.applicants.length === 0 ? (
            <div className="mt-4">
              {current.meta.total > 0 ? (
                <EmptyState
                  action={
                    <Link to={hrefForPage(1)} className={TEXT_LINK}>
                      Go to the first page
                    </Link>
                  }
                >
                  There are no applicants on this page.
                </EmptyState>
              ) : (
                <EmptyState>{status === 'all' ? 'No one has applied for this job yet.' : 'No applicants here.'}</EmptyState>
              )}
            </div>
          ) : (
            <ul className="mt-4">
              {current.applicants.map((applicant) => (
                <ApplicantRow key={applicant.id} applicant={applicant} />
              ))}
            </ul>
          )}
          <div className="mt-8">
            <Pagination page={current.meta.current_page} lastPage={current.meta.last_page} hrefForPage={hrefForPage} label="Pages of applicants" />
          </div>
        </section>
      )}

    </>
  )
}
