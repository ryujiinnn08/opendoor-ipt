import { act, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import useJobSearchParams from './useJobSearchParams.js'

/** Renders the hook at `path` and returns the router plus the latest hook value. */
function setup(path, options) {
  const current = {}
  function Probe() {
    Object.assign(current, useJobSearchParams(options))
    return null
  }
  const router = createMemoryRouter(
    [
      { path: '/jobs', element: <Probe /> },
      { path: '/candidate/jobs', element: <Probe /> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return { router, current }
}

describe('useJobSearchParams', () => {
  it('reads the filters from the address', () => {
    const { current } = setup('/jobs?q=web&category=3&accommodations=1,2&work_setup=remote,hybrid&type=full_time&sort=closing&page=2')
    expect(current.filters).toEqual({
      q: 'web',
      category: '3',
      accommodations: [1, 2],
      workSetup: ['hybrid', 'remote'],
      employmentType: ['full_time'],
      sort: 'closing',
      page: 2,
    })
    expect(current.activeFilterCount).toBe(6)
  })

  it('ignores values it does not understand', () => {
    const { current } = setup('/jobs?sort=price&page=abc&accommodations=1,x&category=it&work_setup=moon,remote,remote&type=gig')
    expect(current.filters).toEqual({ q: '', category: '', accommodations: [1], workSetup: ['remote'], employmentType: [], sort: 'newest', page: 1 })
  })

  it('ignores numbers no list could have', () => {
    expect(setup('/jobs?category=0&page=0&accommodations=0,2').current.filters).toMatchObject({ category: '', page: 1, accommodations: [2] })
    expect(setup('/jobs?category=007&page=99999999').current.filters).toMatchObject({ category: '', page: 1 })
    expect(setup('/jobs?category=1234567890123456789').current.filters.category).toBe('')
  })

  it('keeps the scroll position when the filters change', () => {
    const { router, current } = setup('/jobs')
    act(() => current.setFilters({ category: '4' }))
    expect(router.state.preventScrollReset).toBe(true)
  })

  it('can replace the current history entry instead of adding one', () => {
    const { router, current } = setup('/jobs?q=w')
    act(() => current.setFilters({ q: 'web' }, { replace: true }))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(router.state.location.search).toBe('?q=web')
  })

  it('goes back to page 1 when a filter changes, and keeps the search words', () => {
    const { router, current } = setup('/jobs?q=web&page=3')
    act(() => current.setFilters({ category: '4' }))
    expect(router.state.location.search).toBe('?q=web&category=4')
  })

  it('keeps the filters when only the page changes', () => {
    const { router, current } = setup('/jobs?q=web')
    act(() => current.setFilters({ page: 2 }))
    expect(router.state.location.search).toBe('?q=web&page=2')
    expect(current.hrefForPage(3)).toBe('/jobs?q=web&page=3')
  })

  it('clears category and accommodations but keeps the search words and sort', () => {
    const { router, current } = setup('/jobs?q=web&category=4&accommodations=1&sort=closing')
    act(() => current.clearFilters())
    expect(router.state.location.search).toBe('?q=web&sort=closing')
  })

  describe('matching mode (Find jobs)', () => {
    it('starts in Matches my needs, best match first', () => {
      const { current } = setup('/candidate/jobs', { matching: true })
      expect(current.filters).toMatchObject({ show: 'matches', sort: 'match' })
    })

    it('reads All jobs and another sort from the address', () => {
      const { current } = setup('/candidate/jobs?show=all&sort=newest', { matching: true })
      expect(current.filters).toMatchObject({ show: 'all', sort: 'newest' })
    })

    it('writes only what differs from the defaults', () => {
      const { router, current } = setup('/candidate/jobs?page=2', { matching: true })
      act(() => current.setFilters({ show: 'all' }))
      expect(router.state.location.search).toBe('?show=all')
      act(() => current.setFilters({ sort: 'newest' }))
      expect(router.state.location.search).toBe('?sort=newest&show=all')
    })

    it('keeps the search words, sort and Show switch when clearing filters', () => {
      const { router, current } = setup('/candidate/jobs?q=web&category=4&sort=closing&show=all', { matching: true })
      act(() => current.clearFilters())
      expect(router.state.location.search).toBe('?q=web&sort=closing&show=all')
    })

    it('ignores the matching values outside Find jobs', () => {
      const { current } = setup('/jobs?sort=match&show=all')
      expect(current.filters.sort).toBe('newest')
      expect(current.filters).not.toHaveProperty('show')
    })
  })
})

describe('useJobSearchParams, the job in the details pane', () => {
  it('keeps the chosen job apart from the filters', () => {
    const { current } = setup('/jobs?q=web&job=7')
    expect(current.selectedJob).toBe(7)
    expect(current.filters.q).toBe('web')
    expect(setup('/jobs?job=abc').current.selectedJob).toBeNull()
  })

  it('opens a job without touching the filters, and a filter change closes it', () => {
    const { router, current } = setup('/jobs?q=web&page=2')
    act(() => current.selectJob(4))
    expect(router.state.location.search).toBe('?q=web&page=2&job=4')

    act(() => current.setFilters({ category: '3' }))
    expect(router.state.location.search).toBe('?q=web&category=3')
  })
})
