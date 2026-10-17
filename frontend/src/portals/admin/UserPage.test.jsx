import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import UserPage from './UserPage.jsx'

vi.mock('../../api/admin.js', () => ({
  getUser: vi.fn(),
  setSuspended: vi.fn(),
  replaceTemporaryPassword: vi.fn(),
  updateUser: vi.fn(),
  getUserPhoto: vi.fn(),
}))

const { getUser, setSuspended, replaceTemporaryPassword, updateUser } = await import('../../api/admin.js')

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
  profile: { headline: 'Data encoder', city: 'Quezon City', province: 'Metro Manila', photo_version: null },
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

  it('shows the account with its role, card basics, counts and history', async () => {
    getUser.mockResolvedValue({ ...maria, history: [suspendedEvent] })
    const { container } = renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Santos' })).toBeInTheDocument()
    expect(screen.getByText('Job seeker')).toBeInTheDocument()
    expect(screen.getByText('maria@example.com')).toBeInTheDocument()
    expect(screen.getByText('Data encoder · Quezon City, Metro Manila')).toBeInTheDocument()
    expect(screen.getByText('Joined October 2, 2026')).toBeInTheDocument()
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

  it('makes a new temporary password for an administrator who lost theirs', async () => {
    const rosa = { ...maria, name: 'Rosa Lim', role: 'admin', applications: undefined, must_change_password: true }
    getUser.mockResolvedValue(rosa)
    replaceTemporaryPassword.mockResolvedValue({ user: rosa, temporaryPassword: 'Kq7!mPz2Rt9@wXy4' })
    renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    await userEvent.click(await screen.findByRole('button', { name: 'Make a new temporary password' }))
    const dialog = screen.getByRole('dialog', { name: 'Make a new temporary password for Rosa Lim?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Make a new password' }))

    expect(replaceTemporaryPassword).toHaveBeenCalledWith(3)
    expect(await screen.findByLabelText('Temporary password')).toHaveValue('Kq7!mPz2Rt9@wXy4')
    expect(screen.queryByRole('button', { name: 'Make a new temporary password' })).not.toBeInTheDocument()
  })

  it('starts fresh when the address moves to another account', async () => {
    getUser.mockImplementation(async (id) => (id === '3' ? maria : { ...maria, id: 4, name: 'Jose Reyes' }))
    setSuspended.mockResolvedValue({ ...maria, is_active: false })
    const { router } = renderRoutes(routes, { path: '/admin/users/3', auth: admin })
    await screen.findByRole('heading', { level: 1, name: 'Maria Santos' })

    await act(() => router.navigate('/admin/users/4'))

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend Jose Reyes' }))
    const dialog = screen.getByRole('dialog', { name: 'Suspend Jose Reyes?' })
    await userEvent.type(within(dialog).getByLabelText('Why (only administrators see this)'), 'Posted fake jobs.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend Jose Reyes' }))

    expect(setSuspended).toHaveBeenCalledWith(4, true, 'Posted fake jobs.')
  })

  it('keeps the same heading while the account loads, so focus given to it stays', async () => {
    let finish
    getUser.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    const heading = screen.getByRole('heading', { level: 1, name: 'Account' })
    heading.focus()
    await act(async () => finish(maria))

    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Santos' })).toBe(heading)
    expect(heading).toHaveFocus()
  })

  it('edits the name and email with a reason, then shows the saved account', async () => {
    getUser.mockResolvedValue(maria)
    updateUser.mockResolvedValue({ ...maria, name: 'Maria Santos-Cruz', email: 'maria.cruz@example.com', history: [{ id: 11, type: 'details_edited', reason: 'Name: Maria Santos → Maria Santos-Cruz. Why: Asked by email.', by: 'Ana Cruz', at: '2026-10-17T10:00:00+08:00' }] })
    renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    await userEvent.click(await screen.findByRole('button', { name: 'Edit details' }))
    const dialog = screen.getByRole('dialog', { name: "Edit Maria Santos's details" })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(within(dialog).getByText('Say why you are changing these details.')).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()

    const name = within(dialog).getByLabelText('Full name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Maria Santos-Cruz')
    const email = within(dialog).getByLabelText('Email address')
    await userEvent.clear(email)
    await userEvent.type(email, 'maria.cruz@example.com')
    await userEvent.type(within(dialog).getByLabelText(/Why/), 'Asked by email.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(updateUser).toHaveBeenCalledWith(3, { name: 'Maria Santos-Cruz', email: 'maria.cruz@example.com', reason: 'Asked by email.' })
    expect(await screen.findByText("Maria Santos-Cruz's details are saved.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Maria Santos-Cruz' })).toBeInTheDocument()
    expect(screen.getByText('Details edited on October 17, 2026 by Ana Cruz:')).toBeInTheDocument()
  })

  it('shows a taken email next to the field', async () => {
    getUser.mockResolvedValue(maria)
    updateUser.mockRejectedValue({ response: { status: 422, data: { errors: { email: ['An account with this email already exists.'] } } } })
    renderRoutes(routes, { path: '/admin/users/3', auth: admin })

    await userEvent.click(await screen.findByRole('button', { name: 'Edit details' }))
    const dialog = screen.getByRole('dialog')
    const email = within(dialog).getByLabelText('Email address')
    await userEvent.clear(email)
    await userEvent.type(email, 'taken@example.com')
    await userEvent.type(within(dialog).getByLabelText(/Why/), 'Asked by email.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByText('An account with this email already exists.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Email address')).toHaveFocus()
  })
})
