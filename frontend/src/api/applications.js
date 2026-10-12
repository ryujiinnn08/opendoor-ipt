import client from './client.js'

// Applications (Phase 4). A job seeker sees only their own; the server checks every rule.

/** Sends an application; both texts are optional. Returns the new application. */
export async function applyForJob(jobId, { cover_note, interview_request }) {
  const { data } = await client.post(`/api/job-postings/${jobId}/applications`, { cover_note, interview_request })
  return data.data
}

/** { applications, meta: { current_page, last_page, per_page, total }, counts: { all, waiting, hired, closed } } */
export async function listApplications({ status, page } = {}) {
  const params = { status: status && status !== 'all' ? status : undefined, page: page > 1 ? page : undefined }
  const { data } = await client.get('/api/applications', {
    params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)),
  })
  return { applications: data.data, meta: data.meta, counts: data.counts }
}

/** One application, with the job's accommodations and, for a hire, the copy made then. */
export async function getApplication(id) {
  const { data } = await client.get(`/api/applications/${id}`)
  return data.data
}

/** `expected_status` is the status the person saw, so a change made meanwhile is refused (409). */
export async function changeApplicationStatus(id, { status, expected_status }) {
  const { data } = await client.patch(`/api/applications/${id}/status`, { status, expected_status })
  return data.data
}
