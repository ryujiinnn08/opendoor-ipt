import { useSyncExternalStore } from 'react'
import { useDisplaySettings } from '../display/displayContext.js'

const QUERY = '(min-width: 1024px)'

function subscribe(onChange) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const list = window.matchMedia(QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

const wideEnough = () => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches

/**
 * Whether Find jobs shows the list and the chosen job side by side (UI_FEEDBACK_PLAN Q2): on
 * screens 1024 px and wider, with text at 125 % or less and the full menu. Otherwise the job opens
 * on its own page, where it has the whole width.
 */
export default function useTwoPanes() {
  const { settings } = useDisplaySettings()
  const wide = useSyncExternalStore(subscribe, wideEnough, () => false)
  return wide && settings.text <= 125 && settings.menu !== 'compact'
}
