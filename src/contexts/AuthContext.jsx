import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { emitAuthChanged, fetchCurrentUser, logoutCurrentUser } from '../utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const refreshUser = useCallback(async ({ background = false } = {}) => {
    if (!background) setAuthLoading(true)

    const nextUser = await fetchCurrentUser()
    setUser(nextUser)
    setAuthLoading(false)
    return nextUser
  }, [])

  useEffect(() => {
    void refreshUser()

    const handleAuthChanged = () => {
      void refreshUser({ background: true })
    }

    window.addEventListener('qsphere-auth-changed', handleAuthChanged)
    return () => window.removeEventListener('qsphere-auth-changed', handleAuthChanged)
  }, [refreshUser])

  const login = useCallback(() => {
    emitAuthChanged()
  }, [])

  const logout = useCallback(async () => {
    await logoutCurrentUser()
    setUser(null)
    setAuthLoading(false)
  }, [])

  const value = useMemo(() => ({ user, authLoading, refreshUser, login, logout }), [authLoading, login, logout, refreshUser, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
