import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { manilaToday } from '../../lib/postingOptions.js'
import JobCard from './JobCard.jsx'

function renderCard(props) {
  return render(
    <MemoryRouter>
      <ul>
        <JobCard job={job} to="/jobs/2" {...props} />
      </ul>
    </MemoryRouter>,
  )
}

/** Matches the element whose whole text is `text`, even when it spans several elements. */
const wholeText = (tag, text) => (_, element) => element?.tagName === tag && element.textContent === text

describe('JobCard', () => {
  it('shows the job as job seekers need it', async () => {
    const { container } = renderCard()

    expect(screen.getByRole('link', { name: 'Junior Web Developer' })).toHaveAttribute('href', '/jobs/2')
    expect(screen.getByRole('heading', { name: 'Junior Web Developer' })).toBeInTheDocument()
    expect(screen.getByText('Acme Corp.')).toBeInTheDocument()
    expect(screen.getByText('Verified company')).toBeInTheDocument()
    expect(screen.getByText(wholeText('P', 'Remote · , Full-time · , Anywhere in the Philippines'))).toBeInTheDocument()
    expect(screen.getByText(/Apply by November 30, 2026/)).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Accommodations offered' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Remote work',
      'Flexible hours',
      'Screen reader software provided',
      'Show more accommodations, 1 more',
    ])
    expect(await axe(container)).toHaveNoViolations()
  })

  it('hides the middle dots from screen readers, who hear commas instead', () => {
    const { container } = renderCard()

    expect([...container.querySelectorAll('[aria-hidden="true"]')].filter((element) => element.textContent === ' · ')).not.toHaveLength(0)
    expect([...container.querySelectorAll('.sr-only')].map((element) => element.textContent)).toContain(', ')
  })

  it('says when the employer is an individual', () => {
    renderCard({ job: { ...job, employer: { id: 3, type: 'individual', name: 'Maria Cruz', logo_url: null, is_verified: false } } })

    expect(screen.getByText('Individual employer')).toBeInTheDocument()
    expect(screen.queryByText('Verified company')).not.toBeInTheDocument()
  })

  it('can leave out the employer, on the employer’s own page', () => {
    renderCard({ showEmployer: false })

    expect(screen.queryByText('Acme Corp.')).not.toBeInTheDocument()
    expect(screen.queryByText('Verified company')).not.toBeInTheDocument()
    expect(screen.getByText('Remote')).toBeInTheDocument()
  })

  it('shows how the job meets the job seeker’s needs', () => {
    renderCard({ job: { ...job, match: { needs_total: 5, needs_met: 4, missing: ['Adjustable workstation'] } } })

    expect(screen.getByText('Meets 4 of 5 of your needs')).toBeInTheDocument()
    expect(screen.getByText('Missing: Adjustable workstation')).toBeInTheDocument()
  })

  it('shows no match without needs', () => {
    renderCard()

    expect(screen.queryByText(/of your needs/)).not.toBeInTheDocument()
  })

  it('labels new jobs and jobs closing soon', () => {
    const today = manilaToday()
    renderCard({ job: { ...job, posted_on: today, closes_on: today } })
    expect(within(screen.getByRole('list', { name: 'Labels' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['New', 'Closing soon'])
  })

  it('shows the employer’s initials when there is no logo', () => {
    const { container } = renderCard({ job: { ...job, employer: { ...job.employer, logo_url: null } } })
    expect(container.querySelector('[aria-hidden="true"]').textContent).toBe('AC')
  })

  it('says when a job lists no accommodations', () => {
    renderCard({ job: { ...job, accommodations: [] } })

    expect(screen.getByText('No accommodations listed.')).toBeInTheDocument()
  })

  it("shows the employer's trust score in the card's top right corner (UI_FEEDBACK_PLAN P7)", () => {
    renderCard({ job: { ...job, employer: { ...job.employer, trust_score: 88, trust_count: 4 } } })
    expect(screen.getByText(wholeText('P', 'Trust score: 88%'))).toBeInTheDocument()
    expect(screen.getByText(wholeText('P', 'trust · 4 ratings'))).toBeInTheDocument()
  })

  it('opens the rest of the accommodations from "Show more", and closes them again', async () => {
    const user = userEvent.setup()
    renderCard()
    const more = screen.getByRole('button', { name: 'Show more accommodations, 1 more' })
    expect(more).toHaveAttribute('aria-expanded', 'false')

    await user.click(more)
    const list = screen.getByRole('list', { name: 'Accommodations offered' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Show less accommodations' })).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Show less accommodations' }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
  })

  it('says when there is no trust score yet, but not on the employer’s own page', () => {
    const { unmount } = renderCard({ job: { ...job, employer: { ...job.employer, trust_score: null, trust_count: null } } })
    expect(screen.getByText(wholeText('P', 'Trust score: Not rated yet'))).toBeInTheDocument()
    unmount()

    renderCard({ showEmployer: false })
    expect(screen.queryByText(/trust score/i)).not.toBeInTheDocument()
  })
})
