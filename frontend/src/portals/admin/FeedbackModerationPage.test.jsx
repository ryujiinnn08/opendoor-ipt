import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import FeedbackModerationPage from './FeedbackModerationPage.jsx'

vi.mock('../../api/admin.js', () => ({
  getFeedbackForModeration: vi.fn(),
  revealFeedbackAuthor: vi.fn(),
  setFeedbackHidden: vi.fn(),
}))

const { getFeedbackForModeration, revealFeedbackAuthor, setFeedbackHidden } = await import('../../api/admin.js')

const routes = [{ path: '/admin/feedback', element: <FeedbackModerationPage /> }]
const admin = { status: 'authenticated', role: 'admin', user: { name: 'Ana Cruz', role: 'admin' } }
const feedback = {
  id: 5,
  sent_at: '2026-10-15T09:00:00+08:00',
  employer: { id: 2, name: 'Bayanihan Contact Center' },
  job: { id: 8, title: 'Customer Support Agent' },
  ratings: [{ name: 'Ramp', rating: 'not_delivered', rating_label: 'Not delivered' }],
  comment: 'They never built the ramp.',
  is_hidden: false,
  hidden_reason: null,
  history: [],
}
const page = (data) => ({ data, meta: { current_page: 1, last_page: 1, total: data.length } })

describe('FeedbackModerationPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the comment, ratings and employer, but not who wrote it', async () => {
    getFeedbackForModeration.mockResolvedValue(page([feedback]))
    const { container } = renderRoutes(routes, { path: '/admin/feedback', auth: admin })

    const row = (await screen.findByRole('heading', { name: 'Bayanihan Contact Center, Customer Support Agent' })).closest('article')
    expect(within(row).getByText('“They never built the ramp.”')).toBeInTheDocument()
    expect(within(row).getByText('Not delivered')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Show who wrote this' })).toBeInTheDocument()
    expect(getFeedbackForModeration).toHaveBeenCalledWith('comments', 1)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows who wrote it only when asked, and the look appears in the history', async () => {
    getFeedbackForModeration
      .mockResolvedValueOnce(page([feedback]))
      .mockResolvedValue(page([{ ...feedback, history: [{ id: 1, type: 'author_viewed', reason: null, by: 'Ana Cruz', at: '2026-10-16T10:00:00+08:00' }] }]))
    revealFeedbackAuthor.mockResolvedValue({ name: 'Sample Hire 4', email: 'sample4@opendoor.test' })
    renderRoutes(routes, { path: '/admin/feedback', auth: admin })

    await userEvent.click(await screen.findByRole('button', { name: 'Show who wrote this' }))

    expect(revealFeedbackAuthor).toHaveBeenCalledWith(5)
    expect(await screen.findByText('Sample Hire 4')).toBeInTheDocument()
    expect(await screen.findByText('Ana Cruz looked at who wrote it on October 16, 2026.')).toBeInTheDocument()
  })

  it('hides feedback with a reason and says the score was recalculated', async () => {
    getFeedbackForModeration.mockResolvedValue(page([feedback]))
    setFeedbackHidden.mockResolvedValue({ ...feedback, is_hidden: true, hidden_reason: 'Abusive words.' })
    renderRoutes(routes, { path: '/admin/feedback', auth: admin })

    await userEvent.click(await screen.findByRole('button', { name: 'Hide this feedback on Bayanihan Contact Center' }))
    const dialog = screen.getByRole('dialog', { name: 'Hide this feedback on Bayanihan Contact Center?' })
    await userEvent.type(within(dialog).getByLabelText('Why (only administrators see this)'), 'Abusive words.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hide feedback' }))

    expect(setFeedbackHidden).toHaveBeenCalledWith(5, true, 'Abusive words.')
    expect(
      await screen.findByText('The feedback on Bayanihan Contact Center is hidden. Its trust score was recalculated.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Hidden from the trust score')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Count it again: feedback on Bayanihan Contact Center' })).toBeInTheDocument()
  })

  it('reads the filter from the address', async () => {
    getFeedbackForModeration.mockResolvedValue(page([]))
    renderRoutes(routes, { path: '/admin/feedback?filter=hidden', auth: admin })

    expect(await screen.findByText('No feedback is hidden.')).toBeInTheDocument()
    expect(getFeedbackForModeration).toHaveBeenCalledWith('hidden', 1)
    expect(screen.getByRole('link', { name: 'Hidden' })).toHaveAttribute('aria-current', 'true')
  })
})
