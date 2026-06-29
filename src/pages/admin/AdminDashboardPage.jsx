import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpenText, FileWarning, FolderKanban, MessageSquareText, ShieldCheck, UserCheck, UserRoundX, Users } from 'lucide-react'
import AdminPageShell from './AdminPageShell'
import { useTheme } from '../../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../../themeColors'

const EMPTY_SUMMARY = {
  users: { total: 0, active: 0, suspended: 0, admins: 0, verified: 0, onboarded: 0 },
  content: { blogs: 0, groups: 0, projects: 0, comments: 0, blogReports: 0 },
  recentUsers: [],
}

export default function AdminDashboardPage() {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/summary')
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load dashboard')
        return response.json()
      })
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Total users', value: summary.users.total, icon: Users, tone: palette.accentPrimary },
    { label: 'Active accounts', value: summary.users.active, icon: UserCheck, tone: palette.success },
    { label: 'Suspended', value: summary.users.suspended, icon: UserRoundX, tone: palette.error },
    { label: 'Administrators', value: summary.users.admins, icon: ShieldCheck, tone: palette.info },
  ]

  const contentStats = [
    { label: 'Published blogs', value: summary.content.blogs, icon: BookOpenText },
    { label: 'Groups', value: summary.content.groups, icon: Users },
    { label: 'Projects', value: summary.content.projects, icon: FolderKanban },
    { label: 'Comments', value: summary.content.comments, icon: MessageSquareText },
  ]

  return (
    <AdminPageShell
      eyebrow="Administration"
      title="A clearer view of the"
      titleAccent="whole QSphere ecosystem."
      description="Monitor membership, account health, and community activity from one focused control surface."
      actions={(
        <>
          <Link to="/admin/users" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline" style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}>
            Manage users
            <ArrowUpRight size={16} />
          </Link>
          <Link to="/admin/blog-management" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, color: palette.textPrimary }}>
            Review blog reports
            <ArrowUpRight size={16} />
          </Link>
        </>
      )}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-[30px] p-6" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, boxShadow: isDayMode ? palette.shadowCard : '0 22px 70px rgba(0,0,0,0.24)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>{label}</div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tone}18`, color: tone }}><Icon size={20} /></span>
            </div>
            <div className="type-statValue mt-7 break-words" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
              {loading ? '—' : value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[34px] p-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface }}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Newest members</div>
              <h2 className="type-cardHeading mt-3" style={{ fontFamily: 'var(--font-heading)' }}>Recent registrations</h2>
            </div>
            <Link to="/admin/users" className="text-sm font-semibold no-underline" style={{ color: palette.accentDark }}>View all</Link>
          </div>
          <div className="mt-6 space-y-3">
            {summary.recentUsers.map((user) => (
              <Link key={user.id} to={`/admin/users/${user.id}`} className="flex items-center gap-4 rounded-[22px] p-4 no-underline transition" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgSecondary }}>
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full font-bold" style={{ backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                  {user.profileImage ? <img src={user.profileImage} alt="" className="h-full w-full object-cover" /> : String(user.fullName || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold" style={{ color: palette.textPrimary }}>{user.fullName}</div>
                  <div className="mt-1 truncate text-xs" style={{ color: palette.textMuted }}>{user.emailAddress}</div>
                </div>
                <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ border: `1px solid ${user.isActive ? palette.accentBorder : 'rgba(239,68,68,0.22)'}`, backgroundColor: user.isActive ? palette.accentSoft : 'rgba(239,68,68,0.08)', color: user.isActive ? palette.accentDark : palette.error }}>
                  {user.role || 'member'}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[34px] p-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Community output</div>
          <h2 className="type-cardHeading mt-3" style={{ fontFamily: 'var(--font-heading)' }}>Content pulse</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {contentStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-[24px] p-5" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgSecondary }}>
                <Icon size={19} style={{ color: palette.accentPrimary }} />
                <div className="type-statValue mt-5 break-words" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  {loading ? '—' : value}
                </div>
                <div className="mt-2 text-xs" style={{ color: palette.textMuted }}>{label}</div>
              </div>
            ))}
          </div>
          <Link to="/admin/blog-management" className="mt-5 flex items-center justify-between rounded-[24px] p-5 no-underline transition" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgSecondary }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>Pending blog reports</div>
              <p className="mt-2 text-xs leading-6" style={{ color: palette.textMuted }}>Moderation requests waiting for review from the community blog feed.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="type-statValue" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>{summary.content.blogReports || 0}</span>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${palette.accentPrimary}18`, color: palette.accentPrimary }}>
                <FileWarning size={19} />
              </span>
            </div>
          </Link>
          <div className="mt-5 rounded-[24px] p-5" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
            <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>{summary.users.verified} verified · {summary.users.onboarded} onboarded</div>
            <p className="mt-2 text-xs leading-6" style={{ color: palette.textSecondary }}>Account readiness across the current member base.</p>
          </div>
        </section>
      </div>
    </AdminPageShell>
  )
}
