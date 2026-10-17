import { useSyncExternalStore } from 'react'
import { useDisplaySettings } from '../../display/displayContext.js'

const QUERY = '(prefers-reduced-motion: reduce)'
const subscribe = (onChange) => {
  if (typeof window.matchMedia !== 'function') return () => {}
  const list = window.matchMedia(QUERY)
  list.addEventListener?.('change', onChange)
  return () => list.removeEventListener?.('change', onChange)
}
const systemReduces = () => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches

/**
 * Whether the mascot animations hold still: Reduce motion (the system setting or Account →
 * Display) or Quiet mode. They then show one calm frame instead of moving.
 */
export default function useMascotStill() {
  const { settings } = useDisplaySettings()
  const system = useSyncExternalStore(subscribe, systemReduces, () => false)
  return system || settings.motion === 'reduce' || settings.quiet
}
