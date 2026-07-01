import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import {
  LayoutDashboard, Users, BookOpenText, TextSelect, ChevronLeft, ChevronRight,
} from 'lucide-react'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/blog-management', label: 'Blog Management', icon: BookOpenText },
  { to: '/admin/font-management', label: 'Font Management', icon: TextSelect },
]

export default function AdminSidebar() {
  const { theme } = useTheme()
  const location = useLocation()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('qsphere_admin_sidebar_collapsed') === '1' } catch { return false }
  })

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('qsphere_admin_sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  const width = collapsed ? 'w-16' : 'w-56'

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen ${width} flex flex-col border-r backdrop-blur-2xl transition-all duration-300`}
      style={{
        borderColor: palette.borderPrimary,
        backgroundColor: isDayMode ? 'rgba(247,247,247,0.92)' : 'rgba(0,0,0,0.78)',
      }}
    >
      <div className="flex items-center justify-between px-4 pt-6 pb-4" style={{ borderBottom: `1px solid ${palette.borderSoft}` }}>
        {!collapsed && (
          <span className="text-sm font-bold tracking-wide" style={{ color: palette.accentPrimary }}>
            QSphere Admin
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: palette.textMuted }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all no-underline ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                backgroundColor: active ? palette.accentSoft : 'transparent',
                color: active ? palette.accentDark : palette.textSecondary,
              }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
