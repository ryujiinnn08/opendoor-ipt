import { createContext, useContext } from 'react'
import { DEFAULTS } from './displaySettings.js'

// Without a provider (component tests) the defaults apply and changes go nowhere.
export const DisplayContext = createContext({ settings: DEFAULTS, update: () => {} })

/** { settings, update(changes) } for the display settings. */
export function useDisplaySettings() {
  return useContext(DisplayContext)
}
