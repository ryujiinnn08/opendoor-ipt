import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { applicationFixture, reviewedFixture } from '../../test/applicationFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import MyApplicationsPage from './MyApplicationsPage.jsx'

vi.mock('../../api/applications.js', () => ({ listApplications: vi.fn(), changeApplicationStatus: vi.fn() }))
const { listApplications, changeApplicationStatus } = await import('../../api/applications.js')

const routes = [{ path: '/candidate/applications', element: <MyApplicationsPage /> }]
const auth = { status: 'authenticated', role: 'candidate', user: { name: 'Ana', role: 'candidate' } }
const counts = { all: 2, waiting: 2, hired: 0, closed: 0 }
const page = (applications, extra = {}) => ({
  applications,
  meta: { current_page: 1, last_page: 1, per_page: 12, total: applications.length },
  counts,
  ...extra,
})

describe('MyApplicationsPage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('lists applications with their status, next step and filters', async () => {
    listApplications.mockResolvedValue(page([reviewedFixture(), applicationFixture({ id: 8, job: { ...applicationFixture().job, id: 3, title: 'HR Assistant', state: 'removed' } })]))
    const { container } = renderRoutes(routes, { path: '/candidate/applications', auth })

    expect(await screen.findByRole('heading', { level: 2, name: '2 applications' })).toBeInTheDocument()
    expect(listApplications).toHaveBeenCalledWith({ status: 'all', page: 1 })
    const rows = screen.getAllByRole('listitem').filter((item) => item.id?.startsWith('application-'))
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('href', '/candidate/applications/7')
    expect(within(rows[0]).getByText('Reviewed')).toBeInTheDocument()
    expect(within(rows[0]).getByText(/Applied October 13, 2026/)).toBeInTheDocument()
    expect(within(rows[0]).getByText(/If they want to interview you/)).toBeInTheDocument()
    expect(within(rows[1]).getByText('This job was removed.')).toBeInTheDocument()
    expect(screen.queryByText(/ask the employer to open/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Waiting for a reply (2)' })).toHaveAttribute('href', '/candidate/applications?status=waiting')
    expect(screen.queryByRole('button', { name: /Withdraw application|I was hired/ })).not.toBeInTheDocument()
    expect(changeApplicationStatus).not.toHaveBeenCalled()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('says where each hire’s feedback stands', async () => {
    const hired = (id, title, feedback) =>
      reviewedFixture({ id, status: 'hired', status_label: 'Hired', hired_at: '2026-09-14', actions: [], feedback, job: { ...applicationFixture().job, id, title } })
    listApplications.mockResolvedValue(page([
      hired(7, 'Office Clerk', { state: 'open', opens_on: '2026-10-14', sent_at: null }),
      hired(8, 'Graphic Designer', { state: 'not_yet', opens_on: '2026-11-12', sent_at: null }),
    ]))
    renderRoutes(routes, { path: '/candidate/applications', auth })

    expect(await screen.findByRole('link', { name: 'Rate the accommodations for Office Clerk' })).toHaveAttribute('href', '/candidate/applications/7/feedback')
    const rows = screen.getAllByRole('listitem').filter((item) => item.id?.startsWith('application-'))
    expect(within(rows[0]).queryByText(/About 30 days after your hire date/)).not.toBeInTheDocument()
    expect(within(rows[1]).getByText(/About 30 days after your hire date/)).toBeInTheDocument()
    expect(within(rows[1]).getByText("You can rate your employer's accommodations from November 12, 2026.")).toBeInTheDocument()
  })

  it('reads the filter and page from the address', async () => {
    listApplications.mockResolvedValue(page([], { counts: { all: 3, waiting: 0, hired: 0, closed: 3 } }))
    renderRoutes(routes, { path: '/candidate/applications?status=closed&page=2', auth })

    await waitFor(() => expect(listApplications).toHaveBeenCalledWith({ status: 'closed', page: 2 }))
    expect(await screen.findByText('No applications here.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Closed (3)' })).toHaveAttribute('aria-current', 'true')

    listApplications.mockClear()
    renderRoutes(routes, { path: '/candidate/applications?status=bogus&page=-4', auth })
    await waitFor(() => expect(listApplications).toHaveBeenCalledWith({ status: 'all', page: 1 }))
  })

  it('says a job stopped taking applications only while the application waits', async () => {
    const closedJob = { ...applicationFixture().job, state: 'not_open' }
    listApplications.mockResolvedValue(
      page([
        reviewedFixture({ job: closedJob }),
        applicationFixture({ id: 8, status: 'hired', status_label: 'Hired', hired_at: '2026-09-11', actions: [], job: closedJob }),
      ]),
    )
    renderRoutes(routes, { path: '/candidate/applications', auth })

    await screen.findByRole('heading', { level: 2, name: '2 applications' })
    const rows = screen.getAllByRole('listitem').filter((item) => item.id?.startsWith('application-'))
    expect(within(rows[0]).getByText("This job isn't taking applications right now.")).toBeInTheDocument()
    expect(within(rows[1]).queryByText("This job isn't taking applications right now.")).not.toBeInTheDocument()
  })

  it('starts a new filter on its first page', async () => {
    listApplications.mockResolvedValue(page([reviewedFixture()], { meta: { current_page: 2, last_page: 2, per_page: 12, total: 13 }, counts: { all: 13, waiting: 1, hired: 1, closed: 11 } }))
    renderRoutes(routes, { path: '/candidate/applications?page=2', auth })

    expect(await screen.findByRole('link', { name: 'Hired (1)' })).toHaveAttribute('href', '/candidate/applications?status=hired')
  })

  it('offers the first page when a page has nothing on it', async () => {
    listApplications.mockResolvedValue(page([], { meta: { current_page: 3, last_page: 2, per_page: 12, total: 14 }, counts: { all: 14, waiting: 2, hired: 1, closed: 11 } }))
    renderRoutes(routes, { path: '/candidate/applications?page=3', auth })

    expect(await screen.findByText('There are no applications on this page.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the first page' })).toHaveAttribute('href', '/candidate/applications')
    expect(screen.queryByText("You haven't applied for any jobs yet.")).not.toBeInTheDocument()
  })



  it('invites a job seeker without applications to find jobs', async () => {
    listApplications.mockResolvedValue(page([], { counts: { all: 0, waiting: 0, hired: 0, closed: 0 } }))
    renderRoutes(routes, { path: '/candidate/applications', auth })

    expect(await screen.findByText("You haven't applied for any jobs yet.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find jobs' })).toHaveAttribute('href', '/candidate/jobs')
  })

  it('shows and reads out that an application was sent', async () => {
    const announce = vi.fn()
    listApplications.mockResolvedValue(page([applicationFixture()]))
    const { router, unmount } = renderRoutes(routes, { path: { pathname: '/candidate/applications', state: { sent: 'Acme Corp.' } }, auth, announce })

    // The name's own full stop ends the sentence ("Acme Corp.", not "Acme Corp..").
    expect(await screen.findByText('Your application was sent to Acme Corp.')).toBeInTheDocument()
    // Good news gets the happy mascot (decoration; the words carry the message).
    expect(screen.getByRole('heading', { name: 'Application sent!' })).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith('Your application was sent to Acme Corp.')
    // Shown once: the message leaves the history entry, so Back or a reload won't repeat it.
    await waitFor(() => expect(router.state.location.state).toBeNull())
    unmount()

    renderRoutes(routes, { path: { pathname: '/candidate/applications', state: { sent: 'Maria Cruz' } }, auth })
    expect(await screen.findByText('Your application was sent to Maria Cruz.')).toBeInTheDocument()
  })


})
