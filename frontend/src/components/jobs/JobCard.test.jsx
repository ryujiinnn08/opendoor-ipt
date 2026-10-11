import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
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
    expect(screen.getByText('Work setup: Remote')).toBeInTheDocument()
    expect(screen.getByText('Employment type: Full-time')).toBeInTheDocument()
    expect(screen.getByText('Location: Anywhere in the Philippines')).toBeInTheDocument()
    expect(screen.getByText('Apply by: November 30, 2026')).toBeInTheDocument()
    expect(
      screen.getByText(wholeText('P', 'Provides Remote work, Flexible hours, Screen reader software provided and 1 more')),
    ).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('lets long accommodation names wrap and gives each fact its own line on phones', () => {
    const { container } = renderCard()

    // Only the icon and the first word are kept together.
    expect([...container.querySelectorAll('.whitespace-nowrap')].map((element) => element.textContent)).toEqual(['Remote', 'Flexible', 'Screen'])
    expect(screen.getByText('Work setup: Remote').parentElement).toHaveClass('flex-col', 'sm:flex-row')
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
    expect(screen.getByText('Work setup: Remote')).toBeInTheDocument()
  })

  it('says when a job lists no accommodations', () => {
    renderCard({ job: { ...job, accommodations: [] } })

    expect(screen.getByText('No accommodations listed.')).toBeInTheDocument()
  })
})
