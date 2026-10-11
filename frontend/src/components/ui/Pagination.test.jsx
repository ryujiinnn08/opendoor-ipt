import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Pagination from './Pagination.jsx'

const hrefForPage = (n) => `/jobs?page=${n}`

describe('Pagination', () => {
  it('marks the current page and links the others', () => {
    render(<Pagination page={1} lastPage={2} hrefForPage={hrefForPage} />, { wrapper: MemoryRouter })

    const nav = screen.getByRole('navigation', { name: 'Pages' })
    const current = within(nav).getByText((_, element) => element?.getAttribute('aria-current') === 'page')
    expect(current).toHaveTextContent('Page 1')
    expect(current.closest('a')).toBeNull()
    expect(within(nav).getByRole('link', { name: 'Page 2' })).toHaveAttribute('href', '/jobs?page=2')
    expect(within(nav).getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/jobs?page=2')
    expect(within(nav).queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument()
  })

  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} lastPage={1} hrefForPage={hrefForPage} />, { wrapper: MemoryRouter })
    expect(container).toBeEmptyDOMElement()
  })
})
