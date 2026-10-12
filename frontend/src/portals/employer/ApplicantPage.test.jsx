import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { applicantDetailFixture, withdrawnApplicantFixture } from '../../test/applicantFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ApplicantPage from './ApplicantPage.jsx'

vi.mock('../../api/applications.js', () => ({ getApplication: vi.fn(), changeApplicationStatus: vi.fn(), getApplicantResume: vi.fn() }))
const { getApplication, changeApplicationStatus } = await import('../../api/applications.js')

const routes = [{ path: '/employer/applications/:id', element: <ApplicantPage /> }]
const auth = { status: 'authenticated', role: 'employer', user: { name: 'Ana', role: 'employer', membership: { role: 'owner', employer: { type: 'company' } } } }
const open = (path = '/employer/applications/21') => renderRoutes(routes, { path, auth })
const job = { id: 2, title: 'Junior Web Developer', interview_format: 'online', status: 'open', department: { name: 'IT' } }

describe('ApplicantPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the applicant: request, needs, contact, decision, cover note and résumé', async () => {
    getApplication.mockResolvedValue(applicantDetailFixture())
    const { container } = open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Santos' })).toBeInTheDocument()
    expect(getApplication).toHaveBeenCalledWith('21')
    expect(screen.getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('href', '/employer/job-postings/2/applicants')
    expect(screen.getByText(/Applied for/)).toHaveTextContent('Applied for Junior Web Developer on October 13, 2026')
    expect(screen.getByRole('heading', { name: 'Interview accommodation request' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cover note' })).toBeInTheDocument()
    expect(screen.getByText(/I have three years of bookkeeping/)).toBeInTheDocument()
    // Under the name and again in the résumé.
    expect(screen.getAllByText('Bookkeeper with 3 years of experience')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Open the uploaded résumé' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as hired' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('puts the headline and location under the name', async () => {
    getApplication.mockResolvedValue(applicantDetailFixture())
    open()

    const interview = await screen.findByRole('heading', { name: 'Interview accommodation request' })
    const headline = screen.getAllByText('Bookkeeper with 3 years of experience')[0]
    expect(headline.compareDocumentPosition(interview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Quezon City, Metro Manila', { selector: 'p' })).toBeInTheDocument()
  })

  it('explains a decision that lost to a withdrawal, then shows it and keeps focus', async () => {
    getApplication
      .mockResolvedValueOnce(applicantDetailFixture())
      .mockResolvedValueOnce({ ...withdrawnApplicantFixture, id: 21, applicant: { name: 'Maria Santos' }, job })
    changeApplicationStatus.mockRejectedValue({ response: { status: 409, data: { message: 'This application changed while you were looking at it. Reload to see its status.' } } })
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as hired' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, mark as hired' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This application changed while you were looking at it.')
    expect(getApplication).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText(/Maria Santos withdrew this application/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Maria Santos' })).toHaveFocus())
  })

  it('shows only the name of an applicant who withdrew', async () => {
    getApplication.mockResolvedValue({ ...withdrawnApplicantFixture, job })
    open('/employer/applications/22')

    expect(await screen.findByText('Juan Cruz withdrew this application on October 15, 2026. Their details are no longer shown.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Interview accommodation request' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('updates in place after a decision', async () => {
    getApplication.mockResolvedValue(applicantDetailFixture())
    changeApplicationStatus.mockResolvedValue(applicantDetailFixture({ status: 'rejected', status_label: 'Rejected', rejected_at: '2026-10-15T00:00:00+00:00', actions: [] }))
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as rejected' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, mark as rejected' }))

    expect(await screen.findByText('You marked them as rejected.')).toBeInTheDocument()
    expect(getApplication).toHaveBeenCalledTimes(1)
  })

  it("says it can't find another department's or a missing applicant", async () => {
    getApplication.mockRejectedValue({ response: { status: 403, data: { message: 'You can only see applicants for your own job postings.' } } })
    open()

    expect(await screen.findByText("We couldn't find this applicant.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Applicant' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Job postings' })).toHaveAttribute('href', '/employer/job-postings')
  })

  it('never sends an address that is not an application number', async () => {
    open('/employer/applications/abc')

    expect(await screen.findByText("We couldn't find this applicant.")).toBeInTheDocument()
    expect(getApplication).not.toHaveBeenCalled()
  })
})
