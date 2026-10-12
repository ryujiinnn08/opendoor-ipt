import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ApplyBox from './ApplyBox.jsx'

const render = (auth, value = job) => renderRoutes([{ path: '/', element: <ApplyBox job={value} /> }], { auth })
const as = (role) => ({ status: 'authenticated', role, user: { name: 'Ana', role } })

describe('ApplyBox', () => {
  it('asks a guest to log in and comes back to the Apply page', async () => {
    const { container } = render({})

    expect(screen.getByRole('region', { name: 'Apply' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in to apply' })).toHaveAttribute('href', `/login?next=${encodeURIComponent('/candidate/jobs/2/apply')}`)
    expect(screen.getByRole('link', { name: 'Register as a job seeker' })).toHaveAttribute('href', '/register')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('lets a job seeker apply', () => {
    render(as('candidate'))

    expect(screen.getByRole('link', { name: 'Apply for this job' })).toHaveAttribute('href', '/candidate/jobs/2/apply')
  })

  it('tells a job seeker who applied where to follow it', () => {
    render(as('candidate'), { ...job, my_application: { id: 7, status: 'reviewed', status_label: 'Reviewed', applied_at: '2026-10-13T02:00:00+00:00' } })

    expect(screen.getByText('You applied on October 13, 2026. Status: Reviewed.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View your application' })).toHaveAttribute('href', '/candidate/applications/7')
    expect(screen.queryByRole('link', { name: 'Apply for this job' })).not.toBeInTheDocument()
  })

  it('tells employers and admins who applies', () => {
    render(as('employer'))
    expect(screen.getByText('Job seekers apply from this page.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
