import client from './client.js'

// The accommodation trust score (Phase 5B): totals only, never a response.

/** { employer: { id, name }, score, responses, breakdown, not_enough } for anyone; all null below 3 responses. */
export async function getTrustScore(employerId) {
  const { data } = await client.get(`/api/employers/${employerId}/trust-score`)
  return data.data
}

/** The logged-in employer's own, in the same shape. */
export async function getMyTrustScore() {
  const { data } = await client.get('/api/employer/trust-score')
  return data.data
}
