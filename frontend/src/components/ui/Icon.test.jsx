import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Icon from './Icon.jsx'
import { ICON_NAMES } from './iconImages.js'

describe('Icon', () => {
  it('draws a Lucide icon in the text colour, hidden from screen readers', () => {
    const { container } = render(<Icon name="check" className="size-5" />)
    const icon = container.firstChild

    expect(icon.tagName.toLowerCase()).toBe('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveAttribute('data-icon', 'check')
    expect(icon).toHaveAttribute('stroke', 'currentColor')
    expect(icon).toHaveClass('size-5')
  })

  it('falls back to a plain circle for a name it does not know', () => {
    const { container } = render(<Icon name="unknown" />)

    expect(container.firstChild).toHaveAttribute('data-icon', 'circle')
  })

  it('has every icon the app uses', () => {
    expect(ICON_NAMES).toEqual(
      expect.arrayContaining(['check', 'cross', 'clock', 'minus', 'pencil', 'lock', 'circle', 'refresh', 'door', 'chat', 'calendar', 'monitor', 'people', 'info', 'alert', 'chevron-down']),
    )
  })
})
