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
import './index.css'
import { router } from './router.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AnnouncerProvider>
        <RouterProvider router={router} />
      </AnnouncerProvider>
    </AuthProvider>
  </StrictMode>,
)
