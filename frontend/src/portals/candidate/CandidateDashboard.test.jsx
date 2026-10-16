import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import CandidateDashboard from './CandidateDashboard.jsx'

vi.mock('../../api/candidate.js', () => ({ getDashboard: vi.fn(), getPhotoFile: vi.fn() }))
const { getDashboard } = await import('../../api/candidate.js')

const routes = [{ path: '/candidate/dashboard', element: <CandidateDashboard /> }]
const seeker = { status: 'authenticated', role: 'candidate', user: { name: 'Ana Reyes', role: 'candidate' } }
const matched = (id, title) => ({ ...job, id, title, match: { needs_total: 2, needs_met: 2, missing: [] } })

function renderPage() {
  return renderRoutes(routes, { path: '/candidate/dashboard', auth: seeker })
}

describe('CandidateDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks a new job seeker what they need first', async () => {
    getDashboard.mockResolvedValue({ needs_count: 0, top_matches: [], missing_sections: ['headline', 'location', 'contact_number', 'education', 'skills', 'needs'] })
    const { container } = renderPage()

    expect(await screen.findByRole('link', { name: 'Tell us what you need' })).toHaveAttribute('href', '/candidate/needs')
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome, Ana Reyes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your top matches' })).not.toBeInTheDocument()

    // Get started (UI_FEEDBACK_WAVE_B_PLAN B4): every step to do, worked out from the data.
    const start = screen.getByRole('region', { name: 'Get started' })
    expect(within(start).getByText('0 of 4 done')).toBeInTheDocument()
    expect(within(start).getByRole('link', { name: 'Add your accommodation needs: to do' })).toHaveAttribute('href', '/candidate/needs')
    expect(within(start).getByRole('link', { name: 'Complete your profile: to do' })).toHaveAttribute('href', '/candidate/profile')
    expect(within(start).getByText('Still to fill in: headline, city or municipality and province, contact number, education, skills')).toBeInTheDocument()
    expect(within(start).getByRole('link', { name: 'Upload a résumé: to do' })).toHaveAttribute('href', '/candidate/profile/resume')
    expect(within(start).getByRole('link', { name: 'Apply for a job: to do' })).toHaveAttribute('href', '/candidate/jobs')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('puts feedback due first, with a link to rate', async () => {
    getDashboard.mockResolvedValue({
      needs_count: 2,
      top_matches: [matched(2, 'Data Encoder')],
      missing_sections: [],
      feedback_due: [{ application_id: 7, job_title: 'Office Clerk', employer_name: 'OpenDoor Demo Corp.' }],
    })
    const { container } = renderPage()

    const due = await screen.findByRole('region', { name: 'Feedback due' })
    expect(within(due).getByText('Rate how OpenDoor Demo Corp. delivered the accommodations for Office Clerk.')).toBeInTheDocument()
    expect(within(due).getByRole('link', { name: 'Rate the accommodations for Office Clerk' })).toHaveAttribute('href', '/candidate/applications/7/feedback')
    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings.indexOf('Feedback due')).toBeLessThan(headings.indexOf('Your top matches'))
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no feedback section when nothing is due', async () => {
    getDashboard.mockResolvedValue({ needs_count: 2, top_matches: [], missing_sections: [], feedback_due: [] })
    renderPage()

    await screen.findByRole('region', { name: 'Your top matches' })
    expect(screen.queryByRole('region', { name: 'Feedback due' })).not.toBeInTheDocument()
  })

  it('shows the top matches to a job seeker with needs', async () => {
    getDashboard.mockResolvedValue({ needs_count: 2, top_matches: [matched(2, 'Data Encoder'), matched(3, 'Clerk')], missing_sections: [] })
    renderPage()

    const top = await screen.findByRole('region', { name: 'Your top matches' })
    expect(within(top).getByRole('link', { name: 'Data Encoder' })).toHaveAttribute('href', '/candidate/jobs/2')
    expect(within(top).getAllByText('Meets all 2 of your needs')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'See all matches' })).toHaveAttribute('href', '/candidate/jobs')
    expect(screen.queryByRole('link', { name: 'Tell us what you need' })).not.toBeInTheDocument()
  })

  it('says when no job meets the needs yet', async () => {
    getDashboard.mockResolvedValue({ needs_count: 2, top_matches: [], missing_sections: [] })
    renderPage()

    expect(await screen.findByText('No open jobs meet your needs yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse all jobs' })).toHaveAttribute('href', '/candidate/jobs?show=all')
  })

  it('offers Try again when it cannot load', async () => {
    getDashboard.mockRejectedValueOnce({ response: { status: 500, data: {} } }).mockResolvedValue({ needs_count: 0, top_matches: [], missing_sections: [] })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: 'Tell us what you need' })).toBeInTheDocument()
  })

  it('links each count to the filtered list, shows the latest updates, or invites the first one', async () => {
    getDashboard.mockResolvedValue({
      needs_count: 2,
      top_matches: [],
      missing_sections: [],
      applications: { all: 4, waiting: 2, hired: 1, closed: 1 },
      recent_applications: [
        {
          id: 9,
          status: 'reviewed',
          applied_at: '2026-10-12T02:00:00Z',
          updated_at: '2026-10-14T02:00:00Z',
          job: { id: 2, title: 'Data Encoder', employer: { id: 1, name: 'Acme Corp.', logo_url: null } },
        },
      ],
    })
    const { unmount } = renderPage()

    const card = await screen.findByRole('region', { name: 'My applications' })
    expect(within(card).getByRole('link', { name: '2 Waiting for a reply' })).toHaveAttribute('href', '/candidate/applications?status=waiting')
    expect(within(card).getByRole('link', { name: '1 Hired' })).toHaveAttribute('href', '/candidate/applications?status=hired')
    expect(within(card).getByRole('link', { name: '1 Closed Not selected or withdrawn' })).toHaveAttribute('href', '/candidate/applications?status=closed')
    expect(within(card).getByRole('link', { name: 'See all 4' })).toHaveAttribute('href', '/candidate/applications')
    expect(within(card).getByRole('link', { name: 'Data Encoder' })).toHaveAttribute('href', '/candidate/applications/9')
    expect(within(card).getByText('Reviewed')).toBeInTheDocument()
    unmount()

    getDashboard.mockResolvedValue({ needs_count: 2, top_matches: [], missing_sections: [], applications: { all: 0, waiting: 0, hired: 0, closed: 0 } })
    renderPage()
    const empty = await screen.findByRole('region', { name: 'My applications' })
    expect(within(empty).getByText("You haven't applied for any jobs yet.")).toBeInTheDocument()
    expect(within(empty).getByRole('link', { name: 'Find jobs' })).toHaveAttribute('href', '/candidate/jobs')
  })

  it('hides Get started when asked, and once every step is done', async () => {
    getDashboard.mockResolvedValue({ needs_count: 2, top_matches: [], missing_sections: ['skills'], profile: { has_resume: true }, applications: { all: 1, waiting: 1, hired: 0, closed: 0 } })
    const { unmount } = renderPage()
    const start = await screen.findByRole('region', { name: 'Get started' })
    expect(within(start).getByText('3 of 4 done')).toBeInTheDocument()
    await userEvent.click(within(start).getByRole('button', { name: 'Hide this' }))
    expect(screen.queryByRole('region', { name: 'Get started' })).not.toBeInTheDocument()
    unmount()
    localStorage.clear()

    getDashboard.mockResolvedValue({ needs_count: 2, top_matches: [], missing_sections: [], profile: { has_resume: true }, applications: { all: 1, waiting: 1, hired: 0, closed: 0 } })
    renderPage()
    await screen.findByRole('region', { name: 'My applications' })
    expect(screen.queryByRole('region', { name: 'Get started' })).not.toBeInTheDocument()
  })
})
