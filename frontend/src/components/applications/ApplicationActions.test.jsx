import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ApplicationActions from './ApplicationActions.jsx'

vi.mock('../../api/applications.js', () => ({ changeApplicationStatus: vi.fn() }))
const { changeApplicationStatus } = await import('../../api/applications.js')

describe('ApplicationActions', () => {
  it.each(['pending', 'reviewed', 'hired', 'rejected', 'withdrawn'])('keeps %s read-only even with stale server actions', (status) => {
    render(<ApplicationActions application={{ status, actions: ['withdraw', 'confirm_hire'] }} explainHire />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/Only the employer can update/)).toBeInTheDocument()
    expect(changeApplicationStatus).not.toHaveBeenCalled()
  })
  it('does not repeat the explanation on list rows', () => {
    const { container } = render(<ApplicationActions />)
    expect(container).toBeEmptyDOMElement()
  })
})
