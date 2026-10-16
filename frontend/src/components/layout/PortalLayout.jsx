import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getUnreadCount } from '../../api/notifications.js'
import { useAuth } from '../../auth/authContext.js'
import { dashboardFor } from '../../auth/redirects.js'
import { useAnnounce } from '../ui/announcerContext.js'
import EmailVerificationBanner from '../verification/EmailVerificationBanner.jsx'
import { getPhotoFile } from '../../api/candidate.js'
import usePrivateImage from '../../hooks/usePrivateImage.js'
import { initialsOf } from '../../lib/initials.js'
import { accountMenuFor, portalFor } from './portalMenus.js'
import SiteFooter from './SiteFooter.jsx'
import SiteHeader from './SiteHeader.jsx'
import UtilityBar from './UtilityBar.jsx'

/**
 * Shared frame for the job seeker, employer and admin pages; the menu depends on the role.
 */
export default function PortalLayout() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const portal = portalFor(user)
  // A job seeker's photo in the account menu; a new version (after a change) loads the new photo.
  const photo = usePrivateImage(getPhotoFile, role === 'candidate' ? user.photo_version : null)
  // Job seekers and employers get notifications; admins have their queues (plan PHASE_6 §4.4).
  const notified = role === 'candidate' || role === 'employer'
  const [unread, setUnread] = useState(0)
  const countRequest = useRef(0)

  // Only the latest answer counts, so an older one can't overwrite a newer count (review WR-08).
  const refreshNotifications = useCallback(() => {
    if (!notified) return
    const request = ++countRequest.current
    getUnreadCount()
      .then((count) => {
        if (request === countRequest.current) setUnread(count)
      })
      .catch(() => {})
  }, [notified])

  // Counted when a page loads (Q8): no live updates.
  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications, location.pathname])

  async function handleLogout() {
    setLoggingOut(true)
    // Leave the portal first: clearing the user while still inside it would make the
    // route guard redirect to the login page instead of the home page. The navigation is a
    // transition, so wait for it to finish before clearing the user (A8 check: logging out of
    // Notifications landed on the login page).
    await navigate('/', { replace: true, state: { loggedOut: true } })
    await logout()
    announce('You have logged out.')
  }

  const right = [
    ...(notified ? [{ to: '/notifications', label: 'Notifications', icon: 'bell', count: unread }] : []),
    {
      menu: true,
      label: 'Account',
      avatar: initialsOf(user.name),
      avatarSrc: photo,
      name: user.name,
      email: user.email,
      items: accountMenuFor(user),
      logout: { label: 'Log out', icon: 'log-out', onClick: handleLogout, loading: loggingOut, loadingText: 'Logging out…' },
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <UtilityBar />
      <SiteHeader homeTo={dashboardFor(role)} left={portal.left} right={right} />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none sm:px-6">
        <EmailVerificationBanner />
        <div key={location.pathname} className="animate-page-in">
          <Outlet context={{ refreshNotifications, unreadNotifications: unread }} />
        </div>
      </main>

      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  )
}
