import { describe, expect, it } from 'vitest'
import { countOf, trendText, weekLabel, weekName } from './chartText.js'

describe('chartText', () => {
  it('names weeks', () => {
    expect(weekLabel('2026-10-12')).toBe('Oct 12')
    expect(weekName('2026-10-12')).toBe('Week of October 12')
  })

  it('writes the takeaway of a weekly series', () => {
    const noun = ['application', 'applications']
    expect(trendText([0, 0, 0], noun)).toBe('No applications in the last 3 weeks yet.')
    expect(trendText([1, 4, 11], noun)).toBe('11 applications this week, up from 4 last week. 16 applications in 3 weeks.')
    expect(trendText([0, 3, 1], noun)).toBe('1 application this week, down from 3 last week. 4 applications in 3 weeks.')
    expect(trendText([2, 2], noun)).toBe('2 applications this week, the same as last week. 4 applications in 2 weeks.')
    expect(countOf(1, ['hire', 'hires'])).toBe('1 hire')
  })
})
