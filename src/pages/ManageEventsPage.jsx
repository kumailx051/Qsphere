import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import { formatEventFullDate, formatEventTime, getRegistrationState, parseEventDate } from '../utils/eventStore'
import { fetchManagedEvents } from '../utils/opportunitiesApi'
import { getCurrentUserEmail, getCurrentUserName, readStoredProfile } from '../utils/profileStore'

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

const formatDateTime = (value) => {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Recently'

  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const normalizeManagedEvent = (event = {}) => ({
  ...event,
  registrationCount: Number(event.registrationCount || 0),
  registrations: Array.isArray(event.registrations) ? event.registrations : [],
})

const isManagedEventArchived = (event) => {
  if (getRegistrationState(event?.deadline).badge === 'Closed') return true

  if (!event?.date) return false

  const eventTimestamp = new Date(event.date).getTime()
  return Number.isNaN(eventTimestamp) ? false : eventTimestamp < Date.now()
}

const buildGmailComposeLink = ({ to, subject, body }) => {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: to || '',
    su: subject || '',
    body: body || '',
  })

  return `https://mail.google.com/mail/?${params.toString()}`
}

const ManageEventsPage = () => {
  const profile = readStoredProfile()
  const currentUserEmail = getCurrentUserEmail(profile)
  const currentUserName = getCurrentUserName(profile)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventView, setEventView] = useState('active')
  const [registrationIndex, setRegistrationIndex] = useState(0)
  const [managedEvents, setManagedEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()

  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const activeManagedEvents = useMemo(
    () => managedEvents.filter((event) => !isManagedEventArchived(event)),
    [managedEvents],
  )

  const archivedManagedEvents = useMemo(
    () => managedEvents.filter((event) => isManagedEventArchived(event)),
    [managedEvents],
  )

  const visibleManagedEvents = eventView === 'archived' ? archivedManagedEvents : activeManagedEvents

  const resolvedSelectedEventId =
    visibleManagedEvents.some((event) => String(event.id) === String(selectedEventId))
      ? selectedEventId
      : visibleManagedEvents[0]?.id || ''

  useEffect(() => {
    let active = true

    const loadManagedEvents = async () => {
        if (!currentUserEmail) {
          if (active) {
            setManagedEvents([])
            setLoading(false)
          }
          return
        }

      try {
        const data = await fetchManagedEvents(currentUserEmail)
        if (active) {
          setManagedEvents(
            Array.isArray(data) ? data.map(normalizeManagedEvent) : [],
          )
        }
      } catch (error) {
        console.error('Failed to load managed events:', error)
        if (active) {
          setManagedEvents([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadManagedEvents()

    const refresh = () => {
      setLoading(true)
      loadManagedEvents()
    }

    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
    }
  }, [currentUserEmail])

  const selectedEvent =
    visibleManagedEvents.find((event) => String(event.id) === String(resolvedSelectedEventId)) || null
  const selectedEventArchived = selectedEvent ? isManagedEventArchived(selectedEvent) : false
  const currentRegistration = selectedEvent?.registrations?.[registrationIndex] || null
  const totalRegistrations = managedEvents.reduce((sum, event) => sum + event.registrationCount, 0)
  const activeEventCount = activeManagedEvents.length
  const archivedEventCount = archivedManagedEvents.length
  const mostActiveEvent = managedEvents.reduce(
    (best, event) => (!best || event.registrationCount > best.registrationCount ? event : best),
    null,
  )

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  useEffect(() => {
    setRegistrationIndex(0)
  }, [resolvedSelectedEventId, eventView])

  useEffect(() => {
    if (!selectedEvent?.registrations?.length) {
      if (registrationIndex !== 0) setRegistrationIndex(0)
      return
    }

    if (registrationIndex > selectedEvent.registrations.length - 1) {
      setRegistrationIndex(0)
    }
  }, [selectedEvent?.registrations?.length, registrationIndex])

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
      <Navbar currentPage="dashboard" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.56 : 0.4, background: isDayMode ? 'radial-gradient(circle at 18% 0%, rgba(46,197,138,0.14) 0%, transparent 42%)' : 'radial-gradient(circle at 18% 0%, rgba(16,185,129,0.18) 0%, transparent 42%)', y: glowY1 }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.24 : 0.2, background: isDayMode ? 'radial-gradient(circle at 100% 0%, rgba(255,224,163,0.16) 0%, transparent 36%)' : 'radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12) 0%, transparent 36%)', y: glowY2 }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.11 : 0.14,
            backgroundImage: isDayMode
              ? 'linear-gradient(rgba(10,22,32,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(10,22,32,0.03) 1px, transparent 1px)'
              : 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 18%, black 24%, transparent 88%)',
          }}
        />
      </div>

      <main className="relative z-10 w-full flex-grow pt-32 pb-24">
        <div className="px-6 md:px-12 lg:px-20 xl:px-28">
          <motion.section
            variants={heroVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="relative overflow-hidden rounded-[38px] p-7 md:p-10 xl:p-12"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode
                ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
              boxShadow: isDayMode ? '0 40px 120px rgba(15,23,42,0.08)' : '0 40px 120px rgba(0,0,0,0.45)',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${isDayMode ? 'rgba(46,197,138,0.5)' : 'rgba(110,231,183,0.5)'}, transparent)` }} />
            <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(16,185,129,0.10)' }} />
            <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(255,224,163,0.18)' : 'rgba(6,182,212,0.10)' }} />

            <div className="relative z-10 grid gap-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
              <div>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary }} />
                    Event control
                  </span>
                </div>

                <h1 className="type-heading-soft max-w-3xl xl:max-w-[54rem]" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  Manage registrations
                  <br />
                  <span style={{ color: palette.accentPrimary }}>without losing the vibe.</span>
                </h1>

                <p className="type-bodyText mt-7 max-w-3xl" style={{ color: palette.textSecondary }}>
                  {currentUserName}, this is your event control room. Newly posted events from your dashboard appear here automatically, along with every attendee who registers for them.
                </p>

                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    { label: 'Managed events', value: String(managedEvents.length).padStart(2, '0') },
                    { label: 'Registrations', value: String(totalRegistrations).padStart(2, '0') },
                    { label: 'Archived events', value: String(archivedEventCount).padStart(2, '0') },
                  ].map((item) => (
                    <motion.div key={item.label} variants={itemVariants} className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.2)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>{item.label}</div>
                      <div className="type-statValue mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>{item.value}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <div className="rounded-[34px] p-6 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))' : 'linear-gradient(180deg, rgba(5,10,8,0.92), rgba(4,8,7,0.74))' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Top signal</div>
                <h2 className="type-sectionHeading mt-4 max-w-xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  {mostActiveEvent?.title || 'Create an event to start collecting registrations.'}
                </h2>
                <p className="mt-5 text-sm leading-7" style={{ color: palette.textSecondary }}>
                  {mostActiveEvent
                    ? `${mostActiveEvent.registrationCount} attendee${mostActiveEvent.registrationCount === 1 ? '' : 's'} are already lined up for your most active event.`
                    : 'As soon as someone registers for one of your events, their details will land here in a clean management surface.'}
                </p>

                <div className="mt-5 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.03)', color: palette.textSecondary }}>
                  {activeEventCount} active · {archivedEventCount} archived
                </div>

                <div className="mt-7 grid gap-3">
                  <Link
                    to="/events/new"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold no-underline transition-all"
                    style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                  >
                    Post another event
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/events"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold no-underline transition-all"
                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                  >
                    Browse public event pages
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>

          {loading ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 rounded-[34px] p-10 text-center"
              style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.03)' }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                <Calendar size={26} />
              </div>
              <h2 className="type-sectionHeading mt-6" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Loading your managed events...
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                Pulling the latest registrations from your QSphere database.
              </p>
            </motion.section>
          ) : !managedEvents.length ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 rounded-[34px] p-10 text-center"
              style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.03)' }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                <Calendar size={26} />
              </div>
              <h2 className="type-sectionHeading mt-6" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Your managed events will appear here.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                This page only shows events created from your own dashboard flow. Post a new event first, then registrations will start stacking here automatically.
              </p>
              <Link
                to="/events/new"
                className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline"
                style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
              >
                Create an event
                <ArrowRight size={16} />
              </Link>
            </motion.section>
          ) : (
            <section className="mt-10 grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
              <div className="rounded-[34px] p-6 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Managed events</div>
                    <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                      Pick a room.
                    </h2>
                  </div>
                  <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                    {managedEvents.length} total
                  </span>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  {[
                    { key: 'active', label: 'Active', count: activeManagedEvents.length },
                    { key: 'archived', label: 'Archived', count: archivedManagedEvents.length },
                  ].map((tab) => {
                    const activeTab = eventView === tab.key

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setEventView(tab.key)}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all"
                        style={{
                          border: `1px solid ${activeTab ? palette.accentBorder : palette.borderPrimary}`,
                          backgroundColor: activeTab
                            ? palette.accentSoft
                            : isDayMode
                              ? 'rgba(255,255,255,0.82)'
                              : 'rgba(255,255,255,0.03)',
                          color: activeTab ? palette.accentPrimary : palette.textSecondary,
                        }}
                      >
                        {tab.label}
                        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: activeTab ? 'rgba(255,255,255,0.78)' : palette.accentSoft, color: activeTab ? palette.textPrimary : palette.accentPrimary }}>
                          {tab.count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-7 space-y-3">
                  {visibleManagedEvents.length === 0 ? (
                    <div className="rounded-[24px] p-4 text-sm leading-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.18)', color: palette.textSecondary }}>
                      {eventView === 'archived'
                        ? 'Archived events will appear here as soon as their deadline passes or the event date ends.'
                        : 'Active events will appear here once you post them from your dashboard.'}
                    </div>
                  ) : visibleManagedEvents.map((event) => {
                    const active = String(event.id) === String(resolvedSelectedEventId)
                    const dateInfo = parseEventDate(event.date)
                    const archived = isManagedEventArchived(event)

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEventId(event.id)}
                        className="w-full rounded-[24px] p-4 text-left transition-all"
                        style={{
                          border: `1px solid ${active ? palette.accentBorder : palette.borderPrimary}`,
                          backgroundColor: active ? palette.accentSoft : isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.18)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: active ? palette.accentPrimary : palette.textMuted }}>
                              {archived ? 'Expired' : `${dateInfo.month} ${dateInfo.day}`}
                            </div>
                            <div className="type-statValue mt-3" style={{ color: palette.textPrimary }}>{event.title}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ border: `1px solid ${active ? palette.accentBorder : palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.04)', color: palette.textSecondary }}>
                              <UserCheck size={12} />
                              {event.registrationCount}
                            </span>
                            {archived && (
                              <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ border: '1px solid rgba(239,68,68,0.22)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                                Expired
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 text-sm" style={{ color: palette.textSecondary }}>{event.location}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-[34px] p-6 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))' : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))' }}>
                {selectedEvent && (
                  <>
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Selected event</div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <h2 className="type-sectionHeading leading-tight" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                            {selectedEvent.title}
                          </h2>
                          {selectedEventArchived && (
                            <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: '1px solid rgba(239,68,68,0.22)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                              Expired
                            </span>
                          )}
                        </div>
                        <p className="mt-4 max-w-3xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                          {selectedEvent.description || 'Registrations and attendee details for this event are organized below.'}
                        </p>
                      </div>
                      <Link
                        to={`/events/${selectedEvent.id}`}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline"
                        style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                      >
                        Open public page
                        <ArrowRight size={15} />
                      </Link>
                    </div>

                    <div className="mt-7 grid gap-4 md:grid-cols-3">
                      {[
                        { icon: Calendar, label: 'Date', value: formatEventFullDate(selectedEvent.date) },
                        { icon: Clock, label: 'Time', value: formatEventTime(selectedEvent.date) },
                        { icon: Users, label: 'Audience', value: selectedEvent.audience || 'Open community' },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[24px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.2)' }}>
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.accentPrimary }}>
                            <item.icon size={14} />
                            {item.label}
                          </div>
                          <div className="mt-4 text-sm font-semibold leading-6" style={{ color: palette.textPrimary }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.textMuted }}>Attendee list</div>
                        <h3 className="mt-3 type-statValue" style={{ color: palette.textPrimary }}>
                          {selectedEvent.registrationCount} registration{selectedEvent.registrationCount === 1 ? '' : 's'}
                        </h3>
                      </div>
                      <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                        {selectedEventArchived ? 'Archived record' : 'Live intake'}
                      </span>
                    </div>

                    {selectedEvent.registrations.length === 0 ? (
                      <div className="mt-6 rounded-[26px] p-6 text-center" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.18)' }}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                          <Sparkles size={18} />
                        </div>
                        <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                          No one has registered for this event yet. Once attendees submit the popup form from the public event page, their details will appear here.
                        </p>
                      </div>
                    ) : currentRegistration ? (
                      <div className="mt-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold" style={{ color: palette.textSecondary }}>
                            Applicant {registrationIndex + 1} of {selectedEvent.registrations.length}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setRegistrationIndex((current) =>
                                  current === 0 ? selectedEvent.registrations.length - 1 : current - 1,
                                )
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-all"
                              style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.textSecondary }}
                              aria-label="Previous applicant"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRegistrationIndex((current) =>
                                  current === selectedEvent.registrations.length - 1 ? 0 : current + 1,
                                )
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-all"
                              style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.textSecondary }}
                              aria-label="Next applicant"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>

                        <div key={currentRegistration.id || `${currentRegistration.eventId}-${currentRegistration.email}`} className="rounded-[26px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.03)' }}>
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="type-statValue" style={{ color: palette.textPrimary }}>{currentRegistration.fullName}</div>
                                <div className="mt-2 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>
                                  Registered {formatDateTime(currentRegistration.updatedAt || currentRegistration.createdAt)}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-start justify-end gap-2">
                                {currentRegistration.roleTitle && (
                                  <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                                    {currentRegistration.roleTitle}
                                  </span>
                                )}
                                {currentRegistration.location && (
                                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)', color: palette.textSecondary }}>
                                    <MapPin size={11} />
                                    {currentRegistration.location}
                                  </span>
                                )}
                                {currentRegistration.email && (
                                  <a
                                    href={buildGmailComposeLink({
                                      to: currentRegistration.email,
                                      subject: `QSphere Event Update - ${selectedEvent.title}`,
                                      body: `Hi ${currentRegistration.fullName || 'there'},\n\nI am reaching out regarding your registration for ${selectedEvent.title}.\n\nBest regards,\n${currentUserName || selectedEvent.ownerName || 'QSphere Team'}`,
                                    })}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold no-underline transition-all"
                                    style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                                  >
                                    <Mail size={13} />
                                    Send email
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <Mail size={15} style={{ color: palette.accentPrimary }} />
                                <a href={`mailto:${currentRegistration.email}`} className="truncate text-sm no-underline" style={{ color: palette.textSecondary }}>
                                  {currentRegistration.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <Phone size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentRegistration.phone || 'No phone added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <Users size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentRegistration.affiliation || 'No affiliation added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <UserCheck size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentRegistration.roleTitle || 'No role / title added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <MapPin size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentRegistration.location || 'No city / location added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <ExternalLink size={15} style={{ color: palette.accentPrimary }} />
                                {currentRegistration.profileUrl ? (
                                  <a href={currentRegistration.profileUrl} target="_blank" rel="noreferrer" className="truncate text-sm no-underline" style={{ color: palette.textSecondary }}>
                                    {currentRegistration.profileUrl}
                                  </a>
                                ) : (
                                  <span className="truncate text-sm" style={{ color: palette.textMuted }}>No profile link added</span>
                                )}
                              </div>
                            </div>

                            <div className="mt-5 rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.9)' : 'rgba(0,0,0,0.18)' }}>
                              <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.accentPrimary }}>What they hope to gain</div>
                              <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                                {currentRegistration.expectations || 'No expectations were shared.'}
                              </p>
                            </div>

                            <div className="mt-4 rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.02)' }}>
                              <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>Special requirements or notes</div>
                              <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                                {currentRegistration.notes || 'No special requirements or notes were shared.'}
                              </p>
                            </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
                {!selectedEvent && (
                  <div className="rounded-[26px] p-6 text-center" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.18)' }}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                      <Sparkles size={18} />
                    </div>
                    <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      {eventView === 'archived'
                        ? 'No archived event records are available yet.'
                        : 'Choose an active event from the left to review its registrations.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>
    </div>
  )
}

export default ManageEventsPage
