import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { profileFixture } from '../../test/candidateFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import WhatEmployersSee from './WhatEmployersSee.jsx'

const render = (profile) => renderRoutes([{ path: '/', element: <WhatEmployersSee profile={profile} /> }])

describe('WhatEmployersSee', () => {
  it('lists what a full profile shares, without the private disability type', async () => {
    const { container } = render({ ...profileFixture, resume: { name: 'ana-resume.pdf', uploaded_at: '2026-10-11T00:00:00+00:00' } })

    const section = screen.getByRole('region', { name: 'What the employer will see' })
    expect(within(section).getByRole('link', { name: 'Your profile and My résumé' })).toHaveAttribute('href', '/candidate/profile/resume')
    expect(within(section).getByText('Your uploaded résumé: ana-resume.pdf')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Your accommodation needs' })).toHaveAttribute('href', '/candidate/needs')
    expect(within(section).getByText('Your email and contact number')).toBeInTheDocument()
    expect(within(section).queryByText(/disability type/)).not.toBeInTheDocument()
    expect(within(section).queryByText(/empty/)).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('names the disability type only when it is shown to employers', () => {
    render({ ...profileFixture, show_disability: true })

    expect(screen.getByText('Your disability type: Physical (orthopedic)')).toBeInTheDocument()
  })

  it('links to the empty parts of the profile', () => {
    render({ ...profileFixture, headline: null, city: null, contact_number: '', educations: [], skills: null })

    expect(screen.getByText('These parts of your profile are empty:')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Headline' })).toHaveAttribute('href', '/candidate/profile#profile-basic')
    expect(screen.getByRole('link', { name: 'City or municipality and province' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact number' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Education' })).toHaveAttribute('href', '/candidate/profile#profile-education')
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('href', '/candidate/profile#profile-skills')
  })
})
