import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  Upload,
  User,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../themeColors'
import {
  parsePositionDeadline,
  splitPositionRequirements,
} from '../utils/positionStore'
import {
  checkPositionApplicationConflicts,
  fetchPositionApplication,
  fetchPositionById,
  fetchPositions,
  submitPositionApplication,
} from '../utils/opportunitiesApi'
import { extractResumeText, parseResumeAutofill } from '../utils/resumeAutofill'
import {
  getCurrentUserAffiliation,
  getCurrentUserEmail,
  getCurrentUserLocation,
  getCurrentUserPhone,
  getCurrentUserRoleSummary,
  readStoredProfile,
} from '../utils/profileStore'

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

const showSnackbar = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
}

const splitSkillTags = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const buildApplicationForm = (profile, existingApplication = null) => ({
  fullName: existingApplication?.fullName || profile?.fullName || '',
  email: existingApplication?.email || getCurrentUserEmail(profile) || '',
  phone: existingApplication?.phone || getCurrentUserPhone(profile) || '',
  location: existingApplication?.location || getCurrentUserLocation(profile) || '',
  currentRole: existingApplication?.currentRole || getCurrentUserRoleSummary(profile) || '',
  organization: existingApplication?.organization || getCurrentUserAffiliation(profile) || '',
  linkedinUrl: existingApplication?.linkedinUrl || '',
  portfolioUrl: existingApplication?.portfolioUrl || '',
  availability: existingApplication?.availability || '',
  yearsExperience: existingApplication?.yearsExperience || '',
  skills: Array.isArray(existingApplication?.skills)
    ? existingApplication.skills.join(', ')
    : existingApplication?.skills || '',
  motivation: existingApplication?.motivation || '',
  resumeFileName: existingApplication?.resumeFileName || '',
  resumeFileUrl: existingApplication?.resumeFileUrl || '',
  resumeSummary: existingApplication?.resumeSummary || '',
  resumeAutofillUsed: Boolean(existingApplication?.resumeAutofillUsed),
})

export default function PositionDetailPage() {
  const { id } = useParams()
  const [position, setPosition] = useState(null)
  const [relatedPositions, setRelatedPositions] = useState([])
  const [existingApplication, setExistingApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const profile = readStoredProfile()
  const currentApplicantEmail = getCurrentUserEmail(profile)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [autofillingResume, setAutofillingResume] = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [applicationConflictState, setApplicationConflictState] = useState({
    emailRegistered: false,
    phoneRegistered: false,
  })
  const [form, setForm] = useState(() => buildApplicationForm(profile))

  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  useEffect(() => {
    let active = true

    const loadPosition = async () => {
      setLoading(true)
      setNotFound(false)

      try {
        const [positionData, allPositions, savedApplication] = await Promise.all([
          fetchPositionById(id),
          fetchPositions(),
          currentApplicantEmail
            ? fetchPositionApplication(id, currentApplicantEmail)
            : Promise.resolve(null),
        ])

        if (!active) return

        setPosition(positionData)
        setRelatedPositions(
          (Array.isArray(allPositions) ? allPositions : [])
            .filter((item) => String(item.id) !== String(positionData.id))
            .slice(0, 3),
        )
        setExistingApplication(savedApplication)
        setForm(buildApplicationForm(profile, savedApplication))
        setSubmitted(false)
        setResumeFile(null)
      } catch (error) {
        console.error('Failed to load position details:', error)
        if (!active) return
        setPosition(null)
        setRelatedPositions([])
        setExistingApplication(null)
        setSubmitted(false)
        setNotFound(error?.status === 404)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPosition()

    return () => {
      active = false
    }
  }, [id, currentApplicantEmail])

  useEffect(() => {
    if (!position?.id) return

    const trimmedEmail = form.email.trim()
    const trimmedPhone = form.phone.trim()
    const normalizedPhone = trimmedPhone.replace(/\D/g, '')
    const shouldCheckEmail = trimmedEmail.includes('@')
    const shouldCheckPhone = normalizedPhone.length >= 7

    if (!shouldCheckEmail && !shouldCheckPhone) {
      setApplicationConflictState({ emailRegistered: false, phoneRegistered: false })
      return
    }

    let active = true
    const timerId = window.setTimeout(async () => {
      try {
        const result = await checkPositionApplicationConflicts(position.id, {
          email: shouldCheckEmail ? trimmedEmail : '',
          phone: shouldCheckPhone ? trimmedPhone : '',
          excludeId: existingApplication?.id || '',
        })

        if (!active) return

        setApplicationConflictState({
          emailRegistered: Boolean(result?.emailRegistered),
          phoneRegistered: Boolean(result?.phoneRegistered),
        })
      } catch {
        if (!active) return
        setApplicationConflictState({ emailRegistered: false, phoneRegistered: false })
      }
    }, 350)

    return () => {
      active = false
      window.clearTimeout(timerId)
    }
  }, [existingApplication?.id, form.email, form.phone, position?.id])

  if (loading) {
    return (
      <div className="relative" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
        <Navbar currentPage="positions" />
        <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-12 lg:px-20 xl:px-28">
          <div className="overflow-hidden rounded-[36px] p-10 text-center md:p-16" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.4), transparent)' : 'linear-gradient(to bottom right, rgba(255,255,255,0.04), rgba(255,255,255,0.02), transparent)', boxShadow: isDayMode ? palette.shadowCard : '0 30px 120px rgba(0,0,0,0.45)' }}>
            <span className="inline-flex rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
              Loading Position
            </span>
            <h1 className="mt-6 type-heading-soft max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
              Pulling the latest role signal.
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-base leading-8 md:text-lg" style={{ color: palette.textSecondary }}>
              We are loading this position and its application details from the QSphere database.
            </p>
          </div>
        </main>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer />
        </div>
      </div>
    )
  }

  if (notFound || !position) {
    return (
      <div className="relative" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
        <Navbar currentPage="positions" />
        <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-12 lg:px-20 xl:px-28">
          <div className="overflow-hidden rounded-[36px] p-10 md:p-16" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.4), transparent)' : 'linear-gradient(to bottom right, rgba(255,255,255,0.04), rgba(255,255,255,0.02), transparent)', boxShadow: isDayMode ? palette.shadowCard : '0 30px 120px rgba(0,0,0,0.45)' }}>
            <span className="inline-flex rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
              Position Not Found
            </span>
            <h1 className="mt-6 max-w-3xl type-heading-soft" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
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
  const isPositionArchived = deadline.closed
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

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    if (digits.startsWith('03') && digits.length > 4) {
      return digits.slice(0, 4) + '-' + digits.slice(4)
    }
    return digits
  }

  const updateField = (key, value) => {
    if (key === 'phone') value = formatPhone(value)
    setForm((current) => ({ ...current, [key]: value }))
    if (key === 'email' || key === 'phone') {
      setApplicationConflictState((current) => ({
        ...current,
        ...(key === 'email' ? { emailRegistered: false } : {}),
        ...(key === 'phone' ? { phoneRegistered: false } : {}),
      }))
    }
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setResumeFile(file)
    setAutofillingResume(true)
    setForm((current) => ({
      ...current,
      resumeFileName: file.name,
      resumeFileUrl: '',
      resumeAutofillUsed: true,
    }))

    try {
      const resumeText = await extractResumeText(file)
      const autofill = parseResumeAutofill(resumeText, form.fullName)
      const detectedSkillList = autofill.skills?.length ? autofill.skills.join(', ') : ''
      const matchedCount = [
        autofill.fullName,
        autofill.email,
        autofill.phone,
        autofill.location,
        autofill.currentRole,
        autofill.organization,
        autofill.linkedinUrl,
        autofill.portfolioUrl,
        autofill.availability,
        autofill.yearsExperience,
        detectedSkillList,
        autofill.summary,
      ].filter(Boolean).length

      setForm((current) => ({
        ...current,
        fullName: autofill.fullName || current.fullName,
        email: autofill.email || current.email,
        phone: autofill.phone ? formatPhone(autofill.phone) : current.phone,
        location: autofill.location || current.location,
        currentRole: autofill.currentRole || current.currentRole,
        organization: autofill.organization || current.organization,
        linkedinUrl: autofill.linkedinUrl || current.linkedinUrl,
        portfolioUrl: autofill.portfolioUrl || current.portfolioUrl,
        availability: autofill.availability || current.availability,
        yearsExperience: autofill.yearsExperience || current.yearsExperience,
        skills: detectedSkillList || current.skills,
        resumeFileName: file.name,
        resumeFileUrl: '',
        resumeSummary: autofill.summary || current.resumeSummary,
        resumeAutofillUsed: true,
      }))

      showSnackbar(
        matchedCount > 0
          ? `CV parsed and ${matchedCount} field${matchedCount === 1 ? '' : 's'} were autofilled.`
          : 'CV uploaded. Autofill is best-effort, so a few details may still need manual review.',
        'success',
      )
    } catch {
      showSnackbar('CV attached. We could not fully parse this file, so please review the fields manually before submitting.', 'error')
    } finally {
      setAutofillingResume(false)
      event.target.value = ''
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!form.fullName.trim()) nextErrors.fullName = 'Name is required'
    if (!form.email.trim()) nextErrors.email = 'Email is required'
    else if (!form.email.includes('@')) nextErrors.email = 'Enter a valid email with @'
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required'
    if (!form.motivation.trim()) nextErrors.motivation = 'Tell them why you are a fit'

    const liveConflicts = await checkPositionApplicationConflicts(position.id, {
      email: form.email.trim(),
      phone: form.phone.trim(),
      excludeId: existingApplication?.id || '',
    }).catch(() => ({ emailRegistered: false, phoneRegistered: false }))

    if (liveConflicts.emailRegistered) {
      nextErrors.email = 'This email is already applied.'
    }

    if (liveConflicts.phoneRegistered) {
      nextErrors.phone = 'This phone number is already applied.'
    }

    setApplicationConflictState({
      emailRegistered: Boolean(liveConflicts.emailRegistered),
      phoneRegistered: Boolean(liveConflicts.phoneRegistered),
    })

    if (Object.keys(nextErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setErrors(nextErrors)
      showSnackbar('Please complete the required application fields.', 'error')
      return
    }

    setSubmitting(true)

    try {
      const hadExistingApplication = Boolean(existingApplication?.id)
      const application = await submitPositionApplication(position.id, {
        applicationId: existingApplication?.id || '',
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        currentRole: form.currentRole.trim(),
        organization: form.organization.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        portfolioUrl: form.portfolioUrl.trim(),
        availability: form.availability.trim(),
        yearsExperience: form.yearsExperience.trim(),
        skills: splitSkillTags(form.skills),
        motivation: form.motivation.trim(),
        resumeFileName: form.resumeFileName.trim(),
        resumeFileUrl: form.resumeFileUrl.trim(),
        resumeSummary: form.resumeSummary.trim(),
        resumeAutofillUsed: Boolean(form.resumeAutofillUsed),
        resumeFile,
      })

      setExistingApplication(application)
      setSubmitted(true)
      setForm(buildApplicationForm(profile, application))
      setApplicationConflictState({ emailRegistered: false, phoneRegistered: false })
      setResumeFile(null)
      setPosition((current) =>
        current
          ? {
              ...current,
              applicationCount: Number(current.applicationCount || 0) + (hadExistingApplication ? 0 : 1),
            }
          : current,
      )
      showSnackbar(hadExistingApplication ? 'Application updated successfully.' : 'Application submitted successfully.', 'success')
    } catch (error) {
      const message = error?.message || ''
      if (message.toLowerCase().includes('email is already applied')) {
        setApplicationConflictState((current) => ({ ...current, emailRegistered: true }))
        setErrors((current) => ({ ...current, email: 'This email is already applied.' }))
        showSnackbar('This email is already applied for this position.', 'error')
      } else if (message.toLowerCase().includes('phone number is already applied')) {
        setApplicationConflictState((current) => ({ ...current, phoneRegistered: true }))
        setErrors((current) => ({ ...current, phone: 'This phone number is already applied.' }))
        showSnackbar('This phone number is already applied for this position.', 'error')
      } else {
        showSnackbar(message || 'Unable to save your application right now.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
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
                  className="mt-7 max-w-3xl xl:max-w-[54rem] type-heading-soft"
                  style={{ fontFamily: 'var(--font-heading)', textShadow: isDayMode ? 'none' : '0 0 40px rgba(16,185,129,0.08)', color: palette.textPrimary }}
                >
                  {position.title}
                </h1>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Briefcase size={15} />
                      Role type
                    </div>
                    <div className="mt-4 text-base font-semibold md:text-[1.05rem]" style={{ color: palette.textPrimary }}>{position.type || 'Open role'}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <MapPin size={15} />
                      Work mode
                    </div>
                    <div className="mt-4 text-base font-semibold md:text-[1.05rem]" style={{ color: palette.textPrimary }}>{position.location || 'Flexible'}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Clock size={15} />
                      Deadline
                    </div>
                    <div className="mt-4 text-[1.1rem] font-semibold leading-[1.28] tracking-[-0.02em] md:text-[1.2rem]" style={{ color: palette.textPrimary }}>{deadline.closed ? 'Applications closed' : deadline.full}</div>
                  </div>
                  <div className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.85)' }}>
                      <Mail size={15} />
                      Contact point
                    </div>
                    <div className="mt-4 break-all text-base font-semibold leading-7 md:text-[1.02rem]" style={{ color: palette.textPrimary }}>{position.contact || 'Unavailable'}</div>
                  </div>
                </div>
              </div>

              <aside className="relative overflow-hidden rounded-[34px] p-6 md:p-7 xl:sticky xl:top-28" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,249,0.8))' : 'linear-gradient(180deg,rgba(5,10,8,0.94),rgba(4,8,7,0.72))', boxShadow: isDayMode ? palette.shadowCard : '0 20px 80px rgba(0,0,0,0.38)' }}>
                <div className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tone.edge}, transparent)` }} />

                <div className="rounded-[30px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary }}>Apply window</div>
                      <div className="type-statValue mt-3" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                        {deadline.closed ? 'Closed' : deadline.label}
                      </div>
                    </div>
                    <div className="rounded-2xl px-4 py-2 text-right" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.accentDark }}>Status</div>
                      <div className={`mt-1 text-base font-semibold ${deadline.closed ? 'opacity-50' : deadline.urgent ? 'text-red-500' : ''}`} style={{ color: deadline.closed ? palette.textSecondary : deadline.urgent ? (isDayMode ? '#dc2626' : '#ef4444') : palette.textPrimary }}>
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
                  <h2 className="type-sectionHeading mt-3" style={{ color: palette.textPrimary }}>Apply your way</h2>

                  <div className="mt-5 grid gap-3">
                    {isPositionArchived ? (
                      <div className="rounded-[24px] px-4 py-4 text-sm leading-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textSecondary }}>
                        This position is archived now, so this page is view-only and applications are closed.
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
              <h2 className="type-sectionHeading mt-5 max-w-2xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
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
              <h2 className="type-sectionHeading mt-5 max-w-xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
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

          {!isPositionArchived && (
          <section id="apply-panel" className="mt-8 overflow-hidden rounded-[34px] p-7 md:p-10" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))' : 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', boxShadow: isDayMode ? palette.shadowCard : '0 20px 80px rgba(0,0,0,0.34)' }}>
            <div className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Application cockpit</div>
                <h2 className="type-sectionHeading mt-4 max-w-xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  Apply with speed, clarity, and signal.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8" style={{ color: palette.textSecondary }}>
                  This quick-apply form saves your application directly to QSphere so the role owner can review it from the manage positions workspace without any manual handoff.
                </p>

                <div className="mt-6 rounded-[28px] p-5" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                  <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.accentDark }}>Best practice</div>
                  <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                    Keep your motivation tight, specific, and relevant to the role. Show evidence of fit, not just enthusiasm.
                  </p>
                </div>

                {submitted && (
                  <div className="mt-5 rounded-[24px] px-4 py-4 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    {existingApplication ? (
                      <>Your application for this position is already on file. No need to apply again.</>
                    ) : (
                      <>Your application is saved in the QSphere database and now appears in the manage positions view for the role owner.</>
                    )}
                  </div>
                )}
              </div>

              {submitted ? (
                <div className="flex flex-col items-center justify-center rounded-[30px] p-10 text-center" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.15)', color: palette.accentPrimary }}>
                    <Send size={24} />
                  </div>
                  <h3 className="mt-5 type-statValue" style={{ color: palette.textPrimary }}>
                    {existingApplication ? 'Application already submitted.' : 'Application submitted.'}
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-7" style={{ color: palette.textSecondary }}>
                    {existingApplication
                      ? 'Your application for this position is already on file. The role owner can review it from the manage positions workspace.'
                      : 'Your application has been saved to QSphere and sent to the manage positions workspace for the role owner.'}
                  </p>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="rounded-[30px] p-5 md:p-6" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.cardBg }}>
                <div className="rounded-[26px] p-4" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.accentDark }}>CV autofill</div>
                      <p className="mt-2 text-sm leading-7" style={{ color: palette.textSecondary }}>
                        Upload a CV to prefill the application fields faster. Text-based resumes work best, while PDF and DOCX files are handled best-effort.
                      </p>
                    </div>
                    <label
                      htmlFor="position-cv-upload"
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold"
                      style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                    >
                      <Upload size={16} />
                      {autofillingResume ? 'Reading CV...' : 'Upload CV'}
                    </label>
                  </div>
                  <input
                    id="position-cv-upload"
                    type="file"
                    accept=".txt,.md,.rtf,.json,.pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    className="hidden"
                  />

                  {form.resumeFileName && (
                    <div className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.18)', color: palette.textSecondary }}>
                      <div>Source CV: {form.resumeFileName}</div>
                      {form.resumeFileUrl && (
                        <a
                          href={form.resumeFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-2 no-underline"
                          style={{ color: palette.accentPrimary }}
                        >
                          <FileText size={14} />
                          Open uploaded CV
                        </a>
                      )}
                    </div>
                  )}
                </div>

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
                    {applicationConflictState.emailRegistered && (
                      <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>This email is already applied.</p>
                    )}
                    <div className={`mt-2 rounded-2xl border transition-colors ${errors.email || applicationConflictState.emailRegistered ? 'border-red-500' : ''}`} style={{ backgroundColor: palette.bgSecondary, borderColor: errors.email || applicationConflictState.emailRegistered ? '#ef4444' : palette.borderPrimary }}>
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
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Phone number *</label>
                  {applicationConflictState.phoneRegistered && (
                    <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>This phone number is already applied.</p>
                  )}
                  <div className={`mt-2 rounded-2xl border transition-colors ${errors.phone || applicationConflictState.phoneRegistered ? 'border-red-500' : ''}`} style={{ borderColor: errors.phone || applicationConflictState.phoneRegistered ? '#ef4444' : palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Phone size={16} style={{ color: palette.accentPrimary }} />
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(event) => updateField('phone', event.target.value)}
                        placeholder="+92..."
                        className="w-full bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>
                  {errors.phone && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{errors.phone}</p>}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Current role / degree</label>
                    <div className="mt-2 rounded-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Briefcase size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={form.currentRole}
                          onChange={(event) => updateField('currentRole', event.target.value)}
                          placeholder="Researcher, Student, Engineer..."
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Institute / organization</label>
                    <div className="mt-2 rounded-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Building2 size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={form.organization}
                          onChange={(event) => updateField('organization', event.target.value)}
                          placeholder="University, company, or lab"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Location</label>
                    <div className="mt-2 rounded-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <MapPin size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={form.location}
                          onChange={(event) => updateField('location', event.target.value)}
                          placeholder="City, country"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Availability</label>
                    <div className="mt-2 rounded-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Clock size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={form.availability}
                          onChange={(event) => updateField('availability', event.target.value)}
                          placeholder="Immediate, 2 weeks, Part-time..."
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>LinkedIn URL</label>
                    <div className="mt-2 rounded-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Link2 size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={form.linkedinUrl}
                          onChange={(event) => updateField('linkedinUrl', event.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Portfolio / website</label>
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
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Years of experience</label>
                    <div className="mt-2 rounded-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <FileText size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={form.yearsExperience}
                          onChange={(event) => updateField('yearsExperience', event.target.value)}
                          placeholder="e.g. 2 years"
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Key skills</label>
                    <div className="mt-2 rounded-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Sparkles size={16} style={{ color: palette.accentPrimary }} />
                        <input
                          type="text"
                          value={form.skills}
                          onChange={(event) => updateField('skills', event.target.value)}
                          placeholder="Qiskit, Python, Research, React..."
                          className="w-full bg-transparent outline-none"
                          style={{ color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {form.resumeSummary && (
                  <div className="mt-4 rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.92)' : 'rgba(0,0,0,0.18)' }}>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.accentPrimary }}>
                      <FileText size={12} />
                      CV summary
                    </div>
                    <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>{form.resumeSummary}</p>
                  </div>
                )}

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
                    {deadline.closed ? 'Applications closed' : submitting ? 'Saving application...' : 'Save application'}
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
              )}
            </div>
          </section>
          )}

          {relatedPositions.length > 0 && (
            <section className="mt-8 overflow-hidden rounded-[34px] p-7 md:p-10" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))' : 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', boxShadow: isDayMode ? palette.shadowCard : '0 20px 80px rgba(0,0,0,0.34)' }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>More openings</div>
                  <h2 className="type-sectionHeading mt-4 max-w-xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
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
                          <h3 className="mt-4 text-xl font-semibold leading-tight transition-colors group-hover:brightness-125" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
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
