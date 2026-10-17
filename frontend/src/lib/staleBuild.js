/**
 * After a redeploy, an open tab still asks for the old build's page files, which no longer
 * exist (admin and employer pages load on demand). The fix is to load the new build: reload once.
 * A second failure within a short time is a real error, so it never loops.
 */
const KEY = 'opendoor-reloaded-for-new-build'
const WINDOW_MS = 10_000

// Chrome, Firefox and Safari word a failed page file differently.
const STALE = /dynamically imported module|Importing a module script failed|Unable to preload CSS|MIME type/i

export function isStaleBuildError(error) {
  return STALE.test(String(error?.message ?? error ?? ''))
}

/** Reloads the page unless it already did in the last few seconds. Returns whether it did. */
export function reloadForNewBuild() {
  try {
    const last = Number(sessionStorage.getItem(KEY))
    if (last && Date.now() - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false // No storage, so no way to tell a loop apart: show the error instead.
  }
  window.location.reload()
  return true
}
