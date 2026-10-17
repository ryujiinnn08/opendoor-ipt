import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import AuthProvider from './AuthProvider.jsx'
import { readTour } from '../onboarding/tourStorage.js'
import { useAuth } from './authContext.js'

vi.mock('../api/auth.js', () => ({ fetchCurrentUser: vi.fn(), register: vi.fn() }))
const { fetchCurrentUser, register } = await import('../api/auth.js')

function Status() {
  const { user, status } = useAuth()
  return <p>{status === 'authenticated' ? (user.email_verified ? 'Confirmed' : 'Unconfirmed') : status}</p>
}

beforeEach(() => vi.resetAllMocks())

it('refreshes email confirmation on return without reloading the page, then stops checking', async () => {
  fetchCurrentUser.mockResolvedValueOnce({ role: 'candidate', email_verified: false })
    .mockResolvedValueOnce({ role: 'candidate', email_verified: true })
  render(<AuthProvider><Status /></AuthProvider>)
  await screen.findByText('Unconfirmed')
  fireEvent.focus(window)
  await screen.findByText('Confirmed')
  fireEvent.focus(window)
  expect(fetchCurrentUser).toHaveBeenCalledTimes(2)
})

it('keeps the session if the confirmation refresh fails', async () => {
  fetchCurrentUser.mockResolvedValueOnce({ role: 'candidate', email_verified: false })
    .mockRejectedValueOnce(new Error('Offline'))
  render(<AuthProvider><Status /></AuthProvider>)
  await screen.findByText('Unconfirmed')
  fireEvent.focus(window)
  await waitFor(() => expect(fetchCurrentUser).toHaveBeenCalledTimes(2))
  expect(screen.getByText('Unconfirmed')).toBeInTheDocument()
})

function RegistrationProbe() {
  const auth = useAuth()
  return <>
    <button onClick={() => auth.register({}).catch(() => {})}>Register</button>
    <p>{auth.user ? readTour(auth.user.id).invitation : 'No session'}</p>
  </>
}

it('persists the candidate invitation before publishing the new authenticated session', async () => {
  fetchCurrentUser.mockResolvedValue(null)
  register.mockResolvedValue({ id: 60601, role: 'candidate', email_verified: true })
  render(<AuthProvider><RegistrationProbe /></AuthProvider>)
  await waitFor(() => expect(fetchCurrentUser).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: 'Register' }))
  expect(await screen.findByText('pending')).toBeInTheDocument()
})

it('does not invite a newly registered employer into the candidate tour', async () => {
  fetchCurrentUser.mockResolvedValue(null)
  register.mockResolvedValue({ id: 60602, role: 'employer', email_verified: true })
  render(<AuthProvider><RegistrationProbe /></AuthProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Register' }))
  expect(await screen.findByText('unseen')).toBeInTheDocument()
})
