import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from '../../auth/ProtectedRoute.jsx'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ChangePasswordPage from './ChangePasswordPage.jsx'

vi.mock('../../api/auth.js', () => ({
  changePassword: vi.fn(),
}))

const { changePassword } = await import('../../api/auth.js')

const routes = [
  {
    element: <ProtectedRoute roles={['candidate', 'admin']} />,
    children: [
      { path: '/account/password', element: <ChangePasswordPage /> },
      { path: '/admin/dashboard', element: <p>Admin dashboard</p> },
    ],
  },
]
const auth = (user, extra = {}) => ({ status: 'authenticated', role: user.role, user, refresh: vi.fn(), ...extra })
const maria = { name: 'Maria', role: 'candidate', must_change_password: false }

async function fill(current, next, confirm = next) {
  if (current) await userEvent.type(screen.getByLabelText(/^(Current|Temporary) password$/), current)
  await userEvent.type(screen.getByLabelText('New password'), next)
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ChangePasswordPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('changes the password and reloads the user', async () => {
    changePassword.mockResolvedValue()
    const value = auth(maria)
    renderRoutes(routes, { path: '/account/password', auth: value })

    await fill('Password@123', 'Better@2026')

    expect(changePassword).toHaveBeenCalledWith({
      current_password: 'Password@123',
      password: 'Better@2026',
      password_confirmation: 'Better@2026',
    })
    expect(await screen.findByText('Your password was changed.')).toBeInTheDocument()
    expect(value.refresh).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Go to your dashboard' })).toHaveAttribute('href', '/candidate/dashboard')
  })

  it('checks the new password before sending', async () => {
    renderRoutes(routes, { path: '/account/password', auth: auth(maria) })

    await fill('Password@123', 'Better@2026', 'Better@2027')
    expect(screen.getAllByText('The two new passwords do not match.')).toHaveLength(2)

    await userEvent.clear(screen.getByLabelText('New password'))
    await userEvent.clear(screen.getByLabelText('Confirm new password'))
    await fill('', 'short', 'short')
    expect(screen.getAllByText('Use at least 8 characters.')).toHaveLength(2)
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('shows a wrong current password from the server', async () => {
    changePassword.mockRejectedValue({
      response: { status: 422, data: { errors: { current_password: ["That isn't your current password."] } } },
    })
    renderRoutes(routes, { path: '/account/password', auth: auth(maria) })

    await fill('Wrong@123', 'Better@2026')

    expect(await screen.findAllByText("That isn't your current password.")).toHaveLength(2)
  })

  it('sends someone with a temporary password here from any page, and asks for it by name', () => {
    renderRoutes(routes, {
      path: '/admin/dashboard',
      auth: auth({ name: 'Rosa', role: 'admin', must_change_password: true }),
    })

    expect(screen.getByRole('heading', { level: 1, name: 'Choose your own password' })).toBeInTheDocument()
    expect(screen.getByLabelText('Temporary password')).toBeInTheDocument()
    expect(screen.queryByText('Admin dashboard')).not.toBeInTheDocument()
  })
})
