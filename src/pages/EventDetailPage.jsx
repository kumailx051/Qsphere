import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import {
  formatEventFullDate,
  formatEventTime,
  getRegistrationState,
  parseEventDate,
} from '../utils/eventStore'
import {
  checkEventRegistrationConflicts,
  fetchEventById,
  fetchEventRegistration,
  fetchEvents,
  submitEventRegistration,
} from '../utils/opportunitiesApi'
import {
  getCurrentUserAffiliation,
  getCurrentUserEmail,
  getCurrentUserLocation,
  getCurrentUserName,
  getCurrentUserPhone,
  getCurrentUserRoleSummary,
  readStoredProfile,
} from '../utils/profileStore'

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

const showSnackbar = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
}

const buildRegistrationDraft = (profile, existingRegistration = null) => ({
  fullName: existingRegistration?.fullName || getCurrentUserName(profile) || '',
  email: existingRegistration?.email || getCurrentUserEmail(profile) || '',
  phone: existingRegistration?.phone || getCurrentUserPhone(profile) || '',
  affiliation: existingRegistration?.affiliation || getCurrentUserAffiliation(profile) || '',
  roleTitle: existingRegistration?.roleTitle || getCurrentUserRoleSummary(profile) || '',
  location: existingRegistration?.location || getCurrentUserLocation(profile) || '',
  profileUrl: existingRegistration?.profileUrl || '',
  expectations: existingRegistration?.expectations || '',
  notes: existingRegistration?.notes || '',
})

const EventDetailPage = () => {
  const { id } = useParams()
  const [copied, setCopied] = useState(false)
  const [event, setEvent] = useState(null)
  const [relatedEvents, setRelatedEvents] = useState([])
  const [currentRegistration, setCurrentRegistration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const profile = readStoredProfile()
  const currentUserEmail = getCurrentUserEmail(profile)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [registrationErrors, setRegistrationErrors] = useState({})
  const [registrationConflictState, setRegistrationConflictState] = useState({
    emailRegistered: false,
    phoneRegistered: false,
  })
  const [registrationForm, setRegistrationForm] = useState(() => buildRegistrationDraft(profile))
  const { theme } = useTheme()

  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  useEffect(() => {
    let active = true

    const loadEvent = async () => {
      setLoading(true)
      setNotFound(false)

      try {
        const [eventData, allEvents, savedRegistration] = await Promise.all([
          fetchEventById(id),
          fetchEvents(),
          currentUserEmail ? fetchEventRegistration(id, currentUserEmail) : Promise.resolve(null),
        ])

        if (!active) return

        setEvent(eventData)
        setRelatedEvents(
          (Array.isArray(allEvents) ? allEvents : [])
            .filter((item) => String(item.id) !== String(eventData.id))
            .slice(0, 3),
        )
        setCurrentRegistration(savedRegistration)
        setRegistrationForm(buildRegistrationDraft(profile, savedRegistration))
        setRegistrationComplete(Boolean(savedRegistration))
      } catch (error) {
        console.error('Failed to load event details:', error)
        if (!active) return
        setEvent(null)
        setRelatedEvents([])
        setCurrentRegistration(null)
        setRegistrationComplete(false)
        setNotFound(error?.status === 404)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadEvent()

    return () => {
      active = false
    }
  }, [id, currentUserEmail])

  useEffect(() => {
    if (!isRegisterModalOpen || registrationComplete || !event?.id) return

    const trimmedEmail = registrationForm.email.trim()
    const trimmedPhone = registrationForm.phone.trim()
    const normalizedPhone = trimmedPhone.replace(/\D/g, '')
    const shouldCheckEmail = trimmedEmail.includes('@')
    const shouldCheckPhone = normalizedPhone.length >= 7

    if (!shouldCheckEmail && !shouldCheckPhone) {
      setRegistrationConflictState({ emailRegistered: false, phoneRegistered: false })
      return
    }

    let active = true
    const timerId = window.setTimeout(async () => {
      try {
        const result = await checkEventRegistrationConflicts(event.id, {
          email: shouldCheckEmail ? trimmedEmail : '',
          phone: shouldCheckPhone ? trimmedPhone : '',
          excludeId: currentRegistration?.id || '',
        })

        if (!active) return

        setRegistrationConflictState({
          emailRegistered: Boolean(result?.emailRegistered),
          phoneRegistered: Boolean(result?.phoneRegistered),
        })
      } catch {
        if (!active) return
        setRegistrationConflictState({ emailRegistered: false, phoneRegistered: false })
      }
    }, 350)

    return () => {
      active = false
      window.clearTimeout(timerId)
    }
  }, [
    currentRegistration?.id,
    event?.id,
    isRegisterModalOpen,
    registrationComplete,
    registrationForm.email,
    registrationForm.phone,
  ])

  if (loading) {
    return (
      <div
        className="relative"
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}
      >
        <Navbar currentPage="events" />

        <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-12 lg:px-20 xl:px-28">
          <div
            className="overflow-hidden rounded-[36px] p-10 text-center md:p-16"
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
              Loading Event
            </span>
            <h1 className="mt-6 type-heading-soft max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
              Pulling the latest event signal.
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-base leading-8 md:text-lg" style={{ color: palette.textSecondary }}>
              We are loading this event and its registration details from the QSphere database.
            </p>
          </div>
        </main>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer />
        </div>
      </div>
    )
  }

  if (notFound || !event) {
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
            <h1 className="mt-6 max-w-3xl type-heading-soft" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
              That event is not available anymore.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 md:text-lg" style={{ color: palette.textSecondary }}>
              The event may have been removed, renamed, or is no longer available in the live database. Head back to the events grid and choose another live signal.
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

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer />
        </div>
      </div>
    )
  }

  const tone = getEventTone(event.type, isDayMode)
  const dateInfo = parseEventDate(event.date)
  const deadlineInfo = getRegistrationState(event.deadline)
  const eventTimestamp = new Date(event.date).getTime()
  const isEventArchived =
    deadlineInfo.badge === 'Closed' || (!Number.isNaN(eventTimestamp) && eventTimestamp < Date.now())
  const experienceNotes = getExperienceNotes(event)
  const registrationCount = Number(event.registrationCount || 0)

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    if (digits.startsWith('03') && digits.length > 4) {
      return digits.slice(0, 4) + '-' + digits.slice(4)
    }
    return digits
  }

  const updateRegistrationField = (key, value) => {
    if (key === 'phone') value = formatPhone(value)
    setRegistrationForm((current) => ({ ...current, [key]: value }))
    if (key === 'email' || key === 'phone') {
      setRegistrationConflictState((current) => ({
        ...current,
        ...(key === 'email' ? { emailRegistered: false } : {}),
        ...(key === 'phone' ? { phoneRegistered: false } : {}),
      }))
    }
    setRegistrationErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const openRegistrationModal = () => {
    if (isEventArchived) {
      showSnackbar('Registration for this event is already closed.', 'error')
      return
    }

    setRegistrationConflictState({ emailRegistered: false, phoneRegistered: false })

    if (currentRegistration) {
      setRegistrationComplete(true)
    } else {
      setRegistrationForm(buildRegistrationDraft(profile))
      setRegistrationErrors({})
      setRegistrationComplete(false)
    }
    setIsRegisterModalOpen(true)
  }

  const closeRegistrationModal = () => {
    if (registrationSubmitting) return
    setIsRegisterModalOpen(false)
  }

  const handleRegistrationSubmit = async (submitEvent) => {
    submitEvent.preventDefault()

    const nextErrors = {}
    if (!registrationForm.fullName.trim()) nextErrors.fullName = 'Full name is required'
    if (!registrationForm.email.trim()) nextErrors.email = 'Email is required'
    else if (!registrationForm.email.includes('@')) nextErrors.email = 'Enter a valid email with @'
    if (!registrationForm.phone.trim()) nextErrors.phone = 'Phone number is required'
    if (!registrationForm.affiliation.trim()) nextErrors.affiliation = 'Institute or organization is required'

    const liveConflicts = await checkEventRegistrationConflicts(event.id, {
      email: registrationForm.email.trim(),
      phone: registrationForm.phone.trim(),
      excludeId: currentRegistration?.id || '',
    }).catch(() => ({ emailRegistered: false, phoneRegistered: false }))

    if (liveConflicts.emailRegistered) {
      nextErrors.email = 'This email is already registered.'
    }

    if (liveConflicts.phoneRegistered) {
      nextErrors.phone = 'This phone number is already registered.'
    }

    setRegistrationConflictState({
      emailRegistered: Boolean(liveConflicts.emailRegistered),
      phoneRegistered: Boolean(liveConflicts.phoneRegistered),
    })

    if (Object.keys(nextErrors).length > 0) {
      setRegistrationErrors(nextErrors)
      showSnackbar('Please complete the required registration details.', 'error')
      return
    }

    setRegistrationSubmitting(true)

    try {
      const hadExistingRegistration = Boolean(currentRegistration?.id)
      const savedRegistration = await submitEventRegistration(event.id, {
        registrationId: currentRegistration?.id || '',
        fullName: registrationForm.fullName.trim(),
        email: registrationForm.email.trim(),
        phone: registrationForm.phone.trim(),
        affiliation: registrationForm.affiliation.trim(),
        roleTitle: registrationForm.roleTitle.trim(),
        location: registrationForm.location.trim(),
        profileUrl: registrationForm.profileUrl.trim(),
        expectations: registrationForm.expectations.trim(),
        notes: registrationForm.notes.trim(),
      })

      setCurrentRegistration(savedRegistration)
      setRegistrationForm(buildRegistrationDraft(profile, savedRegistration))
      setRegistrationComplete(true)
      setRegistrationConflictState({ emailRegistered: false, phoneRegistered: false })
      setEvent((current) =>
        current
          ? {
              ...current,
              registrationCount: Number(current.registrationCount || 0) + (hadExistingRegistration ? 0 : 1),
            }
          : current,
      )
      showSnackbar(hadExistingRegistration ? 'Your registration has been updated.' : 'You are registered for this event.', 'success')
    } catch (error) {
      const message = error?.message || ''
      if (message.toLowerCase().includes('email is already registered')) {
        setRegistrationConflictState((current) => ({ ...current, emailRegistered: true }))
        setRegistrationErrors((current) => ({ ...current, email: 'This email is already registered.' }))
        showSnackbar('This email is already registered for this event.', 'error')
      } else if (message.toLowerCase().includes('phone number is already registered')) {
        setRegistrationConflictState((current) => ({ ...current, phoneRegistered: true }))
        setRegistrationErrors((current) => ({ ...current, phone: 'This phone number is already registered.' }))
        showSnackbar('This phone number is already registered for this event.', 'error')
      } else {
        showSnackbar(message || 'Unable to save your registration right now.', 'error')
      }
    } finally {
      setRegistrationSubmitting(false)
    }
  }

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
                  className="mt-7 max-w-3xl xl:max-w-[54rem] type-heading-soft"
                  style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary, textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.55)' : '0 0 40px rgba(16,185,129,0.08)' }}
                >
                  {event.title}
                </h1>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.74)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Calendar size={15} />
                      Event date
                    </div>
                    <div className="mt-4 text-base font-semibold md:text-[1.05rem]" style={{ color: palette.textPrimary }}>{formatEventFullDate(event.date)}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.74)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Clock size={15} />
                      Start time
                    </div>
                    <div className="mt-4 text-base font-semibold md:text-[1.05rem]" style={{ color: palette.textPrimary }}>{formatEventTime(event.date)}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.74)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <MapPin size={15} />
                      Location mode
                    </div>
                    <div className="mt-4 text-base font-semibold leading-7 md:text-[1.05rem]" style={{ color: palette.textPrimary }}>{event.location || 'To be announced'}</div>
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
                      <div className="type-statValue mt-3" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
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
                      <div className="mt-2 type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>Make it unforgettable</div>
                      <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: palette.textSecondary }}>
                        <UserCheck size={15} style={{ color: palette.accentPrimary }} />
                        {registrationCount} attendee{registrationCount === 1 ? '' : 's'} registered
                      </div>
                    </div>
                    <div className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}>
                      {deadlineInfo.badge}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {!isEventArchived ? (
                      <button
                        type="button"
                        onClick={openRegistrationModal}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all"
                        style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                      >
                        <UserCheck size={16} />
                        {currentRegistration ? 'View registration' : 'Register now'}
                      </button>
                    ) : (
                      <div className="rounded-[24px] px-4 py-4 text-sm leading-7" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.82)' : 'rgba(0,0,0,0.2)', color: palette.textSecondary }}>
                        This event is archived now, so this page is view-only and registrations are closed.
                      </div>
                    )}
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
              <h2 className="type-sectionHeading mt-5 max-w-2xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Built for clarity, momentum, and serious curiosity.
              </h2>
              <div className="mt-6 space-y-6 text-base leading-8" style={{ color: palette.textSecondary }}>
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
              <h2 className="type-sectionHeading mt-5 max-w-xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Who this event is tuned for.
              </h2>
              <div className="mt-6 rounded-[28px] p-5" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Recommended audience</div>
                <div className="mt-3 text-lg font-semibold leading-8" style={{ color: palette.textPrimary }}>{event.audience || 'Open community access'}</div>
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
                  <h2 className="type-sectionHeading mt-4 max-w-xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
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
                          <h3 className="mt-3 text-xl font-semibold leading-tight transition-colors" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                            {item.title}
                          </h3>
                        </div>
                        <span className="inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={getTypeStyle(item.type, isDayMode)}>
                          {item.type}
                        </span>
                      </div>
                      <p className="type-cardBody line-clamp-3 mt-4" style={{ color: palette.textSecondary }}>{item.description}</p>
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

      {!isEventArchived && isRegisterModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-10">
          <button
            type="button"
            aria-label="Close registration popup"
            onClick={closeRegistrationModal}
            className="absolute inset-0 border-0 bg-black/45 p-0"
          />

          <div
            className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[34px] p-6 md:p-8"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode
                ? 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,247,245,0.95))'
                : 'linear-gradient(145deg, rgba(7,12,10,0.98), rgba(4,8,7,0.92))',
              boxShadow: isDayMode
                ? '0 30px 120px rgba(15,23,42,0.18)'
                : '0 30px 120px rgba(0,0,0,0.62)',
            }}
          >
            <div className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tone.edge}, transparent)` }} />

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>
                  Event registration
                </div>
                <h2 className="type-cardHeading mt-4 leading-tight" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  Step into {event.title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                  Share the attendee details organizers usually need so the event owner can plan communication, check-in, and the room experience properly.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRegistrationModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all"
                style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.03)', color: palette.textSecondary }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Event date', value: formatEventFullDate(event.date) },
                { label: 'Time', value: formatEventTime(event.date) },
                { label: 'Location', value: event.location || 'To be announced' },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.03)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>{item.label}</div>
                  <div className="mt-3 text-sm font-semibold leading-6" style={{ color: palette.textPrimary }}>{item.value}</div>
                </div>
              ))}
            </div>

            {registrationComplete ? (
              <div className="mt-8 rounded-[28px] p-6" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.15)', color: palette.accentPrimary }}>
                    <UserCheck size={22} />
                  </div>
                  <div>
                    <h3 className="type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>{currentRegistration?.email === registrationForm.email ? 'You are already registered.' : 'You are on the list.'}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                      {currentRegistration?.email === registrationForm.email
                        ? 'Your registration for this event is already confirmed. No need to register again.'
                        : 'Your registration details are saved for this event.'}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={closeRegistrationModal}
                        className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
                        style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegistrationSubmit} className="mt-8 rounded-[30px] p-5 md:p-6" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.03)' }}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Full name *</label>
                    <div className="mt-2 rounded-2xl border" style={{ borderColor: registrationErrors.fullName ? '#ef4444' : palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <User size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={registrationForm.fullName}
                          onChange={(event) => updateRegistrationField('fullName', event.target.value)}
                          placeholder="Your full name"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                    {registrationErrors.fullName && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{registrationErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Email address *</label>
                    {registrationConflictState.emailRegistered && (
                      <p className="mt-2 text-xs font-semibold" style={{ color: '#ef4444' }}>
                        This email is already registered.
                      </p>
                    )}
                    <div className="mt-2 rounded-2xl border" style={{ borderColor: registrationErrors.email || registrationConflictState.emailRegistered ? '#ef4444' : palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Mail size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="email"
                          value={registrationForm.email}
                          onChange={(event) => updateRegistrationField('email', event.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                    {registrationErrors.email && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{registrationErrors.email}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Phone number *</label>
                    {registrationConflictState.phoneRegistered && (
                      <p className="mt-2 text-xs font-semibold" style={{ color: '#ef4444' }}>
                        This phone number is already registered.
                      </p>
                    )}
                    <div className="mt-2 rounded-2xl border" style={{ borderColor: registrationErrors.phone || registrationConflictState.phoneRegistered ? '#ef4444' : palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Phone size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={registrationForm.phone}
                          onChange={(event) => updateRegistrationField('phone', event.target.value)}
                          placeholder="+92..."
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                    {registrationErrors.phone && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{registrationErrors.phone}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Institute / organization *</label>
                    <div className="mt-2 rounded-2xl border" style={{ borderColor: registrationErrors.affiliation ? '#ef4444' : palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Building2 size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={registrationForm.affiliation}
                          onChange={(event) => updateRegistrationField('affiliation', event.target.value)}
                          placeholder="Your university, company, or lab"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                    {registrationErrors.affiliation && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{registrationErrors.affiliation}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Role / title</label>
                    <div className="mt-2 rounded-2xl border" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Briefcase size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={registrationForm.roleTitle}
                          onChange={(event) => updateRegistrationField('roleTitle', event.target.value)}
                          placeholder="Student, Researcher, Engineer..."
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>City / location</label>
                    <div className="mt-2 rounded-2xl border" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <MapPin size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={registrationForm.location}
                          onChange={(event) => updateRegistrationField('location', event.target.value)}
                          placeholder="Your city or region"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>LinkedIn / portfolio URL</label>
                  <div className="mt-2 rounded-2xl border" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <ExternalLink size={16} style={{ color: palette.accentPrimary }} />
                      <input
                        type="text"
                        value={registrationForm.profileUrl}
                        onChange={(event) => updateRegistrationField('profileUrl', event.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>What do you hope to gain from this event?</label>
                  <div className="mt-2 rounded-2xl border" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                    <textarea
                      value={registrationForm.expectations}
                      onChange={(event) => updateRegistrationField('expectations', event.target.value)}
                      placeholder="Share your goals, expectations, or what you want to learn."
                      rows={4}
                      className="w-full resize-none bg-transparent px-4 py-3.5 outline-none"
                      style={{ color: palette.textPrimary }}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Special requirements or notes</label>
                  <div className="mt-2 rounded-2xl border" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                    <textarea
                      value={registrationForm.notes}
                      onChange={(event) => updateRegistrationField('notes', event.target.value)}
                      placeholder="Accessibility needs, dietary notes, or anything the organizer should know."
                      rows={3}
                      className="w-full resize-none bg-transparent px-4 py-3.5 outline-none"
                      style={{ color: palette.textPrimary }}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={registrationSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                  >
                    <UserCheck size={16} />
                    {registrationSubmitting ? 'Saving registration...' : 'Confirm registration'}
                  </button>
                  <button
                    type="button"
                    onClick={closeRegistrationModal}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all"
                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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

export default EventDetailPage
