import { useEffect, useRef, useState } from 'react'
import { useRouteError } from 'react-router-dom'
import { isStaleBuildError, reloadForNewBuild } from '../../lib/staleBuild.js'
import MascotSad from '../mascot/MascotSad.jsx'
import Button from '../ui/Button.jsx'
import LoadingMessage from '../ui/LoadingMessage.jsx'
import PageHeading from '../ui/PageHeading.jsx'

/**
 * Any page that fails to load or show. After a new version of OpenDoor goes live, an open tab
 * reloads once to fetch it; anything else gets a plain explanation and a way to try again,
 * instead of the router's developer message.
 */
export default function RouteError() {
  const error = useRouteError()
  const stale = isStaleBuildError(error)
  const [failed, setFailed] = useState(false)
  const tried = useRef(false)

  useEffect(() => {
    if (!stale || tried.current) return
    tried.current = true
    // Reloading again so soon means the new build fails too: explain instead.
    // oxlint-disable-next-line react/set-state-in-effect
    if (!reloadForNewBuild()) setFailed(true)
  }, [stale])

  const reloading = stale && !failed

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {reloading ? (
        <LoadingMessage>Loading the latest version of OpenDoor…</LoadingMessage>
      ) : (
        <div className="mx-auto max-w-md text-center">
          <MascotSad className="mx-auto w-40 sm:w-48" />
          <PageHeading className="mt-4">This page didn't load</PageHeading>
          <p className="mt-4">Something went wrong on our side. Reloading usually fixes it; your work saved before this is safe.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Reload the page</Button>
            <a href="/" className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 hover:no-underline">
              Go to the home page
            </a>
          </div>
        </div>
      )}
    </main>
  )
}
