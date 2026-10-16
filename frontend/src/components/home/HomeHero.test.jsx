import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import HomeHero from './HomeHero.jsx'

const routes = [{ path: '/', element: <HomeHero /> }]

describe('HomeHero', () => {
  it('says what OpenDoor is, offers the two ways in, and keeps the mascot from screen readers', async () => {
    const { container } = renderRoutes(routes, { path: '/' })

    expect(screen.getByRole('heading', { level: 1, name: 'Find work that fits how you work' })).toBeInTheDocument()
    expect(document.title).toBe('Find jobs that meet your accommodation needs | OpenDoor')
    expect(screen.getByRole('link', { name: 'Register as a job seeker' })).toHaveAttribute('href', '/register?type=candidate')
    expect(screen.getByRole('link', { name: 'Register as an employer' })).toHaveAttribute('href', '/register?type=employer')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(within(screen.getByRole('list', { name: 'Every job lists the support it offers:' })).getAllByRole('listitem')).toHaveLength(4)
    expect(container.querySelector('svg image').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('sends people who are logged in to their dashboard', () => {
    renderRoutes(routes, { path: '/', auth: { status: 'authenticated', role: 'employer', user: { name: 'Ana', role: 'employer' } } })

    expect(screen.getByRole('link', { name: 'Go to my dashboard' })).toHaveAttribute('href', '/employer/dashboard')
    expect(screen.getByRole('link', { name: 'Find jobs' })).toHaveAttribute('href', '/jobs')
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })
})
