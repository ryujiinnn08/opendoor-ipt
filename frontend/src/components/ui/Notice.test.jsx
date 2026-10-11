import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Notice from './Notice.jsx'

describe('Notice', () => {
  it('uses an icon for each tone instead of a text symbol', () => {
    const { container } = render(
      <>
        <Notice tone="success">Saved.</Notice>
        <Notice tone="info">Heads up.</Notice>
        <Notice tone="error">Something went wrong.</Notice>
      </>,
    )

    expect([...container.querySelectorAll('[data-icon]')].map((icon) => icon.dataset.icon)).toEqual(['check', 'info', 'alert'])
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
    expect(screen.queryByText('ℹ')).not.toBeInTheDocument()
  })
})
