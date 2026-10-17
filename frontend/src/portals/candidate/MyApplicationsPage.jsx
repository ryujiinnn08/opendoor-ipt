import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { listApplications } from '../../api/applications.js'
import { generalErrorFrom } from '../../api/client.js'
import ApplicationRow from '../../components/applications/ApplicationRow.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import FilterTabs from '../../components/ui/FilterTabs.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import MascotMessage from '../../components/mascot/MascotMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import { APPLICATION_FILTERS } from '../../lib/applicationText.js'

/** "Acme Corp." already ends the sentence, so no second full stop. */
function sentText(employer) {
  return employer ? `Your application was sent to ${employer}${employer.endsWith('.') ? '' : '.'}` : null
}

function countText(total) {
  return total === 1 ? '1 application' : `${total} applications`
}

/**
 * My applications (F6.3): every application with its status, applied date and next step,
 * newest first, with the All · Waiting · Hired · Closed filter and the page in the address.
 */
export default function MyApplicationsPage() {
  const announce = useAnnounce()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const status = APPLICATION_FILTERS.some((item) => item.value === searchParams.get('status')) ? searchParams.get('status') : 'all'
  const pageParam = Number(searchParams.get('page'))
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1

  // Kept with the filter and page it was loaded for, so a new filter shows "Loading…".
  const key = `${status}|${page}`
  const [list, setList] = useState(null) // { key, applications, meta, counts }
  const current = list?.key === key ? list : null
  const [counts, setCounts] = useState(null)
  const [loadError, setLoadError] = useState(null)
  // "Your application was sent to …" from the Apply page, shown once.
  const [message] = useState(() => sentText(location.state?.sent))
  const latestRequest = useRef(0)
  const listHeading = useRef(null)
  const shownPage = useRef(null)

  const sent = location.state?.sent
  useEffect(() => {
    if (!sent) return
    announce(sentText(sent))
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [sent, announce, navigate, location.pathname, location.search])

  const load = useCallback(() => {
    // Only the latest request may update the list.
    const request = ++latestRequest.current
    return listApplications({ status, page })
      .then((result) => {
        if (request !== latestRequest.current) return
        setList({ key, ...result })
        setCounts(result.counts)
        setLoadError(null)
      })
      .catch((error) => {
        if (request === latestRequest.current) setLoadError(generalErrorFrom(error) ?? 'Something went wrong. Please try again.')
      })
  }, [status, page, key])

  useEffect(() => {
    load()
  }, [load])

  // After moving to another page, focus goes to the count heading (as on Browse jobs).
  useEffect(() => {
    if (!current) return
    if (shownPage.current !== null && shownPage.current !== page) listHeading.current?.focus()
    shownPage.current = page
  }, [current, page])

  // After a change, focus goes to the application's title, or to the count when it left this
  // filter. It moves in an effect, once the reloaded list is on screen.
  // It is used once, so later reloads (another page, another filter) don't move focus again.
  const focusRequest = useRef(null)
  const focusApplication = useCallback((id) => {
    focusRequest.current = id
  }, [])
  useEffect(() => {
    if (focusRequest.current === null || !current) return
    const link = document.querySelector(`#application-${focusRequest.current} h3 a`)
    focusRequest.current = null
    ;(link ?? listHeading.current)?.focus()
  }, [current])

  function hrefForPage(number) {
    const next = new URLSearchParams(searchParams)
    if (number > 1) next.set('page', String(number))
    else next.delete('page')
    return `?${next}`
  }

  const tabs = APPLICATION_FILTERS.map((item) => ({ ...item, label: counts ? `${item.label} (${counts[item.value]})` : item.label }))

  return (
    <>
      <PageHeader title="My applications" intro="Track every job you've applied for and what happens next." />

      {message && (
        <MascotMessage
          mood="happy"
          title="Application sent!"
          className="mt-6"
          action={
            <Link to="/candidate/jobs" className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 hover:no-underline">
              Find more jobs
            </Link>
          }
        >
          <p>{message}</p>
          <p className="mt-1 text-muted">It's in the list below, with what happens next.</p>
        </MascotMessage>
      )}

      <div className="mt-8">
        <FilterTabs label="Show" items={tabs} current={status} resetParams={['page']} />
      </div>

      {loadError && (
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Button variant="secondary" className="mt-3" onClick={load}>
            Try again
          </Button>
        </Notice>
      )}
      {!current && !loadError && <LoadingMessage>Loading your applications…</LoadingMessage>}

      {current && (
        <section aria-labelledby="applications-count" className="mt-8">
          <h2 id="applications-count" ref={listHeading} tabIndex={-1} className="text-2xl font-bold">
            {countText(current.meta.total)}
          </h2>
          {current.applications.length === 0 ? (
            <div className="mt-4">
              {current.meta.total > 0 ? (
                <EmptyState
                  action={
                    <Link to={hrefForPage(1)} className={TEXT_LINK}>
                      Go to the first page
                    </Link>
                  }
                >
                  There are no applications on this page.
                </EmptyState>
              ) : status === 'all' ? (
                <EmptyState
                  mascot
                  action={
                    <Link to="/candidate/jobs" className={TEXT_LINK}>
                      Find jobs
                    </Link>
                  }
                >
                  You haven&apos;t applied for any jobs yet.
                </EmptyState>
              ) : (
                <EmptyState>No applications here.</EmptyState>
              )}
            </div>
          ) : (
            <ul className="mt-4 overflow-hidden rounded-lg border border-border">
              {current.applications.map((application) => (
                <ApplicationRow key={application.id} application={application} onChanged={load} onStale={load} focusAfter={focusApplication} />
              ))}
            </ul>
          )}
          <div className="mt-8">
            <Pagination page={current.meta.current_page} lastPage={current.meta.last_page} hrefForPage={hrefForPage} label="Pages of applications" />
          </div>
        </section>
      )}
    </>
  )
}
