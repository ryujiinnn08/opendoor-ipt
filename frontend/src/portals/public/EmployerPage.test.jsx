import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import EmployerPage from './EmployerPage.jsx'

vi.mock('../../api/jobs.js', () => ({ getEmployer: vi.fn(), searchJobs: vi.fn() }))
const { getEmployer, searchJobs } = await import('../../api/jobs.js')

const routes = [{ path: '/employers/:id', element: <EmployerPage /> }]
const company = {
  id: 1,
  type: 'company',
  name: 'Acme Corp.',
  industry: 'Healthcare',
  address: 'Quezon City',
  description: 'We hire inclusively.',
  logo_url: null,
  is_verified: true,
}
const jobs = [job, { ...job, id: 3, title: 'Data Encoder' }]
const meta = (extra = {}) => ({ current_page: 1, last_page: 1, per_page: 12, total: 2, ...extra })

describe('EmployerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchJobs.mockResolvedValue({ jobs, meta: meta() })
  })

  it('shows a company and its open jobs', async () => {
    getEmployer.mockResolvedValue(company)
    const { container } = renderRoutes(routes, { path: '/employers/1' })

    expect(await screen.findByRole('heading', { level: 2, name: 'Open jobs (2)' })).toBeInTheDocument()
    expect(getEmployer).toHaveBeenCalledWith('1')
    expect(searchJobs).toHaveBeenCalledWith({ employer: 1, sort: 'newest', page: 1 })
    expect(screen.getByRole('heading', { level: 1, name: 'Acme Corp.' })).toBeInTheDocument()
    // The company's badge once; its job rows don't repeat the employer.
    expect(screen.getAllByText('Verified company')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: 'Open jobs (2)' })).queryByText('Acme Corp.')).not.toBeInTheDocument()
    expect(screen.getByText('Industry')).toBeInTheDocument()
    expect(screen.getByText('Healthcare')).toBeInTheDocument()
    expect(screen.getByText('About the company')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('href', '/jobs/2')
    expect(screen.getByRole('link', { name: 'Data Encoder' })).toHaveAttribute('href', '/jobs/3')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows an individual employer without company details', async () => {
    getEmployer.mockResolvedValue({ ...company, type: 'individual', name: 'Maria Cruz', industry: null, is_verified: false })
    renderRoutes(routes, { path: '/employers/1' })

    expect(await screen.findByText('Individual employer')).toBeInTheDocument()
    expect(screen.getByText('City or municipality')).toBeInTheDocument()
    expect(screen.queryByText('Industry')).not.toBeInTheDocument()
  })

  it('says when the employer has no open jobs right now', async () => {
    getEmployer.mockResolvedValue(company)
    searchJobs.mockResolvedValue({ jobs: [], meta: meta({ total: 0 }) })
    renderRoutes(routes, { path: '/employers/1' })

    expect(await screen.findByRole('heading', { level: 2, name: 'No open jobs right now.' })).toBeInTheDocument()
  })

  it('moves focus to the jobs heading after a page change', async () => {
    getEmployer.mockResolvedValue(company)
    searchJobs.mockResolvedValue({ jobs, meta: meta({ total: 14, last_page: 2 }) })
    renderRoutes(routes, { path: '/employers/1' })

    await userEvent.click(await screen.findByRole('link', { name: 'Next' }))

    await waitFor(() => expect(searchJobs).toHaveBeenLastCalledWith({ employer: 1, sort: 'newest', page: 2 }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Open jobs (14)' })).toHaveFocus())
  })

  it('offers Try again when the employer or the jobs cannot load', async () => {
    getEmployer.mockRejectedValueOnce({ response: { status: 500, data: {} } }).mockResolvedValue(company)
    searchJobs.mockRejectedValueOnce({ response: { status: 500, data: {} } })
    renderRoutes(routes, { path: '/employers/1' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Employer' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Acme Corp.' })).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Open jobs (2)' })).toBeInTheDocument()
  })

  it('never sends an address that is not an employer number to the server', async () => {
    renderRoutes(routes, { path: '/employers/..%2Fme' })

    expect(await screen.findByText("We couldn't find this employer. They may not have published a job yet.")).toBeInTheDocument()
    expect(getEmployer).not.toHaveBeenCalled()
  })

  it('explains an employer page that does not exist', async () => {
    getEmployer.mockRejectedValue({ response: { status: 404, data: {} } })
    renderRoutes(routes, { path: '/employers/9' })

    expect(await screen.findByText("We couldn't find this employer. They may not have published a job yet.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse jobs' })).toHaveAttribute('href', '/jobs')
    expect(searchJobs).not.toHaveBeenCalled()
  })
})
