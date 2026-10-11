import client from './client.js'

/**
 * Open jobs, 12 per page unless perPage is smaller. Empty filters are left out of the request;
 * accommodations is sent as accommodations[] (every one must be provided).
 * Returns { jobs, meta: { current_page, last_page, per_page, total } }.
 */
export async function searchJobs({ q, category, accommodations = [], employer, sort, page, perPage } = {}) {
  const params = {
    q: q?.trim() || undefined,
    category: category || undefined,
    accommodations: accommodations.length > 0 ? accommodations : undefined,
    employer: employer || undefined,
    sort: sort || undefined,
    page: page || undefined,
    per_page: perPage || undefined,
  }
  const { data } = await client.get('/api/job-postings', {
    params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)),
  })
  return { jobs: data.data, meta: data.meta }
}

/** One open job; anything else rejects with a 404. */
export async function getJob(id) {
  const { data } = await client.get(`/api/job-postings/${id}`)
  return data.data
}

/** An employer's public page; 404 until they have an approved posting. */
export async function getEmployer(id) {
  const { data } = await client.get(`/api/employers/${id}`)
  return data.data
}
