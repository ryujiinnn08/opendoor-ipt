import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import AddAdminPage from './AddAdminPage.jsx'

vi.mock('../../api/admin.js', () => ({
  addAdmin: vi.fn(),
}))

const { addAdmin } = await import('../../api/admin.js')

const routes = [{ path: '/admin/users/new', element: <AddAdminPage /> }]
const admin = { status: 'authenticated', role: 'admin', user: { name: 'Ana Cruz', role: 'admin' } }

describe('AddAdminPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks for a name and an email first', async () => {
    renderRoutes(routes, { path: '/admin/users/new', auth: admin })

    await userEvent.click(screen.getByRole('button', { name: 'Add administrator' }))

    expect(screen.getByRole('heading', { name: 'There is a problem' })).toBeInTheDocument()
    expect(screen.getAllByText("Enter the administrator's full name.")).toHaveLength(2)
    expect(addAdmin).not.toHaveBeenCalled()
  })

  it('shows the temporary password once, ready to copy', async () => {
    addAdmin.mockResolvedValue({
      user: { id: 12, name: 'Rosa Lim', email: 'rosa@opendoor.test' },
      temporaryPassword: 'Kq7!mPz2Rt9@wXy4',
    })
    const announce = vi.fn()
    renderRoutes(routes, { path: '/admin/users/new', auth: admin, announce })

    await userEvent.type(screen.getByLabelText('Full name'), 'Rosa Lim')
    await userEvent.type(screen.getByLabelText(/Email address/), ' Rosa@OpenDoor.test ')
    await userEvent.click(screen.getByRole('button', { name: 'Add administrator' }))

    expect(addAdmin).toHaveBeenCalledWith({ name: 'Rosa Lim', email: 'rosa@opendoor.test' })
    expect(await screen.findByRole('heading', { name: 'Rosa Lim is now an administrator' })).toHaveFocus()
    expect(screen.getByLabelText('Temporary password')).toHaveValue('Kq7!mPz2Rt9@wXy4')
    expect(screen.getByRole('button', { name: 'Copy password' })).toBeInTheDocument()
    expect(screen.getByText(/it won't be shown again/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Open Rosa Lim's account" })).toHaveAttribute('href', '/admin/users/12')
    expect(announce).toHaveBeenCalledWith('Rosa Lim is now an administrator.')
  })

  it('shows the server refusing a used email', async () => {
    addAdmin.mockRejectedValue({
      response: { status: 422, data: { errors: { email: ['An account with this email already exists.'] } } },
    })
    renderRoutes(routes, { path: '/admin/users/new', auth: admin })

    await userEvent.type(screen.getByLabelText('Full name'), 'Rosa Lim')
    await userEvent.type(screen.getByLabelText(/Email address/), 'admin@opendoor.test')
    await userEvent.click(screen.getByRole('button', { name: 'Add administrator' }))

    expect(await screen.findAllByText('An account with this email already exists.')).toHaveLength(2)
  })
})
