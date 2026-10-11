import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client.js', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }, API_URL: 'http://api.test' }))

const { default: client } = await import('./client.js')
const api = await import('./candidate.js')

describe('candidate api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads and saves the profile and needs', async () => {
    client.get.mockResolvedValue({ data: { data: { name: 'Ana' } } })
    client.put.mockResolvedValue({ data: { data: [{ id: 3 }] } })

    expect(await api.getProfile()).toEqual({ name: 'Ana' })
    expect(client.get).toHaveBeenLastCalledWith('/api/candidate/profile')
    expect(await api.saveNeeds([3, 1])).toEqual([{ id: 3 }])
    expect(client.put).toHaveBeenLastCalledWith('/api/candidate/accommodations', { accommodations: [3, 1] })
    await api.saveProfile({ name: 'Ana' })
    expect(client.put).toHaveBeenLastCalledWith('/api/candidate/profile', { name: 'Ana' })
    await api.getDashboard()
    expect(client.get).toHaveBeenLastCalledWith('/api/candidate/dashboard')
  })

  it('uploads the résumé as a form field named resume', async () => {
    client.post.mockResolvedValue({ data: { data: { resume: { name: 'cv.pdf' } } } })
    const file = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })

    await api.uploadResume(file)

    const [url, form] = client.post.mock.calls[0]
    expect(url).toBe('/api/candidate/resume')
    expect(form.get('resume')).toBe(file)
  })

  it('fetches the résumé as a file', async () => {
    const blob = new Blob(['%PDF'])
    client.get.mockResolvedValue({ data: blob })

    expect(await api.getResumeFile()).toBe(blob)
    expect(client.get).toHaveBeenLastCalledWith('/api/candidate/resume', { responseType: 'blob' })
  })
})
