import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../../themeColors'

export default function AdminGuard({ children }) {
  const location = useLocation()
  const { theme } = useTheme()
  const palette = theme === 'light' ? dayTheme : darkTheme
  const [state, setState] = useState({ loading: true, user: null })

  useEffect(() => {
    let cancelled = false

    const verifyAdmin = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const result = response.ok ? await response.json() : null
        if (!cancelled) setState({ loading: false, user: result?.user || null })
      } catch {
        if (!cancelled) setState({ loading: false, user: null })
      }
    }

    void verifyAdmin()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: palette.bgPrimary }}>
        <div className="rounded-[28px] px-8 py-7 text-center" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, boxShadow: palette.shadowCard }}>
          <ShieldCheck className="mx-auto" size={30} style={{ color: palette.accentPrimary }} />
          <div className="mt-4 text-sm font-semibold" style={{ color: palette.textPrimary }}>Verifying administrator access...</div>
        </div>
      </div>
    )
  }

  if (!state.user || String(state.user.role || '').toLowerCase() !== 'admin') {
    return <Navigate to="/auth" replace state={{ redirectTo: location.pathname, authMessage: 'Administrator access is required.', authMessageType: 'error' }} />
  }

  return children
}
