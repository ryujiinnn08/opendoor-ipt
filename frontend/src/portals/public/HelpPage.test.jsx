import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import HelpPage from './HelpPage.jsx'

describe('HelpPage', () => {
  it('explains OpenDoor in numbered steps for each role and the trust score', async () => {
    const { container } = renderRoutes([{ path: '/help', element: <HelpPage /> }], { path: '/help' })

    expect(screen.getByRole('heading', { level: 1, name: 'How OpenDoor works' })).toBeInTheDocument()
    for (const name of ['For job seekers', 'For employers', 'How the trust score works']) {
      expect(within(screen.getByRole('region', { name })).getAllByRole('listitem').length).toBeGreaterThan(2)
    }
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact')
    expect(await axe(container)).toHaveNoViolations()
  })
})
