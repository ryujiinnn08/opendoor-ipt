import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import AccommodationFilterPanel from './AccommodationFilterPanel.jsx'

const categories = [
  { id: 3, name: 'Information Technology' },
  { id: 4, name: 'Healthcare' },
]
const groups = [
  {
    group: 'Physical access',
    accommodations: [
      { id: 1, name: 'Wheelchair-accessible entrance', description: 'Step-free entry.', is_active: true },
      { id: 2, name: 'Accessible restroom', description: null, is_active: true },
    ],
  },
]
const noFilters = { q: '', category: '', accommodations: [], sort: 'newest', page: 1 }

function renderPanel(props = {}) {
  const handlers = { onChange: vi.fn(), onClear: vi.fn() }
  const result = render(
    <AccommodationFilterPanel filters={noFilters} categories={categories} groups={groups} activeCount={0} {...handlers} {...props} />,
  )
  return { ...result, ...handlers }
}

describe('AccommodationFilterPanel', () => {
  it('reports category and accommodation changes', async () => {
    const { onChange } = renderPanel()

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Healthcare')
    expect(onChange).toHaveBeenLastCalledWith({ category: '4' })

    await userEvent.click(screen.getByRole('checkbox', { name: 'Wheelchair-accessible entrance' }))
    expect(onChange).toHaveBeenLastCalledWith({ accommodations: [1] })
  })

  it('shows the filters that are on', () => {
    renderPanel({ filters: { ...noFilters, category: '4', accommodations: [2] }, activeCount: 2 })

    expect(screen.getByLabelText('Category')).toHaveValue('4')
    expect(screen.getByRole('checkbox', { name: 'Accessible restroom' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Wheelchair-accessible entrance' })).not.toBeChecked()
  })

  it('offers Clear all filters only when a filter is on', async () => {
    renderPanel()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
  })

  it('clears the filters', async () => {
    const { onClear } = renderPanel({ filters: { ...noFilters, category: '4', accommodations: [2] }, activeCount: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    expect(onClear).toHaveBeenCalled()
  })

  it('opens and closes on phones, saying how many filters are on', async () => {
    const { container } = renderPanel({ filters: { ...noFilters, category: '4', accommodations: [2] }, activeCount: 2 })

    const toggle = screen.getByRole('button', { name: 'Filters, 2 on' })
    expect(toggle.querySelector('[data-icon="chevron-down"]')).not.toHaveClass('rotate-180')
    expect(toggle).not.toHaveTextContent(/[+−]/)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'job-filters')
    expect(container.querySelector('#job-filters')).toHaveClass('hidden')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle.querySelector('[data-icon="chevron-down"]')).toHaveClass('rotate-180')
    expect(container.querySelector('#job-filters')).not.toHaveClass('hidden')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('says when the filter lists could not load', () => {
    renderPanel({ listsError: true })
    expect(screen.getByText("We couldn't load the filters. Reload the page to try again.")).toBeInTheDocument()
  })
})
