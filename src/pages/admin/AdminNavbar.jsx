import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Moon, ShieldCheck, Sun, Users, ExternalLink } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../../themeColors'

const readProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('qsphere_onboarding_profile') || 'null')
  } catch {
    return null
  }
}

export default function AdminNavbar() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const palette = theme === 'light' ? dayTheme : darkTheme
  const isDayMode = theme === 'light'
  const [profile] = useState(readProfile)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('qsphere_logged_in')
      localStorage.removeItem('qsphere_onboarding_profile')
      localStorage.removeItem('qsphere_login_time')
      window.dispatchEvent(new Event('qsphere-auth-changed'))
      navigate('/auth', { replace: true })
    }
  }

  const navClass = ({ isActive }) => `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${isActive ? 'admin-nav-active' : ''}`

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-6 pt-5">
      <div
        className="mx-auto flex max-w-[1500px] items-center justify-between rounded-full border px-5 py-3 backdrop-blur-2xl"
        style={{
          borderColor: palette.accentBorder,
          backgroundColor: isDayMode ? 'rgba(255,255,255,0.9)' : 'rgba(2,8,6,0.86)',
          boxShadow: isDayMode ? '0 18px 55px rgba(15,23,42,0.08)' : '0 0 36px rgba(16,185,129,0.16)',
        }}
      >
        <Link to="/admin" className="flex items-center gap-3 no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
            <ShieldCheck size={19} />
          </span>
          <span>
            <span className="block text-lg font-bold leading-none" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
              <span style={{ color: palette.accentPrimary }}>Q</span>Sphere
            </span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.textMuted }}>Admin console</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink to="/admin" end className={navClass} style={({ isActive }) => ({ color: isActive ? palette.accentDark : palette.textSecondary, backgroundColor: isActive ? palette.accentSoft : 'transparent' })}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink to="/admin/users" className={navClass} style={({ isActive }) => ({ color: isActive ? palette.accentDark : palette.textSecondary, backgroundColor: isActive ? palette.accentSoft : 'transparent' })}>
            <Users size={16} />
            Users
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/" className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold no-underline lg:inline-flex" style={{ border: `1px solid ${palette.borderPrimary}`, color: palette.textSecondary }}>
            View site
            <ExternalLink size={14} />
          </Link>
          <button type="button" onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, color: palette.textSecondary }} aria-label="Toggle theme">
            {isDayMode ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <div className="hidden px-2 text-right xl:block">
            <div className="max-w-[150px] truncate text-xs font-semibold" style={{ color: palette.textPrimary }}>{profile?.fullName || 'Administrator'}</div>
            <div className="max-w-[150px] truncate text-[10px]" style={{ color: palette.textMuted }}>{profile?.emailAddress || ''}</div>
          </div>
          <button type="button" onClick={handleLogout} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, color: palette.error }} aria-label="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  )
}
