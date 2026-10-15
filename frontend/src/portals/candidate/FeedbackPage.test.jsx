import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { feedbackFormFixture, sentFeedbackFixture } from '../../test/feedbackFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import FeedbackPage from './FeedbackPage.jsx'

vi.mock('../../api/feedback.js', () => ({ getFeedbackForm: vi.fn(), sendFeedback: vi.fn() }))
const { getFeedbackForm, sendFeedback } = await import('../../api/feedback.js')

const auth = { status: 'authenticated', role: 'candidate', user: { name: 'Ana', role: 'candidate' } }
const routes = [{ path: '/candidate/applications/:id/feedback', element: <FeedbackPage /> }]
const open = (options = {}) => renderRoutes(routes, { path: '/candidate/applications/7/feedback', auth, ...options })

describe('FeedbackPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the form with who sees the answers', async () => {
    getFeedbackForm.mockResolvedValue(feedbackFormFixture())
    const { container } = open()

    expect(await screen.findByRole('heading', { level: 1, name: 'How did OpenDoor Demo Corp. do?' })).toBeInTheDocument()
    expect(getFeedbackForm).toHaveBeenCalledWith('7')
    expect(screen.getByText('Office Clerk, hired September 14, 2026')).toBeInTheDocument()
    expect(screen.getByText('Rate each accommodation they listed when they hired you.')).toBeInTheDocument()
    expect(screen.getByText(/Your employer sees only totals from 3 or more people\./)).toBeInTheDocument()
    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('says when the form opens', async () => {
    getFeedbackForm.mockResolvedValue(feedbackFormFixture({ state: 'not_yet', opens_on: '2026-11-12' }))
    open()

    expect(await screen.findByText("You can rate your employer's accommodations from November 12, 2026.")).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your application' })).toHaveAttribute('href', '/candidate/applications/7')
  })

  it('says when there is nothing to rate', async () => {
    getFeedbackForm.mockResolvedValue(feedbackFormFixture({ state: 'nothing_to_rate', accommodations: [] }))
    open()

    expect(await screen.findByText("This job listed no accommodations, so there's nothing to rate.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send your ratings' })).not.toBeInTheDocument()
  })

  it('shows what was sent, without the form', async () => {
    getFeedbackForm.mockResolvedValue(sentFeedbackFixture())
    open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Your ratings for OpenDoor Demo Corp.' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'What you sent' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send your ratings' })).not.toBeInTheDocument()
  })

  it('thanks the job seeker after sending, with focus and an announcement', async () => {
    const user = userEvent.setup()
    const announce = vi.fn()
    getFeedbackForm.mockResolvedValue(feedbackFormFixture())
    sendFeedback.mockResolvedValue(sentFeedbackFixture())
    open({ announce })

    await user.click(within(await screen.findByRole('group', { name: 'Wheelchair-accessible entrance' })).getByLabelText('Delivered'))
    await user.click(within(screen.getByRole('group', { name: 'Flexible hours' })).getByLabelText('Delivered'))
    await user.click(screen.getByRole('button', { name: 'Send your ratings' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send your ratings' }))

    const thanks = "Thank you. Your ratings now count toward OpenDoor Demo Corp.'s trust score."
    expect(await screen.findByText(thanks)).toBeInTheDocument()
    await waitFor(() => expect(announce).toHaveBeenCalledWith(thanks))
    await waitFor(() => expect(screen.getByText(thanks).closest('[tabindex="-1"]')).toHaveFocus())
    expect(screen.getByRole('heading', { level: 1, name: 'Your ratings for OpenDoor Demo Corp.' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'What you sent' })).toBeInTheDocument()
  })

  it('reloads and says so when the ratings were already sent from another tab', async () => {
    const user = userEvent.setup()
    getFeedbackForm.mockResolvedValueOnce(feedbackFormFixture()).mockResolvedValueOnce(sentFeedbackFixture())
    sendFeedback.mockRejectedValue({ response: { status: 409, data: { message: "You've already sent your ratings." } } })
    open()

    await user.click(within(await screen.findByRole('group', { name: 'Wheelchair-accessible entrance' })).getByLabelText('Delivered'))
    await user.click(within(screen.getByRole('group', { name: 'Flexible hours' })).getByLabelText('Delivered'))
    await user.click(screen.getByRole('button', { name: 'Send your ratings' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send your ratings' }))

    const notice = await screen.findByText("You've already sent your ratings.")
    await waitFor(() => expect(notice.closest('[tabindex="-1"]')).toHaveFocus())
    expect(screen.getByRole('region', { name: 'What you sent' })).toBeInTheDocument()
  })

  it('refuses someone else’s or a not-hired application without a retry', async () => {
    getFeedbackForm.mockRejectedValue({ response: { status: 403, data: { message: "Only a hired job seeker can rate this employer's accommodations." } } })
    open()

    expect(await screen.findByText("Only a hired job seeker can rate this employer's accommodations.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
