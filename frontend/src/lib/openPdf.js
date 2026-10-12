/**
 * Opens a PDF fetched through the app's client (which carries the session) in a new tab. The tab
 * is opened during the click, so pop-up blockers allow it; the file arrives a moment later. On a
 * failed load the empty tab is closed and the error is thrown for the caller to show.
 */
export async function openPdfInNewTab(loadBlob) {
  const tab = window.open('', '_blank')
  try {
    const url = URL.createObjectURL(await loadBlob())
    if (tab) {
      tab.opener = null
      tab.location.href = url
    } else {
      window.location.assign(url)
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}
