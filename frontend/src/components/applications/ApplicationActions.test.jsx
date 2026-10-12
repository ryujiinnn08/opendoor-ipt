import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { applicationFixture, reviewedFixture } from '../../test/applicationFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import ApplicationActions from './ApplicationActions.jsx'

vi.mock('../../api/applications.js', () => ({ changeApplicationStatus: vi.fn() }))
const { changeApplicationStatus } = await import('../../api/applications.js')

function renderActions(application, { onChanged = vi.fn(), announce = vi.fn(), explainHire = false } = {}) {
  const result = renderRoutes([{ path: '/', element: <ApplicationActions application={application} onChanged={onChanged} explainHire={explainHire} /> }], { announce })
  return { ...result, onChanged, announce }
}

describe('ApplicationActions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers Withdraw on a Pending application, and explains I was hired where asked to', async () => {
    const { unmount } = renderActions(applicationFixture())
    // Lists leave the hint out: it would repeat on every Pending row.
    expect(screen.queryByText(/ask the employer to open/)).not.toBeInTheDocument()
    unmount()

    const { container } = renderActions(applicationFixture(), { explainHire: true })

    expect(screen.getByRole('button', { name: 'Withdraw application for Junior Web Developer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /I was hired/ })).not.toBeInTheDocument()
    expect(screen.getByText('If you were hired, ask the employer to open your application on OpenDoor first.')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('offers both on a Reviewed application and nothing on a final one', () => {
    const { unmount } = renderActions(reviewedFixture())
    expect(screen.getByRole('button', { name: 'Withdraw application for Junior Web Developer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I was hired for Junior Web Developer' })).toBeInTheDocument()
    expect(screen.queryByText(/ask the employer to open/)).not.toBeInTheDocument()
    unmount()

    const { container } = renderActions(applicationFixture({ status: 'rejected', actions: [] }))
    expect(container.querySelector('button')).toBeNull()
    expect(screen.queryByText(/ask the employer to open/)).not.toBeInTheDocument()
  })

  it('withdraws after confirming, and says so', async () => {
    const updated = reviewedFixture({ status: 'withdrawn', actions: [] })
    changeApplicationStatus.mockResolvedValue(updated)
    const { onChanged, announce } = renderActions(reviewedFixture())

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw application for Junior Web Developer' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      "Withdraw your application for Junior Web Developer? You can't undo this or apply for this job again.",
    )
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw application' }))

    expect(changeApplicationStatus).toHaveBeenCalledWith(7, { status: 'withdrawn', expected_status: 'reviewed' })
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(updated))
    expect(announce).toHaveBeenCalledWith('Application withdrawn.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('confirms a hire', async () => {
    changeApplicationStatus.mockResolvedValue(reviewedFixture({ status: 'hired', actions: [] }))
    const { onChanged, announce } = renderActions(reviewedFixture())

    await userEvent.click(screen.getByRole('button', { name: 'I was hired for Junior Web Developer' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Confirm that Acme Corp. hired you for Junior Web Developer?')
    await userEvent.click(screen.getByRole('button', { name: 'Yes, I was hired' }))

    expect(changeApplicationStatus).toHaveBeenCalledWith(7, { status: 'hired', expected_status: 'reviewed' })
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(announce).toHaveBeenCalledWith('Marked as hired.')
  })

  it('shows why a change was refused, inside the dialog', async () => {
    changeApplicationStatus.mockRejectedValue({
      response: { status: 409, data: { message: 'This application changed while you were looking at it. Reload to see its status.' } },
    })
    const { onChanged } = renderActions(reviewedFixture())

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw application for Junior Web Developer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw application' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This application changed while you were looking at it. Reload to see its status.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onChanged).not.toHaveBeenCalled()
  })
})
