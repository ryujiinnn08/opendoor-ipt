import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/authContext.js'
import { DisplayContext } from '../../display/displayContext.js'
import { DEFAULTS } from '../../display/displaySettings.js'
import { publicJobFixture as job } from '../../test/publicJobFixture.js'
import StickyApplyBar from './StickyApplyBar.jsx'

let report
beforeEach(() => {
  window.IntersectionObserver = vi.fn(function (callback) {
    report = (top) => act(() => callback([{ isIntersecting: false, boundingClientRect: { top } }]))
    this.observe = vi.fn()
    this.disconnect = vi.fn()
  })
})
afterEach(() => {
  delete window.IntersectionObserver
})

function renderBar({ role = null, text = 100, posting = job } = {}) {
  return render(
    <MemoryRouter>
      <DisplayContext.Provider value={{ settings: { ...DEFAULTS, text }, update: () => {} }}>
        <AuthContext.Provider value={{ role, status: role ? 'authenticated' : 'guest', user: role ? { role } : null }}>
          <main>
            <h1>{posting.title}</h1>
            <StickyApplyBar job={posting} />
          </main>
        </AuthContext.Provider>
      </DisplayContext.Provider>
    </MemoryRouter>,
  )
}

describe('StickyApplyBar', () => {
  it('appears once the title has scrolled away, with the Apply action', () => {
    renderBar({ role: 'candidate' })
    expect(screen.queryByRole('region', { name: 'Quick apply' })).not.toBeInTheDocument()

    report(-80)
    expect(screen.getByRole('region', { name: 'Quick apply' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apply for this job' })).toHaveAttribute('href', '/candidate/jobs/2/apply')
    expect(document.documentElement.style.scrollPaddingTop).toBe('5.5rem')

    report(900) // below the screen, not scrolled past
    expect(screen.queryByRole('region', { name: 'Quick apply' })).not.toBeInTheDocument()
    expect(document.documentElement.style.scrollPaddingTop).toBe('')
  })

  it('asks guests to log in, and stays away at 150 % text', () => {
    const { unmount } = renderBar()
    report(-80)
    expect(screen.getByRole('link', { name: 'Log in to apply' })).toBeInTheDocument()
    unmount()

    renderBar({ text: 150 })
    expect(window.IntersectionObserver).toHaveBeenCalledTimes(1)
  })
})
