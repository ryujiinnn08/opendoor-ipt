import { describe, expect, it } from 'vitest'
import { jobCountText, jobLabels, providesText } from './jobText.js'

describe('jobCountText', () => {
  it('counts jobs in words', () => {
    expect(jobCountText(15)).toBe('15 jobs')
    expect(jobCountText(1)).toBe('1 job')
    expect(jobCountText(0)).toBe('No jobs')
  })
})

describe('providesText', () => {
  it('names up to three accommodations, then says how many more', () => {
    expect(providesText(['Remote work'])).toBe('Provides Remote work')
    expect(providesText(['A', 'B'])).toBe('Provides A and B')
    expect(providesText(['A', 'B', 'C'])).toBe('Provides A, B and C')
    expect(providesText(['A', 'B', 'C', 'D', 'E'])).toBe('Provides A, B, C and 2 more')
  })
})

describe('jobLabels', () => {
  it('marks new jobs and jobs closing within a week', () => {
    expect(jobLabels({ posted_on: '2026-10-14', closes_on: null }, '2026-10-16')).toEqual(['New'])
    expect(jobLabels({ posted_on: '2026-10-01', closes_on: '2026-10-23' }, '2026-10-16')).toEqual(['Closing soon'])
    expect(jobLabels({ posted_on: '2026-10-01', closes_on: '2026-10-24' }, '2026-10-16')).toEqual([])
    expect(jobLabels({ posted_on: '2026-10-16', closes_on: '2026-10-16' }, '2026-10-16')).toEqual(['New', 'Closing soon'])
  })
})
