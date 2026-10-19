import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { applicantDetailFixture } from '../../test/applicantFixture.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import EmployerDecision from './EmployerDecision.jsx'

vi.mock('../../api/applications.js', () => ({ changeApplicationStatus: vi.fn() }))
const { changeApplicationStatus } = await import('../../api/applications.js')

function render(applicant, { onChanged = vi.fn(), onStale = vi.fn(), announce = vi.fn() } = {}) {
  const result = renderRoutes([{ path: '/', element: <EmployerDecision applicant={applicant} onChanged={onChanged} onStale={onStale} /> }], { announce })
  return { ...result, onChanged, onStale, announce }
}

describe('EmployerDecision', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers Mark as hired and Mark as rejected on a Reviewed applicant', async () => {
    const { container } = render(applicantDetailFixture())

    expect(screen.getByRole('heading', { name: 'Your decision' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as hired' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as rejected' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('hires after confirming, and says so', async () => {
    const updated = applicantDetailFixture({ status: 'hired', status_label: 'Hired', hired_at: '2026-10-13', hire_confirmed_by: 'employer', actions: [] })
    changeApplicationStatus.mockResolvedValue(updated)
    const { onChanged, announce } = render(applicantDetailFixture())

    await userEvent.click(screen.getByRole('button', { name: 'Mark as hired' }))
    expect(screen.getByRole('dialog')).toHaveTextContent("Mark Maria Santos as hired for Junior Web Developer? You can't undo this.")
    await userEvent.click(screen.getByRole('button', { name: 'Yes, mark as hired' }))

    expect(changeApplicationStatus).toHaveBeenCalledWith(21, { status: 'hired', expected_status: 'reviewed' })
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(updated))
    expect(announce).toHaveBeenCalledWith('Marked as hired.')
  })

  it('rejects after confirming', async () => {
    changeApplicationStatus.mockResolvedValue(applicantDetailFixture({ status: 'rejected', actions: [] }))
    const { onChanged } = render(applicantDetailFixture())

    await userEvent.click(screen.getByRole('button', { name: 'Mark as rejected' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      "Mark Maria Santos as rejected for Junior Web Developer? You can't undo this. They'll see 'Rejected' on their applications.",
    )
    await userEvent.click(screen.getByRole('button', { name: 'Yes, mark as rejected' }))

    expect(changeApplicationStatus).toHaveBeenCalledWith(21, { status: 'rejected', expected_status: 'reviewed' })
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('explains a change made meanwhile and reloads', async () => {
    changeApplicationStatus.mockRejectedValue({ response: { status: 409, data: { message: 'This application changed while you were looking at it. Reload to see its status.' } } })
    const { onStale, onChanged } = render(applicantDetailFixture())

    await userEvent.click(screen.getByRole('button', { name: 'Mark as hired' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, mark as hired' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This application changed while you were looking at it.')
    // The reload waits until the dialog is closed, so the message isn't swept away while being read.
    expect(onStale).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(onStale).toHaveBeenCalled())
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('says what was decided instead of buttons', () => {
    const { unmount } = render(applicantDetailFixture({ status: 'hired', hired_at: '2026-10-13', hire_confirmed_by: 'employer', actions: [] }))
    expect(screen.getByText('You marked them as hired on October 13, 2026.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    unmount()

    const { unmount: second } = render(applicantDetailFixture({ status: 'hired', hired_at: '2026-10-13', hire_confirmed_by: 'candidate', actions: [] }))
    expect(screen.getByText('Hired on October 13, 2026. Legacy applicant-confirmed hire. Employer review required.')).toBeInTheDocument()
    second()

    render(applicantDetailFixture({ status: 'rejected', rejected_at: '2026-10-14T00:00:00+00:00', actions: [] }))
    expect(screen.getByText('You marked them as rejected.')).toBeInTheDocument()
  })
})
