import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import FormField from './FormField.jsx'

describe('FormField', () => {
  it('labels the input and links hint and error to it', () => {
    render(<FormField id="email" label="Email address" hint="You will use this to log in." error="Enter your email address." />)

    const input = screen.getByLabelText('Email address')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('You will use this to log in. Error: Enter your email address.')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<FormField id="name" label="Full name" error="Enter your full name." />)

    expect(await axe(container)).toHaveNoViolations()
  })

  it('marks optional fields in the label', () => {
    render(<FormField id="description" label="Description" optional />)

    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
  })

  it('lets the caller replace the bottom margin', () => {
    // Both mb-6 and mb-0 on one element: the stylesheet order, not the caller, would decide.
    render(<FormField id="search" label="Search jobs" className="mb-0 flex-1" />)

    const wrapper = screen.getByLabelText('Search jobs').parentElement
    expect(wrapper).toHaveClass('mb-0')
    expect(wrapper).not.toHaveClass('mb-6')
  })

  it('keeps the usual bottom margin by default', () => {
    render(<FormField id="name" label="Full name" />)

    expect(screen.getByLabelText('Full name').parentElement).toHaveClass('mb-6')
  })
})
