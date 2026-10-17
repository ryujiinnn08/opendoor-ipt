import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LoadingMascot from './LoadingMascot.jsx'

describe('LoadingMascot', () => {
  afterEach(() => vi.useRealTimers())

  it('waits 400 ms, so quick loads never flash it, and stays hidden from screen readers', () => {
    vi.useFakeTimers()
    const { container } = render(<LoadingMascot />)
    expect(container).toBeEmptyDOMElement()

    act(() => vi.advanceTimersByTime(400))
    const picture = container.firstChild
    expect(picture).toHaveAttribute('aria-hidden', 'true')
    expect(picture).toHaveClass('od-decoration')
    expect(picture.querySelector('svg')).not.toBeNull()
  })
})
