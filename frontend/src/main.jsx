// Fonts served from the site itself (no visitor addresses sent to Google, PHASE_7 Q19): Lexend
// for headings, buttons and numbers; Atkinson Hyperlegible for everything else.
import '@fontsource/atkinson-hyperlegible/latin-400.css'
import '@fontsource/atkinson-hyperlegible/latin-400-italic.css'
import '@fontsource/atkinson-hyperlegible/latin-700.css'
import '@fontsource/lexend/latin-600.css'
import '@fontsource/lexend/latin-700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import { AnnouncerProvider } from './components/ui/Announcer.jsx'
import DisplaySettingsProvider from './display/DisplaySettingsProvider.jsx'
import { applySettings, readSettings } from './display/displaySettings.js'
import './index.css'
import { reloadForNewBuild } from './lib/staleBuild.js'
import { router } from './router.jsx'

// Vite reports a page file it couldn't preload, e.g., after a redeploy: fetch the new build once.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewBuild()) event.preventDefault()
})

// Before the first render, so no page appears in the wrong text size or colours.
applySettings(readSettings())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DisplaySettingsProvider>
      <AuthProvider>
        <AnnouncerProvider>
          <RouterProvider router={router} />
        </AnnouncerProvider>
      </AuthProvider>
    </DisplaySettingsProvider>
  </StrictMode>,
)
