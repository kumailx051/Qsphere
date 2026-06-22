import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Building2, Calendar, Mail, MapPin, Save, ShieldCheck, UserCheck, UserRoundX } from 'lucide-react'
import AdminPageShell from './AdminPageShell'
import { useTheme } from '../../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../../themeColors'

const ROLES = ['admin', 'student', 'graduate', 'industry', 'faculty', 'researcher']

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ role: '', isActive: true, isVerified: false, isOnboarded: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('User not found')
        return response.json()
      })
      .then((data) => {
        setUser(data)
        setForm({
          role: data.role || '',
          isActive: data.isActive !== false,
          isVerified: Boolean(data.isVerified),
          isOnboarded: Boolean(data.isOnboarded),
        })
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [id])

  const saveUser = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update user')
      setUser(result.user)
      setForm({
        role: result.user.role || '',
        isActive: result.user.isActive !== false,
        isVerified: Boolean(result.user.isVerified),
        isOnboarded: Boolean(result.user.isOnboarded),
      })
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'User account updated.', type: 'success' } }))
    } catch (error) {
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: error.message, type: 'error' } }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <AdminPageShell eyebrow="User administration" title="Loading member profile..."><div /></AdminPageShell>
  }

  if (!user) {
    return (
      <AdminPageShell eyebrow="User administration" title="This member could not be found.">
        <Link to="/admin/users" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline" style={{ backgroundColor: palette.accentSoft, color: palette.accentDark }}><ArrowLeft size={16} /> Back to users</Link>
      </AdminPageShell>
    )
  }

  const details = [
    { label: 'Email', value: user.emailAddress, icon: Mail },
    { label: 'Location', value: user.city || 'Not provided', icon: MapPin },
    { label: 'Organization', value: user.organization || user.institute || 'Not provided', icon: Building2 },
    { label: 'Joined', value: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown', icon: Calendar },
  ]

  return (
    <AdminPageShell
      eyebrow="Member control"
      title={user.fullName}
      description="Review identity signals and control this member’s access, role, verification, and onboarding state."
      actions={<Link to="/admin/users" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, color: palette.textSecondary }}><ArrowLeft size={16} /> All users</Link>}
    >
      <div className="grid gap-7 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="rounded-[34px] p-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, boxShadow: isDayMode ? palette.shadowCard : '0 24px 80px rgba(0,0,0,0.25)' }}>
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] text-3xl font-bold" style={{ backgroundColor: palette.accentSoft, color: palette.accentDark }}>
              {user.profileImage ? <img src={user.profileImage} alt="" className="h-full w-full object-cover" /> : String(user.fullName || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{user.fullName}</div>
              <div className="mt-2 truncate text-sm" style={{ color: palette.textMuted }}>{user.emailAddress}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: palette.accentSoft, color: palette.accentDark }}>{user.role || 'unassigned'}</span>
                <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: user.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: user.isActive ? palette.success : palette.error }}>{user.isActive ? 'Active' : 'Suspended'}</span>
              </div>
            </div>
          </div>
          <div className="mt-7 space-y-3">
            {details.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-start gap-3 rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgSecondary }}>
                <Icon size={17} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>{label}</div>
                  <div className="mt-2 text-sm font-semibold" style={{ color: palette.textPrimary }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[34px] p-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, boxShadow: isDayMode ? palette.shadowCard : '0 24px 80px rgba(0,0,0,0.25)' }}>
          <div className="flex items-center gap-3">
            <ShieldCheck size={21} style={{ color: palette.accentPrimary }} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Access configuration</div>
              <h2 className="mt-2 text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Account controls</h2>
            </div>
          </div>

          <div className="mt-7">
            <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>Role</label>
            <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="mt-2 w-full rounded-2xl px-4 py-3.5 text-sm outline-none" style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgInput, color: palette.textPrimary }}>
              <option value="">Unassigned</option>
              {ROLES.map((role) => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}
            </select>
          </div>

          <div className="mt-6 space-y-3">
            {[
              { key: 'isActive', label: 'Account active', description: 'Allow this member to sign in and use QSphere.', icon: form.isActive ? UserCheck : UserRoundX },
              { key: 'isVerified', label: 'Email verified', description: 'Mark the member email as verified.', icon: BadgeCheck },
              { key: 'isOnboarded', label: 'Onboarding complete', description: 'Allow access to the full member experience.', icon: UserCheck },
            ].map(({ key, label, description, icon: Icon }) => (
              <label key={key} className="flex cursor-pointer items-center gap-4 rounded-[24px] p-4" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgSecondary }}>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: form[key] ? palette.accentSoft : 'rgba(239,68,68,0.08)', color: form[key] ? palette.accentDark : palette.error }}><Icon size={19} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold" style={{ color: palette.textPrimary }}>{label}</span>
                  <span className="mt-1 block text-xs leading-5" style={{ color: palette.textMuted }}>{description}</span>
                </span>
                <input type="checkbox" checked={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))} className="h-5 w-5 accent-emerald-500" />
              </label>
            ))}
          </div>

          <button type="button" onClick={saveUser} disabled={saving} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}>
            <Save size={16} />
            {saving ? 'Saving changes...' : 'Save account changes'}
          </button>
        </section>
      </div>
    </AdminPageShell>
  )
}
