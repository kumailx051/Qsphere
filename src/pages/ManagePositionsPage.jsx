import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  User,
  X,
  XCircle,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import { parsePositionDeadline, splitPositionRequirements } from '../utils/positionStore'
import { fetchManagedPositions, sendPositionApplicationDecision } from '../utils/opportunitiesApi'
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

const showSnackbar = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
}

const normalizeManagedPosition = (position = {}) => ({
  ...position,
  applicationCount: Number(position.applicationCount || 0),
  applications: Array.isArray(position.applications) ? position.applications : [],
})

const isManagedPositionArchived = (position) => parsePositionDeadline(position?.deadline).closed

const ManagePositionsPage = () => {
  const profile = readStoredProfile()
  const currentUserEmail = getCurrentUserEmail(profile)
  const currentUserName = getCurrentUserName(profile)
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [positionView, setPositionView] = useState('active')
  const [applicationIndex, setApplicationIndex] = useState(0)
  const [managedPositions, setManagedPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [decisionSubmittingId, setDecisionSubmittingId] = useState('')
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [interviewErrors, setInterviewErrors] = useState({})
  const [interviewForm, setInterviewForm] = useState({
    positionId: '',
    applicationId: '',
    applicantName: '',
    interviewDate: '',
    interviewTime: '',
    interviewLocation: '',
    nextStepNote: 'Please reply to confirm your availability for the interview.',
  })
  const { theme } = useTheme()

  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const activeManagedPositions = useMemo(
    () => managedPositions.filter((position) => !isManagedPositionArchived(position)),
    [managedPositions],
  )

  const archivedManagedPositions = useMemo(
    () => managedPositions.filter((position) => isManagedPositionArchived(position)),
    [managedPositions],
  )

  const visibleManagedPositions =
    positionView === 'archived' ? archivedManagedPositions : activeManagedPositions

  const resolvedSelectedPositionId =
    visibleManagedPositions.some((position) => String(position.id) === String(selectedPositionId))
      ? selectedPositionId
      : visibleManagedPositions[0]?.id || ''

  useEffect(() => {
    let active = true

    const loadManagedPositions = async () => {
      if (!currentUserEmail) {
        if (active) {
          setManagedPositions([])
          setLoading(false)
        }
        return
      }

      try {
        const data = await fetchManagedPositions(currentUserEmail)
        if (active) {
          setManagedPositions(
            Array.isArray(data) ? data.map(normalizeManagedPosition) : [],
          )
        }
      } catch (error) {
        console.error('Failed to load managed positions:', error)
        if (active) {
          setManagedPositions([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadManagedPositions()

    const refresh = () => {
      setLoading(true)
      loadManagedPositions()
    }

    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
    }
  }, [currentUserEmail])

  const selectedPosition =
    visibleManagedPositions.find((position) => String(position.id) === String(resolvedSelectedPositionId)) || null
  const selectedPositionArchived = selectedPosition ? isManagedPositionArchived(selectedPosition) : false
  const currentApplication = selectedPosition?.applications?.[applicationIndex] || null
  const totalApplications = managedPositions.reduce((sum, position) => sum + position.applicationCount, 0)
  const openPositions = activeManagedPositions.length
  const archivedPositionsCount = archivedManagedPositions.length
  const resumeAssistedCount = managedPositions.reduce(
    (sum, position) =>
      sum + position.applications.filter((application) => application.resumeAutofillUsed).length,
    0,
  )

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  useEffect(() => {
    setApplicationIndex(0)
  }, [resolvedSelectedPositionId, positionView])

  useEffect(() => {
    if (!selectedPosition?.applications?.length) {
      if (applicationIndex !== 0) setApplicationIndex(0)
      return
    }

    if (applicationIndex > selectedPosition.applications.length - 1) {
      setApplicationIndex(0)
    }
  }, [selectedPosition?.applications?.length, applicationIndex])

  const applyApplicationUpdate = (positionId, updatedApplication) => {
    setManagedPositions((current) =>
      current.map((position) =>
        String(position.id) !== String(positionId)
          ? position
          : {
              ...position,
              applications: position.applications.map((application) =>
                String(application.id) === String(updatedApplication.id)
                  ? { ...application, ...updatedApplication }
                  : application,
              ),
            },
      ),
    )
  }

  const openInterviewModal = (position, application) => {
    setInterviewErrors({})
    setInterviewForm({
      positionId: String(position.id),
      applicationId: String(application.id),
      applicantName: application.fullName || '',
      interviewDate: application.interviewDate ? String(application.interviewDate).slice(0, 10) : '',
      interviewTime: application.interviewTime || '',
      interviewLocation: application.interviewLocation || '',
      nextStepNote:
        application.decisionStatus === 'accepted' && application.decisionNote
          ? application.decisionNote
          : 'Please reply to confirm your availability for the interview.',
    })
    setShowInterviewModal(true)
  }

  const closeInterviewModal = () => {
    if (decisionSubmittingId) return
    setShowInterviewModal(false)
  }

  const handleRejectApplication = async (position, application) => {
    const confirmed = window.confirm(`Send rejection email to ${application.fullName}?`)
    if (!confirmed) return

    try {
      setDecisionSubmittingId(String(application.id))
      const updated = await sendPositionApplicationDecision(position.id, application.id, {
        decisionStatus: 'rejected',
        ownerEmail: currentUserEmail,
        senderName: currentUserName,
        encouragementNote:
          'Thank you again for your interest in QSphere. We encourage you to apply again in the future for roles that align with your profile.',
      })
      applyApplicationUpdate(position.id, updated)
      showSnackbar(`Rejection email sent to ${application.fullName}.`, 'success')
    } catch (error) {
      showSnackbar(error.message || 'Failed to send rejection email.', 'error')
    } finally {
      setDecisionSubmittingId('')
    }
  }

  const handleInterviewSave = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!interviewForm.interviewDate) nextErrors.interviewDate = 'Interview date is required'
    if (!interviewForm.interviewLocation.trim()) nextErrors.interviewLocation = 'Interview location is required'

    if (Object.keys(nextErrors).length > 0) {
      setInterviewErrors(nextErrors)
      showSnackbar('Please complete the interview details.', 'error')
      return
    }

    try {
      setDecisionSubmittingId(String(interviewForm.applicationId))
      const updated = await sendPositionApplicationDecision(interviewForm.positionId, interviewForm.applicationId, {
        decisionStatus: 'accepted',
        ownerEmail: currentUserEmail,
        senderName: currentUserName,
        interviewDate: interviewForm.interviewDate,
        interviewTime: interviewForm.interviewTime.trim(),
        interviewLocation: interviewForm.interviewLocation.trim(),
        nextStepNote: interviewForm.nextStepNote.trim(),
      })
      applyApplicationUpdate(interviewForm.positionId, updated)
      setShowInterviewModal(false)
      showSnackbar(`Interview invitation sent to ${interviewForm.applicantName}.`, 'success')
    } catch (error) {
      showSnackbar(error.message || 'Failed to send interview invitation.', 'error')
    } finally {
      setDecisionSubmittingId('')
    }
  }

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
            <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(6,182,212,0.14)' : 'rgba(6,182,212,0.10)' }} />

            <div className="relative z-10 grid gap-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
              <div>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary }} />
                    Position control
                  </span>
                </div>

                <h1 className="type-heading-soft max-w-3xl xl:max-w-[54rem]" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  Review applicants
                  <br />
                  <span style={{ color: palette.accentPrimary }}>with signal, not clutter.</span>
                </h1>

                <p className="type-bodyText mt-7 max-w-3xl" style={{ color: palette.textSecondary }}>
                  {currentUserName}, every application for the positions you posted can be reviewed here. Resume-assisted submissions, motivation notes, and contact details all land in one place.
                </p>

                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    { label: 'Managed positions', value: String(managedPositions.length).padStart(2, '0') },
                    { label: 'Applications', value: String(totalApplications).padStart(2, '0') },
                    { label: 'Archived positions', value: String(archivedPositionsCount).padStart(2, '0') },
                  ].map((item) => (
                    <motion.div key={item.label} variants={itemVariants} className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.2)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>{item.label}</div>
                      <div className="type-statValue mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>{item.value}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <div className="rounded-[34px] p-6 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))' : 'linear-gradient(180deg, rgba(5,10,8,0.92), rgba(4,8,7,0.74))' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Hiring pulse</div>
                <h2 className="type-sectionHeading mt-4 max-w-xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  {openPositions} position{openPositions === 1 ? '' : 's'} still open
                </h2>
                <p className="mt-5 text-sm leading-7" style={{ color: palette.textSecondary }}>
                  Candidates who upload a CV can now prefill their application data faster, and those richer submissions appear here automatically.
                </p>

                <div className="mt-5 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.03)', color: palette.textSecondary }}>
                  {openPositions} active · {archivedPositionsCount} archived · {resumeAssistedCount} CV autofills
                </div>

                <div className="mt-7 grid gap-3">
                  <Link
                    to="/positions/new"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold no-underline transition-all"
                    style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                  >
                    Post another opening
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/positions"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold no-underline transition-all"
                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                  >
                    Browse public positions
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
                <Briefcase size={26} />
              </div>
              <h2 className="type-sectionHeading mt-6" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Loading your managed positions...
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                Pulling the latest applications from your QSphere database.
              </p>
            </motion.section>
          ) : !managedPositions.length ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 rounded-[34px] p-10 text-center"
              style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.03)' }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                <Briefcase size={26} />
              </div>
              <h2 className="type-sectionHeading mt-6" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Your managed positions will appear here.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                This page only tracks positions posted through your own dashboard flow. Create a position first, then incoming applications will appear here automatically.
              </p>
              <Link
                to="/positions/new"
                className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline"
                style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
              >
                Create a position
                <ArrowRight size={16} />
              </Link>
            </motion.section>
          ) : (
            <section className="mt-10 grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
              <div className="rounded-[34px] p-6 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Managed positions</div>
                    <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                      Pick a role.
                    </h2>
                  </div>
                  <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                    {managedPositions.length} total
                  </span>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  {[
                    { key: 'active', label: 'Active', count: activeManagedPositions.length },
                    { key: 'archived', label: 'Archived', count: archivedManagedPositions.length },
                  ].map((tab) => {
                    const activeTab = positionView === tab.key

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setPositionView(tab.key)}
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
                  {visibleManagedPositions.length === 0 ? (
                    <div className="rounded-[24px] p-4 text-sm leading-7" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.18)', color: palette.textSecondary }}>
                      {positionView === 'archived'
                        ? 'Archived positions will appear here once their deadlines pass.'
                        : 'Active positions will appear here once you post them from your dashboard.'}
                    </div>
                  ) : visibleManagedPositions.map((position) => {
                    const active = String(position.id) === String(resolvedSelectedPositionId)
                    const deadline = parsePositionDeadline(position.deadline)
                    const archived = isManagedPositionArchived(position)

                    return (
                      <button
                        key={position.id}
                        type="button"
                        onClick={() => setSelectedPositionId(position.id)}
                        className="w-full rounded-[24px] p-4 text-left transition-all"
                        style={{
                          border: `1px solid ${active ? palette.accentBorder : palette.borderPrimary}`,
                          backgroundColor: active ? palette.accentSoft : isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.18)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: active ? palette.accentPrimary : palette.textMuted }}>
                              {archived ? 'Expired' : deadline.label}
                            </div>
                            <div className="type-statValue mt-3" style={{ color: palette.textPrimary }}>{position.title}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ border: `1px solid ${active ? palette.accentBorder : palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.04)', color: palette.textSecondary }}>
                              <Send size={12} />
                              {position.applicationCount}
                            </span>
                            {archived && (
                              <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ border: '1px solid rgba(239,68,68,0.22)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                                Expired
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 text-sm" style={{ color: palette.textSecondary }}>{position.location}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-[34px] p-6 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))' : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))' }}>
                {selectedPosition && (
                  <>
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Selected position</div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <h2 className="type-sectionHeading leading-tight" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                            {selectedPosition.title}
                          </h2>
                          {selectedPositionArchived && (
                            <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: '1px solid rgba(239,68,68,0.22)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                              Expired
                            </span>
                          )}
                        </div>
                        <p className="mt-4 max-w-3xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                          {selectedPosition.description || 'Applications and applicant details for this position are organized below.'}
                        </p>
                      </div>
                      <Link
                        to={`/positions/${selectedPosition.id}`}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold no-underline"
                        style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                      >
                        Open public page
                        <ArrowRight size={15} />
                      </Link>
                    </div>

                    <div className="mt-7 grid gap-4 md:grid-cols-3">
                      {[
                        { icon: Briefcase, label: 'Type', value: selectedPosition.type || 'Open role' },
                        { icon: MapPin, label: 'Location', value: selectedPosition.location || 'Flexible' },
                        { icon: Clock, label: 'Deadline', value: parsePositionDeadline(selectedPosition.deadline).full },
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

                    {splitPositionRequirements(selectedPosition.requirements).length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {splitPositionRequirements(selectedPosition.requirements).map((requirement) => (
                          <span key={requirement} className="inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.18)', color: palette.textSecondary }}>
                            {requirement}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-8 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.textMuted }}>Applicant list</div>
                        <h3 className="mt-3 type-statValue" style={{ color: palette.textPrimary }}>
                          {selectedPosition.applicationCount} application{selectedPosition.applicationCount === 1 ? '' : 's'}
                        </h3>
                      </div>
                      <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                        {selectedPositionArchived ? 'Archived record' : 'Live intake'}
                      </span>
                    </div>

                    {selectedPosition.applications.length === 0 ? (
                      <div className="mt-6 rounded-[26px] p-6 text-center" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.18)' }}>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                          <Sparkles size={18} />
                        </div>
                        <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                          No applications have landed yet. Once candidates submit the application form from the public position page, their details will appear here.
                        </p>
                      </div>
                    ) : currentApplication ? (
                      <div className="mt-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold" style={{ color: palette.textSecondary }}>
                            Applicant {applicationIndex + 1} of {selectedPosition.applications.length}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setApplicationIndex((current) =>
                                  current === 0 ? selectedPosition.applications.length - 1 : current - 1,
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
                                setApplicationIndex((current) =>
                                  current === selectedPosition.applications.length - 1 ? 0 : current + 1,
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

                        <div key={currentApplication.id || `${currentApplication.positionId}-${currentApplication.email}`} className="rounded-[26px] p-5" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.03)' }}>
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="type-statValue" style={{ color: palette.textPrimary }}>{currentApplication.fullName}</div>
                                <div className="mt-2 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>
                                  Applied {formatDateTime(currentApplication.updatedAt || currentApplication.createdAt)}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span
                                  className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                                  style={{
                                    border: `1px solid ${
                                      currentApplication.decisionStatus === 'accepted'
                                        ? palette.accentBorder
                                        : currentApplication.decisionStatus === 'rejected'
                                          ? 'rgba(239,68,68,0.22)'
                                          : palette.borderPrimary
                                    }`,
                                    backgroundColor:
                                      currentApplication.decisionStatus === 'accepted'
                                        ? palette.accentSoft
                                        : currentApplication.decisionStatus === 'rejected'
                                          ? 'rgba(239,68,68,0.08)'
                                          : isDayMode
                                            ? 'rgba(255,255,255,0.82)'
                                            : 'rgba(0,0,0,0.2)',
                                    color:
                                      currentApplication.decisionStatus === 'accepted'
                                        ? palette.accentPrimary
                                        : currentApplication.decisionStatus === 'rejected'
                                          ? '#dc2626'
                                          : palette.textSecondary,
                                  }}
                                >
                                  {currentApplication.decisionStatus || 'pending'}
                                </span>
                                {currentApplication.currentRole && (
                                  <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                                    {currentApplication.currentRole}
                                  </span>
                                )}
                                {currentApplication.resumeAutofillUsed && (
                                  <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)', color: palette.textSecondary }}>
                                    CV autofill
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => openInterviewModal(selectedPosition, currentApplication)}
                                disabled={decisionSubmittingId === String(currentApplication.id)}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                              >
                                <CheckCircle2 size={13} />
                                {currentApplication.decisionStatus === 'accepted' ? 'Update interview' : 'Accept applicant'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectApplication(selectedPosition, currentApplication)}
                                disabled={decisionSubmittingId === String(currentApplication.id)}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ border: '1px solid rgba(239,68,68,0.24)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
                              >
                                <XCircle size={13} />
                                {currentApplication.decisionStatus === 'rejected' ? 'Reject again' : 'Reject applicant'}
                              </button>
                            </div>

                            {currentApplication.decisionStatus === 'accepted' && (currentApplication.interviewDate || currentApplication.interviewLocation) && (
                              <div className="mt-4 rounded-[22px] p-4" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }}>
                                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.accentPrimary }}>Interview invitation</div>
                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                  <div className="rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.18)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: palette.textMuted }}>Date</div>
                                    <div className="mt-2 text-sm font-semibold" style={{ color: palette.textPrimary }}>{currentApplication.interviewDate || 'Not set'}</div>
                                  </div>
                                  <div className="rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.18)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: palette.textMuted }}>Time</div>
                                    <div className="mt-2 text-sm font-semibold" style={{ color: palette.textPrimary }}>{currentApplication.interviewTime || 'To be confirmed'}</div>
                                  </div>
                                  <div className="rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.18)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: palette.textMuted }}>Location</div>
                                    <div className="mt-2 text-sm font-semibold" style={{ color: palette.textPrimary }}>{currentApplication.interviewLocation || 'Not set'}</div>
                                  </div>
                                </div>
                                {currentApplication.decisionNote && (
                                  <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>{currentApplication.decisionNote}</p>
                                )}
                              </div>
                            )}

                            {currentApplication.decisionStatus === 'rejected' && currentApplication.decisionNote && (
                              <div className="mt-4 rounded-[22px] p-4" style={{ border: '1px solid rgba(239,68,68,0.14)', backgroundColor: 'rgba(239,68,68,0.05)' }}>
                                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#dc2626' }}>Rejection note sent</div>
                                <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>{currentApplication.decisionNote}</p>
                              </div>
                            )}

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <Mail size={15} style={{ color: palette.accentPrimary }} />
                                <a href={`mailto:${currentApplication.email}`} className="truncate text-sm no-underline" style={{ color: palette.textSecondary }}>
                                  {currentApplication.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <Phone size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentApplication.phone || 'No phone added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <Briefcase size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentApplication.currentRole || 'No current role added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <User size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentApplication.organization || 'No organization added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <MapPin size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentApplication.location || 'No location added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <Clock size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentApplication.availability || 'No availability added'}</span>
                              </div>
                              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                                <FileText size={15} style={{ color: palette.accentPrimary }} />
                                <span className="truncate text-sm" style={{ color: palette.textSecondary }}>{currentApplication.yearsExperience || 'No experience added'}</span>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.9)' : 'rgba(0,0,0,0.18)' }}>
                                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>LinkedIn URL</div>
                                {currentApplication.linkedinUrl ? (
                                  <a href={currentApplication.linkedinUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm no-underline" style={{ color: palette.textSecondary }}>
                                    <ExternalLink size={14} style={{ color: palette.accentPrimary }} />
                                    <span className="truncate">{currentApplication.linkedinUrl}</span>
                                  </a>
                                ) : (
                                  <div className="mt-2 text-sm" style={{ color: palette.textSecondary }}>No LinkedIn URL added</div>
                                )}
                              </div>
                              <div className="rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.9)' : 'rgba(0,0,0,0.18)' }}>
                                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>Portfolio / website</div>
                                {currentApplication.portfolioUrl ? (
                                  <a href={currentApplication.portfolioUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm no-underline" style={{ color: palette.textSecondary }}>
                                    <ExternalLink size={14} style={{ color: palette.accentPrimary }} />
                                    <span className="truncate">{currentApplication.portfolioUrl}</span>
                                  </a>
                                ) : (
                                  <div className="mt-2 text-sm" style={{ color: palette.textSecondary }}>No portfolio URL added</div>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.02)' }}>
                              <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>Key skills</div>
                              {currentApplication.skills?.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {currentApplication.skills.map((skill) => (
                                    <span key={skill} className="inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.02)', color: palette.textSecondary }}>
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>No key skills were shared.</p>
                              )}
                            </div>

                            <div className="mt-5 rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.9)' : 'rgba(0,0,0,0.18)' }}>
                              <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.accentPrimary }}>Why they are a fit</div>
                              <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                                {currentApplication.motivation || 'No motivation note was shared.'}
                              </p>
                            </div>

                            <div className="mt-4 rounded-[22px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.02)' }}>
                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.textMuted }}>
                                <FileText size={12} />
                                Applicant CV
                              </div>

                              <div className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                                {currentApplication.resumeFileName ? `Source file: ${currentApplication.resumeFileName}` : 'No CV file was uploaded.'}
                              </div>

                              {currentApplication.resumeSummary && (
                                <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                                  {currentApplication.resumeSummary}
                                </p>
                              )}

                              {currentApplication.resumeFileUrl && (
                                <div className="mt-4 flex flex-wrap gap-3">
                                  <a
                                    href={currentApplication.resumeFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold no-underline"
                                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textSecondary }}
                                  >
                                    <FileText size={13} style={{ color: palette.accentPrimary }} />
                                    Open CV
                                  </a>
                                  <a
                                    href={currentApplication.resumeFileUrl}
                                    download={currentApplication.resumeFileName || true}
                                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold no-underline"
                                    style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                                  >
                                    <FileText size={13} />
                                    Download CV
                                  </a>
                                </div>
                              )}
                            </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
                {!selectedPosition && (
                  <div className="rounded-[26px] p-6 text-center" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.18)' }}>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                      <Sparkles size={18} />
                    </div>
                    <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      {positionView === 'archived'
                        ? 'No archived position records are available yet.'
                        : 'Choose an active position from the left to review its applications.'}
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

      {showInterviewModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8"
          style={{ backgroundColor: 'rgba(3, 8, 6, 0.58)', backdropFilter: 'blur(8px)' }}
          onClick={closeInterviewModal}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-[32px] p-6 md:p-7"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode
                ? 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,247,245,0.95))'
                : 'linear-gradient(145deg, rgba(7,12,10,0.98), rgba(4,8,7,0.92))',
              boxShadow: isDayMode
                ? '0 30px 120px rgba(15,23,42,0.18)'
                : '0 30px 120px rgba(0,0,0,0.62)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>
                  Interview scheduling
                </div>
                <h2 className="type-sectionHeading mt-4 leading-tight" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  Invite {interviewForm.applicantName}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                  Choose the interview details below. When you save, the acceptance email will be sent immediately to the applicant.
                </p>
              </div>

              <button
                type="button"
                onClick={closeInterviewModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all"
                style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.03)', color: palette.textSecondary }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInterviewSave} className="mt-8">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Interview date *</label>
                  <div className="mt-2 rounded-2xl border" style={{ borderColor: interviewErrors.interviewDate ? '#ef4444' : palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Calendar size={16} style={{ color: palette.accentPrimary }} />
                      <input
                        type="date"
                        value={interviewForm.interviewDate}
                        onChange={(event) => setInterviewForm((current) => ({ ...current, interviewDate: event.target.value }))}
                        className="w-full bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>
                  {interviewErrors.interviewDate && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{interviewErrors.interviewDate}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Interview time</label>
                  <div className="mt-2 rounded-2xl border" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Clock size={16} style={{ color: palette.accentPrimary }} />
                      <input
                        type="time"
                        value={interviewForm.interviewTime}
                        onChange={(event) => setInterviewForm((current) => ({ ...current, interviewTime: event.target.value }))}
                        className="w-full bg-transparent outline-none"
                        style={{ color: palette.textPrimary }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Interview location *</label>
                <div className="mt-2 rounded-2xl border" style={{ borderColor: interviewErrors.interviewLocation ? '#ef4444' : palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <MapPin size={16} style={{ color: palette.accentPrimary }} />
                    <input
                      type="text"
                      value={interviewForm.interviewLocation}
                      onChange={(event) => setInterviewForm((current) => ({ ...current, interviewLocation: event.target.value }))}
                      placeholder="Office address, Google Meet link, Zoom link..."
                      className="w-full bg-transparent outline-none"
                      style={{ color: palette.textPrimary }}
                    />
                  </div>
                </div>
                {interviewErrors.interviewLocation && <p className="mt-2 text-xs" style={{ color: '#ef4444' }}>{interviewErrors.interviewLocation}</p>}
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Next step note</label>
                <div className="mt-2 rounded-2xl border" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                  <textarea
                    value={interviewForm.nextStepNote}
                    onChange={(event) => setInterviewForm((current) => ({ ...current, nextStepNote: event.target.value }))}
                    rows={4}
                    placeholder="Please reply to confirm your availability for the interview."
                    className="w-full resize-none bg-transparent px-4 py-3.5 outline-none"
                    style={{ color: palette.textPrimary }}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={decisionSubmittingId === interviewForm.applicationId}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                >
                  <Send size={16} />
                  {decisionSubmittingId === interviewForm.applicationId ? 'Sending invitation...' : 'Save & send email'}
                </button>
                <button
                  type="button"
                  onClick={closeInterviewModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all"
                  style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagePositionsPage
