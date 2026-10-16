import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import PublicLayout from './PublicLayout.jsx'

const routes = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <h1>Home</h1> },
      { path: '/jobs', element: <h1>Browse jobs</h1> },
    ],
  },
]

describe('PublicLayout', () => {
  it('links to Browse jobs from a main navigation', () => {
    const { unmount } = renderRoutes(routes, { path: '/' })
    const link = within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Browse jobs' })
    expect(link).toHaveAttribute('href', '/jobs')
    expect(link).not.toHaveAttribute('aria-current')
    unmount()

    renderRoutes(routes, { path: '/jobs?q=web' })
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Browse jobs' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
