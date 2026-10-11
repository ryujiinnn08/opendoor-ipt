import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useDebouncedValue from './useDebouncedValue.js'

describe('useDebouncedValue', () => {
  it('updates only after a 300 ms pause', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), { initialProps: { value: 'w' } })
    rerender({ value: 'web' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('w')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('web')
    vi.useRealTimers()
  })
})
