import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import EmployerDashboard from './EmployerDashboard.jsx'

vi.mock('../../api/employer.js', () => ({
  getDepartments: vi.fn(),
  getEmployerDashboard: vi.fn(),
  getDashboardActivity: vi.fn(),
}))

const { getDepartments, getEmployerDashboard, getDashboardActivity } = await import('../../api/employer.js')
const WEEKS = ['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']

const company = { id: 1, type: 'company', name: 'Acme Corp.', is_verified: true, verification_status: 'verified' }
const auth = (membership) => ({ status: 'authenticated', role: 'employer', user: { name: 'Ana', role: 'employer', membership } })

describe('EmployerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDepartments.mockResolvedValue({ departments: [], cap: 10, defaultLimit: 3 })
    getDashboardActivity.mockResolvedValue({ weeks: WEEKS, applications_by_week: [0, 0, 0, 0, 0, 0, 0, 0], applicants_by_posting: [] })
  })

  it('counts the postings by status and links to them', async () => {
    getEmployerDashboard.mockResolvedValue({ postings: { draft: 2, pending: 1, open: 3, rejected: 0, closed: 0 } })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'owner', employer: company, department: null }) })

    const tile = (await screen.findByRole('heading', { name: 'Job postings' })).closest('li')
    expect(await within(tile).findByText('3 open')).toBeInTheDocument()
    expect(within(tile).getByText('1 waiting for approval')).toBeInTheDocument()
    expect(within(tile).getByText('2 drafts')).toBeInTheDocument()
    expect(within(tile).queryByText(/rejected/)).not.toBeInTheDocument()
    expect(within(tile).getByRole('link', { name: 'Manage job postings' })).toHaveAttribute('href', '/employer/job-postings')
  })

  it('shows the trust score tile to every kind of employer', async () => {
    getEmployerDashboard.mockResolvedValue({ postings: { draft: 0, pending: 0, open: 1, rejected: 0, closed: 0 }, trust_score: { score: 88, responses: 4 } })
    const memberships = [
      { role: 'owner', employer: company, department: null },
      { role: 'hr', employer: company, department: { id: 5, name: 'IT' } },
      { role: 'owner', employer: { ...company, type: 'individual' }, department: null },
    ]
    for (const membership of memberships) {
      const { unmount } = renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth(membership) })
      const tile = (await screen.findByRole('heading', { name: 'Trust score' })).closest('li')
      expect(await within(tile).findByText((_, element) => element.tagName === 'DIV' && element.textContent === '88%, based on 4 hires')).toBeInTheDocument()
      expect(within(tile).getByRole('link', { name: 'See your trust score' })).toHaveAttribute('href', '/employer/trust-score')
      unmount()
    }
  })

  it('says not enough responses yet, with no count', async () => {
    getEmployerDashboard.mockResolvedValue({ postings: { draft: 0, pending: 0, open: 1, rejected: 0, closed: 0 }, trust_score: { score: null, responses: null } })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'owner', employer: company, department: null }) })

    const tile = (await screen.findByRole('heading', { name: 'Trust score' })).closest('li')
    expect(await within(tile).findByText('Not enough responses yet. The score appears once 3 hired employees have rated this employer.')).toBeInTheDocument()
  })

  it("names the HR officer's department", async () => {
    getEmployerDashboard.mockResolvedValue({ postings: { draft: 0, pending: 0, open: 0, rejected: 0, closed: 0 } })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], {
      auth: auth({ role: 'hr', employer: company, department: { id: 5, name: 'IT' } }),
    })

    const tile = (await screen.findByRole('heading', { name: 'IT job postings' })).closest('li')
    expect(await within(tile).findByText('No job postings yet.')).toBeInTheDocument()
  })

  it('says when the posting counts cannot be loaded, and tries again', async () => {
    getEmployerDashboard
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ postings: { draft: 0, pending: 0, open: 3, rejected: 0, closed: 0 } })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'owner', employer: company, department: null }) })

    const tile = (await screen.findByRole('heading', { name: 'Job postings' })).closest('li')
    expect(await within(tile).findByText("We couldn't load your posting counts.")).toBeInTheDocument()
    await userEvent.click(within(tile).getByRole('button', { name: 'Try again' }))

    expect(await within(tile).findByText('3 open')).toBeInTheDocument()
    expect(within(tile).queryByText("We couldn't load your posting counts.")).not.toBeInTheDocument()
  })

  it('says when the team cannot be loaded, and tries again', async () => {
    getEmployerDashboard.mockResolvedValue({ postings: { draft: 0, pending: 0, open: 0, rejected: 0, closed: 0 } })
    getDepartments
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({
        departments: [{ id: 5, name: 'IT', places_used: 1, effective_limit: 2, hr_officers: [{ id: 9 }] }],
        cap: 10,
        defaultLimit: 3,
      })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'owner', employer: company, department: null }) })

    const tile = (await screen.findByRole('heading', { name: 'Team' })).closest('li')
    expect(await within(tile).findByText("We couldn't load your team.")).toBeInTheDocument()
    await userEvent.click(within(tile).getByRole('button', { name: 'Try again' }))

    expect(await within(tile).findByText('IT: 1 of 2 places used')).toBeInTheDocument()
  })

  it('lists the postings with applicants waiting for review, loading the dashboard once', async () => {
    getEmployerDashboard.mockResolvedValue({
      postings: { draft: 0, pending: 0, open: 2, rejected: 0, closed: 0 },
      waiting_applicants: {
        total: 3,
        postings: [
          { id: 2, title: 'HR Assistant', new: 2 },
          { id: 1, title: 'Junior Web Developer', new: 1 },
        ],
      },
    })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'hr', employer: company, department: { id: 5, name: 'HR' } }) })

    const section = (await screen.findByRole('heading', { level: 2, name: 'Applicants waiting for review' })).closest('section')
    expect(await within(section).findByRole('link', { name: 'HR Assistant: 2 new' })).toHaveAttribute('href', '/employer/job-postings/2/applicants')
    expect(within(section).getByRole('link', { name: 'Junior Web Developer: 1 new' })).toBeInTheDocument()
    expect(await screen.findByText('2 open')).toBeInTheDocument()
    expect(getEmployerDashboard).toHaveBeenCalledTimes(1)
  })

  it('says when nobody is waiting for review', async () => {
    getEmployerDashboard.mockResolvedValue({ postings: { draft: 0, pending: 0, open: 1, rejected: 0, closed: 0 }, waiting_applicants: { total: 0, postings: [] } })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'owner', employer: { id: 2, type: 'individual', name: 'Maria' }, department: null }) })

    expect(await screen.findByText('No applicants are waiting for review.')).toBeInTheDocument()
  })

  it('says when the applicants waiting for review could not be loaded', async () => {
    getEmployerDashboard.mockRejectedValueOnce({ response: { status: 500, data: {} } }).mockResolvedValue({
      postings: { draft: 0, pending: 0, open: 1, rejected: 0, closed: 0 },
      waiting_applicants: { total: 1, postings: [{ id: 2, title: 'HR Assistant', new: 1 }] },
    })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'hr', employer: company, department: { id: 5, name: 'HR' } }) })

    const section = (await screen.findByRole('heading', { level: 2, name: 'Applicants waiting for review' })).closest('section')
    expect(await within(section).findByText("We couldn't load the applicants waiting for review.")).toBeInTheDocument()
    await userEvent.click(within(section).getByRole('button', { name: 'Try again' }))
    expect(await within(section).findByRole('link', { name: 'HR Assistant: 1 new' })).toBeInTheDocument()
  })

  it('charts applications by week and applicants per open job, with the numbers as a table (UI_FEEDBACK_WAVE_B_PLAN B3)', async () => {
    getEmployerDashboard.mockResolvedValue({ postings: { draft: 0, pending: 0, open: 1, rejected: 0, closed: 0 }, profile_complete: true })
    getDashboardActivity.mockResolvedValue({
      weeks: WEEKS,
      applications_by_week: [0, 0, 0, 0, 0, 1, 4, 11],
      applicants_by_posting: [{ id: 3, title: 'Data Encoder', counts: { pending: 5, reviewed: 3, hired: 1, rejected: 2, withdrawn: 0 } }],
    })
    const { container } = renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'owner', employer: company, department: null }) })

    const weekly = await screen.findByRole('figure', { name: 'Applications received, by week' })
    expect(within(weekly).getByText('11 applications this week, up from 4 last week. 16 applications in 8 weeks.')).toBeInTheDocument()
    expect(within(weekly).getByRole('row', { name: 'Week of October 12 11' })).toBeInTheDocument()

    const perJob = screen.getByRole('figure', { name: 'Applicants per open job' })
    expect(within(perJob).getByText('Data Encoder has the most: 11 applicants.')).toBeInTheDocument()
    expect(within(perJob).getByRole('row', { name: 'Data Encoder 5 3 1 2 11' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows Get started to owners until every step is done', async () => {
    getEmployerDashboard.mockResolvedValue({ postings: { draft: 0, pending: 0, open: 0, rejected: 0, closed: 0 }, profile_complete: true })
    renderRoutes([{ path: '/', element: <EmployerDashboard /> }], { auth: auth({ role: 'owner', employer: { ...company, verification_status: 'not_submitted' }, department: null }) })

    const start = await screen.findByRole('region', { name: 'Get started' })
    expect(within(start).getByText('1 of 4 done')).toBeInTheDocument()
    expect(within(start).getByRole('link', { name: 'Post your first job: to do' })).toHaveAttribute('href', '/employer/job-postings/new')
  })
})
