import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
    const account = screen.getByRole('navigation', { name: 'Account' })
    expect(within(account).getByRole('link', { name: 'Data' })).toHaveAttribute('href', '/admin/categories')
    // The initials are decoration; the link is named by its word.
    expect(within(account).getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account/display')
    expect(within(account).getByText('OA')).toHaveAttribute('aria-hidden', 'true')
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

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    await vi.waitFor(() => expect(logout).toHaveBeenCalled())
    expect(whereWhenLoggedOut).toBe('/')
  })
})
