import { useCallback, useMemo, useState } from 'react'
import { DisplayContext } from './displayContext.js'
import { applySettings, readSettings, saveSettings } from './displaySettings.js'

/**
 * Holds the display settings for the whole app. main.jsx applies the saved ones before the first
 * render, so pages never appear in the wrong size or colours; changes here apply at once.
 */
export default function DisplaySettingsProvider({ children }) {
  const [settings, setSettings] = useState(readSettings)

  const update = useCallback((changes) => {
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
