import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import DisplaySettingsProvider from '../../display/DisplaySettingsProvider.jsx'
import { AnnouncerContext } from '../ui/announcerContext.js'
import UtilityBar from './UtilityBar.jsx'

function renderBar() {
  const announce = vi.fn()
  const result = render(
    <AnnouncerContext.Provider value={announce}>
      <DisplaySettingsProvider>
        <UtilityBar />
      </DisplaySettingsProvider>
    </AnnouncerContext.Provider>,
  )
  return { ...result, announce }
}

describe('UtilityBar', () => {
  beforeEach(() => {
    window.localStorage.clear()
    for (const name of ['data-text', 'data-contrast', 'data-quiet', 'data-menu']) document.documentElement.removeAttribute(name)
  })

  it('starts with the skip link and has no accessibility problems', async () => {
    const { container } = renderBar()

    expect(container.querySelector('a')).toHaveAttribute('href', '#main')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('goes round the text sizes, says the size and announces it', async () => {
    const user = userEvent.setup()
    const { announce } = renderBar()
    const button = screen.getByRole('button', { name: 'Text size: Standard' })

    await user.click(button)
    expect(button).toHaveAccessibleName('Text size: Large (125%)')
    expect(document.documentElement).toHaveAttribute('data-text', 'large')
    expect(announce).toHaveBeenLastCalledWith('Text size: Large (125%).')

    await user.click(button)
    await user.click(button)
    expect(document.documentElement).not.toHaveAttribute('data-text')
  })

  it('switches high contrast, quiet mode and the compact menu, and remembers them', async () => {
    const user = userEvent.setup()
    const { announce, unmount } = renderBar()

    for (const [name, attribute] of [
      ['High contrast', 'data-contrast'],
      ['Quiet mode', 'data-quiet'],
      ['Compact menu', 'data-menu'],
    ]) {
      const button = screen.getByRole('button', { name })
      expect(button).toHaveAttribute('aria-pressed', 'false')
      await user.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(document.documentElement).toHaveAttribute(attribute)
      expect(announce).toHaveBeenLastCalledWith(`${name} on.`)
    }
    unmount()

    renderBar()
    expect(screen.getByRole('button', { name: 'High contrast' })).toHaveAttribute('aria-pressed', 'true')
  })
})
