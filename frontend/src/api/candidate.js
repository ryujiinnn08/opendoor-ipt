import client from './client.js'

// The logged-in job seeker's own data (Phase 3B). Nobody else can read it.

export async function getProfile() {
  const { data } = await client.get('/api/candidate/profile')
  return data.data
}

/** Saves the whole profile, including the work experience and education entries. */
export async function saveProfile(values) {
  const { data } = await client.put('/api/candidate/profile', values)
  return data.data
}

/** [{ id, name, group_name, is_active }] in display order; retired ones stay until removed. */
export async function getNeeds() {
  const { data } = await client.get('/api/candidate/accommodations')
  return data.data
}

export async function saveNeeds(ids) {
  const { data } = await client.put('/api/candidate/accommodations', { accommodations: ids })
  return data.data
}

/** Returns the updated profile. */
export async function uploadResume(file) {
  const form = new FormData()
  form.append('resume', file)
  const { data } = await client.post('/api/candidate/resume', form)
  return data.data
}

export async function removeResume() {
  const { data } = await client.delete('/api/candidate/resume')
  return data.data
}

/**
 * The uploaded PDF as a Blob. Fetched through the app's client, which sends the Origin header
 * the API needs to recognise the session (a plain link in a new tab may not).
 */
export async function getResumeFile() {
  try {
    const { data } = await client.get('/api/candidate/resume', { responseType: 'blob' })
    return data
  } catch (error) {
    // Error bodies arrive as a Blob too; turn them back into JSON for the usual messages.
    const body = error?.response?.data
    if (body instanceof Blob) {
      try {
        error.response.data = JSON.parse(await body.text())
      } catch {
        error.response.data = {}
      }
    }
    throw error
  }
}

/** Adds or replaces the profile photo; returns the updated profile. */
export async function uploadPhoto(file) {
  const form = new FormData()
  form.append('photo', file)
  const { data } = await client.post('/api/candidate/profile/photo', form)
  return data.data
}

export async function removePhoto() {
  const { data } = await client.delete('/api/candidate/profile/photo')
  return data.data
}

/** The job seeker's own photo as a Blob (it is private, so it is fetched with the session). */
export async function getPhotoFile() {
  const { data } = await client.get('/api/candidate/profile/photo', { responseType: 'blob' })
  return data
}

/** { needs_count, top_matches, missing_sections } */
export async function getDashboard() {
  const { data } = await client.get('/api/candidate/dashboard')
  return data.data
}
