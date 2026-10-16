import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import PublicLayout from './PublicLayout.jsx'

vi.mock('../../api/notifications.js', () => ({ getUnreadCount: vi.fn().mockResolvedValue(2) }))

const routes = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <h1>Home</h1> },
      { path: '/jobs', element: <h1>Find jobs</h1> },
    ],
  },
]

describe('PublicLayout', () => {
  it('links to Find jobs from the main navigation', () => {
    const { unmount } = renderRoutes(routes, { path: '/' })
    const link = within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Find jobs' })
    expect(link).toHaveAttribute('href', '/jobs')
    expect(link).not.toHaveAttribute('aria-current')
    unmount()

    renderRoutes(routes, { path: '/jobs?q=web' })
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Find jobs' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('offers Log in and Create account to guests, and the dashboard once logged in', () => {
    const { unmount } = renderRoutes(routes, { path: '/' })
    const account = screen.getByRole('navigation', { name: 'Account' })
    expect(within(account).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(within(account).getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register')
    unmount()

    renderRoutes(routes, { path: '/', auth: { status: 'authenticated', role: 'candidate', user: { name: 'Maria', role: 'candidate' } } })
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/candidate/dashboard')
    expect(screen.getByRole('link', { name: 'Find jobs' })).toHaveAttribute('href', '/candidate/jobs')
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account/display')
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Notifications/ })).toBeInTheDocument()
  })

  it('has the skip link, the display settings and the footer on every page', async () => {
    const { container } = renderRoutes(routes, { path: '/' })

    expect(container.querySelector('a')).toHaveTextContent('Skip to main content')
    expect(screen.getByRole('group', { name: 'Display settings' })).toBeInTheDocument()
    const footer = screen.getByRole('navigation', { name: 'Footer' })
    expect(within(footer).getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(within(footer).getByRole('link', { name: 'Accessibility statement' })).toHaveAttribute('href', '/accessibility')
    expect(await axe(container)).toHaveNoViolations()
  })
})
