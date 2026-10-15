import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getUnreadCount } from '../../api/notifications.js'
import { useAuth } from '../../auth/authContext.js'
import { employerSummary } from '../../auth/employerAccess.js'
import { CHANGE_PASSWORD_PATH, dashboardFor } from '../../auth/redirects.js'
import { useAnnounce } from '../ui/announcerContext.js'
import NotificationsLink from '../notifications/NotificationsLink.jsx'
import Button from '../ui/Button.jsx'
import { portalFor } from './portalMenus.js'
import BrandLink from './BrandLink.jsx'
import SiteFooter from './SiteFooter.jsx'
import SkipLink from './SkipLink.jsx'

/**
 * Shared frame for the candidate, employer and admin portals; the menu depends on the role.
 */
export default function PortalLayout() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const portal = portalFor(user)
  const summary = employerSummary(user)
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

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <BrandLink to={dashboardFor(role)} />
            <span className="font-bold text-muted">{portal.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {notified && <NotificationsLink count={unread} />}
            <div>
              <p>
                <span className="sr-only">Logged in as</span> <span className="font-bold">{user.name}</span>
                {summary && <span className="block text-sm text-muted">{summary}</span>}
              </p>
              <Link
                to={CHANGE_PASSWORD_PATH}
                className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4 hover:no-underline"
              >
                Change password
              </Link>
            </div>
            <Button variant="secondary" onClick={handleLogout} loading={loggingOut} loadingText="Logging out…">
              Log out
            </Button>
          </div>
        </div>
        <nav aria-label={portal.name} className="border-t border-border">
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4">
            {portal.menu.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end ?? true}
                  className={({ isActive }) =>
                    `block min-h-11 border-b-4 px-3 py-2 ${isActive ? 'border-primary font-bold text-primary' : 'border-transparent hover:underline'}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none">
        <Outlet context={{ refreshNotifications, unreadNotifications: unread }} />
      </main>

      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  )
}
