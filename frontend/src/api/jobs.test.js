import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client.js', () => ({ default: { get: vi.fn() } }))

const { default: client } = await import('./client.js')
const { getEmployer, getJob, searchJobs } = await import('./jobs.js')

describe('jobs api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends only the filters that are set', async () => {
    client.get.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { total: 1, last_page: 1, current_page: 1, per_page: 3 } } })
    const result = await searchJobs({ q: '  ', category: '3', accommodations: [1, 2], sort: 'newest', page: 2, perPage: 3 })
    expect(client.get).toHaveBeenCalledWith('/api/job-postings', {
      params: { category: '3', accommodations: [1, 2], sort: 'newest', page: 2, per_page: 3 },
    })
    expect(result).toEqual({ jobs: [{ id: 1 }], meta: { total: 1, last_page: 1, current_page: 1, per_page: 3 } })
  })

  it('asks for Matches my needs only when match is on', async () => {
    client.get.mockResolvedValue({ data: { data: [], meta: {} } })

    await searchJobs({ match: true, sort: 'match' })
    expect(client.get).toHaveBeenLastCalledWith('/api/job-postings', { params: { match: 1, sort: 'match' } })
    await searchJobs({ match: false, sort: 'match' })
    expect(client.get).toHaveBeenLastCalledWith('/api/job-postings', { params: { sort: 'match' } })
  })

  it('loads one job and one employer', async () => {
    client.get.mockResolvedValue({ data: { data: { id: 7 } } })
    expect(await getJob(7)).toEqual({ id: 7 })
    expect(client.get).toHaveBeenLastCalledWith('/api/job-postings/7')
    expect(await getEmployer(3)).toEqual({ id: 7 })
    expect(client.get).toHaveBeenLastCalledWith('/api/employers/3')
  })
})
