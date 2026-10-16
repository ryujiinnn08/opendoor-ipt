import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import DisplaySettingsProvider from '../../display/DisplaySettingsProvider.jsx'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import DisplayPage from './DisplayPage.jsx'

const maria = { name: 'Maria Santos', email: 'candidate@opendoor.test', role: 'candidate' }

function renderPage(announce = vi.fn()) {
  const { container } = renderRoutes(
    [
      {
        path: '/account/display',
        element: (
          <DisplaySettingsProvider>
            <DisplayPage />
          </DisplaySettingsProvider>
        ),
      },
    ],
    { path: '/account/display', auth: { status: 'authenticated', role: 'candidate', user: maria }, announce },
  )
  return { announce, container }
}

describe('DisplayPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-text')
    document.documentElement.removeAttribute('data-motion')
  })

  it('says whose account it is and shows the current settings', async () => {
    const { container } = renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument()
    expect(screen.getByText('Maria Santos · candidate@opendoor.test · Job seeker')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Display' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Show all links' })).toBeChecked()
    expect(await axe(container, { rules: { region: { enabled: false } } })).toHaveNoViolations()
  })

  it('applies a choice at once, saves it and announces it', async () => {
    const user = userEvent.setup()
    const { announce } = renderPage()

    await user.click(screen.getByRole('radio', { name: 'Extra large (150%)' }))
    await user.click(screen.getByRole('radio', { name: 'Reduce motion' }))

    expect(document.documentElement).toHaveAttribute('data-text', 'xlarge')
    expect(document.documentElement).toHaveAttribute('data-motion', 'reduce')
    expect(JSON.parse(window.localStorage.getItem('opendoor-display'))).toMatchObject({ text: 'xlarge', motion: 'reduce' })
    expect(announce).toHaveBeenCalledWith('Display settings applied and saved on this device.')
    expect(screen.getByText('Display settings applied and saved on this device.')).toBeInTheDocument()
  })
})
