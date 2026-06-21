import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  Copy,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import {
  formatEventFullDate,
  formatEventTime,
  getEventById,
  getRegistrationState,
  getStoredEvents,
  parseEventDate,
} from '../utils/eventStore'

const getTypeStyle = (type, isDayMode) => {
  if (type === 'Workshop') {
    return {
      borderColor: isDayMode ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.3)',
      backgroundColor: isDayMode ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.15)',
      color: isDayMode ? '#4338ca' : '#c4b5fd',
      boxShadow: isDayMode ? '0 0 18px rgba(99,102,241,0.08)' : '0 0 18px rgba(99,102,241,0.12)',
    }
  }

  if (type === 'Seminar') {
    return {
      borderColor: isDayMode ? 'rgba(46,197,138,0.2)' : 'rgba(16,185,129,0.3)',
      backgroundColor: isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.15)',
      color: isDayMode ? '#0e9660' : '#6ee7b7',
      boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.08)' : '0 0 18px rgba(16,185,129,0.12)',
    }
  }

  if (type === 'Webinar') {
    return {
      borderColor: isDayMode ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.3)',
      backgroundColor: isDayMode ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.15)',
      color: isDayMode ? '#0f766e' : '#67e8f9',
      boxShadow: isDayMode ? '0 0 18px rgba(6,182,212,0.08)' : '0 0 18px rgba(6,182,212,0.12)',
    }
  }

  if (type === 'Meetup') {
    return {
      borderColor: isDayMode ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.3)',
      backgroundColor: isDayMode ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.15)',
      color: isDayMode ? '#b45309' : '#fcd34d',
      boxShadow: isDayMode ? '0 0 18px rgba(245,158,11,0.08)' : '0 0 18px rgba(245,158,11,0.12)',
    }
  }

  return {
    borderColor: isDayMode ? '#E7E5E1' : 'rgba(255,255,255,0.10)',
    backgroundColor: isDayMode ? 'rgba(255,255,255,0.74)' : 'rgba(255,255,255,0.06)',
    color: isDayMode ? '#4E535C' : 'rgba(255,255,255,0.65)',
    boxShadow: 'none',
  }
}

const getEventTone = (type, isDayMode) => {
  if (type === 'Workshop') {
    return {
      edge: isDayMode ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.4)',
      glow: isDayMode ? 'rgba(99,102,241,0.09)' : 'rgba(99,102,241,0.18)',
      haze: isDayMode ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.15)',
    }
  }

  if (type === 'Webinar') {
    return {
      edge: isDayMode ? 'rgba(34,211,238,0.22)' : 'rgba(34,211,238,0.42)',
      glow: isDayMode ? 'rgba(34,211,238,0.08)' : 'rgba(34,211,238,0.16)',
      haze: isDayMode ? 'rgba(34,211,238,0.08)' : 'rgba(34,211,238,0.12)',
    }
  }

  if (type === 'Meetup') {
    return {
      edge: isDayMode ? 'rgba(251,191,36,0.24)' : 'rgba(251,191,36,0.38)',
      glow: isDayMode ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.14)',
      haze: isDayMode ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.12)',
    }
  }

  return {
    edge: isDayMode ? 'rgba(46,197,138,0.24)' : 'rgba(16,185,129,0.42)',
    glow: isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.16)',
    haze: isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.14)',
  }
}

const getExperienceNotes = (event) => {
  const tone = String(event.type || '').toLowerCase()

  if (tone === 'workshop') {
    return [
      'Hands-on sessions designed to turn concepts into working experiments.',
      'Mentor checkpoints help participants move from raw ideas to refined prototypes.',
      'Expect practical takeaways, collaboration energy, and real build momentum.',
    ]
  }

  if (tone === 'webinar') {
    return [
      'A focused digital experience built for clarity, learning, and clean knowledge transfer.',
      'Ideal for attendees who want a compact but high-signal deep dive into the subject.',
      'The session prioritizes sharp explanations, structured pacing, and strong conceptual flow.',
    ]
  }

  if (tone === 'meetup') {
    return [
      'A conversational setting for exchange, discovery, and community crossover.',
      'Perfect for connecting with people exploring similar problems from different angles.',
      'Expect a looser format, organic discussion, and strong networking value.',
    ]
  }

  return [
    'A flagship gathering shaped for ambitious minds tracking the next wave of quantum progress.',
    'The experience blends insight, discussion, and a strong shared sense of where the field is heading.',
    'Expect meaningful conversation, thoughtful pacing, and content worth staying present for.',
  ]
}

const buildCopyText = (event) => {
  return [
    event.title,
    `Type: ${event.type || 'Event'}`,
    `Date: ${formatEventFullDate(event.date)}`,
    `Time: ${formatEventTime(event.date)}`,
    `Location: ${event.location || 'To be announced'}`,
    `Audience: ${event.audience || 'Open community'}`,
    `Deadline: ${event.deadline ? parseEventDate(event.deadline).full : 'Open registration'}`,
    '',
    event.description || '',
  ].join('\n')
}

const getDeadlineToneStyle = (tone, isDayMode) => {
  if (tone === 'text-amber-300') return { color: isDayMode ? '#b45309' : '#fcd34d' }
  if (tone === 'text-white/40') return { color: isDayMode ? '#9CA0A8' : 'rgba(255,255,255,0.40)' }
  return { color: isDayMode ? '#0e9660' : '#6ee7b7' }
}

const EventDetailPage = () => {
  const { id } = useParams()
  const [copied, setCopied] = useState(false)
  const event = getEventById(id)
  const { theme } = useTheme()

  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const relatedEvents = useMemo(() => {
    if (!event) return []
    return getStoredEvents().filter((item) => item.id !== event.id).slice(0, 3)
  }, [event])

  if (!event) {
    return (
      <div
        className="relative"
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}
      >
        <Navbar currentPage="events" />

        <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-12 lg:px-20 xl:px-28">
          <div
            className="overflow-hidden rounded-[36px] p-10 md:p-16"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode
                ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))'
                : 'linear-gradient(to bottom right, rgba(255,255,255,0.04), rgba(255,255,255,0.02), transparent)',
              boxShadow: isDayMode ? '0 30px 120px rgba(15,23,42,0.08)' : '0 30px 120px rgba(0,0,0,0.45)',
            }}
          >
            <span
              className="inline-flex rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em]"
              style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}
            >
              Event Signal Lost
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[0.94] md:text-6xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
              That event is not available anymore.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 md:text-lg" style={{ color: palette.textSecondary }}>
              The event may have been removed, renamed, or never existed in local storage. Head back to the events grid and choose another live signal.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
                style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}
              >
                <ArrowLeft size={16} />
                Back to events
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  const tone = getEventTone(event.type, isDayMode)
  const dateInfo = parseEventDate(event.date)
  const deadlineInfo = getRegistrationState(event.deadline)
  const experienceNotes = getExperienceNotes(event)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText(event))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}
    >
      <Navbar currentPage="events" />

      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.82 : 0.7,
            background: isDayMode
              ? `radial-gradient(circle at 18% 12%, ${tone.haze} 0%, transparent 38%), radial-gradient(circle at 84% 8%, rgba(255,224,163,0.14) 0%, transparent 28%), linear-gradient(180deg, rgba(250,249,247,0.96) 0%, rgba(249,248,245,0.98) 100%)`
              : `radial-gradient(circle at 18% 12%, ${tone.haze} 0%, transparent 38%), radial-gradient(circle at 84% 8%, rgba(255,255,255,0.05) 0%, transparent 28%), linear-gradient(180deg, rgba(3,8,6,0.9) 0%, rgba(2,5,4,0.98) 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.12 : 0.18,
            backgroundImage: isDayMode
              ? 'linear-gradient(rgba(10,22,32,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(10,22,32,0.03) 1px, transparent 1px)'
              : 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '120px 120px',
            maskImage: 'radial-gradient(circle at 50% 25%, black 30%, transparent 90%)',
          }}
        />
      </div>

      <main className="relative z-10 w-full flex-grow pt-32 pb-24">
        <div className="px-6 md:px-12 lg:px-20 xl:px-28">
          <section
            className="relative overflow-hidden rounded-[38px] p-7 md:p-10 xl:p-12"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode
                ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))',
              boxShadow: isDayMode
                ? `0 0 0 1px rgba(255,255,255,0.5) inset, 0 30px 120px rgba(15,23,42,0.08), 0 0 80px ${tone.glow}`
                : `0 0 0 1px rgba(255,255,255,0.02) inset, 0 30px 120px rgba(0,0,0,0.46), 0 0 80px ${tone.glow}`,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent 0%, ${tone.edge} 30%, ${isDayMode ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.45)'} 50%, ${tone.edge} 70%, transparent 100%)` }}
            />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: tone.glow }} />
            <div className="absolute bottom-0 left-0 h-40 w-56 rounded-full blur-3xl" style={{ background: isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.08)' }} />

            <div className="relative z-10 grid gap-10 xl:grid-cols-[1.45fr_0.9fr] xl:items-start">
              <div>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] no-underline transition-all"
                  style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.03)', color: palette.textSecondary }}
                >
                  <ArrowLeft size={14} />
                  Back to events
                </Link>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <span
                    className="inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em]"
                    style={getTypeStyle(event.type, isDayMode)}
                  >
                    {event.type || 'Event'}
                  </span>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.03)', color: palette.textMuted }}
                  >
                    <Sparkles size={14} style={{ color: palette.accentPrimary }} />
                    Quantum community signal
                  </span>
                </div>

                <h1
                  className="mt-7 max-w-5xl text-4xl font-bold leading-[0.9] md:text-6xl xl:text-[5.35rem]"
                  style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary, textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.55)' : '0 0 40px rgba(16,185,129,0.08)' }}
                >
                  {event.title}
                </h1>

                <p className="mt-7 max-w-4xl text-base leading-8 md:text-lg xl:text-[1.15rem]" style={{ color: palette.textSecondary }}>
                  {event.description || 'A high-signal event crafted for the QSphere community. Explore the schedule, context, and registration window below.'}
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.74)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Calendar size={15} />
                      Event date
                    </div>
                    <div className="mt-4 text-xl font-semibold md:text-2xl" style={{ color: palette.textPrimary }}>{formatEventFullDate(event.date)}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.74)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Clock size={15} />
                      Start time
                    </div>
                    <div className="mt-4 text-xl font-semibold md:text-2xl" style={{ color: palette.textPrimary }}>{formatEventTime(event.date)}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.74)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <MapPin size={15} />
                      Location mode
                    </div>
                    <div className="mt-4 text-lg font-semibold leading-7" style={{ color: palette.textPrimary }}>{event.location || 'To be announced'}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.74)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Users size={15} />
                      Best for
                    </div>
                    <div className="mt-4 text-lg font-semibold leading-7" style={{ color: palette.textPrimary }}>{event.audience || 'Open community access'}</div>
                  </div>
                </div>
              </div>

              <aside
                className="relative overflow-hidden rounded-[34px] p-6 md:p-7 xl:sticky xl:top-28"
                style={{
                  border: `1px solid ${palette.borderPrimary}`,
                  background: isDayMode
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))'
                    : 'linear-gradient(180deg, rgba(5,10,8,0.94), rgba(4,8,7,0.72))',
                  boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.38)',
                }}
              >
                <div className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tone.edge}, transparent)` }} />

                <div className="rounded-[30px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Signal window</div>
                      <div className="mt-3 text-6xl font-bold leading-none" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                        {dateInfo.day}
                      </div>
                      <div className="mt-2 text-sm uppercase tracking-[0.26em]" style={{ color: palette.textMuted }}>{dateInfo.month} {dateInfo.year}</div>
                    </div>
                    <div className="rounded-2xl px-4 py-2 text-right" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Weekday</div>
                      <div className="mt-1 text-base font-semibold" style={{ color: palette.textPrimary }}>{dateInfo.weekday || 'TBD'}</div>
                    </div>
                  </div>

                  <div className="mt-6 h-px" style={{ background: palette.borderSoft }} />

                  <div className="mt-6 grid gap-3">
                    <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.82)' : 'rgba(0,0,0,0.2)' }}>
                      <Calendar size={16} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>Registration</div>
                        <div className="mt-1 text-sm font-semibold" style={getDeadlineToneStyle(deadlineInfo.tone, isDayMode)}>{deadlineInfo.label}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.82)' : 'rgba(0,0,0,0.2)' }}>
                      <Clock size={16} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>Live clock</div>
                        <div className="mt-1 text-sm font-semibold" style={{ color: palette.textPrimary }}>{formatEventTime(event.date)}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.82)' : 'rgba(0,0,0,0.2)' }}>
                      <MapPin size={16} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>Venue signal</div>
                        <div className="mt-1 text-sm font-semibold leading-6" style={{ color: palette.textSecondary }}>{event.location || 'To be announced'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[30px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.25)' }}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.textMuted }}>Action layer</div>
                      <div className="mt-2 text-2xl font-semibold" style={{ color: palette.textPrimary }}>Make it unforgettable</div>
                    </div>
                    <div className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}>
                      {deadlineInfo.badge}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all"
                      style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}
                    >
                      <Copy size={16} />
                      {copied ? 'Copied event brief' : 'Copy event brief'}
                    </button>
                    <Link
                      to="/events"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all"
                      style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                    >
                      Explore more events
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div
              className="overflow-hidden rounded-[34px] p-7 md:p-10"
              style={{
                border: `1px solid ${palette.borderPrimary}`,
                background: isDayMode
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,247,245,0.90))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.34)',
              }}
            >
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>
                <Sparkles size={15} />
                Experience overview
              </div>
              <h2 className="mt-5 text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                Built for clarity, momentum, and serious curiosity.
              </h2>
              <div className="mt-6 space-y-6 text-[1.02rem] leading-8" style={{ color: palette.textSecondary }}>
                <p>
                  {event.description || 'This event is designed as a strong entry point into the next conversation shaping the QSphere ecosystem.'}
                </p>
                <p>
                  Whether you are joining to learn, connect, or push your own work further, the structure of this session is tuned for people who want more than surface-level noise. It is meant to feel precise, atmospheric, and genuinely worth showing up for.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {experienceNotes.map((note, index) => (
                  <div key={index} className="rounded-[26px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.75)' }}>0{index + 1}</div>
                    <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="overflow-hidden rounded-[34px] p-7 md:p-8"
              style={{
                border: `1px solid ${palette.borderPrimary}`,
                background: isDayMode
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))'
                  : 'linear-gradient(180deg, rgba(7,12,10,0.95), rgba(4,8,7,0.72))',
                boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.34)',
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Audience focus</div>
              <h2 className="mt-5 text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                Who this event is tuned for.
              </h2>
              <div className="mt-6 rounded-[28px] p-5" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Recommended audience</div>
                <div className="mt-3 text-xl font-semibold leading-8" style={{ color: palette.textPrimary }}>{event.audience || 'Open community access'}</div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  { label: 'Date', value: formatEventFullDate(event.date) },
                  { label: 'Time', value: formatEventTime(event.date) },
                  { label: 'Format', value: event.type || 'Community event' },
                  { label: 'Registration', value: deadlineInfo.label },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-5 rounded-2xl px-4 py-3.5" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.02)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>{item.label}</span>
                    <span className="max-w-[65%] text-right text-sm font-semibold leading-6" style={{ color: palette.textSecondary }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {relatedEvents.length > 0 && (
            <section
              className="mt-8 overflow-hidden rounded-[34px] p-7 md:p-10"
              style={{
                border: `1px solid ${palette.borderPrimary}`,
                background: isDayMode
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,247,245,0.88))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.34)',
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>More signals</div>
                  <h2 className="mt-4 text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                    Other events worth opening next.
                  </h2>
                </div>
                <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: isDayMode ? palette.accentDark : palette.accentLight }}>
                  Return to all events
                  <ArrowUpRight size={16} />
                </Link>
              </div>

              <div className="mt-8 grid gap-5 xl:grid-cols-3">
                {relatedEvents.map((item, index) => {
                  const itemDate = parseEventDate(item.date)
                  return (
                    <Link
                      key={item.id}
                      to={`/events/${item.id}`}
                      className="group relative block overflow-hidden rounded-[28px] p-5 no-underline transition-all duration-300 hover:-translate-y-1.5"
                      style={{
                        animation: `detailFadeUp 0.55s ease-out ${0.1 + index * 0.08}s both`,
                        border: `1px solid ${palette.borderPrimary}`,
                        backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>{itemDate.month} {itemDate.day}</div>
                          <h3 className="mt-3 text-2xl font-semibold leading-tight transition-colors" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                            {item.title}
                          </h3>
                        </div>
                        <span className="inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={getTypeStyle(item.type, isDayMode)}>
                          {item.type}
                        </span>
                      </div>
                      <p className="line-clamp-3 mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>{item.description}</p>
                      <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm" style={{ borderColor: palette.borderSoft, color: palette.textMuted }}>
                        <span>{formatEventTime(item.date)}</span>
                        <span className="inline-flex items-center gap-2 font-semibold transition-all group-hover:gap-3" style={{ color: isDayMode ? palette.accentDark : palette.accentLight }}>
                          Open detail
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

      <Footer />

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

export default EventDetailPage
