import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { applicationFixture, reviewedFixture } from '../../test/applicationFixture.js'
import ApplicationPath from './ApplicationPath.jsx'

/** Each step's text, in order. */
function steps() {
  return within(screen.getByRole('list', { name: 'Your application' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('ApplicationPath', () => {
  it('shows a Pending application as sent and waiting', async () => {
    const { container } = render(<ApplicationPath application={applicationFixture()} />)

    const [sent, opened, decision] = steps()
    expect(sent).toContain('Sent')
    expect(sent).toContain('Current step')
    expect(sent).toContain('October 13, 2026')
    expect(sent).toContain("Sent. The employer hasn't opened it yet.")
    expect(opened).toContain('Opened by the employer')
    expect(opened).toContain('Not yet')
    expect(decision).toContain('Decision')
    expect(decision).toContain('Not yet')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows a Reviewed application as opened', () => {
    render(<ApplicationPath application={reviewedFixture()} />)

    const [sent, opened, decision] = steps()
    expect(sent).toContain('Done')
    expect(opened).toContain('Current step')
    expect(opened).toContain('October 14, 2026')
    expect(opened).toContain("If they want to interview you, they'll contact you by email or phone.")
    expect(decision).toContain('Not yet')
  })

  it('shows a hire, and who confirmed it', () => {
    const hired = reviewedFixture({ status: 'hired', status_label: 'Hired', hired_at: '2026-10-16', hire_confirmed_by: 'employer', actions: [] })
    const { unmount } = render(<ApplicationPath application={hired} />)

    let [sent, opened, decision] = steps()
    expect(sent).toContain('Done')
    expect(opened).toContain('Done')
    expect(decision).toContain('Hired')
    expect(decision).toContain('Current step')
    expect(decision).toContain('October 16, 2026')
    expect(decision).toContain('Congratulations.')
    expect(decision).not.toContain('Confirmed by you')
    unmount()

    render(<ApplicationPath application={{ ...hired, hire_confirmed_by: 'candidate' }} />)
    ;[, , decision] = steps()
    expect(decision).toContain('Confirmed by you')
  })

  it('shows a rejection', () => {
    render(<ApplicationPath application={reviewedFixture({ status: 'rejected', status_label: 'Rejected', rejected_at: '2026-10-17T03:00:00+00:00', actions: [] })} />)

    const [, , decision] = steps()
    expect(decision).toContain('Rejected')
    expect(decision).toContain('October 17, 2026')
    expect(decision).toContain('The employer chose other applicants for this job.')
  })

  it('ends at Withdrawn without the steps never reached', () => {
    render(<ApplicationPath application={applicationFixture({ status: 'withdrawn', status_label: 'Withdrawn', withdrawn_at: '2026-10-15T03:00:00+00:00', actions: [] })} />)

    const items = steps()
    expect(items).toHaveLength(2)
    expect(items[0]).toContain('Sent')
    expect(items[0]).toContain('Done')
    expect(items[1]).toContain('Withdrawn')
    expect(items[1]).toContain('Current step')
    expect(items[1]).toContain('October 15, 2026')
    expect(items[1]).toContain('You withdrew this application.')
  })
})
