import client, { getCsrfCookie } from './client.js'

export async function register(values) {
  await getCsrfCookie()
  const { data } = await client.post('/api/register', values)
  return data.data
}

export async function login(values) {
  await getCsrfCookie()
  const { data } = await client.post('/api/login', values)
  return data.data
}

export async function logout() {
  await client.post('/api/logout')
}

export async function fetchCurrentUser() {
  const { data } = await client.get('/api/me')
  return data.data
}

/**
 * Sends the "confirm your email" link again. Returns { message, email_verified }.
 */
export async function resendVerification() {
  const { data } = await client.post('/api/email/verification-notification')
  return data
}

/** values: { current_password, password, password_confirmation } */
export async function changePassword(values) {
  await client.put('/api/me/password', values)
}
