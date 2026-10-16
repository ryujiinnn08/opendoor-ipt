import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendContactMessage } from '../../api/contact.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ContactPage from './ContactPage.jsx'

vi.mock('../../api/contact.js', () => ({ sendContactMessage: vi.fn() }))

const routes = [{ path: '/contact', element: <ContactPage /> }]

function laravelError(status, data) {
  return Object.assign(new Error('Request failed'), { response: { status, data } })
}

async function fill({ name, email, message } = {}) {
  if (name) await userEvent.type(screen.getByLabelText('Your name'), name)
  if (email) await userEvent.type(screen.getByLabelText('Email address'), email)
  if (message) await userEvent.type(screen.getByLabelText('Your message'), message)
}

const send = () => userEvent.click(screen.getByRole('button', { name: 'Send message' }))

describe('ContactPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks for missing details without calling the server', async () => {
    renderRoutes(routes, { path: '/contact' })

    await send()

    expect(sendContactMessage).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Enter your name.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Enter your email address.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Write your message.' })).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toHaveAccessibleDescription('Error: Enter your name.')
  })

  it('asks for a longer message', async () => {
    renderRoutes(routes, { path: '/contact' })

    await fill({ name: 'Maria', email: 'maria@example.com', message: 'Hi' })
    await send()

    expect(sendContactMessage).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Write at least 10 characters so we can understand your message.' })).toBeInTheDocument()
  })

  it('sends the message, thanks the visitor and clears the form', async () => {
    sendContactMessage.mockResolvedValue('Thank you. Your message was sent. We will reply by email.')
    renderRoutes(routes, { path: '/contact' })

    await fill({ name: ' Maria Santos ', email: 'maria@example.com', message: 'I cannot upload my resume.' })
    await send()

    expect(sendContactMessage).toHaveBeenCalledWith({
      name: 'Maria Santos',
      email: 'maria@example.com',
      message: 'I cannot upload my resume.',
      website: '',
    })
    expect(await screen.findByText('Thank you. Your message was sent. We will reply by email.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toHaveValue('')
    expect(screen.getByLabelText('Your message')).toHaveValue('')
  })

  it('moves focus to the "Message sent" box, again for a second message', async () => {
    sendContactMessage.mockResolvedValue('Thank you. Your message was sent. We will reply by email.')
    renderRoutes(routes, { path: '/contact' })

    await fill({ name: 'Maria Santos', email: 'maria@example.com', message: 'I cannot upload my resume.' })
    await send()
    const box = (await screen.findByText('Message sent')).closest('[tabindex="-1"]')
    expect(box).toHaveFocus()

    await fill({ name: 'Maria Santos', email: 'maria@example.com', message: 'One more question, please.' })
    await send()
    const second = (await screen.findByText('Message sent')).closest('[tabindex="-1"]')
    expect(second).toHaveFocus()
  })

  it("shows Laravel's message beside the field", async () => {
    const message = 'Enter a valid email address, like name@example.com.'
    sendContactMessage.mockRejectedValue(laravelError(422, { errors: { email: [message] } }))
    renderRoutes(routes, { path: '/contact' })

    await fill({ name: 'Maria', email: 'maria@x', message: 'I cannot upload my resume.' })
    await send()

    expect(screen.getByRole('link', { name: message })).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(expect.stringContaining(`Error: ${message}`))
    expect(screen.getByLabelText('Your message')).toHaveValue('I cannot upload my resume.')
  })

  it('shows a friendly message when the server cannot send', async () => {
    const message = 'We could not send your message. Please try again in a few minutes.'
    sendContactMessage.mockRejectedValue(laravelError(503, { message }))
    renderRoutes(routes, { path: '/contact' })

    await fill({ name: 'Maria', email: 'maria@example.com', message: 'I cannot upload my resume.' })
    await send()

    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('says how long to wait when the limit is reached', async () => {
    const message = 'You have sent several messages in a short time. Please wait 10 minutes and try again.'
    sendContactMessage.mockRejectedValue(laravelError(429, { message }))
    renderRoutes(routes, { path: '/contact' })

    await fill({ name: 'Maria', email: 'maria@example.com', message: 'I cannot upload my resume.' })
    await send()

    expect(screen.getByText(message)).toBeInTheDocument()
  })
})
