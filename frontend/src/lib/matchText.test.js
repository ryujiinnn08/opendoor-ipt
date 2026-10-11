import { describe, expect, it } from 'vitest'
import { matchCountText, missingText } from './matchText.js'

describe('matchCountText', () => {
  it('says how many needs a job meets, in the spec’s words', () => {
    expect(matchCountText({ needs_total: 5, needs_met: 5 })).toBe('Meets all 5 of your needs')
    expect(matchCountText({ needs_total: 5, needs_met: 4 })).toBe('Meets 4 of 5 of your needs')
    expect(matchCountText({ needs_total: 5, needs_met: 0 })).toBe('Meets none of your 5 needs')
    expect(matchCountText({ needs_total: 1, needs_met: 1 })).toBe('Meets your need')
    expect(matchCountText({ needs_total: 1, needs_met: 0 })).toBe("Doesn't meet your need")
  })
})

describe('missingText', () => {
  it('names two missing needs, then counts the rest', () => {
    expect(missingText([])).toBeNull()
    expect(missingText(['A'])).toBe('Missing: A')
    expect(missingText(['A', 'B'])).toBe('Missing: A and B')
    expect(missingText(['A', 'B', 'C'])).toBe('Missing: A, B and 1 more')
    expect(missingText(['A', 'B', 'C', 'D'])).toBe('Missing: A, B and 2 more')
  })
})
