import client from './client.js'

// Accommodation feedback (Phase 5). Only the hired job seeker; the server checks every rule.

/** The form: { application_id, job, employer, hired_at, state, opens_on, accommodations, sent }. */
export async function getFeedbackForm(applicationId) {
  const { data } = await client.get(`/api/applications/${applicationId}/feedback-form`)
  return data.data
}

/** `ratings` maps each accommodation id to an answer. Returns the form, now with `sent`. */
export async function sendFeedback(applicationId, { ratings, comment }) {
  const { data } = await client.post(`/api/applications/${applicationId}/feedback`, { ratings, comment })
  return data.data
}
