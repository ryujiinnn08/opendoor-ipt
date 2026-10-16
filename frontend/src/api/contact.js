import client, { getCsrfCookie } from './client.js'

/** Emails the OpenDoor team. `website` is the hidden trap field; people leave it empty. */
export async function sendContactMessage({ name, email, message, website = '' }) {
  await getCsrfCookie()
  const { data } = await client.post('/api/contact', { name, email, message, website })
  return data.message
}
