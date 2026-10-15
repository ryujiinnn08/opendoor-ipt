import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { applicationFixture, reviewedFixture } from '../../test/applicationFixture.js'
import { sentFeedbackFixture } from '../../test/feedbackFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ApplicationPage from './ApplicationPage.jsx'

vi.mock('../../api/applications.js', () => ({ getApplication: vi.fn(), changeApplicationStatus: vi.fn() }))
const { getApplication, changeApplicationStatus } = await import('../../api/applications.js')
vi.mock('../../api/feedback.js', () => ({ getFeedbackForm: vi.fn() }))
const { getFeedbackForm } = await import('../../api/feedback.js')

const auth = { status: 'authenticated', role: 'candidate', user: { name: 'Ana', role: 'candidate' } }
const routes = [{ path: '/candidate/applications/:id', element: <ApplicationPage /> }]
const open = (path = '/candidate/applications/7') => renderRoutes(routes, { path, auth })
const accommodations = [
  { id: 10, name: 'Remote work', group_name: 'Work arrangement', note: 'Laptop provided.' },
  { id: 11, name: 'Flexible hours', group_name: 'Work arrangement', note: null },
]
const detailed = (application) => ({ ...application, job: { ...application.job, accommodations }, hired_accommodations: null })

describe('ApplicationPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a Pending application: path, job, what was sent', async () => {
    getApplication.mockResolvedValue(detailed(applicationFixture()))
    const { container } = open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Junior Web Developer' })).toBeInTheDocument()
    expect(getApplication).toHaveBeenCalledWith('7')
    expect(screen.getByText('Acme Corp.')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Your application' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See the job' })).toHaveAttribute('href', '/candidate/jobs/2')
    const sent = screen.getByRole('region', { name: 'What you sent' })
    expect(within(sent).getByText(/I have three years of bookkeeping/)).toBeInTheDocument()
    expect(within(sent).getByText('Online interview with captions, please.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Withdraw application for Junior Web Developer' })).toBeInTheDocument()
    expect(screen.getByText('If you were hired, ask the employer to open your application on OpenDoor first.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to My applications' })).toHaveAttribute('href', '/candidate/applications')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('says Nothing for texts left empty', async () => {
    getApplication.mockResolvedValue(detailed(applicationFixture({ cover_note: null, interview_request: null })))
    open()

    const sent = await screen.findByRole('region', { name: 'What you sent' })
    expect(within(sent).getAllByText('Nothing')).toHaveLength(2)
  })

  it('shows the accommodations copied at the hire, confirmed by the job seeker', async () => {
    getApplication.mockResolvedValue({
      ...detailed(reviewedFixture({ status: 'hired', status_label: 'Hired', hired_at: '2026-10-16', hire_confirmed_by: 'candidate', actions: [] })),
      hired_accommodations: [accommodations[0]],
    })
    open()

    const hired = await screen.findByRole('region', { name: 'Accommodations when you were hired' })
    expect(within(hired).getByText('Remote work')).toBeInTheDocument()
    expect(within(hired).queryByText('Flexible hours')).not.toBeInTheDocument()
    expect(screen.getByText('Confirmed by you')).toBeInTheDocument()
  })

  it('links to the feedback form once it opens', async () => {
    getApplication.mockResolvedValue({
      ...detailed(reviewedFixture({ status: 'hired', status_label: 'Hired', hired_at: '2026-09-14', actions: [], feedback: { state: 'open', opens_on: '2026-10-14', sent_at: null } })),
      hired_accommodations: [accommodations[0]],
    })
    open()

    expect(await screen.findByRole('link', { name: 'Rate the accommodations for Junior Web Developer' })).toHaveAttribute('href', '/candidate/applications/7/feedback')
    expect(getFeedbackForm).not.toHaveBeenCalled()
  })

  it('shows the job seeker their own ratings once sent', async () => {
    getApplication.mockResolvedValue({
      ...detailed(reviewedFixture({ status: 'hired', status_label: 'Hired', hired_at: '2026-09-14', actions: [], feedback: { state: 'sent', opens_on: '2026-10-14', sent_at: '2026-10-15T03:00:00+00:00' } })),
      hired_accommodations: [accommodations[0]],
    })
    getFeedbackForm.mockResolvedValue(sentFeedbackFixture())
    const { container } = open()

    expect(await screen.findByText('You rated the accommodations on October 15, 2026.')).toBeInTheDocument()
    const ratings = await screen.findByRole('region', { name: 'Your ratings' })
    expect(within(ratings).getByText('Partly delivered')).toBeInTheDocument()
    expect(getFeedbackForm).toHaveBeenCalledWith('7')
    expect(await axe(container)).toHaveNoViolations()
  })

  it("says when the job seeker's own ratings couldn't load, with Try again", async () => {
    const user = userEvent.setup()
    getApplication.mockResolvedValue({
      ...detailed(reviewedFixture({ status: 'hired', status_label: 'Hired', hired_at: '2026-09-14', actions: [], feedback: { state: 'sent', opens_on: '2026-10-14', sent_at: '2026-10-15T03:00:00+00:00' } })),
      hired_accommodations: [accommodations[0]],
    })
    getFeedbackForm.mockRejectedValueOnce({ response: { status: 500, data: {} } }).mockResolvedValueOnce(sentFeedbackFixture())
    open()

    expect(await screen.findByText("We couldn't load your ratings.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('region', { name: 'Your ratings' })).toBeInTheDocument()
  })

  it('explains a removed job instead of linking to it', async () => {
    getApplication.mockResolvedValue(detailed(applicationFixture({ job: { ...applicationFixture().job, state: 'removed' } })))
    open()

    expect(await screen.findByText('This job was removed.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'See the job' })).not.toBeInTheDocument()
  })

  it('updates in place after an action', async () => {
    getApplication.mockResolvedValue(detailed(reviewedFixture()))
    changeApplicationStatus.mockResolvedValue(detailed(reviewedFixture({ status: 'withdrawn', status_label: 'Withdrawn', withdrawn_at: '2026-10-15T03:00:00+00:00', actions: [] })))
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw application for Junior Web Developer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw application' }))

    expect(await screen.findByText('You withdrew this application.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Withdraw application for/ })).not.toBeInTheDocument()
    expect(getApplication).toHaveBeenCalledTimes(1)
  })

  it('reloads when the application changed elsewhere', async () => {
    getApplication
      .mockResolvedValueOnce(detailed(reviewedFixture()))
      .mockResolvedValueOnce(detailed(reviewedFixture({ status: 'rejected', status_label: 'Rejected', rejected_at: '2026-10-15T03:00:00+00:00', actions: [] })))
    changeApplicationStatus.mockRejectedValue({ response: { status: 409, data: { message: 'This application changed while you were looking at it. Reload to see its status.' } } })
    open()

    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw application for Junior Web Developer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw application' }))

    expect(await screen.findByText(/The employer chose other applicants/)).toBeInTheDocument()
    expect(getApplication).toHaveBeenCalledTimes(2)
  })

  it("says it can't find someone else's or a missing application", async () => {
    getApplication.mockRejectedValue({ response: { status: 403, data: { message: "This application isn't yours." } } })
    open()

    expect(await screen.findByText("We couldn't find this application.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Application' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My applications' })).toHaveAttribute('href', '/candidate/applications')
  })

  it('never sends an address that is not an application number', async () => {
    open('/candidate/applications/..%2Fme')

    expect(await screen.findByText("We couldn't find this application.")).toBeInTheDocument()
    expect(getApplication).not.toHaveBeenCalled()
  })
})
