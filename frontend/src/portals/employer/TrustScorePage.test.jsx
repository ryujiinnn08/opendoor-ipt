import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import { trustScoreFixture, unscoredFixture } from '../../test/trustScoreFixture.js'
import TrustScorePage from './TrustScorePage.jsx'

vi.mock('../../api/trustScore.js', () => ({ getMyTrustScore: vi.fn() }))
const { getMyTrustScore } = await import('../../api/trustScore.js')

const auth = { status: 'authenticated', role: 'employer', user: { name: 'Ana', role: 'employer', membership: { role: 'owner', employer: { type: 'company' } } } }
const open = () => renderRoutes([{ path: '/employer/trust-score', element: <TrustScorePage /> }], { path: '/employer/trust-score', auth })

describe('TrustScorePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the employer's own score, breakdown and what it means", async () => {
    getMyTrustScore.mockResolvedValue(trustScoreFixture())
    const { container } = open()

    expect(screen.getByRole('heading', { level: 1, name: 'Trust score' })).toBeInTheDocument()
    const card = await screen.findByRole('region', { name: 'Accommodation trust score' })
    expect(card).toHaveTextContent('88%, based on 4 hires')
    expect(within(card).getByText('3 of 3 delivered')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'What the score means' })).toHaveTextContent('You never see who rated you, when, or what they wrote.')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('explains how it works before 3 responses, with no count', async () => {
    getMyTrustScore.mockResolvedValue(unscoredFixture())
    open()

    const card = await screen.findByRole('region', { name: 'Accommodation trust score' })
    expect(card).toHaveTextContent('Not enough responses yet.')
    expect(card.textContent).not.toMatch(/\d+ of|%/)
    expect(screen.getByRole('region', { name: 'What the score means' })).toBeInTheDocument()
  })

  it('offers to try again when loading fails', async () => {
    getMyTrustScore.mockRejectedValue({ response: { status: 500, data: {} } })
    open()

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
