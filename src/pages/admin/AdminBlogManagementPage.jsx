import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink, Eye, FileWarning, Flag, Search, ShieldAlert, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminPageShell from './AdminPageShell'
import { useTheme } from '../../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../../themeColors'

const formatReportDate = (value) => {
  if (!value) return 'Not available'
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

const prettifyReason = (value) =>
  String(value || '')
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function AdminBlogManagementPage() {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [activeReport, setActiveReport] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [savingAction, setSavingAction] = useState('')

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status, search })
      const response = await fetch(`/api/admin/blog-reports?${params}`)
      if (!response.ok) throw new Error('Failed to load reports')
      const data = await response.json()
      setReports(Array.isArray(data) ? data : [])
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReports(), 220)
    return () => window.clearTimeout(timer)
  }, [loadReports])

  const counts = useMemo(() => ({
    all: reports.length,
    pending: reports.filter((item) => item.status === 'pending').length,
    under_review: reports.filter((item) => item.status === 'under_review').length,
    resolved: reports.filter((item) => item.status === 'resolved').length,
    dismissed: reports.filter((item) => item.status === 'dismissed').length,
  }), [reports])

  const openReport = (report) => {
    setActiveReport(report)
    setAdminNote(report.adminNote || '')
  }

  const closeReport = () => {
    if (savingAction) return
    setActiveReport(null)
    setAdminNote('')
  }

  const handleModerationAction = async (nextStatus, adminAction) => {
    if (!activeReport?.id) return

    setSavingAction(adminAction || nextStatus)
    try {
      const response = await fetch(`/api/admin/blog-reports/${activeReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          adminAction,
          adminNote,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: result.error || 'Unable to update this report.', type: 'error' } }))
        return
      }

      setActiveReport(result)
      await loadReports()
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: adminAction === 'deleted' ? 'Blog deleted and report resolved.' : 'Moderation decision saved.', type: 'success' } }))
    } catch (error) {
      console.error('Failed to update blog report:', error)
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Unable to update this report.', type: 'error' } }))
    } finally {
      setSavingAction('')
    }
  }

  return (
    <AdminPageShell
      eyebrow="Blog moderation"
      title="Review blog reports with clarity,"
      titleAccent="before taking action."
      description="See who reported what, inspect the article context, and decide whether to keep the post live, continue reviewing, or remove it."
      actions={(
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline"
          style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
        >
          Browse public blogs
          <ExternalLink size={16} />
        </Link>
      )}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'All reports', value: counts.all, icon: FileWarning, tone: palette.accentPrimary },
          { label: 'Pending', value: counts.pending, icon: Flag, tone: '#f59e0b' },
          { label: 'Under review', value: counts.under_review, icon: Eye, tone: palette.info },
          { label: 'Resolved', value: counts.resolved + counts.dismissed, icon: ShieldAlert, tone: palette.success },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-[30px] p-6" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, boxShadow: isDayMode ? palette.shadowCard : '0 22px 70px rgba(0,0,0,0.24)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>{label}</div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tone}18`, color: tone }}><Icon size={20} /></span>
            </div>
            <div className="type-statValue mt-7 break-words" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-7 rounded-[34px] p-5 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSurface, boxShadow: isDayMode ? palette.shadowCard : '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgInput }}>
            <Search size={18} style={{ color: palette.textMuted }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search blog title, reporter, or reason..." className="w-full bg-transparent text-sm outline-none" style={{ color: palette.textPrimary }} />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl px-4 py-3 text-sm outline-none" style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgInput, color: palette.textPrimary }}>
            <option value="all">All report states</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-[26px] p-6 text-sm" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textMuted }}>
                Loading moderation queue...
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-[26px] p-6 text-sm leading-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textMuted }}>
                No blog reports match this filter right now.
              </div>
            ) : reports.map((report) => {
              const active = activeReport?.id === report.id
              const tone =
                report.status === 'pending'
                  ? '#f59e0b'
                  : report.status === 'under_review'
                    ? palette.info
                    : report.status === 'dismissed'
                      ? palette.textMuted
                      : palette.success

              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => openReport(report)}
                  className="w-full rounded-[26px] p-5 text-left transition"
                  style={{
                    border: `1px solid ${active ? palette.accentBorder : palette.borderPrimary}`,
                    backgroundColor: active ? palette.accentSoft : palette.bgSecondary,
                    boxShadow: active && isDayMode ? palette.shadowCard : 'none',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: tone }}>{prettifyReason(report.reason)}</div>
                      <div className="mt-3 type-cardHeading break-words" style={{ color: palette.textPrimary }}>
                        {report.currentBlogTitle || report.blogTitle || 'Removed blog'}
                      </div>
                      <div className="mt-3 text-sm" style={{ color: palette.textSecondary }}>
                        Reported by {report.reportedByName} • {formatReportDate(report.created_at)}
                      </div>
                    </div>

                    <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ border: `1px solid ${tone}30`, backgroundColor: `${tone}14`, color: tone }}>
                      {prettifyReason(report.status)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="rounded-[30px] p-6 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.97), rgba(247,247,245,0.9))' : 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))' }}>
            {!activeReport ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                  <Flag size={22} />
                </div>
                <h2 className="type-sectionHeading-soft mt-6" style={{ color: palette.textPrimary }}>
                  Select a report to start moderation.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                  The article context, reporter details, and moderation actions will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Selected report</div>
                    <h2 className="type-sectionHeading-soft mt-4" style={{ color: palette.textPrimary }}>
                      {activeReport.currentBlogTitle || activeReport.blogTitle || 'Removed blog'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeReport}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
                    style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary, color: palette.textSecondary }}
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>Reporter</div>
                    <div className="mt-3 text-sm font-semibold" style={{ color: palette.textPrimary }}>{activeReport.reportedByName}</div>
                    <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>{activeReport.reportedByEmail}</div>
                  </div>
                  <div className="rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>Report state</div>
                    <div className="mt-3 text-sm font-semibold" style={{ color: palette.textPrimary }}>{prettifyReason(activeReport.status)}</div>
                    <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>{formatReportDate(activeReport.created_at)}</div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>Reason</div>
                  <div className="mt-3 type-cardHeading" style={{ color: palette.textPrimary }}>{prettifyReason(activeReport.reason)}</div>
                  <p className="mt-4 text-sm leading-7 whitespace-pre-wrap" style={{ color: palette.textSecondary }}>
                    {activeReport.details || 'The reporter did not add extra context.'}
                  </p>
                </div>

                <div className="mt-5 rounded-[24px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>Article status</div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ border: `1px solid ${activeReport.blogStillLive ? palette.accentBorder : 'rgba(239,68,68,0.22)'}`, backgroundColor: activeReport.blogStillLive ? palette.accentSoft : 'rgba(239,68,68,0.08)', color: activeReport.blogStillLive ? palette.accentDark : palette.error }}>
                      {activeReport.blogStillLive ? 'Still live' : 'No longer live'}
                    </span>
                    {activeReport.blogStillLive && activeReport.blogId ? (
                      <Link to={`/blogs/${activeReport.blogId}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold no-underline" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
                        Open public article
                        <ExternalLink size={13} />
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>
                    Admin note
                  </label>
                  <textarea
                    rows={5}
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    placeholder="Record why you kept the article live, what policy you applied, or why the post was removed."
                    className="mt-2 w-full rounded-[24px] px-4 py-3 text-sm leading-7 outline-none transition"
                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                  />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    disabled={Boolean(savingAction)}
                    onClick={() => handleModerationAction('under_review', 'none')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textPrimary }}
                  >
                    <Eye size={15} />
                    {savingAction === 'none' ? 'Saving...' : 'Mark under review'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(savingAction)}
                    onClick={() => handleModerationAction('dismissed', 'kept')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ backgroundColor: palette.accentSoft, color: palette.accentDark, border: `1px solid ${palette.accentBorder}` }}
                  >
                    <ShieldAlert size={15} />
                    {savingAction === 'kept' ? 'Saving...' : 'Keep blog live'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(savingAction) || !activeReport.blogStillLive}
                    onClick={() => handleModerationAction('resolved', 'deleted')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ backgroundColor: isDayMode ? 'rgba(254,242,242,0.95)' : 'rgba(127,29,29,0.18)', color: isDayMode ? '#dc2626' : '#fca5a5', border: `1px solid ${isDayMode ? 'rgba(239,68,68,0.18)' : 'rgba(248,113,113,0.2)'}` }}
                  >
                    <Trash2 size={15} />
                    {savingAction === 'deleted' ? 'Deleting...' : 'Delete blog'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </AdminPageShell>
  )
}
