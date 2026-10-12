import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ApplicationStatusBadge from './ApplicationStatusBadge.jsx'

describe('ApplicationStatusBadge', () => {
  it.each([
    ['pending', 'Pending', 'clock', 'text-primary'],
    ['reviewed', 'Reviewed', 'door', 'text-primary'],
    ['hired', 'Hired', 'check', 'text-success'],
    ['rejected', 'Rejected', 'minus', 'text-muted'],
    ['withdrawn', 'Withdrawn', 'minus', 'text-muted'],
  ])('shows %s with an icon and its word', (status, label, icon, colour) => {
    const { container } = render(<ApplicationStatusBadge status={status} />)

    const badge = screen.getByText(label)
    expect(badge).toHaveClass(colour)
    expect(container.querySelector(`[data-icon="${icon}"]`)).toBeInTheDocument()
  })
})
