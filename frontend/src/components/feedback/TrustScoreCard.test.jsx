import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { trustScoreFixture, unscoredFixture } from '../../test/trustScoreFixture.js'
import TrustScoreCard from './TrustScoreCard.jsx'

const show = (props) => render(<TrustScoreCard {...props} />, { wrapper: MemoryRouter })

describe('TrustScoreCard', () => {
  it('says the score in a sentence and each accommodation as words', async () => {
    const { container } = show({ summary: trustScoreFixture() })

    const card = screen.getByRole('region', { name: 'Accommodation trust score' })
    expect(within(card).getByText((_, element) => element.tagName === 'P' && element.textContent === '88%, based on 4 hires')).toBeInTheDocument()
    expect(within(card).getByText('88%').tagName).toBe('STRONG')
    expect(within(card).getByText("From hired employees' ratings of each accommodation this employer listed.")).toBeInTheDocument()
    expect(within(card).getByText('Wheelchair-accessible entrance').nextSibling).toHaveTextContent('3 of 3 delivered')
    expect(within(card).getByText('Adjustable workstation').nextSibling).toHaveTextContent('0 of 3 delivered, 2 partly, 1 not delivered')
    expect(within(card).getByText('Sign language interpreter').nextSibling).toHaveTextContent('Not enough ratings yet')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows no number at all below 3 responses', () => {
    show({ summary: unscoredFixture() })

    const card = screen.getByRole('region', { name: 'Accommodation trust score' })
    expect(card).toHaveTextContent('Not enough responses yet. The score appears once 3 hired employees have rated this employer.')
    expect(card.textContent).not.toMatch(/\d+ of|\d+%|based on/)
  })

  it('in short form leaves out the breakdown and links to it', () => {
    show({ summary: { score: 88, responses: 4 }, short: true, employerHref: '/employers/1' })

    expect(screen.queryByRole('term')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See how each accommodation was rated' })).toHaveAttribute('href', '/employers/1')
  })
})
