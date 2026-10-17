import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { profileFixture } from '../../test/candidateFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ResumePage from './ResumePage.jsx'

vi.mock('../../api/candidate.js', () => ({ getProfile: vi.fn() }))
const { getProfile } = await import('../../api/candidate.js')

const routes = [{ path: '/candidate/profile/resume', element: <ResumePage /> }]
const seeker = { status: 'authenticated', role: 'candidate', user: { name: 'Ana Reyes', role: 'candidate' } }

describe('ResumePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProfile.mockResolvedValue(profileFixture)
    vi.spyOn(window, 'print').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows the résumé under the person’s name and prints it', async () => {
    const { container } = renderRoutes(routes, { path: '/candidate/profile/resume', auth: seeker })

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Reyes' })).toBeInTheDocument()
    expect(screen.getByText(/Don.t have a résumé yet\? OpenDoor builds this one from your profile/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit my profile' })).toHaveAttribute('href', '/candidate/profile')
    await userEvent.click(screen.getByRole('button', { name: 'Print or save as PDF' }))
    expect(window.print).toHaveBeenCalled()
    expect(await axe(container)).toHaveNoViolations()
  })
})
