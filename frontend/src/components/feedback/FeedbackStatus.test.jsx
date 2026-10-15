import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { applicationFixture } from '../../test/applicationFixture.js'
import FeedbackStatus from './FeedbackStatus.jsx'

const hired = (feedback) => applicationFixture({ status: 'hired', feedback, job: { ...applicationFixture().job, title: 'Office Clerk' } })
const show = (application) => render(<FeedbackStatus application={application} />, { wrapper: MemoryRouter })

describe('FeedbackStatus', () => {
  it('links to the form while it is open', () => {
    show(hired({ state: 'open', opens_on: '2026-10-14', sent_at: null }))

    expect(screen.getByRole('link', { name: 'Rate the accommodations for Office Clerk' })).toHaveAttribute('href', '/candidate/applications/7/feedback')
  })

  it('says when it opens', () => {
    show(hired({ state: 'not_yet', opens_on: '2026-11-12', sent_at: null }))

    expect(screen.getByText("You can rate your employer's accommodations from November 12, 2026.")).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('says when it was sent', () => {
    show(hired({ state: 'sent', opens_on: '2026-10-14', sent_at: '2026-10-15T03:00:00+00:00' }))

    expect(screen.getByText('You rated the accommodations on October 15, 2026.')).toBeInTheDocument()
  })

  it('shows nothing without accommodations or before a hire', () => {
    const { container } = show(hired({ state: 'nothing_to_rate', opens_on: '2026-10-14', sent_at: null }))
    expect(container).toBeEmptyDOMElement()

    const { container: pending } = show(applicationFixture({ feedback: null }))
    expect(pending).toBeEmptyDOMElement()
  })
})
