import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { applicantFixture, withdrawnApplicantFixture } from '../../test/applicantFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ApplicantRow from './ApplicantRow.jsx'

const render = (applicant) => renderRoutes([{ path: '/', element: <ul><ApplicantRow applicant={applicant} /></ul> }])

describe('ApplicantRow', () => {
  it('shows the applicant, status, match and interview request', async () => {
    const { container } = render(applicantFixture())

    expect(screen.getByRole('link', { name: 'Maria Santos' })).toHaveAttribute('href', '/employer/applications/21')
    expect(screen.getByText('Bookkeeper with 3 years of experience')).toBeInTheDocument()
    expect(screen.getByText('Reviewed')).toBeInTheDocument()
    expect(screen.getByText('Applied October 13, 2026')).toBeInTheDocument()
    expect(screen.getByText('Your job meets 4 of their 5 needs')).toBeInTheDocument()
    expect(screen.getByText('Missing: Sign language interpreter')).toBeInTheDocument()
    expect(screen.getByText('Asked for an interview accommodation')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('leaves out the match when the applicant listed no needs', () => {
    render(applicantFixture({ match: null, has_interview_request: false }))

    expect(screen.queryByText(/Your job meets/)).not.toBeInTheDocument()
    expect(screen.queryByText('Asked for an interview accommodation')).not.toBeInTheDocument()
  })

  it('shows only the name, status and dates of a withdrawn applicant', () => {
    render(withdrawnApplicantFixture)

    expect(screen.getByRole('link', { name: 'Juan Cruz' })).toBeInTheDocument()
    expect(screen.getByText('Withdrawn')).toBeInTheDocument()
    expect(screen.queryByText(/Your job meets/)).not.toBeInTheDocument()
  })
})
