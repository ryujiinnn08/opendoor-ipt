import { useEffect, useState } from 'react'
import MascotLoader from '../mascot/MascotLoader.jsx'

/**
 * The loading picture (mascot-loader, animation only): the mascot strolling along while the
 * scenery scrolls past. It appears only after 400 ms, so quick loads don't flash it. Decoration
 * only: the words beside it are the status screen readers hear. Gone in Quiet mode; still with
 * Reduce motion.
 */
export default function LoadingMascot() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 400)
    return () => clearTimeout(timer)
  }, [])

  if (!shown) return null
  return (
    <div aria-hidden="true" className="od-decoration mx-auto mb-3 w-72 max-w-full animate-fade-in overflow-hidden rounded-lg border border-border">
      <MascotLoader className="w-full" />
    </div>
  )
}
