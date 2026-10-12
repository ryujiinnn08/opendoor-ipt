import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { applicationFixture } from '../../test/applicationFixture.js'
import { profileFixture } from '../../test/candidateFixture.js'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ApplyPage from './ApplyPage.jsx'

vi.mock('../../api/jobs.js', () => ({ getJob: vi.fn() }))
vi.mock('../../api/candidate.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../api/applications.js', () => ({ applyForJob: vi.fn() }))
const { getJob } = await import('../../api/jobs.js')
const { getProfile } = await import('../../api/candidate.js')
const { applyForJob } = await import('../../api/applications.js')

const auth = { status: 'authenticated', role: 'candidate', user: { name: 'Ana', role: 'candidate' } }
const routes = [
  { path: '/candidate/jobs/:id/apply', element: <ApplyPage /> },
  { path: '/candidate/applications', element: <p>My applications page</p> },
]
const open = () => renderRoutes(routes, { path: '/candidate/jobs/2/apply', auth })

async function fillIn() {
  await userEvent.type(await screen.findByLabelText(/Cover note/), 'I have three years of bookkeeping.')
  await userEvent.type(screen.getByLabelText(/Interview accommodation request/), 'Captions, please.')
}

describe('ApplyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getJob.mockResolvedValue(job)
    getProfile.mockResolvedValue(profileFixture)
  })

  it('sends both texts and opens My applications', async () => {
    applyForJob.mockResolvedValue(applicationFixture())
    const { container, router } = open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Apply for Junior Web Developer' })).toBeInTheDocument()
    expect(screen.getByText("This job's interview is online. For example: captions, a chat option or more time.")).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'What the employer will see' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
    await fillIn()
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }))

    expect(applyForJob).toHaveBeenCalledWith('2', { cover_note: 'I have three years of bookkeeping.', interview_request: 'Captions, please.' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/candidate/applications'))
    expect(router.state.location.state).toEqual({ sent: 'Acme Corp.' })
  })

  it('says so when the job seeker already applied', async () => {
    getJob.mockResolvedValue({ ...job, my_application: { id: 7, status: 'pending', status_label: 'Pending', applied_at: '2026-10-13T02:00:00+00:00' } })
    open()

    expect(await screen.findByText("You've already applied for this job.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View your application' })).toHaveAttribute('href', '/candidate/applications/7')
    expect(screen.queryByRole('button', { name: 'Send application' })).not.toBeInTheDocument()
  })

  it('explains an application sent from another tab, keeping the text', async () => {
    applyForJob.mockRejectedValue({ response: { status: 409, data: { message: "You've already applied for this job.", application_id: 9 } } })
    open()
    await fillIn()
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }))

    expect(await screen.findByText("You've already applied for this job.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View your application' })).toHaveAttribute('href', '/candidate/applications/9')
    expect(screen.getByLabelText(/Cover note/)).toHaveValue('I have three years of bookkeeping.')
  })

  it('explains when the job closed while writing', async () => {
    applyForJob.mockRejectedValue({ response: { status: 404, data: { message: "This job isn't taking applications." } } })
    open()
    await fillIn()
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }))

    expect(await screen.findByText("This job isn't taking applications.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse open jobs' })).toHaveAttribute('href', '/candidate/jobs')
    expect(screen.getByLabelText(/Interview accommodation request/)).toHaveValue('Captions, please.')
  })

  it('shows field errors in a summary', async () => {
    applyForJob.mockRejectedValue({
      response: { status: 422, data: { message: 'Invalid', errors: { cover_note: ['The cover note may not be greater than 3000 characters.'] } } },
    })
    open()
    await fillIn()
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }))

    expect(await screen.findByRole('link', { name: 'The cover note may not be greater than 3000 characters.' })).toBeInTheDocument()
  })

  it('says a job that is not open is not taking applications', async () => {
    getJob.mockRejectedValue({ response: { status: 404, data: {} } })
    open()

    expect(await screen.findByText("This job isn't taking applications.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send application' })).not.toBeInTheDocument()
  })
})
