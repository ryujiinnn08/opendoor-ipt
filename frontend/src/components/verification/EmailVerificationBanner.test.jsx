import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import EmailVerificationBanner from './EmailVerificationBanner.jsx'

vi.mock('../../api/auth.js', () => ({ resendVerification: vi.fn() }))
const { resendVerification } = await import('../../api/auth.js')

const seeker = { name: 'Ana', email: 'ana@example.com', role: 'candidate', email_verified: false }
const signedIn = (user, extra = {}) => ({ status: 'authenticated', role: user.role, user, ...extra })
const show = (auth, announce) => renderRoutes([{ path: '/', element: <EmailVerificationBanner /> }], { auth, announce })

describe('EmailVerificationBanner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reminds a job seeker or employer whose email is not confirmed', async () => {
    const { container } = show(signedIn(seeker))

    expect(screen.getByText('Please confirm your email address')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText(/before you can apply for jobs/)).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('tells employers what waits for the confirmation', () => {
    show(signedIn({ ...seeker, role: 'employer' }))

    expect(screen.getByText(/before you can post jobs/)).toBeInTheDocument()
  })

  it.each([
    ['a guest', { status: 'guest', user: null }],
    ['a confirmed job seeker', signedIn({ ...seeker, email_verified: true })],
    ['an administrator', signedIn({ ...seeker, role: 'admin' })],
  ])('stays hidden for %s', (_, auth) => {
    show(auth)

    expect(screen.queryByText('Please confirm your email address')).not.toBeInTheDocument()
  })

  it('sends the link again, shows the result and reads it out', async () => {
    resendVerification.mockResolvedValue({ message: 'We sent a new link to ana@example.com.', email_verified: false })
    const announce = vi.fn()
    show(signedIn(seeker), announce)

    await userEvent.click(screen.getByRole('button', { name: 'Send the link again' }))

    expect(resendVerification).toHaveBeenCalledOnce()
    expect(await screen.findByText('We sent a new link to ana@example.com.')).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith('We sent a new link to ana@example.com.')
  })

  it('reloads the account when the email was confirmed meanwhile', async () => {
    resendVerification.mockResolvedValue({ message: 'Your email address is already confirmed.', email_verified: true })
    const refresh = vi.fn()
    show(signedIn(seeker, { refresh }))

    await userEvent.click(screen.getByRole('button', { name: 'Send the link again' }))

    expect(await screen.findByText('Your email address is already confirmed.')).toBeInTheDocument()
    expect(refresh).toHaveBeenCalled()
  })

  it('explains the limit in plain words when asked too often', async () => {
    resendVerification.mockRejectedValue({ response: { status: 429, data: { message: 'Too Many Attempts.' } } })
    show(signedIn(seeker))

    await userEvent.click(screen.getByRole('button', { name: 'Send the link again' }))

    expect(await screen.findByText('You asked for several links in a short time. Please wait a minute, then try again.')).toBeInTheDocument()
  })
})
