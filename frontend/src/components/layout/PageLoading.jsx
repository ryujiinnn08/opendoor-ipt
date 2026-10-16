import LoadingMessage from '../ui/LoadingMessage.jsx'

/**
 * Shown while the first page's code is still downloading (the admin and employer pages load
 * on demand), so opening or refreshing one of them never shows a blank screen.
 */
export default function PageLoading() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <LoadingMessage>Loading the page…</LoadingMessage>
    </main>
  )
}
