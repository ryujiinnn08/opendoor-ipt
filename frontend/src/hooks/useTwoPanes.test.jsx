import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DisplayContext } from '../display/displayContext.js'
import { DEFAULTS } from '../display/displaySettings.js'
import useTwoPanes from './useTwoPanes.js'

function twoPanesWith(settings, wide = true) {
  window.matchMedia = vi.fn(() => ({ matches: wide, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const wrapper = ({ children }) => <DisplayContext.Provider value={{ settings: { ...DEFAULTS, ...settings }, update: () => {} }}>{children}</DisplayContext.Provider>
  return renderHook(() => useTwoPanes(), { wrapper }).result.current
}

describe('useTwoPanes', () => {
  afterEach(() => {
    delete window.matchMedia
  })

  it('uses two panes on wide screens with standard or large text', () => {
    expect(twoPanesWith({})).toBe(true)
    expect(twoPanesWith({ text: 125 })).toBe(true)
  })

  it('keeps one column on narrow screens, at larger text and with the compact menu', () => {
    expect(twoPanesWith({}, false)).toBe(false)
    expect(twoPanesWith({ text: 130 })).toBe(false)
    expect(twoPanesWith({ menu: 'compact' })).toBe(false)
  })
})
