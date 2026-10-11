import { useCallback, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { RECORD_ID as ID } from '../lib/recordId.js'

export const JOB_SORTS = ['newest', 'closing']
/** Find jobs adds Best match, its default. */
export const MATCHING_SORTS = ['match', 'newest', 'closing']

// Pages stop at 10,000, as on the API.
const MAX_PAGE = 10000

/**
 * Job list filters kept in the address, so Back, Forward and shared links show the same list:
 * ?q=web&category=3&accommodations=1,2&sort=closing&page=2. Values the page doesn't
 * understand (a hand-edited address) fall back to the defaults. In matching mode (Find jobs)
 * there is also `show` (Matches my needs, or `show=all`) and the Best match sort.
 */
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
  if (filters.sort !== (matching ? MATCHING_SORTS : JOB_SORTS)[0]) params.set('sort', filters.sort)
  if (matching && filters.show === 'all') params.set('show', 'all')
  if (filters.page > 1) params.set('page', String(filters.page))
  return params.toString()
}

export default function useJobSearchParams({ matching = false } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()
  const query = searchParams.toString()

  // Keyed on the query text, so the object only changes when the address does.
  const filters = useMemo(() => parse(new URLSearchParams(query), matching), [query, matching])

  /**
   * Changes some filters: a new history entry, or `replace: true` to update the current one.
   * Any change except the page goes back to page 1. The scroll position stays where it is.
   */
  const setFilters = useCallback(
    (changes, { replace = false } = {}) => {
      const next = { ...filters, ...changes }
      if (!('page' in changes)) next.page = 1
      setSearchParams(toQuery(next, matching), { replace, preventScrollReset: true })
    },
    [filters, matching, setSearchParams],
  )

  /** Removes the category and accommodation filters; keeps the search words, sort and Show switch. */
  const clearFilters = useCallback(
    () => setFilters({ category: '', accommodations: [] }),
    [setFilters],
  )

  const hrefForPage = useCallback(
    (page) => {
      const next = toQuery({ ...filters, page }, matching)
      return next ? `${pathname}?${next}` : pathname
    },
    [filters, matching, pathname],
  )

  const activeFilterCount = (filters.category ? 1 : 0) + filters.accommodations.length

  return { filters, setFilters, clearFilters, hrefForPage, activeFilterCount }
}
