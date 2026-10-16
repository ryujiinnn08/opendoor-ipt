import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { needsFixture } from '../../test/candidateFixture.js'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import FindJobsPage from './FindJobsPage.jsx'

vi.mock('../../api/jobs.js', () => ({ searchJobs: vi.fn() }))
vi.mock('../../api/candidate.js', () => ({ getNeeds: vi.fn(), getProfile: vi.fn() }))
vi.mock('../../api/masterData.js', () => ({ getCategories: vi.fn(), getAccommodationGroups: vi.fn() }))

const { searchJobs } = await import('../../api/jobs.js')
const { getNeeds, getProfile } = await import('../../api/candidate.js')
const { getCategories, getAccommodationGroups } = await import('../../api/masterData.js')

const routes = [
  { path: '/candidate/jobs', element: <FindJobsPage /> },
  { path: '/candidate/jobs/:id', element: <h1>Job page</h1> },
]
const seeker = { status: 'authenticated', role: 'candidate', user: { name: 'Ana', role: 'candidate' } }
const matched = { ...job, match: { needs_total: 2, needs_met: 1, missing: ['Accessible restroom'] } }
const results = (jobs, total = jobs.length) => ({ jobs, meta: { current_page: 1, last_page: 1, per_page: 12, total } })

function renderPage(path = '/candidate/jobs') {
  return renderRoutes(routes, { path, auth: seeker })
}

describe('FindJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getNeeds.mockResolvedValue(needsFixture) // two active needs, one retired
    searchJobs.mockResolvedValue(results([matched]))
    getCategories.mockResolvedValue([])
    getAccommodationGroups.mockResolvedValue([])
    getProfile.mockResolvedValue({ open_to_work_setups: [], open_to_employment_types: [] })
    sessionStorage.clear()
  })

  it('starts in Matches my needs with each job’s match', async () => {
    renderPage()

    expect(await screen.findByText('Meets 1 of 2 of your needs')).toBeInTheDocument()
    expect(searchJobs).toHaveBeenCalledTimes(1)
    expect(searchJobs).toHaveBeenCalledWith(expect.objectContaining({ match: true, sort: 'match', show: 'matches' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Find jobs' })).toBeInTheDocument()
    expect(screen.getByText('Jobs ranked by how many of your 2 needs they meet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change my needs' })).toHaveAttribute('href', '/candidate/needs')
    expect(screen.getByRole('button', { name: 'Matches my needs' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Sort: Best match' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('href', '/candidate/jobs/2')
  })

  it('switches to All jobs', async () => {
    const { router } = renderPage()
    await screen.findByText('Meets 1 of 2 of your needs')

    await userEvent.click(screen.getByRole('button', { name: 'Matches my needs' }))

    expect(router.state.location.search).toBe('?show=all')
    await waitFor(() => expect(searchJobs).toHaveBeenLastCalledWith(expect.objectContaining({ match: false, show: 'all' })))
    expect(screen.getByRole('button', { name: 'Matches my needs' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Matches my needs' })).toHaveFocus()
  })

  it('restores Matches my needs with Back', async () => {
    const { router } = renderPage()
    await screen.findByText('Meets 1 of 2 of your needs')
    await userEvent.click(screen.getByRole('button', { name: 'Matches my needs' }))

    await act(() => router.navigate(-1))

    expect(screen.getByRole('button', { name: 'Matches my needs' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(searchJobs).toHaveBeenLastCalledWith(expect.objectContaining({ match: true, show: 'matches' })))
  })

  it('offers all jobs when none meet the needs yet', async () => {
    searchJobs.mockResolvedValue(results([]))
    const { router } = renderPage()

    expect(await screen.findByText('No open jobs meet your needs yet.')).toBeInTheDocument()
    searchJobs.mockResolvedValue(results([job], 13))
    await userEvent.click(screen.getByRole('button', { name: 'Show all jobs' }))
    expect(router.state.location.search).toBe('?show=all')
    // The button goes away with the empty list: focus moves to the results heading, and the old
    // list's empty text isn't swapped for "No open jobs right now" while the new one loads.
    expect(screen.queryByText('No open jobs right now. Check back soon.')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: '13 jobs' })).toHaveFocus())
  })

  it('says when the needs cannot load, with Try again', async () => {
    getNeeds.mockRejectedValueOnce({ response: { status: 500, data: {} } })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Meets 1 of 2 of your needs')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tell us what you need' })).not.toBeInTheDocument()
  })

  it('asks for needs first when there are none', async () => {
    getNeeds.mockResolvedValue([needsFixture[2]]) // only a retired one
    searchJobs.mockResolvedValue(results([job]))
    renderPage()

    expect(await screen.findByRole('link', { name: 'Tell us what you need' })).toHaveAttribute('href', '/candidate/needs')
    expect(screen.queryByRole('radio', { name: 'Matches my needs' })).not.toBeInTheDocument()
    // The search runs in an effect after the render that shows the link.
    await waitFor(() => expect(searchJobs).toHaveBeenCalledWith(expect.objectContaining({ sort: 'newest' })))
    expect(searchJobs).not.toHaveBeenCalledWith(expect.objectContaining({ match: true }))
  })

  it('keeps focus on the page heading while the needs load', async () => {
    let finish
    getNeeds.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    renderPage()
    const heading = screen.getByRole('heading', { level: 1, name: 'Find jobs' })
    heading.focus()

    finish(needsFixture)

    await screen.findByText('Meets 1 of 2 of your needs')
    expect(screen.getByRole('heading', { level: 1 })).toBe(heading)
    expect(heading).toHaveFocus()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderPage()
    await screen.findByText('Meets 1 of 2 of your needs')

    expect(within(container).getByRole('button', { name: 'Matches my needs' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('starts from the profile’s Open to choices, says so, and can show every kind of work (UI_FEEDBACK_WAVE_B_PLAN B1)', async () => {
    const user = userEvent.setup()
    getProfile.mockResolvedValue({ open_to_work_setups: ['remote'], open_to_employment_types: ['internship'] })
    const { router } = renderPage()

    expect(await screen.findByText('Using your Open to choices from your profile.')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?work_setup=remote&type=internship')
    expect(await screen.findByRole('button', { name: 'Work setup: Remote' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show every kind of work' }))
    expect(router.state.location.search).toBe('')
    expect(screen.queryByText('Using your Open to choices from your profile.')).not.toBeInTheDocument()
  })

  it('leaves an address that already chooses the kind of work alone', async () => {
    getProfile.mockResolvedValue({ open_to_work_setups: ['remote'], open_to_employment_types: [] })
    const { router } = renderPage('/candidate/jobs?work_setup=on_site')
    await screen.findByText('Meets 1 of 2 of your needs')
    expect(router.state.location.search).toBe('?work_setup=on_site')
    expect(screen.queryByText('Using your Open to choices from your profile.')).not.toBeInTheDocument()
  })
})
