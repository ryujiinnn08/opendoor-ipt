import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth.js'
import { setProfileRequiredHandler, setUnauthorizedHandler } from '../api/client.js'
import { AuthContext } from './authContext.js'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'guest' | 'authenticated'

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser)
    setStatus(nextUser ? 'authenticated' : 'guest')
  }, [])

  /**
   * Reloads the user, e.g., after an employer sets up or renames their company. A failed reload
   * keeps the user: an ended session (401) is already handled by the unauthorized handler, and a
   * network error shouldn't log anyone out (Phase 6 review).
   */
  const refresh = useCallback(async () => {
    try {
      applyUser(await authApi.fetchCurrentUser())
    } catch {
      // Keep the current user.
    }
  }, [applyUser])

  // Restore the session on page load: the cookie survives refreshes, the React state does not.
  useEffect(() => {
    setUnauthorizedHandler(() => applyUser(null))
    setProfileRequiredHandler(() => refresh())
    authApi
      .fetchCurrentUser()
      .then(applyUser)
      .catch(() => applyUser(null))
  }, [applyUser, refresh])

  const login = useCallback(
    async (values) => {
      const loggedIn = await authApi.login(values)
      applyUser(loggedIn)
      return loggedIn
    },
    [applyUser],
  )

  const register = useCallback(
    async (values) => {
      const created = await authApi.register(values)
      applyUser(created)
      return created
    },
    [applyUser],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      applyUser(null)
    }
  }, [applyUser])

  const value = useMemo(
    () => ({ user, role: user?.role ?? null, status, login, register, logout, refresh }),
    [user, status, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
