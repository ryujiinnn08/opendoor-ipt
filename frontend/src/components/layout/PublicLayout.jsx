import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/authContext.js'
import { dashboardFor } from '../../auth/redirects.js'
import EmailVerificationBanner from '../verification/EmailVerificationBanner.jsx'
import { GUEST_MENU } from './portalMenus.js'
import SiteFooter from './SiteFooter.jsx'
import SiteHeader from './SiteHeader.jsx'
import UtilityBar from './UtilityBar.jsx'

/** The frame for public pages: Home and Find jobs, then Log in and Create account. */
export default function PublicLayout() {
  const { status, role } = useAuth()

  const right =
    status === 'authenticated'
      ? [{ to: dashboardFor(role), label: 'Go to my dashboard', icon: 'home', cta: true }]
      : [
          { to: '/login', label: 'Log in', icon: 'user' },
          { to: '/register', label: 'Create account', icon: 'plus', cta: true },
        ]

  return (
    <div className="flex min-h-screen flex-col">
      <UtilityBar />
      <SiteHeader left={GUEST_MENU} right={right} />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none sm:px-6">
        <EmailVerificationBanner />
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
