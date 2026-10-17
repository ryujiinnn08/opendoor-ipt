import { act, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DisplayContext } from '../display/displayContext.js'
import { DEFAULTS } from '../display/displaySettings.js'
import TourMascot from './TourMascot.jsx'

const { clock, stop } = vi.hoisted(() => ({ clock: vi.fn(), stop: vi.fn() }))
vi.mock('../components/mascot/svgIds.js', async (original) => ({ ...await original(), runClock: clock }))
afterEach(() => { vi.useRealTimers(); clock.mockReset(); stop.mockReset() })
function frame(settings, child) { return <DisplayContext.Provider value={{ settings: { ...DEFAULTS, ...settings }, update: () => {} }}>{child}</DisplayContext.Provider> }

describe('tour mascot motion', () => {
  it('draws ordinary coachmarks still without starting a clock', async () => {
    const { container } = render(<TourMascot />)
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    expect(clock).not.toHaveBeenCalled()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('stops a greeting when Quiet mode is enabled', async () => {
    clock.mockReturnValue(stop)
    const { container, rerender } = render(frame({}, <TourMascot animate />))
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    expect(clock).toHaveBeenCalledTimes(1)
    rerender(frame({ quiet: true }, <TourMascot animate />))
    expect(stop).toHaveBeenCalledTimes(1)
    rerender(frame({}, <TourMascot animate />))
    expect(clock).toHaveBeenCalledTimes(1)
  })

  it('never starts an animation with reduced motion and hides confetti', async () => {
    clock.mockReturnValue(stop)
    const { container } = render(frame({ motion: 'reduce' }, <TourMascot mood="happy" animate />))
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    expect(clock).not.toHaveBeenCalled()
    const confetti = [...container.querySelectorAll('[id]')].filter((node) => /C\d+$/.test(node.id))
    expect(confetti.length).toBeGreaterThan(0)
    expect(confetti.every((node) => node.getAttribute('visibility') === 'hidden')).toBe(true)
  })

  it('ends the greeting after a bounded time', async () => {
    clock.mockReturnValue(stop)
    const { container, rerender } = render(<TourMascot />)
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    vi.useFakeTimers()
    rerender(<TourMascot animate />)
    expect(clock).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTime(4500))
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
