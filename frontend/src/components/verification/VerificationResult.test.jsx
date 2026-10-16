import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import VerificationResult from './VerificationResult.jsx'

const routes = [{ path: '/', element: <VerificationResult /> }]
const seeker = { name: 'Ana', email: 'ana@example.com', role: 'candidate', email_verified: false }

describe('VerificationResult', () => {
  it('says the email is confirmed once, reloads the account and clears the address', async () => {
    const announce = vi.fn()
    const refresh = vi.fn()
    const { container, router } = renderRoutes(routes, {
      path: '/?verified=1',
      auth: { status: 'authenticated', role: 'candidate', user: seeker, refresh },
      announce,
    })

    expect(screen.getByText('Thank you. Your email address is confirmed.')).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
    expect(refresh).toHaveBeenCalled()
    expect(announce).toHaveBeenCalledWith('Thank you. Your email address is confirmed.')
    expect(await axe(container)).toHaveNoViolations()

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss this message' }))
    expect(screen.queryByText('Thank you. Your email address is confirmed.')).not.toBeInTheDocument()
  })

  it('tells a guest with a broken link to log in and ask for a new one', () => {
    renderRoutes(routes, { path: '/?verified=0' })

    expect(screen.getByText(/This link didn't work/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })

  it('points a logged-in person with a broken link to the reminder', () => {
    renderRoutes(routes, { path: '/?verified=0', auth: { status: 'authenticated', role: 'candidate', user: seeker } })

    expect(screen.getByText(/This link didn't work/)).toBeInTheDocument()
    expect(screen.getByText(/in the reminder to get a new one/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it('shows nothing on an ordinary visit', () => {
    const { container } = renderRoutes(routes, { path: '/' })

    expect(container).toBeEmptyDOMElement()
  })
})
