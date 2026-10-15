import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import UsersPage from './UsersPage.jsx'

vi.mock('../../api/admin.js', () => ({
  getUsers: vi.fn(),
}))

const { getUsers } = await import('../../api/admin.js')

const routes = [{ path: '/admin/users', element: <UsersPage /> }]
const admin = { status: 'authenticated', role: 'admin', user: { name: 'Admin', role: 'admin' } }
const page = (data, meta = {}) => ({ data, meta: { current_page: 1, last_page: 1, total: data.length, ...meta } })
const maria = { id: 3, name: 'Maria Santos', email: 'maria@example.com', role: 'candidate', is_active: false, joined_at: '2026-10-02T10:00:00+08:00' }
const ana = {
  id: 4,
  name: 'Ana Reyes',
  email: 'ana@acme.test',
  role: 'employer',
  is_active: true,
  joined_at: '2026-10-05T10:00:00+08:00',
  employer: { id: 1, name: 'Acme Corp.', type: 'company', member_role: 'hr', department: 'IT' },
}

describe('UsersPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists accounts as ruled rows with role, email, company and status', async () => {
    getUsers.mockResolvedValue(page([maria, ana]))
    const { container } = renderRoutes(routes, { path: '/admin/users', auth: admin })

    expect(await screen.findByRole('heading', { name: '2 accounts' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Maria Santos' })).toHaveAttribute('href', '/admin/users/3')
    expect(screen.getByText('Job seeker, maria@example.com')).toBeInTheDocument()
    expect(screen.getByText('Suspended', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('HR officer in IT at Acme Corp.')).toBeInTheDocument()
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
})
