import { describe, expect, it } from 'vitest'
import { basedOnText, rowText } from './trustScoreText.js'

describe('trustScoreText', () => {
  it('writes each breakdown row as words, leaving out zeros', () => {
    expect(rowText({ delivered: 4, partial: 1, not_delivered: 0, rated: 5 })).toBe('4 of 5 delivered, 1 partly')
    expect(rowText({ delivered: 5, partial: 0, not_delivered: 0, rated: 5 })).toBe('5 of 5 delivered')
    expect(rowText({ delivered: 1, partial: 1, not_delivered: 1, rated: 3 })).toBe('1 of 3 delivered, 1 partly, 1 not delivered')
    expect(rowText({ delivered: 0, partial: 0, not_delivered: 3, rated: 3 })).toBe('0 of 3 delivered, 3 not delivered')
  })

  it('writes the count', () => {
    expect(basedOnText(5)).toBe(', based on 5 hires')
  })
})
