import client from './client.js'

/** { data, meta }: 20 a page, newest first. */
export async function getNotifications(page = 1) {
  const { data } = await client.get('/api/notifications', { params: { page } })
  return data
}

export async function getUnreadCount() {
  const { data } = await client.get('/api/notifications/unread-count')
  return data.data.count
}

export async function markRead(id) {
  const { data } = await client.patch(`/api/notifications/${id}/read`)
  return data.data
}

export async function markAllRead() {
  await client.patch('/api/notifications/read-all')
}
