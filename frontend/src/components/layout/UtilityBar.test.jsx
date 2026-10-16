import { fireEvent, render, screen } from '@testing-library/react'
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
      <p>Outside</p>
    </AnnouncerContext.Provider>,
  )
  return { ...result, announce }
}

const fontSize = () => document.documentElement.style.getPropertyValue('--od-font-size')

describe('UtilityBar', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('style')
    for (const name of ['data-contrast', 'data-quiet', 'data-menu']) document.documentElement.removeAttribute(name)
  })

  it('starts with the skip link and has no accessibility problems, open or closed', async () => {
    const user = userEvent.setup()
    const { container } = renderBar()

    expect(container.querySelector('a')).toHaveAttribute('href', '#main')
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole('button', { name: 'Text size: 100%' }))
    expect(await axe(container)).toHaveNoViolations()
  })

  it('opens a slider for the text size, which resizes the page as it moves', async () => {
    const user = userEvent.setup()
    renderBar()
    const button = screen.getByRole('button', { name: 'Text size: 100%' })

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const slider = screen.getByRole('slider', { name: 'Text size' })
    expect(slider).toHaveAttribute('aria-valuetext', '100%, Standard')

    fireEvent.change(slider, { target: { value: '140' } })
    expect(fontSize()).toBe('140%')
    expect(slider).toHaveAttribute('aria-valuetext', '140%')
    expect(button).toHaveAccessibleName('Text size: 140%')
  })

  it('while the thumb is dragged, previews the size and applies it only when let go', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(screen.getByRole('button', { name: 'Text size: 100%' }))
    const slider = screen.getByRole('slider', { name: 'Text size' })

    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '160' } })
    expect(fontSize()).toBe('')
    expect(screen.getByText('160%')).toBeInTheDocument()
    expect(slider).toHaveAttribute('aria-valuetext', '160%')

    fireEvent.pointerUp(slider)
    expect(fontSize()).toBe('160%')
  })

  it('offers Smaller, Larger and the design’s sizes for people who find dragging hard', async () => {
    const user = userEvent.setup()
    const { announce } = renderBar()
    await user.click(screen.getByRole('button', { name: 'Text size: 100%' }))

    expect(screen.getByRole('button', { name: 'Smaller text' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Larger text' }))
    expect(fontSize()).toBe('105%')
    expect(announce).toHaveBeenLastCalledWith('Text size 105%.')

    await user.click(screen.getByRole('button', { name: 'Extra large (150%)' }))
    expect(fontSize()).toBe('150%')
    expect(screen.getByRole('button', { name: 'Extra large (150%)' })).toHaveAttribute('aria-pressed', 'true')
    expect(announce).toHaveBeenLastCalledWith('Text size 150%, Extra large.')
  })

  it('closes the slider with Escape back on the button, with Done, and with a click outside', async () => {
    const user = userEvent.setup()
    renderBar()
    const button = screen.getByRole('button', { name: /Text size/ })

    await user.click(button)
    screen.getByRole('slider').focus()
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()

    await user.click(button)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    await user.click(screen.getByText('Outside'))
    expect(button).toHaveAttribute('aria-expanded', 'false')
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

  it('can be kept open instead of folding away until pointed at', async () => {
    const user = userEvent.setup()
    const { announce } = renderBar()

    const pin = screen.getByRole('button', { name: 'Keep open' })
    expect(pin).toHaveAttribute('aria-pressed', 'false')
    await user.click(pin)
    expect(pin).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('data-bar', 'pinned')
    expect(announce).toHaveBeenLastCalledWith('Keep this bar open on.')
  })

  it('fades the colours only while high contrast switches', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderBar()

    await user.click(screen.getByRole('button', { name: 'High contrast' }))
    expect(document.documentElement).toHaveClass('od-theme-transition')
    vi.advanceTimersByTime(600)
    expect(document.documentElement).not.toHaveClass('od-theme-transition')
    vi.useRealTimers()
  })
})
