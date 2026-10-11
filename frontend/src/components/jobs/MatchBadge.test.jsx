import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import MatchBadge from './MatchBadge.jsx'

describe('MatchBadge', () => {
  it('says how many needs the job meets and what is missing', async () => {
    const { container } = render(<MatchBadge match={{ needs_total: 5, needs_met: 4, missing: ['Adjustable workstation'] }} />)

    expect(screen.getByText('Meets 4 of 5 of your needs')).toBeInTheDocument()
    expect(screen.getByText('Missing: Adjustable workstation')).toBeInTheDocument()
    expect([...container.querySelectorAll('[data-icon]')].map((icon) => icon.dataset.icon)).toEqual(['check', 'circle'])
    expect(await axe(container)).toHaveNoViolations()
  })

  it('keeps amber for needs a job meets: no check when it meets none', () => {
    const { container } = render(<MatchBadge match={{ needs_total: 3, needs_met: 0, missing: ['A', 'B', 'C'] }} />)

    expect(screen.getByText('Meets none of your 3 needs')).toBeInTheDocument()
    expect(container.querySelector('.text-accent')).toBeNull()
    expect([...container.querySelectorAll('[data-icon]')].map((icon) => icon.dataset.icon)).toEqual(['circle', 'circle'])
  })

  it('leaves out the missing line for a full match', () => {
    render(<MatchBadge match={{ needs_total: 3, needs_met: 3, missing: [] }} />)

    expect(screen.getByText('Meets all 3 of your needs')).toBeInTheDocument()
    expect(screen.queryByText(/Missing/)).not.toBeInTheDocument()
  })
})
