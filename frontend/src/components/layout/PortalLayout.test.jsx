import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../api/candidate.js', () => ({ getPhotoFile: vi.fn(async () => new Blob(['x'], { type: 'image/png' })) }))
import ProtectedRoute from '../../auth/ProtectedRoute.jsx'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import PortalLayout from './PortalLayout.jsx'

const routes = [
  { path: '/', element: <p>Home page</p> },
  { path: '/login', element: <p>Login page</p> },
  {
    element: <ProtectedRoute roles={['admin']} />,
    children: [
      { element: <PortalLayout />, children: [{ path: '/admin/dashboard', element: <h1>Admin dashboard</h1> }] },
    ],
  },
]

describe('PortalLayout', () => {
  it('shows the menu for the role', () => {
    renderRoutes(routes, {
      path: '/admin/dashboard',
      auth: { status: 'authenticated', role: 'admin', user: { name: 'OpenDoor Admin', role: 'admin' } },
    })

    const main = screen.getByRole('navigation', { name: 'Main' })
    expect(within(main).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    expect(main).toHaveTextContent('Employers')
    expect(main).toHaveTextContent('Postings')
    expect(within(main).getByRole('link', { name: 'Data' })).toHaveAttribute('href', '/admin/categories')
    const account = screen.getByRole('navigation', { name: 'Account' })
    // The initials are decoration; the menu button is named by its word.
    const menu = within(account).getByRole('button', { name: 'Account' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(within(menu).getByText('OA')).toHaveAttribute('aria-hidden', 'true')
    // Administrators have their queues instead of notifications (PHASE_6 §4.4).
    expect(within(account).queryByRole('link', { name: /Notifications/ })).not.toBeInTheDocument()
  })

  it('goes to the home page (not the login page) after logging out', async () => {
    const logout = vi.fn().mockResolvedValue()
    const announce = vi.fn()
    const { router } = renderRoutes(routes, {
      path: '/admin/dashboard',
      auth: { status: 'authenticated', role: 'admin', user: { name: 'OpenDoor Admin', role: 'admin' }, logout },
      announce,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.state).toEqual({ loggedOut: true })
    expect(logout).toHaveBeenCalled()
    expect(announce).toHaveBeenCalledWith('You have logged out.')
  })

  it('clears the user only after leaving the portal, so the guard never sends them to login', async () => {
    let router
    let whereWhenLoggedOut
    const logout = vi.fn(async () => {
      whereWhenLoggedOut = router.state.location.pathname
    })
    ;({ router } = renderRoutes(routes, {
      path: '/admin/dashboard',
      auth: { status: 'authenticated', role: 'admin', user: { name: 'OpenDoor Admin', role: 'admin' }, logout },
    }))

    await userEvent.click(screen.getByRole('button', { name: 'Account' }))
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    await vi.waitFor(() => expect(logout).toHaveBeenCalled())
    expect(whereWhenLoggedOut).toBe('/')
  })

  it('opens the account menu in one click and closes it with Escape (UI_FEEDBACK_PLAN §3.2)', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, {
      path: '/admin/dashboard',
      auth: { status: 'authenticated', role: 'admin', user: { name: 'OpenDoor Admin', email: 'admin@example.com', role: 'admin' } },
    })

    const menu = screen.getByRole('button', { name: 'Account' })
    await user.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('admin@example.com')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Display settings' })).toHaveAttribute('href', '/account/display')
    expect(screen.getByRole('link', { name: 'Change password' })).toHaveAttribute('href', '/account/password')

    await user.keyboard('{Escape}')
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(menu).toHaveFocus()
  })

  it('shows a job seeker’s photo on the account menu instead of initials', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:photo')
    URL.revokeObjectURL = vi.fn()
    const candidateRoutes = [
      { element: <PortalLayout />, children: [{ path: '/candidate/dashboard', element: <h1>Dashboard</h1> }] },
    ]
    renderRoutes(candidateRoutes, {
      path: '/candidate/dashboard',
      auth: { status: 'authenticated', role: 'candidate', user: { name: 'Maria Santos', role: 'candidate', photo_version: 'abc' } },
    })

    const menu = screen.getByRole('button', { name: 'Account' })
    await vi.waitFor(() => expect(menu.querySelector('img')).toHaveAttribute('src', 'blob:photo'))
    expect(menu.querySelector('img')).toHaveAttribute('alt', '')
  })
})
