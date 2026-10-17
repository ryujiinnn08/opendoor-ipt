import { lazy, memo, Suspense, useEffect, useState } from 'react'
const MascotDoor = lazy(() => import('../components/mascot/MascotDoor.jsx'))
import MascotHappy from '../components/mascot/MascotHappy.jsx'
import useMascotStill from '../components/mascot/useMascotStill.js'

/** One brief greeting or celebration; ordinary coachmarks remain still. */
function TourMascot({ mood = 'guide', animate = false, large = false }) {
  const prefersStill = useMascotStill()
  const [finished, setFinished] = useState(prefersStill)
  // Motion disabled during a greeting cancels it for the rest of this step.
  if (prefersStill && !finished) setFinished(true)
  useEffect(() => {
    if (!animate || prefersStill || finished) return
    const timer = setTimeout(() => setFinished(true), mood === 'happy' ? 3200 : 4500)
    return () => clearTimeout(timer)
  }, [animate, prefersStill, mood, finished])
  const still = !animate || finished || prefersStill
  return <div aria-hidden="true" className={`tour-mascot shrink-0 overflow-hidden ${large ? 'w-28' : 'w-12'}`}>
    <Suspense fallback={null}>{mood === 'happy' ? <MascotHappy forceStill={still} noConfetti className="w-full" /> : <MascotDoor forceStill={still} className="w-full" />}</Suspense>
  </div>
}

export default memo(TourMascot)
