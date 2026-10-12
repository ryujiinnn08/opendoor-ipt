import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { applicantFixture, withdrawnApplicantFixture } from '../../test/applicantFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ApplicantsPage from './ApplicantsPage.jsx'

vi.mock('../../api/applications.js', () => ({ listApplicants: vi.fn() }))
const { listApplicants } = await import('../../api/applications.js')

const routes = [{ path: '/employer/job-postings/:id/applicants', element: <ApplicantsPage /> }]
const auth = { status: 'authenticated', role: 'employer', user: { name: 'Ana', role: 'employer', membership: { role: 'owner', employer: { type: 'company' } } } }
const job = { id: 2, title: 'Junior Web Developer', status: 'open', department: { name: 'IT' } }
const counts = { all: 2, pending: 0, reviewed: 1, hired: 0, rejected: 0, withdrawn: 1 }
const result = (applicants, extra = {}) => ({ applicants, meta: { current_page: 1, last_page: 1, per_page: 12, total: applicants.length }, counts, job, ...extra })
const open = (path = '/employer/job-postings/2/applicants') => renderRoutes(routes, { path, auth })

describe('ApplicantsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists a posting’s applicants with filters and counts', async () => {
    listApplicants.mockResolvedValue(result([applicantFixture(), withdrawnApplicantFixture]))
    const { container } = open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Applicants for Junior Web Developer' })).toBeInTheDocument()
    expect(listApplicants).toHaveBeenCalledWith('2', { status: 'all', page: 1 })
    expect(screen.getByRole('heading', { level: 2, name: '2 applicants' })).toBeInTheDocument()
    expect(screen.getByText('Department: IT')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reviewed (1)' })).toHaveAttribute('href', '/employer/job-postings/2/applicants?status=reviewed')
    expect(screen.getByRole('link', { name: 'Maria Santos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to job postings' })).toHaveAttribute('href', '/employer/job-postings')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('reads the filter and page from the address', async () => {
    listApplicants.mockResolvedValue(result([], { counts: { ...counts, pending: 0 } }))
    open('/employer/job-postings/2/applicants?status=pending&page=2')

    await waitFor(() => expect(listApplicants).toHaveBeenCalledWith('2', { status: 'pending', page: 2 }))
  })

  it('says when nobody has applied, or a filter is empty', async () => {
    listApplicants.mockResolvedValue(result([], { counts: { all: 0, pending: 0, reviewed: 0, hired: 0, rejected: 0, withdrawn: 0 } }))
    const { unmount } = open()
    expect(await screen.findByText('No one has applied for this job yet.')).toBeInTheDocument()
    unmount()

    listApplicants.mockResolvedValue(result([]))
    open('/employer/job-postings/2/applicants?status=hired')
    expect(await screen.findByText('No applicants here.')).toBeInTheDocument()
  })

  it('offers the first page when a page has nothing on it', async () => {
    listApplicants.mockResolvedValue(result([], { meta: { current_page: 3, last_page: 2, per_page: 12, total: 14 } }))
    open('/employer/job-postings/2/applicants?page=3')

    expect(await screen.findByText('There are no applicants on this page.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the first page' })).toHaveAttribute('href', '/employer/job-postings/2/applicants')
  })

  it("says it can't find another department's or a missing posting", async () => {
    listApplicants.mockRejectedValue({ response: { status: 403, data: { message: 'You can only manage job postings in your own department.' } } })
    open()

    expect(await screen.findByText("We couldn't find this job posting.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Applicants' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Job postings' })).toHaveAttribute('href', '/employer/job-postings')
  })

  it('never sends an address that is not a posting number', async () => {
    open('/employer/job-postings/..%2Fme/applicants')

    expect(await screen.findByText("We couldn't find this job posting.")).toBeInTheDocument()
    expect(listApplicants).not.toHaveBeenCalled()
  })
})
