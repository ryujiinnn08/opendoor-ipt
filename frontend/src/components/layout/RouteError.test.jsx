import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RouteError from './RouteError.jsx'

function renderFailing(error) {
  const router = createMemoryRouter([{ path: '/', errorElement: <RouteError />, loader: () => { throw error } }])
  return render(<RouterProvider router={router} />)
}

describe('RouteError', () => {
  const reload = vi.fn()

  beforeEach(() => {
    sessionStorage.clear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('location', { ...window.location, reload })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    reload.mockReset()
  })

  it('reloads once to fetch the new version after a redeploy', async () => {
    renderFailing(new TypeError('Failed to fetch dynamically imported module: /assets/UsersPage-old.js'))

    expect(await screen.findByText('Loading the latest version of OpenDoor…')).toBeInTheDocument()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('explains other failures with a way to try again', async () => {
    renderFailing(new Error('Boom'))

    expect(await screen.findByRole('heading', { name: "This page didn't load" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()
  })

  it('explains instead of looping when the new version fails too', async () => {
    sessionStorage.setItem('opendoor-reloaded-for-new-build', String(Date.now()))
    renderFailing(new TypeError('Importing a module script failed.'))

    expect(await screen.findByRole('heading', { name: "This page didn't load" })).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()
  })
})
