import { describe, expect, it } from 'vitest'
import { employerMatchText } from './matchText.js'

describe('employerMatchText', () => {
  it('says how the job meets the applicant’s needs', () => {
    expect(employerMatchText({ needs_total: 5, needs_met: 4 })).toBe('Your job meets 4 of their 5 needs')
    expect(employerMatchText({ needs_total: 5, needs_met: 5 })).toBe('Your job meets all 5 of their needs')
    expect(employerMatchText({ needs_total: 5, needs_met: 0 })).toBe('Your job meets none of their 5 needs')
    expect(employerMatchText({ needs_total: 1, needs_met: 1 })).toBe('Your job meets their need')
    expect(employerMatchText({ needs_total: 1, needs_met: 0 })).toBe("Your job doesn't meet their need")
  })
})
