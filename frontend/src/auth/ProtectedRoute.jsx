import { Navigate, Outlet, useLocation } from 'react-router-dom'
import PageLoading from '../components/layout/PageLoading.jsx'
import { useAuth } from './authContext.js'
import { CHANGE_PASSWORD_PATH, dashboardFor } from './redirects.js'

/**
 * Shows child routes only to logged-in users with one of `roles`. Someone still on a temporary
 * password is sent to Change password first (plan PHASE_6 Q4). The server enforces the same
 * rules; this only keeps navigation sensible.
 */
export default function ProtectedRoute({ roles }) {
  const { status, role, user } = useAuth()
  const location = useLocation()

  // Restoring the session after a reload: the same loading screen as a page that is still loading.
  if (status === 'loading') return <PageLoading />

  if (status === 'guest') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (!roles.includes(role)) return <Navigate to={dashboardFor(role)} replace />

  if (user?.must_change_password && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  return <Outlet />
}
