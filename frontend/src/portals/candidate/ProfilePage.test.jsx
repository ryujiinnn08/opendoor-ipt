import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { profileFixture } from '../../test/candidateFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ProfilePage from './ProfilePage.jsx'

vi.mock('../../api/candidate.js', () => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  uploadResume: vi.fn(),
  removeResume: vi.fn(),
  getResumeFile: vi.fn(),
}))
const { getProfile, saveProfile } = await import('../../api/candidate.js')

const routes = [{ path: '/candidate/profile', element: <ProfilePage /> }]
const seeker = { status: 'authenticated', role: 'candidate', user: { name: 'Ana Reyes', role: 'candidate' }, refresh: vi.fn() }

function renderPage(announce = vi.fn()) {
  return { ...renderRoutes(routes, { path: '/candidate/profile', auth: seeker, announce }), announce }
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProfile.mockResolvedValue(profileFixture)
    saveProfile.mockImplementation(async (values) => ({ ...profileFixture, ...values }))
  })

  it('shows the profile in its sections', async () => {
    renderPage()

    expect(await screen.findByLabelText('Headline', { exact: false })).toHaveValue('Data encoder with 2 years of experience')
    for (const name of ['Basic information', 'About me', 'Work experience', 'Education', 'Skills', 'Trainings and certifications', 'Languages', 'Résumé', 'Private']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Work experience 1 of 1' })).getByLabelText('Job title')).toHaveValue('Data Encoder')
    expect(screen.getByLabelText('Disability type (optional)')).toHaveValue('physical')
    expect(
      screen.getByText('Optional. OpenDoor never uses this to match or filter jobs. Employers see it only if you tick the box below and apply to one of their jobs.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View My résumé' })).toHaveAttribute('href', '/candidate/profile/resume')
  })

  it('saves the whole profile and says so', async () => {
    const { announce } = renderPage()
    const headline = await screen.findByLabelText('Headline', { exact: false })

    await userEvent.clear(headline)
    await userEvent.type(headline, 'Bookkeeper')
    await userEvent.click(screen.getByRole('button', { name: 'Add education' }))
    await userEvent.selectOptions(screen.getByLabelText('Level', { selector: '#educations-1-level' }), 'Vocational or TESDA')
    await userEvent.type(screen.getByLabelText('School', { selector: '#educations-1-school' }), 'TESDA Quezon City')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    const sent = saveProfile.mock.calls[0][0]
    expect(sent.headline).toBe('Bookkeeper')
    expect(sent.experiences).toEqual([profileFixture.experiences[0]])
    expect(sent.educations[1]).toEqual({ level: 'vocational', school: 'TESDA Quezon City', course: '', year_finished: '', is_studying: false })
    expect(sent).not.toHaveProperty('email')
    expect(await screen.findByText('Your profile is saved.')).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith('Your profile is saved.')
  })

  it('does not send the hidden end month of a current job or the year of current studies', async () => {
    renderPage()

    await userEvent.click(await screen.findByLabelText('I work here now'))
    await userEvent.click(screen.getByLabelText('Still studying'))
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    const sent = saveProfile.mock.calls[0][0]
    expect(sent.experiences[0]).toMatchObject({ is_current: true, ended_on: null })
    expect(sent.educations[0]).toMatchObject({ is_studying: true, year_finished: null })
  })

  it('clears entry errors when an entry is added or removed, so none points at the wrong entry', async () => {
    saveProfile.mockRejectedValue({
      response: { status: 422, data: { message: 'Invalid.', errors: { 'experiences.0.ended_on': ["The end can't be before the start."] } } },
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Save profile' }))
    await screen.findByRole('link', { name: "The end can't be before the start." })

    await userEvent.click(screen.getByRole('button', { name: 'Add work experience' }))

    expect(screen.queryByText("The end can't be before the start.")).not.toBeInTheDocument()
  })

  it('shows an entry’s server error on that entry’s field', async () => {
    saveProfile.mockRejectedValue({
      response: { status: 422, data: { message: 'Invalid.', errors: { 'experiences.0.ended_on': ["The end can't be before the start."] } } },
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('link', { name: "The end can't be before the start." })).toHaveAttribute('href', '#experiences-0-ended_on')
    expect(screen.getByLabelText('Ended', { selector: '#experiences-0-ended_on' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('asks for a name before saving', async () => {
    renderPage()
    await userEvent.clear(await screen.findByLabelText('Full name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('link', { name: 'Enter your full name.' })).toBeInTheDocument()
    expect(saveProfile).not.toHaveBeenCalled()
  })

  it('opens at the section named in the address', async () => {
    renderRoutes(routes, { path: '/candidate/profile#profile-skills', auth: seeker })

    const heading = await screen.findByRole('heading', { level: 2, name: 'Skills' })
    await vi.waitFor(() => expect(heading).toHaveFocus())
  })

  it('has no accessibility violations', async () => {
    const { container } = renderPage()
    await screen.findByLabelText('Headline', { exact: false })

    expect(await axe(container)).toHaveNoViolations()
  })
})
