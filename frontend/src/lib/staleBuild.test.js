import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isStaleBuildError, reloadForNewBuild } from './staleBuild.js'

describe('staleBuild', () => {
  const reload = vi.fn()

  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('location', { ...window.location, reload })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    reload.mockReset()
  })

  it('recognises a missing page file in each browser', () => {
    expect(isStaleBuildError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/A.js'))).toBe(true)
    expect(isStaleBuildError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isStaleBuildError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleBuildError(new Error('Request failed with status code 500'))).toBe(false)
    expect(isStaleBuildError(null)).toBe(false)
  })

  it('reloads once, never in a loop', () => {
    expect(reloadForNewBuild()).toBe(true)
    expect(reloadForNewBuild()).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
