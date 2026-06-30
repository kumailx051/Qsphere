import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, CalendarPlus, Briefcase } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../themeColors'
import {
  getCurrentUserEmail,
  getCurrentUserName,
  readStoredProfile,
} from '../utils/profileStore'
import { createEvent, createPosition } from '../utils/opportunitiesApi'

const wordCount = (str) => str.trim() ? str.trim().split(/\s+/).length : 0

const getLocalDateValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getLocalDateTimeValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const getFutureDateTimeValue = (daysAhead = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const getPreviousDateValue = (dateValue) => {
  if (!dateValue) return ''
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - 1)
  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}

const CreateOpportunityPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const todayDate = getLocalDateValue()
  const todayDateTimeLocal = getLocalDateTimeValue()
  const defaultEventDateTime = getFutureDateTimeValue(1)
  
  // Determine initial type from URL
  const initialType = location.pathname.includes('/events') ? 'event' : 'position'
  const [activeTab, setActiveTab] = useState(initialType)

  // Event State
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState('Workshop')
  const [eventDate, setEventDate] = useState(defaultEventDateTime)
  const [eventLocation, setEventLocation] = useState('')
  const [eventAudience, setEventAudience] = useState('')
  const [eventDeadline, setEventDeadline] = useState(todayDate)
  const [eventDescription, setEventDescription] = useState('')

  // Position State
  const [positionTitle, setPositionTitle] = useState('')
  const [positionType, setPositionType] = useState('Research Assistant')
  const [positionLocation, setPositionLocation] = useState('Remote')
  const [positionDeadline, setPositionDeadline] = useState(todayDate)
  const [positionContact, setPositionContact] = useState('')
  const [positionRequirements, setPositionRequirements] = useState('')
  const [positionDescription, setPositionDescription] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const eventDateOnly = eventDate ? eventDate.slice(0, 10) : ''
  const eventDeadlineMax = eventDateOnly ? getPreviousDateValue(eventDateOnly) : ''
  const hasValidDeadlineWindow = Boolean(eventDeadlineMax) && eventDeadlineMax >= todayDate

  useEffect(() => {
    const logged = localStorage.getItem('qsphere_logged_in') === '1'
    if (!logged) {
      navigate('/auth', { state: { redirectTo: location.pathname } })
      return
    }

    const profile = readStoredProfile()
    if (String(profile?.role || '').toLowerCase() === 'student') {
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Students are not allowed to create events or positions.', type: 'error' } }))
      navigate('/dashboard')
    }
  }, [navigate, location.pathname])

  useEffect(() => {
    if (!eventDateOnly) return

    if (!hasValidDeadlineWindow) {
      setEventDeadline('')
      return
    }

    setEventDeadline((current) => {
      if (!current || current < todayDate) return todayDate
      if (current > eventDeadlineMax) return eventDeadlineMax
      return current
    })
  }, [eventDateOnly, eventDeadlineMax, hasValidDeadlineWindow, todayDate])

  const showSnackbar = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
  }

  const handleCreate = async () => {
    setErrorMsg('')
    setMessage('')
    const profile = readStoredProfile()
    const ownerEmail = getCurrentUserEmail(profile)
    const ownerName = getCurrentUserName(profile)
    const effectiveEventDate = eventDate || todayDateTimeLocal
    const effectiveEventDeadline = eventDeadline
    const effectivePositionDeadline = positionDeadline || todayDate
    const effectiveEventDateOnly = effectiveEventDate.slice(0, 10)

    // Word count helpers
    const titleWords = wordCount(activeTab === 'event' ? eventTitle : positionTitle)
    const descWords = wordCount(activeTab === 'event' ? eventDescription : positionDescription)

    // Validation
    if (activeTab === 'event') {
      if (!eventTitle.trim() || !effectiveEventDate || !eventLocation) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setErrorMsg('Please fill in the required event fields (Title, Date, Location).')
        return
      }
      if (titleWords < 4) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setErrorMsg(`Event title must be at least 4 words (currently ${titleWords}).`)
        return
      }
      if (descWords < 100) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setErrorMsg(`Event description must be at least 100 words (currently ${descWords}).`)
        return
      }
      if (!effectiveEventDeadline) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setErrorMsg('Please choose a registration deadline.')
        return
      }
      if (effectiveEventDeadline < todayDate || effectiveEventDeadline >= effectiveEventDateOnly) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setErrorMsg('Registration deadline must be after today and before the event date.')
        return
      }
    } else {
      if (!positionTitle.trim() || !positionContact) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setErrorMsg('Please fill in the required position fields (Title, Contact).')
        return
      }
      if (titleWords < 4) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setErrorMsg(`Position title must be at least 4 words (currently ${titleWords}).`)
        return
      }
      if (descWords < 100) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setErrorMsg(`Position description must be at least 100 words (currently ${descWords}).`)
        return
      }
    }

    setSaving(true)

    try {
      if (activeTab === 'event') {
        await createEvent({
          title: eventTitle,
          type: eventType,
          date: effectiveEventDate,
          location: eventLocation,
          audience: eventAudience,
          deadline: effectiveEventDeadline,
          description: eventDescription,
          ownerEmail,
          ownerName,
        })
      } else {
        await createPosition({
          title: positionTitle,
          type: positionType,
          location: positionLocation,
          deadline: effectivePositionDeadline,
          contact: positionContact,
          requirements: positionRequirements,
          description: positionDescription,
          ownerEmail,
          ownerName,
        })
      }

      setSaving(false)
      setMessage('')
      showSnackbar(
        activeTab === 'event'
          ? 'Event created successfully.'
          : 'Position created successfully.',
        'success',
      )
      setTimeout(() => {
        navigate('/dashboard')
      }, 1200)
    } catch (error) {
      setSaving(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setErrorMsg(error.message || 'An error occurred while saving. Please try again.')
    }
  }

  return (
    <div className="relative" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
      <Navbar currentPage="create-opportunity" />

      {/* Background Effect */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <div
          className="absolute inset-0 opacity-45"
          style={{ background: `radial-gradient(circle at 50% 0%, ${palette.accentGlow} 0%, transparent 70%)` }}
        />
        <div
          className="absolute inset-0 opacity-24"
          style={{ background: `radial-gradient(circle at 100% 100%, ${palette.accentSecondaryGlow} 0%, transparent 50%)` }}
        />
      </div>

      <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-5xl">
          <button
            onClick={() => navigate('/dashboard')}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: palette.textMuted }}
            onMouseEnter={e => e.currentTarget.style.color = palette.accentPrimary}
            onMouseLeave={e => e.currentTarget.style.color = palette.textMuted}
          >
            <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>

          <div className="mb-10 text-center" style={{ animation: 'dashFadeUp 0.6s ease-out both' }}>
            <h1
              className="type-heading-soft mx-auto max-w-3xl"
              style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}
            >
              Create New{' '}
              <span style={{ color: palette.accentPrimary, textShadow: `0 0 40px ${palette.accentPrimary}40` }}>
                Opportunity
              </span>
            </h1>
            <p className="mt-4 mx-auto max-w-xl text-base leading-8" style={{ color: palette.textMuted }}>
              Launch a new event or open a position to collaborate with the QSphere community.
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex justify-center mb-10" style={{ animation: 'dashFadeUp 0.6s ease-out 0.1s both' }}>
            <div className="inline-flex items-center p-1.5 rounded-2xl border backdrop-blur-md" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgInput }}>
              <button
                onClick={() => setActiveTab('event')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300`}
                style={activeTab === 'event'
                  ? { backgroundColor: palette.accentSoft, color: palette.accentPrimary, border: `1px solid ${palette.accentBorder}`, boxShadow: `0 0 20px ${palette.accentPrimary}26` }
                  : { color: palette.textMuted, backgroundColor: 'transparent' }
                }
                onMouseEnter={e => { if (activeTab !== 'event') { e.currentTarget.style.color = palette.textPrimary; e.currentTarget.style.backgroundColor = palette.bgSurfaceHover } }}
                onMouseLeave={e => { if (activeTab !== 'event') { e.currentTarget.style.color = palette.textMuted; e.currentTarget.style.backgroundColor = 'transparent' } }}
              >
                <CalendarPlus size={18} />
                Event
              </button>
              <button
                onClick={() => setActiveTab('position')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300`}
                style={activeTab === 'position'
                  ? { backgroundColor: palette.accentSoft, color: palette.accentPrimary, border: `1px solid ${palette.accentBorder}`, boxShadow: `0 0 20px ${palette.accentPrimary}26` }
                  : { color: palette.textMuted, backgroundColor: 'transparent' }
                }
                onMouseEnter={e => { if (activeTab !== 'position') { e.currentTarget.style.color = palette.textPrimary; e.currentTarget.style.backgroundColor = palette.bgSurfaceHover } }}
                onMouseLeave={e => { if (activeTab !== 'position') { e.currentTarget.style.color = palette.textMuted; e.currentTarget.style.backgroundColor = 'transparent' } }}
              >
                <Briefcase size={18} />
                Open Position
              </button>
            </div>
          </div>

          <div className="flip-container mx-auto w-full max-w-5xl">
            <div className={`flipper ${activeTab === 'position' ? 'flipped' : ''}`}>
              {/* Event Form (Front Face) */}
              <div 
                className={`front-face rounded-3xl border p-8 md:p-10 backdrop-blur-xl shadow-2xl ${activeTab === 'position' ? 'pointer-events-none' : ''}`}
                  style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface, boxShadow: palette.shadowCard }}>
                {errorMsg && (
                  <div className="mb-8 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: isDayMode ? 'rgba(220,38,38,0.3)' : 'rgba(248,113,113,0.25)', backgroundColor: isDayMode ? 'rgba(254,202,202,0.15)' : 'rgba(127,29,29,0.2)', color: isDayMode ? '#b91c1c' : '#fca5a5' }}>
                    {errorMsg}
                  </div>
                )}
                {message && (
                  <div className="mb-8 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: isDayMode ? 'rgba(16,185,129,0.3)' : 'rgba(110,231,183,0.25)', backgroundColor: isDayMode ? 'rgba(167,243,208,0.15)' : 'rgba(20,83,45,0.2)', color: isDayMode ? '#047857' : '#a7f3d0' }}>
                    {message}
                  </div>
                )}

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Event Title *</label>
                    <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                      <input
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g. Quantum Computing 101"
                        className="w-full px-5 py-4 bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                    <div className="text-xs mt-1" style={{ color: wordCount(eventTitle) >= 4 ? palette.accentPrimary : palette.textMuted }}>Words: {wordCount(eventTitle)} / min 4</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>
                      Event Type
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full appearance-none rounded-xl border px-5 py-4 outline-none transition-all focus:border-emerald-500/50 focus:bg-emerald-500/[0.02]"
                      style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                    >
                      <option value="Workshop" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Workshop</option>
                      <option value="Seminar" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Seminar</option>
                      <option value="Webinar" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Webinar</option>
                      <option value="Meetup" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Meetup</option>
                      <option value="Other" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Event Date & Time *</label>
                      <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                        <input
                          type="datetime-local"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          min={todayDateTimeLocal}
                          className="w-full px-5 py-4 bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Registration Deadline</label>
                      <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                        <input
                          type="date"
                          value={eventDeadline}
                          onChange={(e) => setEventDeadline(e.target.value)}
                          min={todayDate}
                          max={hasValidDeadlineWindow ? eventDeadlineMax : undefined}
                          className="w-full px-5 py-4 bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                      <div className="text-xs mt-1" style={{ color: hasValidDeadlineWindow ? palette.textMuted : isDayMode ? '#b91c1c' : '#fca5a5' }}>
                        {hasValidDeadlineWindow
                          ? `Choose a date from ${todayDate} to ${eventDeadlineMax}.`
                          : 'Select an event date later than today so the deadline can be before the event.'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Location / Virtual Link *</label>
                    <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                      <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="e.g. Zoom Link or Physical Address"
                        className="w-full px-5 py-4 bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Target Audience</label>
                    <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                      <input
                        type="text"
                        value={eventAudience}
                        onChange={(e) => setEventAudience(e.target.value)}
                        placeholder="e.g. Undergraduate students, Researchers"
                        className="w-full px-5 py-4 bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Description</label>
                    <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                      <textarea
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Provide details about the event agenda, speakers, etc."
                        rows={5}
                        className="w-full px-5 py-4 bg-transparent outline-none resize-y"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                    <div className="text-xs mt-1" style={{ color: wordCount(eventDescription) >= 100 ? palette.accentPrimary : palette.textMuted }}>Words: {wordCount(eventDescription)} / min 100</div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={handleCreate}
                      disabled={saving}
                      className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl px-6 py-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: `0 0 20px ${palette.accentPrimary}4d` }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {saving ? 'Creating...' : 'Create Event'}
                        {!saving && <CheckCircle2 size={18} className="transform group-hover:scale-110 transition-transform" />}
                      </span>
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Position Form (Back Face) */}
              <div 
                className={`back-face rounded-3xl border p-8 md:p-10 backdrop-blur-xl shadow-2xl ${activeTab === 'event' ? 'pointer-events-none' : ''}`}
                style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface, boxShadow: palette.shadowCard }}>
                {errorMsg && (
                  <div className="mb-8 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: isDayMode ? 'rgba(220,38,38,0.3)' : 'rgba(248,113,113,0.25)', backgroundColor: isDayMode ? 'rgba(254,202,202,0.15)' : 'rgba(127,29,29,0.2)', color: isDayMode ? '#b91c1c' : '#fca5a5' }}>
                    {errorMsg}
                  </div>
                )}
                {message && (
                  <div className="mb-8 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: isDayMode ? 'rgba(16,185,129,0.3)' : 'rgba(110,231,183,0.25)', backgroundColor: isDayMode ? 'rgba(167,243,208,0.15)' : 'rgba(20,83,45,0.2)', color: isDayMode ? '#047857' : '#a7f3d0' }}>
                    {message}
                  </div>
                )}

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Position / Role Title *</label>
                    <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                      <input
                        type="text"
                        value={positionTitle}
                        onChange={(e) => setPositionTitle(e.target.value)}
                        placeholder="e.g. Quantum Algorithms Researcher"
                        className="w-full px-5 py-4 bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                    <div className="text-xs mt-1" style={{ color: wordCount(positionTitle) >= 4 ? palette.accentPrimary : palette.textMuted }}>Words: {wordCount(positionTitle)} / min 4</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>
                      Position Type
                    </label>
                    <select
                      value={positionType}
                      onChange={(e) => setPositionType(e.target.value)}
                      className="w-full appearance-none rounded-xl border px-5 py-4 outline-none transition-all focus:border-emerald-500/50 focus:bg-emerald-500/[0.02]"
                      style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                    >
                      <option value="Research Assistant" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Research Assistant</option>
                      <option value="Intern" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Intern</option>
                      <option value="Collaborator" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Collaborator</option>
                      <option value="Postdoc" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Postdoc</option>
                      <option value="Other" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>
                        Location
                      </label>
                      <select
                        value={positionLocation}
                        onChange={(e) => setPositionLocation(e.target.value)}
                        className="w-full appearance-none rounded-xl border px-5 py-4 outline-none transition-all focus:border-emerald-500/50 focus:bg-emerald-500/[0.02]"
                        style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                      >
                        <option value="Remote" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Remote</option>
                        <option value="On-site" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>On-site</option>
                        <option value="Hybrid" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Hybrid</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Application Deadline</label>
                      <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                        <input
                          type="date"
                          value={positionDeadline}
                          onChange={(e) => setPositionDeadline(e.target.value)}
                          min={todayDate}
                          className="w-full px-5 py-4 bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Contact Email / Application Link *</label>
                    <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                      <input
                        type="text"
                        value={positionContact}
                        onChange={(e) => setPositionContact(e.target.value)}
                        placeholder="e.g. apply@qsphere.com or https://forms.google.com/..."
                        className="w-full px-5 py-4 bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Requirements / Qualifications</label>
                    <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                      <textarea
                        value={positionRequirements}
                        onChange={(e) => setPositionRequirements(e.target.value)}
                        placeholder="List the skills, degrees, or experience required."
                        rows={4}
                        className="w-full px-5 py-4 bg-transparent outline-none resize-y"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: palette.accentPrimary }}>Description / Responsibilities</label>
                    <div className="w-full rounded-xl border transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                      <textarea
                        value={positionDescription}
                        onChange={(e) => setPositionDescription(e.target.value)}
                        placeholder="Describe what the applicant will be doing."
                        rows={5}
                        className="w-full px-5 py-4 bg-transparent outline-none resize-y"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                    <div className="text-xs mt-1" style={{ color: wordCount(positionDescription) >= 100 ? palette.accentPrimary : palette.textMuted }}>Words: {wordCount(positionDescription)} / min 100</div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={handleCreate}
                      disabled={saving}
                      className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl px-6 py-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: `0 0 20px ${palette.accentPrimary}4d` }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {saving ? 'Creating...' : 'Create Position'}
                        {!saving && <CheckCircle2 size={18} className="transform group-hover:scale-110 transition-transform" />}
                      </span>
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>

      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .flip-container {
          perspective: 1600px;
          animation: dashFadeUp 0.6s ease-out 0.2s both;
        }

        .flipper {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 1.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .flipper.flipped {
          transform: rotateY(180deg);
        }

        .front-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
        }

        .back-face {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          transform: rotateY(180deg);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  )
}

export default CreateOpportunityPage
