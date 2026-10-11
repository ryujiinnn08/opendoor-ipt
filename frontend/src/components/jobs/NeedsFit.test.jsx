import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import NeedsFit from './NeedsFit.jsx'

const match = {
  needs_total: 2,
  needs_met: 1,
  missing: ['Adjustable workstation'],
  needs: [
    { id: 1, name: 'Flexible hours', group_name: 'Work arrangement', provided: true, note: 'Start any time between 7 and 10 a.m.' },
    { id: 2, name: 'Adjustable workstation', group_name: 'Assistive technology', provided: false, note: null },
  ],
}

describe('NeedsFit', () => {
  it('marks each need provided or missing', async () => {
    const { container } = render(<NeedsFit match={match} />)

    const section = screen.getByRole('region', { name: 'How this job fits your needs' })
    expect(within(section).getByText('Meets 1 of 2 of your needs')).toBeInTheDocument()
    expect(within(section).getByText('Flexible hours: Provided')).toBeInTheDocument()
    expect(within(section).getByText('Start any time between 7 and 10 a.m.')).toBeInTheDocument()
    expect(within(section).getByText('Adjustable workstation: Missing. You can ask the employer about it.')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})
