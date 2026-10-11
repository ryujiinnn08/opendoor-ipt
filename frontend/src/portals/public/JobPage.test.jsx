import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import JobPage from './JobPage.jsx'

vi.mock('../../api/jobs.js', () => ({ getJob: vi.fn() }))
const { getJob } = await import('../../api/jobs.js')

const routes = [{ path: '/jobs/:id', element: <JobPage /> }]

describe('JobPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows an open job with its employer link', async () => {
    getJob.mockResolvedValue(job)
    const { container } = renderRoutes(routes, { path: '/jobs/2' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Junior Web Developer' })).toBeInTheDocument()
    expect(getJob).toHaveBeenCalledWith('2')
    expect(screen.getByRole('link', { name: 'Acme Corp.' })).toHaveAttribute('href', '/employers/1')
    expect(screen.getByRole('heading', { name: 'Accommodations provided' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to jobs' })).toHaveAttribute('href', '/jobs')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('explains a job that is not open', async () => {
    getJob.mockRejectedValue({ response: { status: 404, data: {} } })
    renderRoutes(routes, { path: '/jobs/9' })

    expect(await screen.findByText("This job isn't open. It may have closed or been removed.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse open jobs' })).toHaveAttribute('href', '/jobs')
  })

  it('offers Try again when the job cannot load for another reason', async () => {
    getJob.mockRejectedValueOnce({ response: { status: 500, data: {} } }).mockResolvedValueOnce(job)
    renderRoutes(routes, { path: '/jobs/2' })

    expect(await screen.findByText('Something went wrong on our side. Please try again in a moment.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Job' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Junior Web Developer' })).toBeInTheDocument()
  })

  it('never sends an address that is not a job number to the server', async () => {
    renderRoutes(routes, { path: '/jobs/..%2Fme' })

    expect(await screen.findByText("This job isn't open. It may have closed or been removed.")).toBeInTheDocument()
    expect(getJob).not.toHaveBeenCalled()
  })

  it('keeps focus on the page heading when the job finishes loading', async () => {
    let finish
    getJob.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    renderRoutes(routes, { path: '/jobs/2' })

    const heading = screen.getByRole('heading', { level: 1 })
    heading.focus()
    finish(job)

    await screen.findByRole('heading', { level: 1, name: 'Junior Web Developer' })
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBe(heading))
    expect(document.activeElement).toBe(heading)
  })

  it('uses the base paths it is given', async () => {
    getJob.mockResolvedValue(job)
    renderRoutes([{ path: '/candidate/jobs/:id', element: <JobPage basePath="/candidate/jobs" employerBasePath="/candidate/employers" /> }], {
      path: '/candidate/jobs/2',
    })

    expect(await screen.findByRole('link', { name: 'Acme Corp.' })).toHaveAttribute('href', '/candidate/employers/1')
    expect(screen.getByRole('link', { name: 'Back to jobs' })).toHaveAttribute('href', '/candidate/jobs')
  })
})
