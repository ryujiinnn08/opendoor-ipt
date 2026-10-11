import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import CandidateDashboard from './CandidateDashboard.jsx'

vi.mock('../../api/candidate.js', () => ({ getDashboard: vi.fn() }))
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

    const missing = screen.getByRole('region', { name: 'Finish your profile' })
    expect(within(missing).getByRole('link', { name: 'Headline' })).toHaveAttribute('href', '/candidate/profile#profile-basic')
    expect(within(missing).getByRole('link', { name: 'City or municipality and province' })).toHaveAttribute('href', '/candidate/profile#profile-basic')
    expect(within(missing).getByRole('link', { name: 'Education' })).toHaveAttribute('href', '/candidate/profile#profile-education')
    expect(within(missing).getByRole('link', { name: 'Skills' })).toHaveAttribute('href', '/candidate/profile#profile-skills')
    expect(within(missing).getByRole('link', { name: 'Accommodation needs' })).toHaveAttribute('href', '/candidate/needs')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows the top matches to a job seeker with needs', async () => {
    getDashboard.mockResolvedValue({ needs_count: 2, top_matches: [matched(2, 'Data Encoder'), matched(3, 'Clerk')], missing_sections: [] })
    renderPage()

    const top = await screen.findByRole('region', { name: 'Your top matches' })
    expect(within(top).getByRole('link', { name: 'Data Encoder' })).toHaveAttribute('href', '/candidate/jobs/2')
    expect(within(top).getAllByText('Meets all 2 of your needs')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'See all matches' })).toHaveAttribute('href', '/candidate/jobs')
    expect(screen.queryByRole('region', { name: 'Finish your profile' })).not.toBeInTheDocument()
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
})
