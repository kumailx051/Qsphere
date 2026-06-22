import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Send,
  Sparkles,
  User,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../themeColors'
import {
  getPositionById,
  getStoredPositions,
  parsePositionDeadline,
  splitPositionRequirements,
} from '../utils/positionStore'

const getTypeStyles = (isDayMode) => ({
  'Research Assistant': isDayMode 
    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.06)]' 
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_18px_rgba(16,185,129,0.12)]',
  Intern: isDayMode
    ? 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.06)]'
    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_18px_rgba(34,211,238,0.12)]',
  Collaborator: isDayMode
    ? 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.06)]'
    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-[0_0_18px_rgba(99,102,241,0.12)]',
  Postdoc: isDayMode
    ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 shadow-[0_0_12px_rgba(251,191,36,0.06)]'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_18px_rgba(251,191,36,0.12)]',
  Other: isDayMode
    ? 'bg-gray-100 text-gray-600 border-gray-200'
    : 'bg-white/[0.06] text-white/60 border-white/10',
})

const getLocationVariants = (isDayMode) => ({
  Remote: { 
    bg: isDayMode ? 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20' : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20', 
    dot: isDayMode ? 'bg-cyan-500' : 'bg-cyan-400', 
    glow: isDayMode ? 'rgba(34,211,238,0.08)' : 'rgba(34,211,238,0.16)' 
  },
  Hybrid: { 
    bg: isDayMode ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20', 
    dot: isDayMode ? 'bg-amber-500' : 'bg-amber-400', 
    glow: isDayMode ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.14)' 
  },
  'On-site': { 
    bg: isDayMode ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', 
    dot: isDayMode ? 'bg-emerald-500' : 'bg-emerald-400', 
    glow: isDayMode ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.16)' 
  },
})

const APPLICATION_STORAGE_KEY = 'qsphere_position_applications'

const getPositionTone = (position) => {
  if (position.type === 'Intern') {
    return {
      edge: 'rgba(34,211,238,0.4)',
      glow: 'rgba(34,211,238,0.16)',
      haze: 'rgba(34,211,238,0.12)',
    }
  }

  if (position.type === 'Collaborator') {
    return {
      edge: 'rgba(99,102,241,0.42)',
      glow: 'rgba(99,102,241,0.16)',
      haze: 'rgba(99,102,241,0.12)',
    }
  }

  if (position.type === 'Postdoc') {
    return {
      edge: 'rgba(251,191,36,0.4)',
      glow: 'rgba(251,191,36,0.14)',
      haze: 'rgba(251,191,36,0.1)',
    }
  }

  return {
    edge: 'rgba(16,185,129,0.42)',
    glow: 'rgba(16,185,129,0.16)',
    haze: 'rgba(16,185,129,0.14)',
  }
}

const getRoleNotes = (position) => {
  const type = String(position.type || '').toLowerCase()

  if (type === 'intern') {
    return [
      'Built for fast learners who want real exposure instead of passive observation.',
      'You get meaningful technical context, hands-on contribution, and strong learning velocity.',
      'The role rewards curiosity, execution, and the ability to turn theory into action.',
    ]
  }

  if (type === 'collaborator') {
    return [
      'Designed for builders and researchers who thrive in shared momentum.',
      'The position favors people who can bridge disciplines and make complex work legible.',
      'You should expect autonomy, idea exchange, and room to shape the direction of the work.',
    ]
  }

  if (type === 'research assistant') {
    return [
      'A focused role for candidates who enjoy rigorous thinking and careful experimentation.',
      'You will be close to the technical core, where precision matters and questions stay ambitious.',
      'It is a strong fit for disciplined contributors who want research depth with visible output.',
    ]
  }

  return [
    'This opening is tuned for people who want meaningful work around serious quantum problems.',
    'The role balances clarity, ambition, and enough space to do your best thinking well.',
    'Expect substance over noise, with opportunities to contribute in ways that matter.',
  ]
}

const isExternalLink = (value) => /^https?:\/\//i.test(String(value || '').trim())

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem('qsphere_onboarding_profile')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const showSnackbar = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
}

export default function PositionDetailPage() {
  const { id } = useParams()
  const position = getPositionById(id)
  const profile = readStoredProfile()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(() => ({
    fullName: profile?.fullName || '',
    email: profile?.emailAddress || profile?.email || '',
    portfolioUrl: '',
    motivation: '',
  }))

  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const relatedPositions = useMemo(() => {
    if (!position) return []
    return getStoredPositions().filter((item) => item.id !== position.id).slice(0, 3)
  }, [position])

  if (!position) {
    return (
      <div className="relative" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
        <Navbar currentPage="positions" />
        <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-12 lg:px-20 xl:px-28">
          <div className="overflow-hidden rounded-[36px] p-10 md:p-16" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.4), transparent)' : 'linear-gradient(to bottom right, rgba(255,255,255,0.04), rgba(255,255,255,0.02), transparent)', boxShadow: isDayMode ? palette.shadowCard : '0 30px 120px rgba(0,0,0,0.45)' }}>
            <span className="inline-flex rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
              Position Not Found
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[0.94] md:text-6xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
              This role is no longer available.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 md:text-lg" style={{ color: palette.textSecondary }}>
              The opening may have been removed or replaced. Jump back to the opportunities grid and pick another role to explore.
            </p>
            <Link
              to="/positions"
              className="mt-10 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all hover:brightness-110"
              style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}
            >
              <ArrowLeft size={16} />
              Back to positions
            </Link>
          </div>
        </main>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer />
        </div>
      </div>
    )
  }

  const deadline = parsePositionDeadline(position.deadline)
  const requirements = splitPositionRequirements(position.requirements)
  const tone = getPositionTone(position)
  const typeStyles = getTypeStyles(isDayMode)
  const locationVariants = getLocationVariants(isDayMode)
  const locationStyle = locationVariants[position.location] || { 
    bg: isDayMode ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-white/[0.06] text-white/50 border-white/10', 
    dot: isDayMode ? 'bg-gray-400' : 'bg-white/40', 
    glow: 'transparent' 
  }
  const roleNotes = getRoleNotes(position)
  const contactHref = isExternalLink(position.contact) ? position.contact : `mailto:${position.contact}`

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!form.fullName.trim()) nextErrors.fullName = 'Name is required'
    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!form.motivation.trim()) nextErrors.motivation = 'Tell them why you are a fit'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      showSnackbar('Please complete the required application fields.', 'error')
      return
    }

    setSubmitting(true)

    window.setTimeout(() => {
      try {
        const existing = JSON.parse(localStorage.getItem(APPLICATION_STORAGE_KEY) || '[]')
        const application = {
          id: `${position.id}-${Date.now()}`,
          positionId: position.id,
          positionTitle: position.title,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          portfolioUrl: form.portfolioUrl.trim(),
          motivation: form.motivation.trim(),
          submittedAt: new Date().toISOString(),
          contact: position.contact,
        }

        localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify([application, ...existing]))
        setSubmitted(true)
        setForm((current) => ({ ...current, portfolioUrl: '', motivation: '' }))
        showSnackbar('Application draft saved successfully.', 'success')
      } catch {
        showSnackbar('Unable to save your application right now.', 'error')
      } finally {
        setSubmitting(false)
      }
    }, 900)
  }

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
      <Navbar currentPage="positions" />

      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(circle at 14% 10%, ${tone.haze} 0%, transparent 34%), radial-gradient(circle at 86% 10%, ${locationStyle.glow} 0%, transparent 26%), linear-gradient(180deg, ${isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(3,8,6,0.9)'} 0%, ${isDayMode ? 'rgba(255,255,255,0.98)' : 'rgba(2,5,4,0.98)'} 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.4 : 0.16,
            backgroundImage: isDayMode 
              ? `linear-gradient(${palette.borderPrimary} 1px, transparent 1px), linear-gradient(90deg, ${palette.borderPrimary} 1px, transparent 1px)` 
              : 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 20%, black 28%, transparent 88%)',
          }}
        />
      </div>

      <main className="relative z-10 flex-grow w-full pt-32 pb-24">
        <div className="px-6 md:px-12 lg:px-20 xl:px-28">
          <section
            className="relative overflow-hidden rounded-[38px] p-7 md:p-10 xl:p-12"
            style={{ 
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))' : 'linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))',
              boxShadow: isDayMode ? palette.shadowCard : `0 0 0 1px rgba(255,255,255,0.02) inset, 0 30px 120px rgba(0,0,0,0.46), 0 0 80px ${tone.glow}` 
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent 0%, ${tone.edge} 30%, ${isDayMode ? palette.accentPrimary : 'rgba(255,255,255,0.45)'} 50%, ${tone.edge} 70%, transparent 100%)` }}
            />
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: tone.glow }} />
            <div className="absolute bottom-0 left-0 h-44 w-60 rounded-full blur-3xl" style={{ background: locationStyle.glow }} />

            <div className="relative z-10 grid gap-10 xl:grid-cols-[1.45fr_0.9fr] xl:items-start">
              <div>
                <Link
                  to="/positions"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] no-underline transition-all hover:brightness-110"
                  style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textSecondary }}
                >
                  <ArrowLeft size={14} />
                  Back to positions
                </Link>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] ${typeStyles[position.type] || typeStyles.Other}`}>
                    {position.type || 'Opportunity'}
                  </span>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${locationStyle.bg}`}>
                    <span className={`h-2 w-2 rounded-full ${locationStyle.dot}`} />
                    {position.location || 'Flexible'}
                  </span>
                </div>

                <h1
                  className="mt-7 max-w-5xl text-4xl font-bold leading-[0.9] md:text-6xl xl:text-[5.15rem]"
                  style={{ fontFamily: "'Syne', sans-serif", textShadow: isDayMode ? 'none' : '0 0 40px rgba(16,185,129,0.08)', color: palette.textPrimary }}
                >
                  {position.title}
                </h1>

                <p className="mt-7 max-w-4xl text-base leading-8 md:text-lg xl:text-[1.15rem]" style={{ color: palette.textSecondary }}>
                  {position.description || 'A carefully designed opening for builders, researchers, and operators who want to contribute to work that actually matters.'}
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Briefcase size={15} />
                      Role type
                    </div>
                    <div className="mt-4 text-xl font-semibold md:text-2xl" style={{ color: palette.textPrimary }}>{position.type || 'Open role'}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <MapPin size={15} />
                      Work mode
                    </div>
                    <div className="mt-4 text-xl font-semibold md:text-2xl" style={{ color: palette.textPrimary }}>{position.location || 'Flexible'}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Clock size={15} />
                      Deadline
                    </div>
                    <div className="mt-4 text-lg font-semibold leading-7" style={{ color: palette.textPrimary }}>{deadline.closed ? 'Applications closed' : deadline.full}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Mail size={15} />
                      Contact point
                    </div>
                    <div className="mt-4 break-all text-lg font-semibold leading-7" style={{ color: palette.textPrimary }}>{position.contact || 'Unavailable'}</div>
                  </div>
                </div>
              </div>

              <aside className="relative overflow-hidden rounded-[34px] p-6 md:p-7 xl:sticky xl:top-28" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,249,0.8))' : 'linear-gradient(180deg,rgba(5,10,8,0.94),rgba(4,8,7,0.72))', boxShadow: isDayMode ? palette.shadowCard : '0 20px 80px rgba(0,0,0,0.38)' }}>
                <div className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tone.edge}, transparent)` }} />

                <div className="rounded-[30px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary }}>Apply window</div>
                      <div className="mt-3 text-4xl font-bold leading-none" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                        {deadline.closed ? 'Closed' : deadline.label}
                      </div>
                    </div>
                    <div className="rounded-2xl px-4 py-2 text-right" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.accentDark }}>Status</div>
                      <div className={`mt-1 text-base font-semibold ${deadline.closed ? 'opacity-50' : deadline.urgent ? 'text-amber-500' : ''}`} style={{ color: deadline.closed ? palette.textSecondary : deadline.urgent ? (isDayMode ? '#d97706' : '#fcd34d') : palette.textPrimary }}>
                        {deadline.closed ? 'Closed' : deadline.urgent ? 'Priority' : 'Open'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 h-px" style={{ backgroundColor: palette.borderPrimary }} />

                  <div className="mt-6 grid gap-3">
                    <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <Briefcase size={16} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>Role fit</div>
                        <div className="mt-1 text-sm font-semibold" style={{ color: palette.textPrimary }}>{position.type || 'Open role'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <MapPin size={16} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>Work setup</div>
                        <div className="mt-1 text-sm font-semibold" style={{ color: palette.textPrimary }}>{position.location || 'Flexible'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <Mail size={16} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>Direct line</div>
                        <div className="mt-1 break-all text-sm font-semibold leading-6" style={{ color: palette.textSecondary }}>{position.contact || 'Unavailable'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[30px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.cardBg }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.textMuted }}>Fast actions</div>
                  <h2 className="mt-3 text-2xl font-semibold" style={{ color: palette.textPrimary }}>Apply your way</h2>

                  <div className="mt-5 grid gap-3">
                    <a
                      href={contactHref}
                      target={isExternalLink(position.contact) ? '_blank' : undefined}
                      rel={isExternalLink(position.contact) ? 'noreferrer' : undefined}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold no-underline transition-all hover:brightness-110"
                      style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}
                    >
                      {isExternalLink(position.contact) ? <ExternalLink size={16} /> : <Mail size={16} />}
                      {isExternalLink(position.contact) ? 'Open application link' : 'Email this role'}
                    </a>
                    <a
                      href="#apply-panel"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold no-underline transition-all hover:brightness-110"
                      style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textSecondary }}
                    >
                      Start quick application
                      <ArrowUpRight size={16} />
                    </a>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-8 grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="overflow-hidden rounded-[34px] p-7 md:p-10" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))' : 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))', boxShadow: isDayMode ? palette.shadowCard : '0 20px 80px rgba(0,0,0,0.34)' }}>
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>
                <Sparkles size={15} />
                Role overview
              </div>
              <h2 className="mt-5 text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                A role built for people who want to matter on day one.
              </h2>
              <div className="mt-6 space-y-6 text-[1.02rem] leading-8" style={{ color: palette.textSecondary }}>
                <p>
                  {position.description || 'This opportunity is shaped for candidates who want substance, ownership, and a real contribution path.'}
                </p>
                <p>
                  The ideal applicant is not just qualified on paper. They bring energy, signal, and the ability to move good work forward without unnecessary noise. If that sounds like you, this page is your launch point.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {roleNotes.map((note, index) => (
                  <div key={index} className="rounded-[26px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.accentPrimary }}>0{index + 1}</div>
                    <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[34px] p-7 md:p-8" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))' : 'linear-gradient(180deg,rgba(7,12,10,0.95),rgba(4,8,7,0.72))', boxShadow: isDayMode ? palette.shadowCard : '0 20px 80px rgba(0,0,0,0.34)' }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Requirements cloud</div>
              <h2 className="mt-5 text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                What will make you stand out.
              </h2>

              {requirements.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {requirements.map((requirement, index) => (
                    <div key={index} className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textSecondary }}>
                      <CheckCircle2 size={14} style={{ color: palette.accentPrimary }} />
                      {requirement}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-base leading-8" style={{ color: palette.textMuted }}>No formal requirement list was provided for this role.</p>
              )}

              <div className="mt-7 space-y-3">
                {[
                  { label: 'Deadline', value: deadline.closed ? 'Applications closed' : deadline.full },
                  { label: 'Location', value: position.location || 'Flexible' },
                  { label: 'Type', value: position.type || 'Opportunity' },
                  { label: 'Contact', value: position.contact || 'Unavailable' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-5 rounded-2xl px-4 py-3.5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>{item.label}</span>
                    <span className="max-w-[65%] break-words text-right text-sm font-semibold leading-6" style={{ color: palette.textPrimary }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="apply-panel" className="mt-8 overflow-hidden rounded-[34px] p-7 md:p-10" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))' : 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', boxShadow: isDayMode ? palette.shadowCard : '0 20px 80px rgba(0,0,0,0.34)' }}>
            <div className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Application cockpit</div>
                <h2 className="mt-4 text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                  Apply with speed, clarity, and signal.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8" style={{ color: palette.textSecondary }}>
                  This quick-apply form saves your application draft locally and lets you route the final handoff through the contact method provided by the role owner. It feels fast, clean, and friction-light.
                </p>

                <div className="mt-6 rounded-[28px] p-5" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                  <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.accentDark }}>Best practice</div>
                  <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                    Keep your motivation tight, specific, and relevant to the role. Show evidence of fit, not just enthusiasm.
                  </p>
                </div>

                {submitted && (
                  <div className="mt-5 rounded-[24px] px-4 py-4 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    Your application draft has been saved. You can now send it through the direct contact channel too.
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="rounded-[30px] p-5 md:p-6" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.cardBg }}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Full name *</label>
                    <div className={`mt-2 rounded-2xl border transition-colors ${errors.fullName ? 'border-red-500' : ''}`} style={{ backgroundColor: palette.bgSecondary, borderColor: errors.fullName ? '#ef4444' : palette.borderPrimary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <User size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={form.fullName}
                          onChange={(event) => updateField('fullName', event.target.value)}
                          placeholder="Your full name"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                    {errors.fullName && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Email address *</label>
                    <div className={`mt-2 rounded-2xl border transition-colors ${errors.email ? 'border-red-500' : ''}`} style={{ backgroundColor: palette.bgSecondary, borderColor: errors.email ? '#ef4444' : palette.borderPrimary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Mail size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(event) => updateField('email', event.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                    {errors.email && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{errors.email}</p>}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Portfolio / LinkedIn / Resume URL</label>
                  <div className="mt-2 rounded-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <ExternalLink size={16} style={{ color: palette.accentPrimary }} />
                      <input
                        type="text"
                        value={form.portfolioUrl}
                        onChange={(event) => updateField('portfolioUrl', event.target.value)}
                        placeholder="https://portfolio.example.com"
                        className="w-full bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Why are you a fit? *</label>
                  <div className={`mt-2 rounded-2xl border transition-colors ${errors.motivation ? 'border-red-500' : ''}`} style={{ backgroundColor: palette.bgSecondary, borderColor: errors.motivation ? '#ef4444' : palette.borderPrimary }}>
                    <textarea
                      value={form.motivation}
                      onChange={(event) => updateField('motivation', event.target.value)}
                      placeholder="Share the experience, projects, and energy you would bring to this role."
                      rows={6}
                      className="w-full resize-none bg-transparent px-4 py-3.5 outline-none"
                      style={{ color: palette.textPrimary }}
                    />
                  </div>
                  {errors.motivation && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{errors.motivation}</p>}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting || deadline.closed}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                  >
                    <Send size={16} />
                    {deadline.closed ? 'Applications closed' : submitting ? 'Saving application...' : 'Save application draft'}
                  </button>
                  <a
                    href={contactHref}
                    target={isExternalLink(position.contact) ? '_blank' : undefined}
                    rel={isExternalLink(position.contact) ? 'noreferrer' : undefined}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold no-underline transition-all hover:brightness-110"
                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textSecondary }}
                  >
                    {isExternalLink(position.contact) ? 'Open external apply link' : 'Send by email'}
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </form>
            </div>
          </section>

          {relatedPositions.length > 0 && (
            <section className="mt-8 overflow-hidden rounded-[34px] p-7 md:p-10" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))' : 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', boxShadow: isDayMode ? palette.shadowCard : '0 20px 80px rgba(0,0,0,0.34)' }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>More openings</div>
                  <h2 className="mt-4 text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                    Keep exploring the frontier.
                  </h2>
                </div>
                <Link to="/positions" className="inline-flex items-center gap-2 text-sm font-semibold no-underline transition-colors hover:brightness-125" style={{ color: palette.accentPrimary }}>
                  Return to all positions
                  <ArrowUpRight size={16} />
                </Link>
              </div>

              <div className="mt-8 grid gap-5 xl:grid-cols-3">
                {relatedPositions.map((item, index) => {
                  const itemDeadline = parsePositionDeadline(item.deadline)
                  const typeStyles = getTypeStyles(isDayMode)
                  const locationVariants = getLocationVariants(isDayMode)
                  const loc = locationVariants[item.location] || { bg: isDayMode ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-white/[0.06] text-white/50 border-white/10', dot: isDayMode ? 'bg-gray-400' : 'bg-white/40' }

                  return (
                    <Link
                      key={item.id}
                      to={`/positions/${item.id}`}
                      className="group relative block overflow-hidden rounded-[28px] p-5 no-underline transition-all duration-300 hover:-translate-y-1.5"
                      style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.cardBg, animation: `detailFadeUp 0.55s ease-out ${0.1 + index * 0.08}s both` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold ${loc.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${loc.dot}`} />
                            {item.location}
                          </span>
                          <h3 className="mt-4 text-2xl font-semibold leading-tight transition-colors group-hover:brightness-125" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                            {item.title}
                          </h3>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${typeStyles[item.type] || typeStyles.Other}`}>
                          {item.type}
                        </span>
                      </div>
                      <p className="mt-4 line-clamp-3 text-sm leading-7" style={{ color: palette.textSecondary }}>{item.description}</p>
                      <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm" style={{ borderColor: palette.borderPrimary, color: palette.textMuted }}>
                        <span>{itemDeadline.closed ? 'Closed' : itemDeadline.label}</span>
                        <span className="inline-flex items-center gap-2 font-semibold transition-all group-hover:gap-3 group-hover:brightness-125" style={{ color: palette.accentPrimary }}>
                          Open role
                          <ArrowUpRight size={15} />
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>

      <style>{`
        @keyframes detailFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
