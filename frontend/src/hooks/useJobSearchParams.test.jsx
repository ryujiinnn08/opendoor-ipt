import { act, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import useJobSearchParams from './useJobSearchParams.js'

/** Renders the hook at `path` and returns the router plus the latest hook value. */
function setup(path) {
  const current = {}
  function Probe() {
    Object.assign(current, useJobSearchParams())
    return null
  }
  const router = createMemoryRouter([{ path: '/jobs', element: <Probe /> }], { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return { router, current }
}

describe('useJobSearchParams', () => {
  it('reads the filters from the address', () => {
    const { current } = setup('/jobs?q=web&category=3&accommodations=1,2&sort=closing&page=2')
    expect(current.filters).toEqual({ q: 'web', category: '3', accommodations: [1, 2], sort: 'closing', page: 2 })
    expect(current.activeFilterCount).toBe(3)
  })

  it('ignores values it does not understand', () => {
    const { current } = setup('/jobs?sort=price&page=abc&accommodations=1,x&category=it')
    expect(current.filters).toEqual({ q: '', category: '', accommodations: [1], sort: 'newest', page: 1 })
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
})
