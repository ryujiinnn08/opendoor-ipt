import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import BackLink from './BackLink.jsx'

function renderAt(entry) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <BackLink to="/jobs">Back to jobs</BackLink>
    </MemoryRouter>,
  )
  return screen.getByRole('link', { name: 'Back to jobs' })
}

describe('BackLink', () => {
  it('returns to the list with the filters it was opened from', () => {
    expect(renderAt({ pathname: '/jobs/4', state: { backTo: '/jobs?q=web&work_setup=remote' } })).toHaveAttribute('href', '/jobs?q=web&work_setup=remote')
  })

  it('goes to the list itself when opened from a shared link or another list', () => {
    expect(renderAt('/jobs/4')).toHaveAttribute('href', '/jobs')
  })

  it('ignores a saved address from a different list', () => {
    expect(renderAt({ pathname: '/jobs/4', state: { backTo: '/candidate/applications?status=hired' } })).toHaveAttribute('href', '/jobs')
  })
})
