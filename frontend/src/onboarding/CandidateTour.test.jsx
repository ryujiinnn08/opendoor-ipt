import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Outlet } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../test/renderWithProviders.jsx'
import CandidateTourProvider from './CandidateTourProvider.jsx'
import TourEntry from './TourEntry.jsx'
import TourHub from './TourHub.jsx'
import TourPageLink from './TourPageLink.jsx'
import { chapters } from './candidateTour.js'
import { useCandidateTour } from './tourContext.js'
import { freshTour, inviteCandidate, readTour, saveTour } from './tourStorage.js'

let nextId = 7000
const submit = vi.fn((event) => event.preventDefault())
function Frame() { return <CandidateTourProvider><Outlet /></CandidateTourProvider> }
function Page() {
  const tour = useCandidateTour()
  return <main><h1 tabIndex={-1}>Test page</h1><TourPageLink /><TourEntry welcome />
    <div data-tour="display-controls"><button>Text size</button></div>
    <div data-tour="dashboard-content">Your dashboard</div>
    <div data-tour="account-menu"><button>Account</button></div>
    <div data-tour="job-search"><input aria-label="Search" /></div>
    <div data-tour="job-results"><Link data-tour-record="job" to="/candidate/jobs/42">Available job</Link></div>
    <div data-tour="job-details">Real job details</div>
    <div data-tour="page-content">Application list</div>
    <div data-tour="nav-/notifications">Notifications</div>
    <form data-tour="candidate-needs" onSubmit={submit}><label>Needs<input aria-label="Needs" /></label><button>Save my needs</button></form>
    <button onClick={() => tour?.markSaved()}>Confirm save succeeded</button><Link to="/help">Help</Link>
  </main>
}
function open({ role = 'candidate', initial, path = '/candidate/dashboard', id = nextId++ } = {}) {
  if (initial) saveTour(id, { ...freshTour(), ...initial })
  return { id, ...renderRoutes([{ element: <Frame />, children: [
    { path: '/candidate/tour', element: <main><TourHub /></main> },
    { path: '*', element: <Page /> },
  ] }], { path, auth: { status: 'authenticated', role, user: { id, role, name: 'Ana' } } }) }
}

beforeEach(() => {
  submit.mockClear()
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => [{ width: 100, height: 40 }])
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ top: 100, left: 20, right: 120, bottom: 140, width: 100, height: 40 }))
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('candidate onboarding', () => {
  it('invites only newly registered candidates and persists dismissal', async () => {
    const id = nextId++
    inviteCandidate({ id, role: 'candidate' })
    const { unmount } = open({ id })
    expect(screen.getByRole('button', { name: 'Start tour' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Explore on my own' }))
    expect(readTour(id).invitation).toBe('dismissed')
    unmount()
    open({ id })
    expect(screen.queryByRole('button', { name: 'Start tour' })).not.toBeInTheDocument()
  })

  it('does not auto-invite existing accounts or expose tours to employers', () => {
    const { unmount } = open()
    expect(screen.getByRole('button', { name: 'Take a tour' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start tour' })).not.toBeInTheDocument()
    unmount()
    open({ role: 'employer' })
    expect(screen.queryByRole('button', { name: 'Take a tour' })).not.toBeInTheDocument()
  })

  it('completes the six-step introduction across routes without submitting', async () => {
    const { id, router, container } = open({ initial: { invitation: 'pending', showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Start tour' }))
    expect(screen.getByRole('heading', { name: 'Make OpenDoor comfortable' })).toHaveFocus()
    for (let n = 0; n < 5; n++) await userEvent.click(screen.getByRole('button', { name: 'Next', exact: true }))
    expect(router.state.location.pathname).toBe('/candidate/applications')
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }))
    expect(readTour(id).chapterStates.intro).toBe('viewed')
    expect(submit).not.toHaveBeenCalled()
    expect(container.querySelector('.tour-highlight')).toBeNull()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('moves through steps with the arrow keys while focus is in the guide', async () => {
    open({ initial: { invitation: 'pending', showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Start tour' }))
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { name: 'Your starting point' })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('heading', { name: 'Make OpenDoor comfortable' })).toBeInTheDocument()
  })

  it('ends the introduction by pointing to the first real setup step', async () => {
    const { id, router, unmount } = open({ initial: { invitation: 'pending', showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Start tour' }))
    for (let n = 0; n < 5; n++) await userEvent.click(screen.getByRole('button', { name: 'Next', exact: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }))
    expect(screen.getByRole('heading', { name: 'That’s the quick tour!' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add my needs' }))
    expect(router.state.location.pathname).toBe('/candidate/needs')
    expect(screen.queryByRole('complementary', { name: 'Candidate tour' })).not.toBeInTheDocument()
    unmount()
    open({ id })
    expect(screen.getByText(`0 of ${chapters.length - 1} feature guides explored`)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Take a tour' })).not.toBeInTheDocument()
  })

  it('saves a paused step and resumes without opening automatically on refresh', async () => {
    const { id, unmount } = open({ initial: { invitation: 'pending', showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Start tour' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next', exact: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Finish later' }))
    unmount()
    open({ id })
    expect(screen.queryByRole('complementary', { name: 'Candidate tour' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continue tour' }))
    expect(screen.getByRole('heading', { name: 'Your starting point' })).toBeInTheDocument()
  })

  it('isolates progress and mascot preference between accounts', async () => {
    const { id, unmount } = open({ path: '/candidate/tour' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show mascot in tour' }))
    expect(readTour(id).showMascot).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Explore my accommodation needs' }))
    await userEvent.click(screen.getByRole('button', { name: 'Skip this feature' }))
    expect(readTour(id).chapterStates.needs).toBe('skipped')
    unmount()
    const { id: other } = open({ path: '/candidate/tour' })
    expect(other).not.toBe(id)
    expect(screen.getByRole('checkbox', { name: 'Show mascot in tour' })).toBeChecked()
    expect(readTour(other).chapterStates).toEqual({})
  })

  it('follows an actual job link and pauses on unrelated manual navigation', async () => {
    const { router } = open({ path: '/candidate/tour', initial: { showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Explore job details' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next', exact: true }))
    expect(router.state.location.pathname).toBe('/candidate/jobs/42')
    await userEvent.click(screen.getByRole('link', { name: 'Help', exact: true }))
    expect(screen.queryByRole('complementary', { name: 'Candidate tour' })).not.toBeInTheDocument()
  })

  it('uses a read-only preview if a record is unavailable on resume', async () => {
    open({ initial: { status: 'paused', currentChapterId: 'feedback', currentStepId: 'ratings', showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Continue tour' }))
    const guide = screen.getByRole('complementary', { name: 'Candidate tour' })
    expect(within(guide).getByText('Example — read-only')).toBeInTheDocument()
    expect(within(guide).queryByRole('button', { name: /submit|send/i })).not.toBeInTheDocument()
  })

  it('protects unsaved input and lets the user stay on the current page', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { router } = open({ path: '/candidate/tour', initial: { showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Explore my accommodation needs' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Needs', exact: true }), 'My change')
    await userEvent.click(screen.getByRole('link', { name: 'Help', exact: true }))
    expect(window.confirm).toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/candidate/needs')
    expect(screen.getByRole('textbox', { name: 'Needs', exact: true })).toHaveValue('My change')
    expect(submit).not.toHaveBeenCalled()
  })

  it('pauses with Escape and removes highlights', async () => {
    const { container } = open({ initial: { invitation: 'pending', showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Start tour' }))
    expect(container.querySelector('.tour-highlight')).not.toBeNull()
    expect(container.querySelector('.tour-spotlight')).toHaveAttribute('aria-hidden', 'true')
    await userEvent.keyboard('{Escape}')
    expect(container.querySelector('.tour-highlight')).toBeNull()
    expect(container.querySelector('.tour-spotlight')).toBeNull()
    expect(screen.queryByRole('complementary', { name: 'Candidate tour' })).not.toBeInTheDocument()
  })

  it('continues across chapters without marking skipped ones viewed', async () => {
    const { id } = open({ path: '/candidate/tour', initial: { showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Tour all features' }))
    await userEvent.click(screen.getByRole('button', { name: 'Skip this feature' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next feature' }))
    expect(readTour(id).currentChapterId).toBe('dashboard')
    expect(readTour(id).chapterStates.display).toBe('skipped')
  })

  it('covers every feature and preserves full completion after closing', async () => {
    const { id } = open({ path: '/candidate/tour', initial: { showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Tour all features' }))
    const features = chapters.filter((item) => item.id !== 'intro')
    for (let chapterIndex = 0; chapterIndex < features.length; chapterIndex++) {
      for (let i = 0; i < features[chapterIndex].steps.length - 1; i++) {
        await userEvent.click(within(screen.getByRole('complementary', { name: 'Candidate tour' })).getByRole('button', { name: 'Next', exact: true }))
      }
      await userEvent.click(within(screen.getByRole('complementary', { name: 'Candidate tour' })).getByRole('button', { name: 'Finish chapter' }))
      if (chapterIndex < features.length - 1) await userEvent.click(within(screen.getByRole('complementary', { name: 'Candidate tour' })).getByRole('button', { name: 'Next feature' }))
    }
    expect(readTour(id).status).toBe('completed')
    expect(features.every((item) => readTour(id).chapterStates[item.id] === 'viewed')).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Close tour and save progress' }))
    expect(readTour(id).status).toBe('completed')
    expect(submit).not.toHaveBeenCalled()
  })

  it('stops warning about unsaved changes after a confirmed successful save', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { router } = open({ path: '/candidate/tour', initial: { showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Explore my accommodation needs' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Needs', exact: true }), 'My change')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm save succeeded' }))
    await userEvent.click(screen.getByRole('link', { name: 'Help', exact: true }))
    expect(router.state.location.pathname).toBe('/help')
    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('starts contextual help on the current page instead of sending the user elsewhere', async () => {
    const { router } = open({ path: '/contact', initial: { showMascot: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Show me around this page' }))
    expect(router.state.location.pathname).toBe('/contact')
    expect(screen.getByRole('heading', { name: 'Contact the team' })).toBeInTheDocument()
  })

  it('falls back when a target is missing without blocking the tour', async () => {
    vi.useFakeTimers()
    open({ initial: { status: 'paused', currentChapterId: 'profile', currentStepId: 'basics', showMascot: false } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Continue tour' })))
    await act(async () => vi.advanceTimersByTime(5200))
    expect(screen.getByText('This feature is not visible right now')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next', exact: true })).toBeEnabled()
    vi.useRealTimers()
  })
})

describe('storage failure', () => {
  it('retains progress in memory when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const id = nextId++
    inviteCandidate({ id, role: 'candidate' })
    expect(readTour(id).invitation).toBe('pending')
    saveTour(id, { ...readTour(id), status: 'paused', currentStepId: 'dashboard' })
    expect(readTour(id).currentStepId).toBe('dashboard')
  })
})
