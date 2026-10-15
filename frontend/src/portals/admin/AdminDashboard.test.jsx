import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import AdminDashboard from './AdminDashboard.jsx'

vi.mock('../../api/admin.js', () => ({
  getAdminDashboard: vi.fn(),
}))

const { getAdminDashboard } = await import('../../api/admin.js')

const routes = [{ path: '/', element: <AdminDashboard /> }]
const admin = { status: 'authenticated', role: 'admin', user: { name: 'Admin', role: 'admin' } }
const counts = {
  companies_waiting_for_verification: 2,
  postings_waiting_for_approval: 0,
  job_seekers: 42,
  employer_accounts: 9,
  companies: 7,
  individual_employers: 1,
  administrators: 2,
  suspended_accounts: 1,
  open_jobs: 14,
  applications: 12,
  hires: 6,
  employers_with_trust_score: 1,
  categories: 10,
  active_accommodations: 18,
  hr_per_department_cap: 10,
}

describe('AdminDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it("leads with what's waiting, as sentences linking to each queue", async () => {
    getAdminDashboard.mockResolvedValue(counts)
    renderRoutes(routes, { auth: admin })

    const waiting = (await screen.findByRole('heading', { name: 'Waiting for you' })).closest('section')
    expect(within(waiting).getByText('2 companies to verify')).toBeInTheDocument()
    expect(within(waiting).getByText('Nothing waiting for approval')).toBeInTheDocument()
    expect(within(waiting).getByRole('link', { name: 'Review companies' })).toHaveAttribute('href', '/admin/employers')
    expect(within(waiting).getByRole('link', { name: 'Review postings' })).toHaveAttribute('href', '/admin/job-postings')
  })

  it('shows OpenDoor in numbers, with a way to the suspended accounts', async () => {
    getAdminDashboard.mockResolvedValue(counts)
    renderRoutes(routes, { auth: admin })

    const numbers = (await screen.findByRole('heading', { name: 'OpenDoor in numbers' })).closest('section')
    expect(within(numbers).getByText('42')).toBeInTheDocument()
    expect(within(numbers).getByText('(7 companies, 1 individual)')).toBeInTheDocument()
    expect(within(numbers).getByRole('link', { name: 'See who' })).toHaveAttribute(
      'href',
      '/admin/users?status=suspended',
    )
  })

  it('keeps the shared list tiles', async () => {
    getAdminDashboard.mockResolvedValue(counts)
    renderRoutes(routes, { auth: admin })

    const tile = (await screen.findByRole('heading', { name: 'Categories' })).closest('li')
    expect(await within(tile).findByText('10')).toBeInTheDocument()
  })

  it('says when the numbers cannot be loaded, and tries again', async () => {
    getAdminDashboard.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(counts)
    renderRoutes(routes, { auth: admin })

    expect(await screen.findByText("We couldn't load the numbers on this page.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('2 companies to verify')).toBeInTheDocument()
    expect(screen.queryByText("We couldn't load the numbers on this page.")).not.toBeInTheDocument()
  })
})
