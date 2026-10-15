import { describe, expect, it } from 'vitest'
import { APPLICATION_FILTERS, APPLICATION_STATUSES, interviewHint, JOB_STATE_TEXT, nextStepText } from './applicationText.js'

describe('applicationText', () => {
  it('has the five statuses with the spec words', () => {
    expect(Object.keys(APPLICATION_STATUSES)).toEqual(['pending', 'reviewed', 'hired', 'rejected', 'withdrawn'])
    expect(APPLICATION_STATUSES.pending).toEqual({ label: 'Pending', tone: 'info', icon: 'clock', next: "Sent. The employer hasn't opened it yet." })
    expect(APPLICATION_STATUSES.reviewed.icon).toBe('door')
    expect(APPLICATION_STATUSES.reviewed.next).toBe(
      "The employer has opened your application. If they want to interview you, they'll contact you by email or phone.",
    )
    expect(APPLICATION_STATUSES.hired).toMatchObject({ tone: 'success', icon: 'check' })
    expect(APPLICATION_STATUSES.rejected).toMatchObject({ tone: 'neutral', icon: 'minus' })
    expect(APPLICATION_STATUSES.withdrawn).toMatchObject({ tone: 'neutral', icon: 'minus', next: 'You withdrew this application.' })
  })

  it('has the filters and the job states', () => {
    expect(APPLICATION_FILTERS.map((filter) => filter.value)).toEqual(['all', 'waiting', 'hired', 'closed'])
    expect(JOB_STATE_TEXT).toEqual({ not_open: "This job isn't taking applications right now.", removed: 'This job was removed.' })
  })

  it('suggests interview accommodations for the format', () => {
    expect(interviewHint('online')).toBe("This job's interview is online. For example: captions, a chat option or more time.")
    expect(interviewHint('on_site')).toBe("This job's interview is on-site. For example: a ground-floor room, a sign language interpreter or more time.")
    expect(interviewHint('online_or_on_site')).toBe("This job's interview can be online or on-site. Say which you prefer and what you need.")
    expect(interviewHint(null)).toBeNull()
  })
})

describe('nextStepText', () => {
  const hired = (state) => ({ status: 'hired', feedback: state ? { state } : null })

  it('follows where a hire’s feedback stands', () => {
    expect(nextStepText(hired(null))).toMatch(/About 30 days after your hire date/)
    expect(nextStepText(hired('not_yet'))).toMatch(/About 30 days after your hire date/)
    expect(nextStepText(hired('open'))).toBe('Congratulations. You can now rate whether each accommodation was delivered.')
    expect(nextStepText(hired('sent'))).toBe('Congratulations. Thank you for rating the accommodations.')
    expect(nextStepText(hired('nothing_to_rate'))).toBe('Congratulations on your new job.')
    expect(nextStepText({ status: 'pending', feedback: null })).toBe("Sent. The employer hasn't opened it yet.")
  })
})
