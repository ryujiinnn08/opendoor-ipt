import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import EmployerDashboard from './EmployerDashboard.jsx'

vi.mock('../../api/employer.js', () => ({
  getDepartments: vi.fn(),
  getEmployerDashboard: vi.fn(),
}))

const { getDepartments, getEmployerDashboard } = await import('../../api/employer.js')

const company = { id: 1, type: 'company', name: 'Acme Corp.', is_verified: true, verification_status: 'verified' }
const auth = (membership) => ({ status: 'authenticated', role: 'employer', user: { name: 'Ana', role: 'employer', membership } })

describe('EmployerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDepartments.mockResolvedValue({ departments: [], cap: 10, defaultLimit: 3 })
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
    expect(await within(tile).findByText('Not enough responses yet.')).toBeInTheDocument()
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
})
