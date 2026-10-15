import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { feedbackFormFixture, sentFeedbackFixture } from '../../test/feedbackFixture.js'
import FeedbackForm from './FeedbackForm.jsx'

vi.mock('../../api/feedback.js', () => ({ sendFeedback: vi.fn() }))
const { sendFeedback } = await import('../../api/feedback.js')

const show = (props = {}) => render(<FeedbackForm form={feedbackFormFixture()} onSent={vi.fn()} {...props} />)
const row = (name) => screen.getByRole('group', { name })

describe('FeedbackForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists each accommodation with its note and four answers', async () => {
    const { container } = show()

    const entrance = row('Wheelchair-accessible entrance')
    expect(within(entrance).getByText('“Ramp at the main entrance.”')).toBeInTheDocument()
    expect(within(entrance).getAllByRole('radio').map((radio) => radio.labels[0].textContent)).toEqual([
      'Delivered',
      'Partly delivered',
      'Not delivered',
      "I didn't use this",
    ])
    expect(within(row('Flexible hours')).getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByLabelText(/Comment/)).toHaveAccessibleDescription("Only OpenDoor's administrators read this. Your employer never sees it.")
    expect(await axe(container)).toHaveNoViolations()
  })

  it('asks for every answer before sending', async () => {
    const user = userEvent.setup()
    show()

    await user.click(within(row('Wheelchair-accessible entrance')).getByLabelText('Delivered'))
    await user.click(screen.getByRole('button', { name: 'Send your ratings' }))

    const link = screen.getByRole('link', { name: 'Choose an answer for Flexible hours.' })
    expect(link).toHaveAttribute('href', '#rating-11-delivered')
    expect(row('Flexible hours')).toHaveAccessibleDescription(/Choose an answer for Flexible hours\./)
    await user.click(link)
    expect(within(row('Flexible hours')).getByLabelText('Delivered')).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sendFeedback).not.toHaveBeenCalled()
  })

  it('needs at least one accommodation that was used', async () => {
    const user = userEvent.setup()
    show()

    await user.click(within(row('Wheelchair-accessible entrance')).getByLabelText("I didn't use this"))
    await user.click(within(row('Flexible hours')).getByLabelText("I didn't use this"))
    await user.click(screen.getByRole('button', { name: 'Send your ratings' }))

    expect(screen.getByText('Rate at least one accommodation you used.')).toBeInTheDocument()
    expect(sendFeedback).not.toHaveBeenCalled()
  })

  it('confirms, sends the answers and hands back the result', async () => {
    const user = userEvent.setup()
    const onSent = vi.fn()
    sendFeedback.mockResolvedValue(sentFeedbackFixture())
    show({ onSent })

    await user.click(within(row('Wheelchair-accessible entrance')).getByLabelText('Partly delivered'))
    await user.click(within(row('Flexible hours')).getByLabelText("I didn't use this"))
    await user.type(screen.getByLabelText(/Comment/), '  The ramp was blocked on Mondays. ')
    await user.click(screen.getByRole('button', { name: 'Send your ratings' }))

    const dialog = screen.getByRole('dialog', { name: 'Send your ratings?' })
    expect(dialog).toHaveAccessibleDescription("You can't change them afterwards.")
    await user.click(within(dialog).getByRole('button', { name: 'Send your ratings' }))

    expect(sendFeedback).toHaveBeenCalledWith(7, { ratings: { 10: 'partial', 11: 'not_used' }, comment: 'The ramp was blocked on Mondays.' })
    await waitFor(() => expect(onSent).toHaveBeenCalledWith(sentFeedbackFixture()))
  })

  it("shows the server's answer errors on their rows", async () => {
    const user = userEvent.setup()
    sendFeedback.mockRejectedValue({ response: { status: 422, data: { message: 'x', errors: { 'ratings.11': ['Choose an answer for Flexible hours.'] } } } })
    show()

    await user.click(within(row('Wheelchair-accessible entrance')).getByLabelText('Delivered'))
    await user.click(within(row('Flexible hours')).getByLabelText('Delivered'))
    await user.click(screen.getByRole('button', { name: 'Send your ratings' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send your ratings' }))

    expect(await screen.findByRole('link', { name: 'Choose an answer for Flexible hours.' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says when it was already sent from somewhere else', async () => {
    const user = userEvent.setup()
    const onAlreadySent = vi.fn()
    sendFeedback.mockRejectedValue({ response: { status: 409, data: { message: "You've already sent your ratings." } } })
    show({ onAlreadySent })

    await user.click(within(row('Wheelchair-accessible entrance')).getByLabelText('Delivered'))
    await user.click(within(row('Flexible hours')).getByLabelText('Delivered'))
    await user.click(screen.getByRole('button', { name: 'Send your ratings' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send your ratings' }))

    await waitFor(() => expect(onAlreadySent).toHaveBeenCalled())
  })

  it('keeps the dialog open with the reason when sending fails', async () => {
    const user = userEvent.setup()
    sendFeedback.mockRejectedValue({ response: { status: 500, data: {} } })
    show()

    await user.click(within(row('Wheelchair-accessible entrance')).getByLabelText('Delivered'))
    await user.click(within(row('Flexible hours')).getByLabelText('Delivered'))
    await user.click(screen.getByRole('button', { name: 'Send your ratings' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Send your ratings' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })
})
