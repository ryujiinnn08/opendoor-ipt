import { describe, expect, it } from 'vitest'
import { sinceText } from './format.js'

describe('sinceText', () => {
  const now = new Date('2026-10-16T04:00:00Z') // noon in Manila

  it('counts whole days in Philippine time', () => {
    expect(sinceText('2026-10-16T01:00:00Z', now)).toBe('today')
    expect(sinceText('2026-10-15T17:00:00Z', now)).toBe('today') // 1 a.m. on the 16th in Manila
    expect(sinceText('2026-10-15T15:00:00Z', now)).toBe('yesterday')
    expect(sinceText('2026-10-13T04:00:00Z', now)).toBe('3 days ago')
    expect(sinceText('2026-10-02T04:00:00Z', now)).toBe('on October 2, 2026')
    expect(sinceText(null, now)).toBe('')
  })
})
