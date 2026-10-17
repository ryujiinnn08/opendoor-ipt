import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import UsersPage from './UsersPage.jsx'

vi.mock('../../api/admin.js', () => ({
  getUsers: vi.fn(),
  setSuspended: vi.fn(),
  updateUser: vi.fn(),
  getUserPhoto: vi.fn(),
}))

const { getUsers, setSuspended } = await import('../../api/admin.js')

const routes = [{ path: '/admin/users', element: <UsersPage /> }]
const admin = { status: 'authenticated', role: 'admin', user: { name: 'Admin', role: 'admin' } }
const page = (data, meta = {}) => ({ data, meta: { current_page: 1, last_page: 1, total: data.length, ...meta } })
const maria = {
  id: 3,
  name: 'Maria Santos',
  email: 'maria@example.com',
  role: 'candidate',
  is_active: false,
  joined_at: '2026-10-02T10:00:00+08:00',
  last_login_at: '2026-10-15T09:00:00+08:00',
  profile: { headline: 'Data encoder', city: 'Quezon City', province: null, photo_version: null },
}
const ana = {
  id: 4,
  name: 'Ana Reyes',
  email: 'ana@acme.test',
  role: 'employer',
  is_active: true,
  joined_at: '2026-10-05T10:00:00+08:00',
  last_login_at: null,
  employer: { id: 1, name: 'Acme Corp.', type: 'company', member_role: 'hr', department: 'IT' },
}

describe('UsersPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists accounts with a picture, role, email, card basics, dates and status', async () => {
    getUsers.mockResolvedValue(page([maria, ana]))
    const { container } = renderRoutes(routes, { path: '/admin/users', auth: admin })

    expect(await screen.findByRole('heading', { name: '2 accounts' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Maria Santos' })).toHaveAttribute('href', '/admin/users/3')
    expect(screen.getByText('Job seeker')).toBeInTheDocument()
    expect(screen.getByText('maria@example.com')).toBeInTheDocument()
    expect(screen.getByText('Data encoder · Quezon City')).toBeInTheDocument()
    expect(screen.getByText('Last logged in October 15, 2026')).toBeInTheDocument()
    expect(screen.getByText('Suspended', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Employer')).toBeInTheDocument()
    expect(screen.getByText('HR officer in IT at Acme Corp.')).toBeInTheDocument()
    expect(screen.getByText('Not logged in since this was recorded')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add an administrator' })).toHaveAttribute('href', '/admin/users/new')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('searches through the address and reads the filters from it', async () => {
    getUsers.mockResolvedValue(page([maria]))
    const { router } = renderRoutes(routes, { path: '/admin/users?role=candidate', auth: admin })

    await screen.findByRole('heading', { name: '1 account found' })
    expect(getUsers).toHaveBeenLastCalledWith({ q: undefined, role: 'candidate', status: undefined, page: 1 })
    expect(screen.getByLabelText('Role')).toHaveValue('candidate')

    await userEvent.type(screen.getByLabelText('Name or email'), 'santos')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'suspended')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(router.state.location.search).toBe('?q=santos&role=candidate&status=suspended')
    expect(getUsers).toHaveBeenLastCalledWith({ q: 'santos', role: 'candidate', status: 'suspended', page: 1 })
    expect(await screen.findByRole('heading', { name: '1 account found' })).toHaveFocus()
  })

  it('says when nothing matches and offers every account', async () => {
    getUsers.mockResolvedValue(page([]))
    renderRoutes(routes, { path: '/admin/users?q=zzz', auth: admin })

    expect(await screen.findByText('No accounts match. Check the spelling, or search with fewer filters.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Show every account' })).toHaveAttribute('href', '/admin/users')
  })

  it('pages through 20 at a time, keeping the search', async () => {
    getUsers.mockResolvedValue(page([maria], { total: 41, last_page: 3, current_page: 2 }))
    renderRoutes(routes, { path: '/admin/users?q=a&page=2', auth: admin })

    await screen.findByRole('heading', { name: '41 accounts found' })
    expect(getUsers).toHaveBeenLastCalledWith({ q: 'a', role: undefined, status: undefined, page: 2 })
    expect(screen.getByRole('link', { name: 'Page 3' })).toHaveAttribute('href', '/admin/users?q=a&page=3')
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/admin/users?q=a')
  })

  it('suspends from the Actions menu and updates the row', async () => {
    const jose = { ...maria, id: 5, name: 'Jose Reyes', email: 'jose@example.com', is_active: true }
    getUsers.mockResolvedValue(page([jose]))
    setSuspended.mockResolvedValue({ ...jose, is_active: false })
    renderRoutes(routes, { path: '/admin/users', auth: admin })

    const actions = await screen.findByRole('button', { name: 'Actions for Jose Reyes' })
    await userEvent.click(actions)
    expect(actions).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'View account' })).toHaveAttribute('href', '/admin/users/5')
    await userEvent.click(screen.getByRole('button', { name: 'Suspend' }))

    const dialog = screen.getByRole('dialog', { name: 'Suspend Jose Reyes?' })
    await userEvent.type(within(dialog).getByLabelText(/Why/), 'Posted fake jobs.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend Jose Reyes' }))

    expect(setSuspended).toHaveBeenCalledWith(5, true, 'Posted fake jobs.')
    expect(await screen.findByText("Jose Reyes's account is suspended.")).toBeInTheDocument()
    expect(screen.getByText('Suspended', { selector: 'span' })).toBeInTheDocument()
  })

  it('opens the edit dialog from the Actions menu and closes the menu with Escape', async () => {
    getUsers.mockResolvedValue(page([ana]))
    renderRoutes(routes, { path: '/admin/users', auth: admin })

    const actions = await screen.findByRole('button', { name: 'Actions for Ana Reyes' })
    await userEvent.click(actions)
    await userEvent.keyboard('{Escape}')
    expect(actions).toHaveAttribute('aria-expanded', 'false')
    expect(actions).toHaveFocus()

    await userEvent.click(actions)
    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }))
    expect(screen.getByRole('dialog', { name: "Edit Ana Reyes's details" })).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toHaveValue('ana@acme.test')
  })
})
