import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import { searchJobs } from '../../api/jobs.js'
import { getAccommodationGroups, getCategories } from '../../api/masterData.js'
import { useAuth } from '../../auth/authContext.js'
import AccommodationFilterPanel from '../../components/jobs/AccommodationFilterPanel.jsx'
import JobCard from '../../components/jobs/JobCard.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import FormField from '../../components/ui/FormField.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import SelectField from '../../components/ui/SelectField.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import useDebouncedValue from '../../hooks/useDebouncedValue.js'
import useJobSearchParams from '../../hooks/useJobSearchParams.js'
import { jobCountText } from '../../lib/jobText.js'

const STALE_FILTERS = "Some filters in this address don't exist any more."

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'closing', label: 'Closing soon' },
]

/** Every filter except the page, to tell a page change from a filter change. */
function withoutPage({ page: _page, ...rest }) {
  return JSON.stringify(rest)
}

/**
 * Browse jobs (plan PHASE_3 §6.3): search, filters and sort kept in the address, 12 jobs a
 * page. Typing searches after a 300 ms pause (Enter at once); filters apply at once and keep
 * focus; the new count is read out. Phase 3B mounts it inside the candidate portal with its
 * own basePath.
 */
export default function BrowseJobsPage({ basePath = '/jobs' }) {
  const { status } = useAuth()
  const announce = useAnnounce()
  const { filters, setFilters, clearFilters, hrefForPage, activeFilterCount } = useJobSearchParams()
  const { key: locationKey } = useLocation()

  // The search box keeps its own text; the address gets it after a pause or on Enter.
  const [text, setText] = useState(filters.q)
  const debouncedText = useDebouncedValue(text, 300)
  const appliedText = useRef(filters.q.trim())
  const setFiltersRef = useRef(setFilters)
  useEffect(() => {
    setFiltersRef.current = setFilters
  }, [setFilters])
  // Typing makes one history entry per search: the first pause adds it, later pauses update it,
  // until anything else changes the address.
  const locationKeyRef = useRef(locationKey)
  const typingEntry = useRef({ pending: false, key: null })
  useEffect(() => {
    locationKeyRef.current = locationKey
    if (typingEntry.current.pending) typingEntry.current = { pending: false, key: locationKey }
  }, [locationKey])

  const [categories, setCategories] = useState([])
  const [groups, setGroups] = useState([])
  const [listsError, setListsError] = useState(false)

  const [results, setResults] = useState(null) // { filters, jobs, meta }
  const [loadError, setLoadError] = useState(null) // { general, q, staleFilters }
  const [attempt, setAttempt] = useState(0)
  const latestRequest = useRef(0)
  const loadedFilters = useRef(null)
  const focusResultsOnLoad = useRef(false)
  const resultsHeading = useRef(null)

  // Back, Forward or a link changed the words in the address: show them in the box.
  useEffect(() => {
    if (filters.q.trim() !== appliedText.current) {
      appliedText.current = filters.q.trim()
      setText(filters.q)
    }
  }, [filters.q])

  // Only a pause in typing applies the box; reacting to other changes would put back old words after Back.
  useEffect(() => {
    const words = debouncedText.trim()
    if (words === appliedText.current) return
    appliedText.current = words
    const replace = typingEntry.current.key === locationKeyRef.current
    typingEntry.current = { pending: true, key: null }
    setFiltersRef.current({ q: words }, { replace })
  }, [debouncedText])

  useEffect(() => {
    Promise.all([getCategories(), getAccommodationGroups()])
      .then(([categoryList, groupList]) => {
        setCategories(categoryList)
        setGroups(groupList)
      })
      .catch(() => setListsError(true))
  }, [])

  useEffect(() => {
    // Only the latest request may update the list; an earlier, slower one is ignored.
    const request = ++latestRequest.current
    searchJobs(filters)
      .then(({ jobs, meta }) => {
        if (request !== latestRequest.current) return
        const previous = loadedFilters.current
        loadedFilters.current = filters
        setLoadError(null)
        setResults({ filters, jobs, meta })
        if (!previous) return
        announce(`${jobCountText(meta.total)} found`)
        // Only the page changed: start the new page at its heading (after it renders). Filter changes keep focus.
        focusResultsOnLoad.current = withoutPage(previous) === withoutPage(filters) && previous.page !== filters.page
      })
      .catch((error) => {
        if (request !== latestRequest.current) return
        // A 422 on the words belongs to the search box; on other filters, the address is out of date
        // (e.g., a shared link to a category that was removed).
        const { q = null, ...otherFields } = fieldErrorsFrom(error)
        const staleFilters = Object.keys(otherFields).length > 0
        const general = generalErrorFrom(error)
        setLoadError({ general, q, staleFilters, filters })
        announce(q ?? (staleFilters ? STALE_FILTERS : general))
      })
  }, [filters, attempt, announce])

  useEffect(() => {
    if (!focusResultsOnLoad.current) return
    focusResultsOnLoad.current = false
    resultsHeading.current?.focus()
  }, [results])

  function submitSearch(event) {
    event.preventDefault()
    const words = text.trim()
    if (words === appliedText.current) return
    appliedText.current = words
    setFilters({ q: words })
  }

  // The Clear all filters button goes away with the filters, so focus moves to the results
  // heading (or the first filter, when no results are shown) instead of falling to the page.
  function clearAndKeepPlace() {
    // The filter panel may be closed (phones) and the heading absent, but the search box is always there.
    const target = resultsHeading.current ?? document.getElementById('job-search')
    target?.focus()
    clearFilters()
  }

  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  const somethingOn = Boolean(filters.q.trim()) || activeFilterCount > 0
  const clearButton = activeFilterCount > 0 && (
    <Button variant="secondary" onClick={clearAndKeepPlace}>
      Clear all filters
    </Button>
  )

  return (
    <div>
      <PageHeader title="Browse jobs" intro="Find open jobs and see which accommodations each one provides." />

      {status === 'guest' && (
        <p className="mt-4 max-w-prose">
          Have accommodation needs?{' '}
          <Link to="/register?type=candidate" className="font-bold text-primary underline underline-offset-4 hover:no-underline">
            Register as a job seeker
          </Link>{' '}
          to see how well each job fits you.
        </p>
      )}

      <form role="search" onSubmit={submitSearch} className="mt-8 flex max-w-3xl flex-wrap items-end gap-3">
        <FormField
          id="job-search"
          label="Search jobs"
          hint="Job title, skill, company or place"
          type="search"
          maxLength={100}
          value={text}
          onChange={(event) => setText(event.target.value)}
          error={loadError?.q}
          className="mb-0 min-w-0 flex-1 basis-64"
          inputClassName="w-full"
        />
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <AccommodationFilterPanel
          filters={filters}
          categories={categories}
          groups={groups}
          onChange={setFilters}
          onClear={clearAndKeepPlace}
          activeCount={activeFilterCount}
          listsError={listsError}
        />

        <section aria-labelledby="job-results-heading" aria-busy={Boolean(results) && results.filters !== filters && loadError?.filters !== filters} className="min-w-0">
          <SelectField
            id="job-sort"
            label="Sort by"
            options={SORTS}
            value={filters.sort}
            onChange={(event) => setFilters({ sort: event.target.value })}
          />

          {loadError?.general && (
            <Notice tone="error" className="mb-6">
              <p>{loadError.general}</p>
              <Button variant="secondary" className="mt-3" onClick={retry}>
                Try again
              </Button>
            </Notice>
          )}

          {loadError?.staleFilters && (
            <EmptyState
              action={
                <Button variant="secondary" onClick={clearAndKeepPlace}>
                  Clear all filters
                </Button>
              }
            >
              {STALE_FILTERS}
            </EmptyState>
          )}

          {loadError?.staleFilters ? null : results ? (
            <>
              <h2
                id="job-results-heading"
                ref={resultsHeading}
                tabIndex={-1}
                className="text-[1.625rem] font-bold outline-none focus-visible:outline-2"
              >
                {jobCountText(results.meta.total)}
              </h2>

              {results.jobs.length > 0 ? (
                <ul className="mt-4">
                  {results.jobs.map((job) => (
                    <JobCard key={job.id} job={job} to={`${basePath}/${job.id}`} />
                  ))}
                </ul>
              ) : (
                <div className="mt-4">
                  {results.meta.total > 0 ? (
                    <EmptyState
                      action={
                        <Link to={hrefForPage(1)} className={TEXT_LINK}>
                          Go to the first page
                        </Link>
                      }
                    >
                      This page is past the end of the list.
                    </EmptyState>
                  ) : somethingOn ? (
                    <EmptyState action={clearButton}>No jobs match these filters. Try fewer filters or different words.</EmptyState>
                  ) : (
                    <EmptyState>No open jobs right now. Check back soon.</EmptyState>
                  )}
                </div>
              )}

              <Pagination page={results.meta.current_page} lastPage={results.meta.last_page} hrefForPage={hrefForPage} />
            </>
          ) : (
            !loadError && <LoadingMessage>Loading jobs…</LoadingMessage>
          )}
        </section>
      </div>
    </div>
  )
}
