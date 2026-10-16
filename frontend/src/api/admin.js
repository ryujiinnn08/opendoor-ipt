import client from './client.js'

export async function getAdminDashboard() {
  const { data } = await client.get('/api/admin/dashboard')
  return data.data
}

/** status: 'pending' | 'verified' | 'rejected' */
export async function getCompanies(status) {
  const { data } = await client.get('/api/admin/employers', { params: { verification: status } })
  return data.data
}

export async function decideCompany(id, decision, reason) {
  const { data } = await client.patch(`/api/admin/employers/${id}/verify`, { decision, reason })
  return data.data
}

/** status: 'pending' (oldest first) | 'open' | 'rejected' */
export async function getPostingQueue(status) {
  const { data } = await client.get('/api/admin/job-postings', { params: { status } })
  return data.data
}

export async function getPostingForReview(id) {
  const { data } = await client.get(`/api/admin/job-postings/${id}`)
  return data.data
}

/**
 * decision: 'approve' | 'reject' (a reason is required to reject). updatedAt is the posting's
 * `updated_at` the admin reviewed; the API refuses (409) if the posting changed since.
 */
export async function decidePosting(id, decision, reason, updatedAt) {
  const { data } = await client.patch(`/api/admin/job-postings/${id}/approve`, { decision, reason, updated_at: updatedAt })
  return data.data
}

export async function getSettings() {
  const { data } = await client.get('/api/admin/settings')
  return data.data
}

export async function updateSettings(values) {
  const { data } = await client.put('/api/admin/settings', values)
  return data.data
}

/** Phase 6A. params: { q, role, status, page } */
export async function getUsers(params) {
  const { data } = await client.get('/api/admin/users', { params })
  return data
}

export async function getUser(id) {
  const { data } = await client.get(`/api/admin/users/${id}`)
  return data.data
}

/** Returns { user, temporaryPassword }: the new administrator and their password, shown once. */
export async function addAdmin(values) {
  const { data } = await client.post('/api/admin/users', values)
  return { user: data.data, temporaryPassword: data.temporary_password }
}

/** Suspend with a reason, or reactivate (no reason). */
export async function setSuspended(id, suspended, reason) {
  const { data } = await client.patch(`/api/admin/users/${id}/suspend`, suspended ? { suspended, reason } : { suspended })
  return data.data
}

/** Remove a posting; the employer sees the reason. */
export async function removePosting(id, reason) {
  await client.delete(`/api/admin/job-postings/${id}`, { data: { reason } })
}

/** Phase 6B. filter: 'comments' (default) | 'all' | 'hidden'. Returns { data, meta }. */
export async function getFeedbackForModeration(filter, page) {
  const { data } = await client.get('/api/admin/feedback', { params: { filter, page } })
  return data
}

/** "Show who wrote this": { name, email }; each look is recorded in the feedback's history. */
export async function revealFeedbackAuthor(id) {
  const { data } = await client.post(`/api/admin/feedback/${id}/author`)
  return data.data
}

/** Hide with a reason (leaves the trust score), or show again (no reason). */
export async function setFeedbackHidden(id, hidden, reason) {
  const { data } = await client.patch(`/api/admin/feedback/${id}/hide`, hidden ? { hidden, reason } : { hidden })
  return data.data
}

/** A new temporary password for an administrator who lost theirs: { user, temporaryPassword }. */
export async function replaceTemporaryPassword(id) {
  const { data } = await client.post(`/api/admin/users/${id}/temporary-password`)
  return { user: data.data, temporaryPassword: data.temporary_password }
}

/** Weekly activity for the dashboard charts: accounts, approvals, applications and hires by week, and verification. */
export async function getDashboardActivity() {
  const { data } = await client.get('/api/admin/dashboard/activity')
  return data.data
}
