import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Calendar, Clock, ArrowUpRight, MapPin, Sparkles, Users } from 'lucide-react'

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
import {
  formatEventTime,
  getRegistrationState,
  getStoredEvents,
  parseEventDate,
} from '../utils/eventStore'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

const getDynamicTypeStyles = (type, isDayMode, palette) => {
  if (type === 'Workshop') return isDayMode ? { bg: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'rgba(99,102,241,0.3)', shadow: '0 0 12px rgba(99,102,241,0.1)' } : { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: 'rgba(99,102,241,0.3)', shadow: '0 0 12px rgba(99,102,241,0.08)' }
  if (type === 'Seminar') return isDayMode ? { bg: 'rgba(16,185,129,0.1)', color: '#059669', border: 'rgba(16,185,129,0.3)', shadow: '0 0 12px rgba(16,185,129,0.1)' } : { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)', shadow: '0 0 12px rgba(16,185,129,0.08)' }
  if (type === 'Webinar') return isDayMode ? { bg: 'rgba(6,182,212,0.1)', color: '#0891b2', border: 'rgba(6,182,212,0.3)', shadow: '0 0 12px rgba(6,182,212,0.1)' } : { bg: 'rgba(6,182,212,0.15)', color: '#67e8f9', border: 'rgba(6,182,212,0.3)', shadow: '0 0 12px rgba(6,182,212,0.08)' }
  if (type === 'Meetup') return isDayMode ? { bg: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'rgba(245,158,11,0.3)', shadow: '0 0 12px rgba(245,158,11,0.1)' } : { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: 'rgba(245,158,11,0.3)', shadow: '0 0 12px rgba(245,158,11,0.08)' }
  return { bg: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: palette.textSecondary, border: palette.borderPrimary, shadow: 'none' }
}

const getEventAccent = (type) => {
  if (type === 'Workshop') {
    return {
      glow: 'rgba(99,102,241,0.16)',
      haze: 'rgba(99,102,241,0.09)',
      edge: 'rgba(99,102,241,0.35)',
    }
  }

  if (type === 'Webinar') {
    return {
      glow: 'rgba(34,211,238,0.16)',
      haze: 'rgba(34,211,238,0.08)',
      edge: 'rgba(34,211,238,0.34)',
    }
  }

  if (type === 'Meetup') {
    return {
      glow: 'rgba(251,191,36,0.14)',
      haze: 'rgba(251,191,36,0.08)',
      edge: 'rgba(251,191,36,0.34)',
    }
  }

  return {
    glow: 'rgba(16,185,129,0.16)',
    haze: 'rgba(16,185,129,0.1)',
    edge: 'rgba(16,185,129,0.34)',
  }
}

const getDynamicStatusBadgeStyles = (badge, isDayMode, palette) => {
  if (badge === 'Closing Soon') {
    return isDayMode ? { border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.1)', color: '#d97706' } : { border: 'rgba(251,191,36,0.25)', bg: 'rgba(251,191,36,0.12)', color: '#fcd34d' }
  }

  if (badge === 'Closed') {
    return { border: palette.borderPrimary, bg: isDayMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', color: palette.textMuted }
  }

  return isDayMode ? { border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)', color: '#059669' } : { border: 'rgba(52,211,153,0.2)', bg: 'rgba(52,211,153,0.1)', color: '#6ee7b7' }
}

const isFutureEvent = (event) => {
  if (!event?.date) return true
  const timestamp = new Date(event.date).getTime()
  return Number.isNaN(timestamp) ? true : timestamp >= Date.now()
}

const EventsPage = () => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  const [events] = useState(() => getStoredEvents())
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()),
    [events],
  )

  const featuredEvent = sortedEvents.find(isFutureEvent) || sortedEvents[0] || null
  const liveCount = sortedEvents.filter(isFutureEvent).length
  const openRegistrations = sortedEvents.filter((event) => getRegistrationState(event.deadline).badge !== 'Closed').length
  const eventTypesCount = new Set(sortedEvents.map((event) => event.type).filter(Boolean)).size

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
      <Navbar currentPage="events" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.6 : 0.4, background: isDayMode ? 'radial-gradient(circle at 18% 0%, rgba(46,197,138,0.16) 0%, transparent 42%)' : 'radial-gradient(circle at 18% 0%, rgba(16,185,129,0.18) 0%, transparent 42%)', y: glowY1 }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.26 : 0.2, background: isDayMode ? 'radial-gradient(circle at 100% 0%, rgba(255,224,163,0.22) 0%, transparent 38%)' : 'radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12) 0%, transparent 38%)', y: glowY2 }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.12 : 0.14,
            backgroundImage: isDayMode ? 'linear-gradient(rgba(10,22,32,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(10,22,32,0.035) 1px, transparent 1px)' : 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 20%, black 24%, transparent 88%)',
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
            <div className="absolute -right-12 top-8 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(255,224,163,0.2)' : 'rgba(6,182,212,0.1)' }} />

            <div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary, boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.45)' : '0 0 18px rgba(16,185,129,0.8)' }} />
                    Community Events
                  </span>
                </div>

                <h1
                  className="max-w-5xl text-5xl font-bold leading-[0.9] md:text-6xl xl:text-[5.35rem]"
                  style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary, textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.6)' : '0 0 40px rgba(16,185,129,0.08)' }}
                >
                  Where quantum minds gather,
                  <br />
                  <span style={{ color: palette.accentPrimary }}>build, and spark momentum.</span>
                </h1>

                <p className="mt-7 max-w-3xl text-base leading-8 md:text-lg xl:text-[1.12rem]" style={{ color: palette.textSecondary }}>
                  Explore workshops, seminars, webinars, and community meetups designed to feel more like high-signal launchpads than ordinary listings.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/events/new"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                    style={{ border: `1px solid ${isDayMode ? 'transparent' : palette.btnPrimaryBorder}`, backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText, boxShadow: isDayMode ? '0 20px 45px rgba(30,158,107,0.18)' : 'none' }}
                  >
                    Launch an event
                    <ArrowUpRight size={16} />
                  </Link>
                  <a
                    href="#event-grid"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                    style={{ border: `1px solid ${palette.btnSecondaryBorder}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                  >
                    Browse the grid
                    <ArrowUpRight size={16} />
                  </a>
                </div>

                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    { label: 'Live opportunities', value: String(liveCount).padStart(2, '0') },
                    { label: 'Open registrations', value: String(openRegistrations).padStart(2, '0') },
                    { label: 'Event formats', value: String(eventTypesCount).padStart(2, '0') },
                  ].map((item) => (
                    <motion.div key={item.label} variants={itemVariants} className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.2)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>{item.label}</div>
                      <div className="mt-4 text-4xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>{item.value}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.section>

          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.02)' }}>
                <Calendar size={32} style={{ color: palette.textMuted }} />
              </div>
              <h3 className="mb-2 text-2xl font-semibold" style={{ color: palette.textSecondary }}>No events yet</h3>
              <p className="max-w-md text-sm" style={{ color: palette.textMuted }}>Events appear here once the community creates them.</p>
            </motion.div>
          ) : (
            <section id="event-grid" className="mt-10">
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Event grid</div>
                  <h2 className="mt-4 text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                    Pick the room you want to enter next.
                  </h2>
                </div>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 md:gap-8"
              >
                {sortedEvents.map((event, index) => {
                const dateInfo = parseEventDate(event.date)
                const deadline = getRegistrationState(event.deadline)
                const accent = getEventAccent(event.type)
                const typeStyle = getDynamicTypeStyles(event.type, isDayMode, palette)
                const badgeStyle = getDynamicStatusBadgeStyles(deadline.badge, isDayMode, palette)

                return (
                  <motion.div key={event.id} variants={itemVariants}>
                  <Link
                    to={`/events/${event.id}`}
                    className="group relative block overflow-hidden rounded-[32px] no-underline backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_60px_rgba(16,185,129,0.06),0_30px_80px_-20px_rgba(0,0,0,0.5)]"
                    style={{
                      border: `1px solid ${palette.borderPrimary}`,
                      background: isDayMode ? 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.4))' : 'linear-gradient(to bottom right, rgba(255,255,255,0.03), rgba(255,255,255,0.015), transparent)',
                      boxShadow: isDayMode ? '0 10px 40px rgba(15,23,42,0.05)' : 'none',
                    }}
                    aria-label={`View details for ${event.title}`}
                  >
                    <div className="absolute inset-0 rounded-[32px] opacity-0 transition-opacity duration-700 group-hover:opacity-100 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent.haze} 0%, transparent 70%)` }} />
                    <div className="absolute inset-x-8 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${accent.edge}, transparent)` }} />
                    <div className="absolute right-0 top-0 h-28 w-28 rounded-full blur-3xl" style={{ background: accent.glow }} />

                    <div className="relative z-10 p-7 md:p-8 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-6 gap-4">
                        <div className="flex flex-col items-center rounded-[24px] px-4 py-3 min-w-[92px]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.04)', boxShadow: isDayMode ? '0 4px 12px rgba(15,23,42,0.04)' : '0 0 20px rgba(0,0,0,0.2)' }}>
                          <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: palette.accentPrimary }}>{dateInfo.month}</span>
                          <span className="mt-1 text-3xl font-bold leading-none" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>{dateInfo.day}</span>
                          <span className="mt-1 text-[10px]" style={{ color: palette.textMuted }}>{dateInfo.weekday}</span>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className="inline-flex items-center rounded-full border px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                            style={{ backgroundColor: typeStyle.bg, color: typeStyle.color, borderColor: typeStyle.border, boxShadow: typeStyle.shadow }}
                          >
                            {event.type}
                          </span>
                          <span
                            className="inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                            style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color, borderColor: badgeStyle.border }}
                          >
                            {deadline.badge}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-2xl md:text-[2rem] mb-3 leading-tight font-bold transition-colors duration-300 group-hover:text-emerald-400" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                        {event.title}
                      </h3>

                      {event.description && (
                        <p className="text-sm leading-7 mb-6 flex-1 line-clamp-3" style={{ color: palette.textSecondary }}>
                          {event.description}
                        </p>
                      )}

                      <div className="space-y-3 mb-6 pt-5" style={{ borderTop: `1px solid ${palette.borderPrimary}` }}>
                        <div className="flex items-center gap-3 text-sm" style={{ color: palette.textMuted }}>
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.accentSoft }}>
                            <MapPin size={13} style={{ color: palette.accentPrimary }} />
                          </div>
                          <span className="truncate">{event.location}</span>
                        </div>
                        {event.audience && (
                          <div className="flex items-center gap-3 text-sm" style={{ color: palette.textMuted }}>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.accentSoft }}>
                              <Users size={13} style={{ color: palette.accentPrimary }} />
                            </div>
                            <span className="truncate">{event.audience}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm" style={{ color: palette.textMuted }}>
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.accentSoft }}>
                            <Clock size={13} style={{ color: palette.accentPrimary }} />
                          </div>
                          <span className="truncate">{formatEventTime(event.date)}</span>
                        </div>
                      </div>

                      <div className="mt-auto pt-5" style={{ borderTop: `1px solid ${palette.borderPrimary}` }}>
                        {event.deadline && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: palette.textMuted }}>
                            <Calendar size={12} />
                            Reg closes {parseEventDate(event.deadline).full}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <span className="text-sm font-semibold" style={{ color: palette.textSecondary }}>{deadline.label}</span>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold transition-all duration-300 group-hover:gap-2" style={{ color: palette.accentPrimary }}>
                            Details
                            <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  </motion.div>
                )
              })}
              </motion.div>
            </section>
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

export default EventsPage
