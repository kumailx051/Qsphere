import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, BookOpen, Briefcase, Clock, Mail, MapPin, Sparkles } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const heroVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
}
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { parsePositionDeadline, splitPositionRequirements } from '../utils/positionStore'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import { fetchPositions } from '../utils/opportunitiesApi'

const getDynamicTypeStyles = (type, isDayMode, palette) => {
  if (type === 'Research Assistant') return isDayMode ? { bg: 'rgba(46,197,138,0.08)', color: '#0f9f6e', border: 'rgba(46,197,138,0.24)' } : { bg: 'rgba(46,197,138,0.14)', color: '#8af0c5', border: 'rgba(46,197,138,0.28)' }
  if (type === 'Intern') return isDayMode ? { bg: 'rgba(20,184,166,0.08)', color: '#0f8f82', border: 'rgba(20,184,166,0.24)' } : { bg: 'rgba(20,184,166,0.14)', color: '#7be7dc', border: 'rgba(20,184,166,0.28)' }
  if (type === 'Collaborator') return isDayMode ? { bg: 'rgba(34,197,94,0.07)', color: '#167a49', border: 'rgba(34,197,94,0.22)' } : { bg: 'rgba(34,197,94,0.13)', color: '#9be7b6', border: 'rgba(34,197,94,0.24)' }
  if (type === 'Postdoc') return isDayMode ? { bg: 'rgba(15,118,110,0.08)', color: '#11655e', border: 'rgba(15,118,110,0.22)' } : { bg: 'rgba(15,118,110,0.15)', color: '#7fddd3', border: 'rgba(15,118,110,0.26)' }
  return { bg: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: palette.textSecondary, border: palette.borderPrimary }
}

const getDynamicLocationStyles = (location, isDayMode, palette) => {
  if (location === 'Remote') return isDayMode ? { bg: 'rgba(6,182,212,0.05)', color: '#0d8aa6', border: 'rgba(6,182,212,0.16)', dot: '#14b8a6', glow: 'rgba(20,184,166,0.08)' } : { bg: 'rgba(20,184,166,0.09)', color: '#7be7dc', border: 'rgba(20,184,166,0.18)', dot: '#5eead4', glow: 'rgba(20,184,166,0.12)' }
  if (location === 'Hybrid') return isDayMode ? { bg: 'rgba(46,197,138,0.05)', color: '#14845d', border: 'rgba(46,197,138,0.16)', dot: '#2ec58a', glow: 'rgba(46,197,138,0.08)' } : { bg: 'rgba(46,197,138,0.09)', color: '#8af0c5', border: 'rgba(46,197,138,0.18)', dot: '#6ee7b7', glow: 'rgba(46,197,138,0.12)' }
  if (location === 'On-site') return isDayMode ? { bg: 'rgba(22,163,74,0.05)', color: '#19764a', border: 'rgba(22,163,74,0.16)', dot: '#22c55e', glow: 'rgba(22,163,74,0.08)' } : { bg: 'rgba(22,163,74,0.10)', color: '#9be7b6', border: 'rgba(22,163,74,0.18)', dot: '#4ade80', glow: 'rgba(22,163,74,0.12)' }
  return { bg: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: palette.textSecondary, border: palette.borderPrimary, dot: palette.textMuted, glow: 'rgba(0,0,0,0)' }
}

const getPositionAccent = (type) => {
  if (type === 'Intern') {
    return {
      glow: 'rgba(34,211,238,0.16)',
      haze: 'rgba(34,211,238,0.08)',
      edge: 'rgba(34,211,238,0.34)',
    }
  }

  if (type === 'Collaborator') {
    return {
      glow: 'rgba(99,102,241,0.16)',
      haze: 'rgba(99,102,241,0.08)',
      edge: 'rgba(99,102,241,0.34)',
    }
  }

  if (type === 'Postdoc') {
    return {
      glow: 'rgba(251,191,36,0.14)',
      haze: 'rgba(251,191,36,0.08)',
      edge: 'rgba(251,191,36,0.34)',
    }
  }

  return {
    glow: 'rgba(16,185,129,0.16)',
    haze: 'rgba(16,185,129,0.09)',
    edge: 'rgba(16,185,129,0.34)',
  }
}

const getDynamicStatusBadgeStyles = (deadline, isDayMode, palette) => {
  if (deadline === 'Expired') {
    return {
      border: 'rgba(239,68,68,0.24)',
      bg: 'rgba(239,68,68,0.08)',
      color: '#dc2626',
    }
  }

  if (deadline.closed) {
    return { border: palette.borderPrimary, bg: isDayMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', color: palette.textMuted }
  }

  if (deadline.urgent) {
    return isDayMode ? { border: 'rgba(20,184,166,0.24)', bg: 'rgba(20,184,166,0.08)', color: '#0f8f82' } : { border: 'rgba(20,184,166,0.24)', bg: 'rgba(20,184,166,0.14)', color: '#7be7dc' }
  }

  return isDayMode ? { border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)', color: '#059669' } : { border: 'rgba(52,211,153,0.2)', bg: 'rgba(52,211,153,0.1)', color: '#6ee7b7' }
}

const getDeadlineTimestamp = (position) => {
  if (!position?.deadline) return Number.MAX_SAFE_INTEGER
  const timestamp = new Date(position.deadline).getTime()
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

const isPositionArchived = (position) => parsePositionDeadline(position?.deadline).closed

const scrollToPositionGrid = () => {
  const section = document.getElementById('position-grid')
  if (!section) return

  const top = section.getBoundingClientRect().top + window.scrollY - 120
  window.scrollTo({ top, behavior: 'smooth' })
}

const PositionsPage = () => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const profile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('qsphere_onboarding_profile') || '{}') } catch { return {} }
  }, [])
  const isStudent = String(profile.role || '').toLowerCase() === 'student'

  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [positionTab, setPositionTab] = useState('active')

  useEffect(() => {
    let active = true

    const loadPositions = async () => {
      try {
        const data = await fetchPositions()
        if (active) {
          setPositions(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Failed to load positions:', error)
        if (active) {
          setPositions([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPositions()

    return () => {
      active = false
    }
  }, [])

  const activePositions = useMemo(
    () => positions.filter((position) => !isPositionArchived(position)),
    [positions],
  )

  const archivedPositions = useMemo(
    () => positions.filter((position) => isPositionArchived(position)),
    [positions],
  )

  const sortedActivePositions = useMemo(
    () => [...activePositions].sort((a, b) => getDeadlineTimestamp(a) - getDeadlineTimestamp(b)),
    [activePositions],
  )

  const sortedArchivedPositions = useMemo(
    () => [...archivedPositions].sort((a, b) => getDeadlineTimestamp(b) - getDeadlineTimestamp(a)),
    [archivedPositions],
  )

  const displayedPositions = positionTab === 'archived' ? sortedArchivedPositions : sortedActivePositions

  const openCount = sortedActivePositions.length
  const urgentCount = sortedActivePositions.filter((position) => parsePositionDeadline(position.deadline).urgent).length
  const archivedCount = sortedArchivedPositions.length

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
      <Navbar currentPage="positions" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.6 : 0.4, background: isDayMode ? 'radial-gradient(circle at 18% 0%, rgba(46,197,138,0.16) 0%, transparent 42%)' : 'radial-gradient(circle at 18% 0%, rgba(16,185,129,0.18) 0%, transparent 42%)', y: glowY1 }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.26 : 0.2, background: isDayMode ? 'radial-gradient(circle at 100% 0%, rgba(255,224,163,0.22) 0%, transparent 36%)' : 'radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12) 0%, transparent 36%)', y: glowY2 }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.12 : 0.14,
            backgroundImage: isDayMode ? 'linear-gradient(rgba(10,22,32,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(10,22,32,0.035) 1px, transparent 1px)' : 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 18%, black 24%, transparent 88%)',
          }}
        />
      </div>

      <main className="relative z-10 flex-grow w-full pt-32 pb-24">
        <div className="px-6 md:px-12 lg:px-20 xl:px-28">
          <motion.section
            variants={heroVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="relative overflow-hidden rounded-[38px] p-7 md:p-10 xl:p-12"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,247,245,0.88))' : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: isDayMode ? 'linear-gradient(to right, transparent, rgba(46,197,138,0.55), transparent)' : 'linear-gradient(to right, transparent, rgba(110,231,183,0.5), transparent)' }} />
            <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.12)' : 'rgba(16,185,129,0.12)' }} />
            <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(6,182,212,0.12)' : 'rgba(6,182,212,0.1)' }} />

            <div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary, boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.45)' : '0 0 18px rgba(16,185,129,0.8)' }} />
                    Careers and Research
                  </span>
                </div>

                <h1
                  className="type-heading-soft max-w-3xl xl:max-w-[54rem]"
                  style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary, textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.6)' : '0 0 40px rgba(16,185,129,0.08)' }}
                >
                  Open positions with
                  <br />
                  <span style={{ color: palette.accentPrimary }}>real frontier energy.</span>
                </h1>

                <p className="mt-7 max-w-3xl text-base leading-8" style={{ color: palette.textSecondary }}>
                  Explore research, engineering, and collaboration openings that feel less like static listings and more like serious invitations into the quantum frontier.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  {!isStudent ? (
                    <Link
                      to="/positions/new"
                      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                      style={{ border: `1px solid ${isDayMode ? 'transparent' : palette.btnPrimaryBorder}`, backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText, boxShadow: isDayMode ? '0 20px 45px rgba(30,158,107,0.18)' : 'none' }}
                    >
                      Post an opening
                      <ArrowUpRight size={16} />
                    </Link>
                  ) : null}
                  <a
                    href="#position-grid"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                    style={{ border: `1px solid ${palette.btnSecondaryBorder}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                  >
                    Browse roles
                    <ArrowUpRight size={16} />
                  </a>
                </div>

                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    { key: 'active', label: 'Open roles', value: String(openCount).padStart(2, '0') },
                    { key: 'active', label: 'Urgent closes', value: String(urgentCount).padStart(2, '0') },
                    { key: 'archived', label: 'Archived roles', value: String(archivedCount).padStart(2, '0') },
                  ].map((item) => {
                    const selected = positionTab === item.key

                    return (
                    <motion.button
                      key={item.label}
                      variants={itemVariants}
                      type="button"
                      onClick={() => {
                        setPositionTab(item.key)
                        window.requestAnimationFrame(() => scrollToPositionGrid())
                      }}
                      className="rounded-[28px] p-5 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1"
                      style={{
                        border: `1px solid ${selected ? palette.accentBorder : palette.borderPrimary}`,
                        backgroundColor: selected
                          ? palette.accentSoft
                          : isDayMode
                            ? 'rgba(255,255,255,0.72)'
                            : 'rgba(0,0,0,0.2)',
                        boxShadow: selected
                          ? (isDayMode ? '0 18px 40px rgba(46,197,138,0.12)' : '0 18px 40px rgba(16,185,129,0.10)')
                          : 'none',
                      }}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: selected ? palette.accentPrimary : isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>{item.label}</div>
                      <div className="type-statValue mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                        {item.value}
                      </div>
                    </motion.button>
                  )})}
                </motion.div>
              </div>
            </div>
          </motion.section>

          {!loading && displayedPositions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.cardBg }}>
                <Briefcase size={32} style={{ color: palette.textMuted }} />
              </div>
              <h3 className="type-statValue mb-2" style={{ fontFamily: 'var(--font-heading)', color: palette.textSecondary }}>
                {positionTab === 'archived' ? 'No archived positions yet' : 'No open positions right now'}
              </h3>
              <p className="max-w-md text-sm" style={{ color: palette.textMuted }}>
                {positionTab === 'archived'
                  ? 'Once a role expires, it will move into the archived tab here.'
                  : 'Switch to the archived tab to review expired openings, or wait for new roles to appear.'}
              </p>
            </motion.div>
          ) : (
            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              id="position-grid"
              className="mt-10"
            >
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Openings grid</div>
                  <h2 className="type-sectionHeading mt-4 max-w-3xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                    Choose the role you want to step into next.
                  </h2>
                </div>


              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8"
              >
                {displayedPositions.map((pos) => {
                 const deadline = parsePositionDeadline(pos.deadline)
                 const archived = isPositionArchived(pos)
                 const locStyle = getDynamicLocationStyles(pos.location, isDayMode, palette)
                 const typeStyle = getDynamicTypeStyles(pos.type, isDayMode, palette)
                 const accent = getPositionAccent(pos.type)
                 const statusStyle = getDynamicStatusBadgeStyles(archived ? 'Expired' : deadline, isDayMode, palette)

                 return (
                   <motion.div key={pos.id} variants={itemVariants}>
                   <Link
                     to={`/positions/${pos.id}`}
                     className="group relative block overflow-hidden rounded-[32px] no-underline backdrop-blur-xl transition-all duration-500 hover:-translate-y-2"
                     style={{
                       border: `1px solid ${palette.borderPrimary}`,
                       background: isDayMode ? 'linear-gradient(to bottom right, rgba(255,255,255,0.95), rgba(248,250,249,0.75))' : 'linear-gradient(to bottom right, rgba(255,255,255,0.03), rgba(255,255,255,0.015), transparent)',
                       boxShadow: palette.shadowCard
                     }}
                     aria-label={`View and apply for ${pos.title}`}
                   >
                    <div className="absolute inset-0 rounded-[32px] opacity-0 transition-opacity duration-700 group-hover:opacity-100 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${isDayMode ? accent.haze.replace('0.08', '0.04').replace('0.09', '0.04') : accent.haze} 0%, transparent 70%)` }} />
                    <div className="absolute inset-x-8 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${accent.edge}, transparent)` }} />
                    <div className="absolute right-0 top-0 h-28 w-28 rounded-full blur-3xl" style={{ background: locStyle.glow }} />
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full transition-all duration-500 group-hover:top-3 group-hover:bottom-3" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0)' : 'rgba(52,211,153,0)', borderRight: '3px solid transparent' }} />
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full transition-all duration-500 group-hover:top-3 group-hover:bottom-3 opacity-0 group-hover:opacity-100" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.6)' : 'rgba(52,211,153,0.4)' }} />

                     <div className="relative z-10 p-7 md:p-8 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="inline-flex items-center rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${typeStyle.border}`, backgroundColor: typeStyle.bg, color: typeStyle.color }}>
                            {pos.type}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold" style={{ border: `1px solid ${locStyle.border}`, backgroundColor: locStyle.bg, color: locStyle.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: locStyle.dot }} />
                            {pos.location}
                          </span>
                        </div>
                        <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${statusStyle.border}`, backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                          {archived ? 'Expired' : deadline.closed ? 'Closed' : deadline.urgent ? 'Priority' : 'Open'}
                        </span>
                      </div>

                      <h3 className="type-cardHeading mb-3 transition-colors duration-300" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                        {pos.title}
                      </h3>

                      {pos.description && (
                        <p className="type-cardBody mb-5 flex-1 line-clamp-3" style={{ color: palette.textSecondary }}>
                          {pos.description}
                        </p>
                      )}

                      {pos.requirements && (
                        <div className="mb-6">
                          <div className="flex flex-wrap gap-2">
                            {splitPositionRequirements(pos.requirements).map((req, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors duration-300" style={{ border: `1px solid ${isDayMode ? 'rgba(46,197,138,0.14)' : 'rgba(46,197,138,0.12)'}`, backgroundColor: isDayMode ? 'rgba(46,197,138,0.04)' : 'rgba(46,197,138,0.06)', color: palette.textSecondary }}>
                                <BookOpen size={11} style={{ color: palette.accentPrimary, opacity: 0.7 }} />
                                {req.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 pt-5 mt-auto" style={{ borderTop: `1px solid ${palette.borderPrimary}` }}>
                        {pos.deadline && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isDayMode ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)', border: `1px solid ${isDayMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.15)'}` }}>
                              <Clock size={13} style={{ color: isDayMode ? '#059669' : 'rgba(52,211,153,0.6)' }} />
                            </div>
                            <span style={{ color: archived ? '#dc2626' : deadline.urgent ? (isDayMode ? '#d97706' : '#fcd34d') : deadline.closed ? palette.textMuted : palette.textSecondary, fontWeight: archived || deadline.urgent ? 600 : 400 }}>
                              {archived ? `Expired on ${deadline.full}` : deadline.closed ? 'Applications closed' : `Apply by ${deadline.label}`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isDayMode ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)', border: `1px solid ${isDayMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.15)'}` }}>
                            <Mail size={13} style={{ color: isDayMode ? '#059669' : 'rgba(52,211,153,0.6)' }} />
                          </div>
                          <span className="truncate" style={{ color: palette.textSecondary }}>{pos.contact}</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${palette.borderPrimary}` }}>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 group-hover:gap-2.5" style={{ color: palette.accentPrimary }}>
                          {archived ? 'View Archived Role' : 'Apply Now'}
                          <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                  </motion.div>
                )
              })}
              </motion.div>
            </motion.section>
          )}
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
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

export default PositionsPage
