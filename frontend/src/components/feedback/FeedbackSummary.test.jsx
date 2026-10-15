import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { sentFeedbackFixture } from '../../test/feedbackFixture.js'
import FeedbackSummary from './FeedbackSummary.jsx'

describe('FeedbackSummary', () => {
  it('lists the job seeker’s own answers and comment', async () => {
    const { container } = render(<FeedbackSummary sent={sentFeedbackFixture().sent} />)

    const region = screen.getByRole('region', { name: 'Your ratings' })
    expect(within(region).getByText(/You sent these on October 15, 2026\./)).toBeInTheDocument()
    expect(within(region).getByText('Wheelchair-accessible entrance').nextSibling).toHaveTextContent('Partly delivered')
    expect(within(region).getByText('Flexible hours').nextSibling).toHaveTextContent("I didn't use this")
    expect(within(region).getByText('The ramp was blocked on Mondays.')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('says when there was no comment', () => {
    const sent = { ...sentFeedbackFixture().sent, comment: null }
    render(<FeedbackSummary sent={sent} />)

    expect(screen.getByText("You didn't add a comment.")).toBeInTheDocument()
  })

  it('says when OpenDoor removed the ratings from the trust score', () => {
    render(<FeedbackSummary sent={{ ...sentFeedbackFixture().sent, hidden: true }} />)

    expect(screen.getByText("OpenDoor's administrators removed these ratings from the trust score.")).toBeInTheDocument()
  })
})
