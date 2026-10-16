import { useCallback, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { EMPLOYMENT_TYPES, WORK_SETUPS } from '../lib/postingOptions.js'
import { RECORD_ID as ID } from '../lib/recordId.js'

export const JOB_SORTS = ['newest', 'closing']
/** Find jobs adds Best match, its default. */
export const MATCHING_SORTS = ['match', 'newest', 'closing']

// Pages stop at 10,000, as on the API.
const MAX_PAGE = 10000

/**
 * Job list filters kept in the address, so Back, Forward and shared links show the same list:
 * ?q=web&category=3&accommodations=1,2&work_setup=remote,hybrid&type=full_time&sort=closing&page=2. Values the page doesn't
 * understand (a hand-edited address) fall back to the defaults. In matching mode (Find jobs)
 * there is also `show` (Matches my needs, or `show=all`) and the Best match sort.
 */
/** The known values of a comma list in the address, each once, in the options' order. */
function listOf(searchParams, key, options) {
  const given = (searchParams.get(key) ?? '').split(',')
  return options.map((option) => option.value).filter((value) => given.includes(value))
}

function parse(searchParams, matching) {
  const category = searchParams.get('category') ?? ''
  const sort = searchParams.get('sort')
  const page = searchParams.get('page') ?? ''
  const accommodations = (searchParams.get('accommodations') ?? '')
    .split(',')
    .filter((id) => ID.test(id))
    .map(Number)

  const sorts = matching ? MATCHING_SORTS : JOB_SORTS
  const filters = {
    q: searchParams.get('q') ?? '',
    category: ID.test(category) ? category : '',
    accommodations: [...new Set(accommodations)],
    workSetup: listOf(searchParams, 'work_setup', WORK_SETUPS),
    employmentType: listOf(searchParams, 'type', EMPLOYMENT_TYPES),
    sort: sorts.includes(sort) ? sort : sorts[0],
    page: ID.test(page) && Number(page) <= MAX_PAGE ? Number(page) : 1,
  }
  if (matching) filters.show = searchParams.get('show') === 'all' ? 'all' : 'matches'
  return filters
}

/** The address query for these filters, leaving out defaults. */
function toQuery(filters, matching) {
  const params = new URLSearchParams()
  if (filters.q.trim()) params.set('q', filters.q.trim())
  if (filters.category) params.set('category', filters.category)
  if (filters.accommodations.length > 0) params.set('accommodations', filters.accommodations.join(','))
  if (filters.workSetup.length > 0) params.set('work_setup', filters.workSetup.join(','))
  if (filters.employmentType.length > 0) params.set('type', filters.employmentType.join(','))
  if (filters.sort !== (matching ? MATCHING_SORTS : JOB_SORTS)[0]) params.set('sort', filters.sort)
  if (matching && filters.show === 'all') params.set('show', 'all')
  if (filters.page > 1) params.set('page', String(filters.page))
  return params.toString()
}

export default function useJobSearchParams({ matching = false } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()
  const query = searchParams.toString()

  // The job open in the details pane (Find jobs on wide screens, UI_FEEDBACK_PLAN Q2) is kept
  // apart from the filters, so choosing a job never reloads the list.
  const params = new URLSearchParams(query)
  const jobParam = params.get('job') ?? ''
  const selectedJob = ID.test(jobParam) ? Number(jobParam) : null
  params.delete('job')
  const listQuery = params.toString()

  // Keyed on the query text, so the object only changes when the address does.
  const filters = useMemo(() => parse(new URLSearchParams(listQuery), matching), [listQuery, matching])

  /**
   * Changes some filters: a new history entry, or `replace: true` to update the current one.
   * Any change except the page goes back to page 1, and closes the job in the details pane.
   * The scroll position stays where it is.
   */
  const setFilters = useCallback(
    (changes, { replace = false } = {}) => {
      const next = { ...filters, ...changes }
      if (!('page' in changes)) next.page = 1
      setSearchParams(toQuery(next, matching), { replace, preventScrollReset: true })
    },
    [filters, matching, setSearchParams],
  )

  /** Opens a job in the details pane: a new history entry, so Back returns to the previous one. */
  const selectJob = useCallback(
    (id) => {
      const next = new URLSearchParams(toQuery(filters, matching))
      next.set('job', String(id))
      setSearchParams(next.toString(), { preventScrollReset: true })
    },
    [filters, matching, setSearchParams],
  )

  /** Removes every filter; keeps the search words, sort and Matches my needs. */
  const clearFilters = useCallback(
    () => setFilters({ category: '', accommodations: [], workSetup: [], employmentType: [] }),
    [setFilters],
  )

  const hrefForPage = useCallback(
    (page) => {
      const next = toQuery({ ...filters, page }, matching)
      return next ? `${pathname}?${next}` : pathname
    },
    [filters, matching, pathname],
  )

  const activeFilterCount = (filters.category ? 1 : 0) + filters.accommodations.length + filters.workSetup.length + filters.employmentType.length

  return { filters, setFilters, clearFilters, hrefForPage, activeFilterCount, selectedJob, selectJob }
}
