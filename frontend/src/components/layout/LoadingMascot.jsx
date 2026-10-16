import { useEffect, useState } from 'react'
import Mascot from '../home/Mascot.jsx'
import Icon from '../ui/Icon.jsx'

/**
 * The loading picture (UI_FEEDBACK_WAVE_B_PLAN B5): the mascot hurrying towards an open door, in a
 * loop. It appears only after 400 ms, so quick loads don't flash it. Decoration only: the words
 * beside it are the status screen readers hear. With Reduce motion he waits by the door; in
 * Quiet mode he is gone.
 */
export default function LoadingMascot() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 400)
    return () => clearTimeout(timer)
  }, [])

  if (!shown) return null
  return (
    <div aria-hidden="true" className="od-decoration relative mx-auto mb-2 h-24 w-56 animate-fade-in">
      <span className="absolute right-0 bottom-0 grid size-16 place-items-center rounded-md bg-lilac text-accent">
        <Icon name="door" className="size-10" />
      </span>
      <div className="od-run absolute bottom-0 left-0 w-16">
        <Mascot pose={0} />
      </div>
    </div>
  )
}
