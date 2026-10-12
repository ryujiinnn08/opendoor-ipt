import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { applicantDetailFixture } from '../../test/applicantFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ApplicantSummary from './ApplicantSummary.jsx'

const render = (applicant) => renderRoutes([{ path: '/', element: <ApplicantSummary applicant={applicant} /> }])

describe('ApplicantSummary', () => {
  it('puts the interview request first, then needs and contact', async () => {
    const { container } = render(applicantDetailFixture())

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings).toEqual(['Interview accommodation request', 'Their needs and your job', 'Contact'])
    expect(screen.getByText('Online interview with captions, please.')).toBeInTheDocument()
    const needs = screen.getByRole('region', { name: 'Their needs and your job' })
    expect(within(needs).getByText('Your job meets 1 of their 2 needs')).toBeInTheDocument()
    expect(within(needs).getByText('Flexible hours: Provided')).toBeInTheDocument()
    expect(within(needs).getByText('Start between 7 and 10 a.m.')).toBeInTheDocument()
    expect(within(needs).getByText('Sign language interpreter: Missing')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'maria@example.com' })).toHaveAttribute('href', 'mailto:maria@example.com')
    // A long address wraps instead of pushing the page sideways at 360 px (WCAG 1.4.10).
    expect(screen.getByRole('link', { name: 'maria@example.com' })).toHaveClass('break-all')
    expect(screen.getByRole('link', { name: '0917 555 0199' })).toHaveAttribute('href', 'tel:09175550199')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('says when nothing was asked for and no needs are listed', () => {
    render(applicantDetailFixture({ interview_request: null, match: null, profile: { ...applicantDetailFixture().profile, contact_number: null } }))

    expect(screen.getByText("They didn't ask for anything for the interview.")).toBeInTheDocument()
    expect(screen.getByText("They haven't listed any accommodation needs.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /0917/ })).not.toBeInTheDocument()
  })
})
