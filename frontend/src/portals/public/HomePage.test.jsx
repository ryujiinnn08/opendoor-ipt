import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import HomePage from './HomePage.jsx'

vi.mock('../../api/jobs.js', () => ({ searchJobs: vi.fn() }))
const { searchJobs } = await import('../../api/jobs.js')

const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/jobs', element: <h1>Browse jobs</h1> },
]
const threeJobs = [job, { ...job, id: 3, title: 'Data Encoder' }, { ...job, id: 4, title: 'Pharmacy Aide' }]

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchJobs.mockResolvedValue({ jobs: threeJobs, meta: { current_page: 1, last_page: 5, per_page: 3, total: 13 } })
  })

  it('starts a job search from Home', async () => {
    const { router } = renderRoutes(routes, { path: '/' })

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search jobs' }), 'encoder')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(router.state.location.pathname).toBe('/jobs')
    expect(router.state.location.search).toBe('?q=encoder')
  })

  it('opens every job when the search is blank', async () => {
    const { router } = renderRoutes(routes, { path: '/' })

    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(router.state.location.pathname).toBe('/jobs')
    expect(router.state.location.search).toBe('')
  })

  it('shows three open jobs and a link to all of them', async () => {
    const { container } = renderRoutes(routes, { path: '/' })

    expect(await screen.findByRole('heading', { level: 2, name: 'Open jobs' })).toBeInTheDocument()
    expect(searchJobs).toHaveBeenCalledWith({ sort: 'newest', perPage: 3 })
    expect(screen.getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('href', '/jobs/2')
    expect(screen.getByRole('link', { name: 'Data Encoder' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pharmacy Aide' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse all jobs' })).toHaveAttribute('href', '/jobs')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('leaves the jobs out quietly when they cannot load', async () => {
    searchJobs.mockRejectedValue(new Error('offline'))
    const { container } = renderRoutes(routes, { path: '/' })

    await screen.findByRole('heading', { level: 2, name: 'How OpenDoor works' })
    await new Promise((done) => setTimeout(done, 0))
    expect(screen.queryByRole('heading', { name: 'Open jobs' })).not.toBeInTheDocument()
    expect(screen.queryByText(/went wrong|couldn't|could not/i)).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('keeps the register links for guests', () => {
    renderRoutes(routes, { path: '/' })
    expect(screen.getByRole('link', { name: 'Register as a job seeker' })).toHaveAttribute('href', '/register?type=candidate')
  })
})
