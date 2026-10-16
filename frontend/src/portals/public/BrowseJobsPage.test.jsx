import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import BrowseJobsPage from './BrowseJobsPage.jsx'

vi.mock('../../api/jobs.js', () => ({ searchJobs: vi.fn(), getJob: vi.fn() }))
vi.mock('../../api/masterData.js', () => ({ getCategories: vi.fn(), getAccommodationGroups: vi.fn() }))

const { searchJobs, getJob } = await import('../../api/jobs.js')
const { getCategories, getAccommodationGroups } = await import('../../api/masterData.js')

const routes = [
  { path: '/jobs', element: <BrowseJobsPage /> },
  { path: '/jobs/:id', element: <h1>Job page</h1> },
]
const meta = (total, extra = {}) => ({ current_page: 1, last_page: Math.max(1, Math.ceil(total / 12)), per_page: 12, total, ...extra })
const results = (total, jobs = [job], extra) => ({ jobs, meta: meta(total, extra) })
const candidate = { status: 'authenticated', role: 'candidate', user: { name: 'Ana', role: 'candidate' } }

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('BrowseJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchJobs.mockResolvedValue(results(15))
    getCategories.mockResolvedValue([{ id: 4, name: 'Healthcare' }])
    getAccommodationGroups.mockResolvedValue([
      { group: 'Physical access', accommodations: [{ id: 1, name: 'Wheelchair-accessible entrance', description: null, is_active: true }] },
    ])
  })
  afterEach(() => vi.useRealTimers())

  it('lists open jobs with the count, using the filters in the address', async () => {
    renderRoutes(routes, { path: '/jobs?q=web&category=4' })

    expect(await screen.findByRole('heading', { level: 2, name: '15 jobs' })).toBeInTheDocument()
    expect(searchJobs).toHaveBeenCalledWith({ q: 'web', category: '4', accommodations: [], workSetup: [], employmentType: [], sort: 'newest', page: 1 })
    expect(screen.getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('href', '/jobs/2')
    expect(screen.getByRole('searchbox', { name: 'Search jobs' })).toHaveValue('web')
  })

  it('searches 300 ms after typing stops, or at once on Enter', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { router } = renderRoutes(routes, { path: '/jobs' })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })
    const box = screen.getByRole('searchbox', { name: 'Search jobs' })

    await user.type(box, 'data')
    expect(router.state.location.search).toBe('')
    act(() => vi.advanceTimersByTime(300))
    expect(router.state.location.search).toBe('?q=data')

    await user.clear(box)
    await user.type(box, 'clerk{Enter}')
    expect(router.state.location.search).toBe('?q=clerk')
  })

  it('reads out the new count after a filter changes, but not on the first load', async () => {
    const announce = vi.fn()
    const { router } = renderRoutes(routes, { path: '/jobs?page=2', announce })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })
    expect(announce).not.toHaveBeenCalled()

    searchJobs.mockResolvedValue(results(12))
    await userEvent.click(screen.getByRole('button', { name: 'Category' }))
    await userEvent.click(await screen.findByRole('radio', { name: 'Healthcare' }))

    await waitFor(() => expect(announce).toHaveBeenCalledWith('12 jobs found'))
    expect(router.state.location.search).toBe('?category=4')
    expect(screen.getByRole('radio', { name: 'Healthcare' })).toHaveFocus()
    // The chip names the category instead of counting filters (UI_FEEDBACK_PLAN P5).
    expect(screen.getByRole('button', { name: 'Category: Healthcare' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('moves focus to the results heading after a page change', async () => {
    renderRoutes(routes, { path: '/jobs' })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })

    searchJobs.mockResolvedValue(results(15, [{ ...job, id: 3, title: 'Data Encoder' }], { current_page: 2 }))
    await userEvent.click(screen.getByRole('link', { name: 'Next' }))

    await screen.findByRole('link', { name: 'Data Encoder' })
    expect(searchJobs).toHaveBeenLastCalledWith({ q: '', category: '', accommodations: [], workSetup: [], employmentType: [], sort: 'newest', page: 2 })
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: '15 jobs' })).toHaveFocus())
  })

  it('shows the latest results when an earlier request finishes last', async () => {
    const first = deferred()
    const second = deferred()
    searchJobs.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { router } = renderRoutes(routes, { path: '/jobs' })

    await act(() => router.navigate('/jobs?category=4'))
    await act(async () => second.resolve(results(1, [{ ...job, id: 5, title: 'Pharmacy Aide' }])))
    await act(async () => first.resolve(results(1, [{ ...job, id: 6, title: 'Old Result' }])))

    expect(await screen.findByRole('link', { name: 'Pharmacy Aide' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Old Result' })).not.toBeInTheDocument()
  })

  it('restores the previous search with Back', async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, { path: '/jobs' })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })
    const box = screen.getByRole('searchbox', { name: 'Search jobs' })

    await user.type(box, 'web')
    await waitFor(() => expect(router.state.location.search).toBe('?q=web'))
    await act(() => router.navigate(-1))

    expect(box).toHaveValue('')
    expect(searchJobs).toHaveBeenLastCalledWith(expect.objectContaining({ q: '' }))
    // The search box's own pause must not put the old words back.
    await new Promise((done) => setTimeout(done, 350))
    expect(router.state.location.search).toBe('')
  })

  it('adds one history entry per search, not one per typing pause', async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, { path: '/jobs' })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })
    const box = screen.getByRole('searchbox', { name: 'Search jobs' })

    await user.type(box, 'da')
    await waitFor(() => expect(router.state.location.search).toBe('?q=da'))
    await user.type(box, 'ta')
    await waitFor(() => expect(router.state.location.search).toBe('?q=data'))
    await act(() => router.navigate(-1))

    expect(router.state.location.search).toBe('')
    expect(box).toHaveValue('')
  })

  it('reads out a failed load and stops saying the list is loading', async () => {
    const announce = vi.fn()
    const { container } = renderRoutes(routes, { path: '/jobs', announce })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })

    searchJobs.mockRejectedValueOnce({ response: { status: 500, data: {} } })
    await userEvent.click(screen.getByRole('button', { name: 'Category' }))
    await userEvent.click(await screen.findByRole('radio', { name: 'Healthcare' }))

    await waitFor(() => expect(announce).toHaveBeenCalledWith('Something went wrong on our side. Please try again in a moment.'))
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('explains an empty list and offers to clear the filters', async () => {
    searchJobs.mockResolvedValue(results(0, []))
    const { router, unmount } = renderRoutes(routes, { path: '/jobs?category=4' })

    expect(await screen.findByText('No jobs match these filters. Try fewer filters or different words.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'No jobs' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear all filters' })[0])
    expect(router.state.location.search).toBe('')
    unmount()

    renderRoutes(routes, { path: '/jobs' })
    expect(await screen.findByText('No open jobs right now. Check back soon.')).toBeInTheDocument()
  })

  it('offers the first page when the address points past the last one', async () => {
    searchJobs.mockResolvedValue(results(15, [], { current_page: 5, last_page: 2 }))
    renderRoutes(routes, { path: '/jobs?page=5' })

    expect(await screen.findByRole('link', { name: 'Go to the first page' })).toHaveAttribute('href', '/jobs')
  })

  it('shows the server’s message when a search is too long', async () => {
    searchJobs.mockRejectedValue({ response: { status: 422, data: { message: 'Invalid.', errors: { q: ['Search with 8 words or fewer.'] } } } })
    renderRoutes(routes, { path: '/jobs?q=one+two+three+four+five+six+seven+eight+nine' })

    expect(await screen.findByText('Search with 8 words or fewer.')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search jobs' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('moves focus to the results heading after Clear all filters, since the button goes away', async () => {
    renderRoutes(routes, { path: '/jobs?category=4' })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })

    await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))

    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: '15 jobs' })).toHaveFocus())
  })

  it('explains filters in the address that no longer exist, and clears them', async () => {
    searchJobs.mockRejectedValueOnce({
      response: { status: 422, data: { message: 'Invalid.', errors: { category: ['The selected category is invalid.'] } } },
    })
    const { router } = renderRoutes(routes, { path: '/jobs?q=web&category=999' })

    expect(await screen.findByText("Some filters in this address don't exist any more.")).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear all filters' }).at(-1))

    expect(router.state.location.search).toBe('?q=web')
    // The panel (closed on phones) and the results heading may both be hidden: focus goes to the search box.
    expect(screen.getByRole('searchbox', { name: 'Search jobs' })).toHaveFocus()
    expect(await screen.findByRole('heading', { level: 2, name: '15 jobs' })).toBeInTheDocument()
  })

  it('offers Try again when the jobs cannot load', async () => {
    searchJobs.mockRejectedValueOnce({ response: { status: 500, data: {} } })
    renderRoutes(routes, { path: '/jobs' })

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 2, name: '15 jobs' })).toBeInTheDocument()
  })

  it('says when the filter lists cannot load', async () => {
    getCategories.mockRejectedValue(new Error('offline'))
    renderRoutes(routes, { path: '/jobs' })

    expect(await screen.findByText("We couldn't load the filters. Reload the page to try again.")).toBeInTheDocument()
  })

  it('shows the guest line to guests only', async () => {
    const { unmount } = renderRoutes(routes, { path: '/jobs' })
    expect(await screen.findByRole('link', { name: 'Register as a job seeker' })).toHaveAttribute('href', '/register?type=candidate')
    unmount()

    renderRoutes(routes, { path: '/jobs', auth: candidate })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })
    expect(screen.queryByRole('link', { name: 'Register as a job seeker' })).not.toBeInTheDocument()
  })

  it('filters by work setup and employment type, and names every filter on the list', async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, { path: '/jobs' })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })

    await user.click(screen.getByRole('button', { name: 'Work setup' }))
    await user.click(screen.getByRole('checkbox', { name: 'Remote' }))
    await user.click(screen.getByRole('checkbox', { name: 'Hybrid' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Work setup: Hybrid +1' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Employment type' }))
    await user.click(screen.getByRole('checkbox', { name: 'Internship' }))

    expect(router.state.location.search).toBe('?work_setup=hybrid%2Cremote&type=internship')
    await waitFor(() => expect(searchJobs).toHaveBeenLastCalledWith(expect.objectContaining({ workSetup: ['hybrid', 'remote'], employmentType: ['internship'] })))
    expect(await screen.findByText('Showing: Hybrid, Remote, Internship')).toBeInTheDocument()
  })

  it('picks accommodations in a dialog', async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, { path: '/jobs' })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })

    await user.click(screen.getByRole('button', { name: 'Accommodations' }))
    await user.click(await screen.findByRole('checkbox', { name: 'Wheelchair-accessible entrance' }))
    await user.click(screen.getByRole('button', { name: 'Show jobs' }))

    expect(router.state.location.search).toBe('?accommodations=1')
    expect(screen.getByRole('button', { name: 'Accommodations: 1 accommodation' })).toHaveFocus()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderRoutes(routes, { path: '/jobs?category=4' })
    await screen.findByRole('heading', { level: 2, name: '15 jobs' })
    await screen.findByRole('button', { name: 'Category: Healthcare' })

    expect(await axe(container)).toHaveNoViolations()
  })

  describe('in two panes on wide screens (UI_FEEDBACK_PLAN Q2)', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
      const second = { ...job, id: 3, title: 'Data Encoder' }
      searchJobs.mockResolvedValue(results(2, [job, second]))
      getJob.mockImplementation(async (id) => (String(id) === '3' ? second : job))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('shows the first job beside the list, and a chosen one with focus on its heading', async () => {
      const user = userEvent.setup()
      const { router } = renderRoutes(routes, { path: '/jobs' })

      const pane = await screen.findByRole('region', { name: 'Junior Web Developer' })
      expect(screen.getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('aria-current', 'true')

      await user.click(screen.getByRole('link', { name: 'Data Encoder' }))

      expect(router.state.location.pathname).toBe('/jobs')
      expect(router.state.location.search).toBe('?job=3')
      const heading = await screen.findByRole('heading', { level: 2, name: 'Data Encoder' })
      await waitFor(() => expect(heading).toHaveFocus())
      expect(screen.getByRole('link', { name: 'Open the full job page' })).toHaveAttribute('href', '/jobs/3')
      expect(searchJobs).toHaveBeenCalledTimes(1)
      expect(pane).toHaveAccessibleName('Data Encoder')
    })
  })
})
