import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { DisplayContext } from '../../display/displayContext.js'
import { DEFAULTS } from '../../display/displaySettings.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import SiteHeader from './SiteHeader.jsx'

const left = [
  { to: '/candidate/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/candidate/jobs', label: 'Find jobs', icon: 'search', end: false },
]

function renderHeader({ menu = 'full', onLogout = vi.fn(), path = '/candidate/jobs/4' } = {}) {
  const right = [
    { to: '/notifications', label: 'Notifications', icon: 'bell', count: 2 },
    { label: 'Log out', icon: 'log-out', onClick: onLogout },
  ]
  const header = (
    <DisplayContext.Provider value={{ settings: { ...DEFAULTS, menu }, update: () => {} }}>
      <SiteHeader left={left} right={right} />
      <main>
        <p>Page</p>
      </main>
    </DisplayContext.Provider>
  )
  return renderRoutes(
    [
      { path: '/candidate/jobs/:id', element: header },
      { path: '/notifications', element: header },
    ],
    { path },
  )
}

describe('SiteHeader', () => {
  it('shows every link, marks the current section and reads the count', async () => {
    const { container } = renderHeader()

    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Find jobs' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Notifications (2 unread)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('folds into one Menu button that opens, and closes with Escape back on the button', async () => {
    const user = userEvent.setup()
    const { container } = renderHeader({ menu: 'compact' })
    const menu = screen.getByRole('button', { name: 'Menu' })

    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()

    await user.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Find jobs' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Notifications (2 unread)' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()

    await user.tab()
    await user.keyboard('{Escape}')
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(menu).toHaveFocus()
  })

  it('closes the menu on a click outside it', async () => {
    const user = userEvent.setup()
    renderHeader({ menu: 'compact' })

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByText('Page'))

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('logs out from inside the menu', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    renderHeader({ menu: 'compact', onLogout })

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(onLogout).toHaveBeenCalled()
  })
})
