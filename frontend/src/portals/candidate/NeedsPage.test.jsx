import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { needsFixture } from '../../test/candidateFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import NeedsPage from './NeedsPage.jsx'

vi.mock('../../api/candidate.js', () => ({ getNeeds: vi.fn(), saveNeeds: vi.fn() }))
vi.mock('../../api/masterData.js', () => ({ getAccommodationGroups: vi.fn() }))

const { getNeeds, saveNeeds } = await import('../../api/candidate.js')
const { getAccommodationGroups } = await import('../../api/masterData.js')

const groups = [
  {
    group: 'Physical access',
    accommodations: [
      { id: 2, name: 'Accessible restroom', description: null, is_active: true },
      { id: 1, name: 'Wheelchair-accessible entrance', description: null, is_active: true },
    ],
  },
  { group: 'Work arrangement', accommodations: [{ id: 5, name: 'Flexible hours', description: null, is_active: true }] },
]
const routes = [{ path: '/candidate/needs', element: <NeedsPage /> }]
const seeker = { status: 'authenticated', role: 'candidate', user: { name: 'Ana', role: 'candidate' } }

function renderPage(announce = vi.fn()) {
  return { ...renderRoutes(routes, { path: '/candidate/needs', auth: seeker, announce }), announce }
}

describe('NeedsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getNeeds.mockResolvedValue(needsFixture)
    getAccommodationGroups.mockResolvedValue(groups)
  })

  it('ticks the saved needs and marks a retired one', async () => {
    renderPage()

    expect(await screen.findByRole('checkbox', { name: 'Wheelchair-accessible entrance' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Accessible restroom' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Flexible hours' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Braille signage (no longer offered)' })).toBeChecked()
    expect(screen.getByText('Only you. Employers see your needs only when you apply to one of their jobs.')).toBeInTheDocument()
  })

  it('saves the ticked needs and says so', async () => {
    saveNeeds.mockResolvedValue(needsFixture.slice(0, 2))
    const { announce } = renderPage()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Flexible hours' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Braille signage (no longer offered)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save my needs' }))

    expect(saveNeeds).toHaveBeenCalledWith([2, 1, 5])
    expect(await screen.findByText('Your needs are saved. Find jobs now ranks jobs by them.')).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith('Your needs are saved. Find jobs now ranks jobs by them.')
    expect(screen.getByRole('link', { name: 'Find jobs' })).toHaveAttribute('href', '/candidate/jobs')
    // Next to the button, where a magnified or phone screen is looking.
    const saveButton = screen.getByRole('button', { name: 'Save my needs' })
    const notice = screen.getByText('Your needs are saved. Find jobs now ranks jobs by them.')
    expect(saveButton.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: /Braille signage/ })).not.toBeInTheDocument()
  })

  it('shows the server’s reason when a need is refused', async () => {
    saveNeeds.mockRejectedValue({
      response: { status: 422, data: { message: 'Invalid.', errors: { 'accommodations.2': ['"Braille signage" is no longer offered. Untick it to continue.'] } } },
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Save my needs' }))

    expect(await screen.findByRole('link', { name: '"Braille signage" is no longer offered. Untick it to continue.' })).toHaveAttribute('href', '#needs')
  })

  it('offers Try again when the needs cannot load', async () => {
    getNeeds.mockRejectedValueOnce({ response: { status: 500, data: {} } })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('checkbox', { name: 'Accessible restroom' })).toBeChecked()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderPage()
    await screen.findByRole('checkbox', { name: 'Flexible hours' })

    await waitFor(async () => expect(await axe(container)).toHaveNoViolations())
  })
})
