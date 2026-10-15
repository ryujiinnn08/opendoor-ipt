import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import UserPage from './UserPage.jsx'

vi.mock('../../api/admin.js', () => ({
  getUser: vi.fn(),
  setSuspended: vi.fn(),
}))

const { getUser, setSuspended } = await import('../../api/admin.js')

const routes = [{ path: '/admin/users/:id', element: <UserPage /> }]
const admin = { status: 'authenticated', role: 'admin', user: { name: 'Ana Cruz', role: 'admin' } }
const maria = {
  id: 3,
  name: 'Maria Santos',
  email: 'maria@example.com',
  role: 'candidate',
  is_active: true,
  joined_at: '2026-10-02T10:00:00+08:00',
  last_login_at: '2026-10-15T09:00:00+08:00',
  must_change_password: false,
  is_you: false,
  applications: { total: 4, hires: 1 },
  history: [],
}
const suspendedEvent = {
  id: 9,
  type: 'suspended',
  reason: 'Posted fake jobs, reported by 3 job seekers.',
  by: 'Ana Cruz',
  at: '2026-10-16T10:00:00+08:00',
}

describe('UserPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the account, its counts and its history, but nothing from the profile', async () => {
    getUser.mockResolvedValue({ ...maria, history: [suspendedEvent] })
    const { container } = renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Santos' })).toBeInTheDocument()
    expect(screen.getByText('Job seeker, maria@example.com')).toBeInTheDocument()
    expect(screen.getByText('4 applications, 1 hire')).toBeInTheDocument()
    const history = screen.getByRole('heading', { name: 'History' }).closest('section')
    expect(within(history).getByText('Suspended on October 16, 2026 by Ana Cruz:')).toBeInTheDocument()
    expect(within(history).getByText('“Posted fake jobs, reported by 3 job seekers.”')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('suspends with a reason, then shows the new state and history', async () => {
    getUser.mockResolvedValue(maria)
    setSuspended.mockResolvedValue({ ...maria, is_active: false, history: [suspendedEvent] })
    const announce = vi.fn()
    renderRoutes(routes, { path: '/admin/users/3', auth: admin, announce })

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend Maria Santos' }))
    const dialog = screen.getByRole('dialog', { name: 'Suspend Maria Santos?' })
    expect(within(dialog).getByText(/Their applications stay as they are/)).toBeInTheDocument()

    await userEvent.type(within(dialog).getByLabelText('Why (only administrators see this)'), 'Bad')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend Maria Santos' }))
    expect(within(dialog).getByText('Use at least 5 characters.')).toBeInTheDocument()
    expect(setSuspended).not.toHaveBeenCalled()

    await userEvent.clear(within(dialog).getByLabelText('Why (only administrators see this)'))
    await userEvent.type(within(dialog).getByLabelText('Why (only administrators see this)'), suspendedEvent.reason)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend Maria Santos' }))

    expect(setSuspended).toHaveBeenCalledWith(3, true, suspendedEvent.reason)
    expect(await screen.findByText("Maria Santos's account is suspended.")).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith("Maria Santos's account is suspended.")
    expect(screen.getByRole('button', { name: 'Reactivate Maria Santos' })).toBeInTheDocument()
    expect(screen.getByText("Can't log in until an administrator reactivates the account.")).toBeInTheDocument()
  })

  it('reactivates a suspended account', async () => {
    getUser.mockResolvedValue({ ...maria, is_active: false })
    setSuspended.mockResolvedValue(maria)
    renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    await userEvent.click(await screen.findByRole('button', { name: 'Reactivate Maria Santos' }))
    const dialog = screen.getByRole('dialog', { name: 'Reactivate Maria Santos?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reactivate Maria Santos' }))

    expect(setSuspended).toHaveBeenCalledWith(3, false, undefined)
    expect(await screen.findByText("Maria Santos's account is active again.")).toBeInTheDocument()
  })

  it('shows a refusal in the dialog', async () => {
    getUser.mockResolvedValue({ ...maria, role: 'admin' })
    setSuspended.mockRejectedValue({ response: { status: 422, data: { message: 'OpenDoor needs at least one active administrator.' } } })
    renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend Maria Santos' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Why (only administrators see this)'), 'Left the team.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend Maria Santos' }))

    expect(await within(dialog).findByText('OpenDoor needs at least one active administrator.')).toBeInTheDocument()
  })

  it("doesn't offer suspending your own account", async () => {
    getUser.mockResolvedValue({ ...maria, role: 'admin', is_you: true })
    renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    expect(await screen.findByText(/This is your account, so you can't suspend it here/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Suspend/ })).not.toBeInTheDocument()
  })

  it("lists an employer's postings with a way to remove each", async () => {
    getUser.mockResolvedValue({
      ...maria,
      role: 'employer',
      applications: undefined,
      employer: { id: 1, name: 'Acme Corp.', type: 'company', member_role: 'owner', department: null },
      postings: [{ id: 7, title: 'Junior Web Developer', status: 'open' }],
    })
    renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    expect(await screen.findByText('Owner of Acme Corp.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('href', '/admin/job-postings/7')
  })
})
