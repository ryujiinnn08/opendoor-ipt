import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import AuthProvider from './AuthProvider.jsx'
import { useAuth } from './authContext.js'

vi.mock('../api/auth.js', () => ({ fetchCurrentUser: vi.fn() }))
const { fetchCurrentUser } = await import('../api/auth.js')

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
