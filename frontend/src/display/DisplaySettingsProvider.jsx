import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DisplayContext } from './displayContext.js'
import { applySettings, readSettings, saveSettings } from './displaySettings.js'

// Settings that recolour the page; switching them fades the colours (index.css).
const RECOLOURING = ['contrast', 'quiet']
const FADE_MS = 500

/**
 * Holds the display settings for the whole app. main.jsx applies the saved ones before the first
 * render, so pages never appear in the wrong size or colours; changes here apply at once.
 */
export default function DisplaySettingsProvider({ children }) {
  const [settings, setSettings] = useState(readSettings)
  const fadeTimer = useRef(null)

  useEffect(() => () => clearTimeout(fadeTimer.current), [])

  const update = useCallback((changes) => {
    if (RECOLOURING.some((name) => name in changes)) {
      const root = document.documentElement
      root.classList.add('od-theme-transition')
      clearTimeout(fadeTimer.current)
      fadeTimer.current = setTimeout(() => root.classList.remove('od-theme-transition'), FADE_MS)
    }
    setSettings((current) => {
      const next = { ...current, ...changes }
      applySettings(next)
      saveSettings(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ settings, update }), [settings, update])

  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>
}
