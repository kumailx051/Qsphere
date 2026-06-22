import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Filter, Search, ShieldCheck, UserCheck, UserRoundX } from 'lucide-react'
import AdminPageShell from './AdminPageShell'
import { useTheme } from '../../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../../themeColors'

export default function AdminUsersPage() {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ search, role, status })
    try {
      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to load users')
      setUsers(await response.json())
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [role, search, status])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 250)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  const toggleStatus = async (user) => {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    const result = await response.json()
    if (response.ok) {
      setUsers((current) => current.map((item) => item.id === user.id ? result.user : item))
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: `${user.fullName} ${user.isActive ? 'suspended' : 'activated'}.`, type: 'success' } }))
    } else {
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: result.error || 'Unable to update account.', type: 'error' } }))
    }
  }

  return (
    <AdminPageShell eyebrow="User administration" title="Manage people without losing the human signal." description="Search accounts, inspect onboarding state, assign roles, and suspend or restore access.">
      <section className="rounded-[34px] p-5 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, boxShadow: isDayMode ? palette.shadowCard : '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgInput }}>
            <Search size={18} style={{ color: palette.textMuted }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email..." className="w-full bg-transparent text-sm outline-none" style={{ color: palette.textPrimary }} />
          </label>
          <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgInput }}>
            <ShieldCheck size={17} style={{ color: palette.textMuted }} />
            <select value={role} onChange={(event) => setRole(event.target.value)} className="w-full bg-transparent text-sm outline-none" style={{ color: palette.textPrimary }}>
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="graduate">Graduate</option>
              <option value="industry">Industry</option>
              <option value="faculty">Faculty</option>
              <option value="researcher">Researcher</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgInput }}>
            <Filter size={17} style={{ color: palette.textMuted }} />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full bg-transparent text-sm outline-none" style={{ color: palette.textPrimary }}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-y-3 text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>
                <th className="px-4">Member</th>
                <th className="px-4">Role</th>
                <th className="px-4">Readiness</th>
                <th className="px-4">Status</th>
                <th className="px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && users.map((user) => (
                <tr key={user.id} style={{ backgroundColor: palette.bgSecondary }}>
                  <td className="rounded-l-[22px] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-sm font-bold" style={{ backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                        {user.profileImage ? <img src={user.profileImage} alt="" className="h-full w-full object-cover" /> : String(user.fullName || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>{user.fullName}</div>
                        <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>{user.emailAddress}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>{user.role || 'unassigned'}</span>
                  </td>
                  <td className="px-4 py-4 text-xs" style={{ color: palette.textSecondary }}>
                    <div>{user.isVerified ? 'Verified email' : 'Unverified email'}</div>
                    <div className="mt-1" style={{ color: palette.textMuted }}>{user.isOnboarded ? 'Onboarding complete' : 'Onboarding pending'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: user.isActive ? palette.success : palette.error }}>
                      {user.isActive ? <UserCheck size={15} /> : <UserRoundX size={15} />}
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="rounded-r-[22px] px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => toggleStatus(user)} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ border: `1px solid ${palette.borderPrimary}`, color: user.isActive ? palette.error : palette.success }}>
                        {user.isActive ? 'Suspend' : 'Activate'}
                      </button>
                      <Link to={`/admin/users/${user.id}`} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold no-underline" style={{ backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                        Manage
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <div className="py-16 text-center text-sm" style={{ color: palette.textMuted }}>Loading users...</div> : null}
          {!loading && users.length === 0 ? <div className="py-16 text-center text-sm" style={{ color: palette.textMuted }}>No users match these filters.</div> : null}
        </div>
      </section>
    </AdminPageShell>
  )
}
