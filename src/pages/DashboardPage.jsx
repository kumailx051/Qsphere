import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  BookPlus,
  Briefcase,
  Building2,
  CalendarPlus,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  PenLine,
  Sparkles,
  Telescope,
  UserCog,
  Users2,
} from 'lucide-react'
import { onboardingCommonFields, onboardingRoleFields, onboardingRoles } from '../data/onboarding'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

const storageKey = 'qsphere_onboarding_profile'

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

const profileKeyMap = {
  email: 'emailAddress',
  cellAlt: 'cellAlternative',
  dob: 'dateOfBirth',
  graduationDate: 'dateOfGraduation',
}

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const readProfileValue = (profile, fieldName) => {
  if (!profile) return ''

  if (fieldName === 'email') {
    return profile.emailAddress || profile.email || ''
  }

  return profile[profileKeyMap[fieldName] || fieldName] || ''
}

const getInitials = (name) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'QS'
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() || '').join('')
}

const getCompletion = (profile, roleId) => {
  const roleFields = onboardingRoleFields[roleId] || []
  const requiredFields = [
    'fullName',
    ...onboardingCommonFields.filter((field) => field.required).map((field) => field.name),
    ...roleFields.filter((field) => field.required).map((field) => field.name),
  ]

  const total = requiredFields.length
  const completed = requiredFields.filter((fieldName) => String(readProfileValue(profile, fieldName)).trim()).length

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
  }
}

const firstFilled = (...values) => values.find((value) => String(value || '').trim()) || ''

const buildProfileSignal = (profile, roleConfig) => {
  const base = {
    baseLabel: 'Base',
    baseValue: firstFilled(profile.institute, profile.organization, profile.city) || 'Add your base details',
    trackLabel: 'Focus',
    trackValue: firstFilled(profile.researchFocus, profile.researchInterest, profile.interests, profile.majors) || 'Define your direction',
    note: roleConfig.description,
  }

  if (roleConfig.id === 'student') {
    return {
      ...base,
      baseLabel: 'Institute',
      baseValue: profile.institute || 'Add your institute',
      trackLabel: 'Study track',
      trackValue: [profile.degree, profile.semester].filter(Boolean).join(' - ') || 'Add your degree and semester',
      note: profile.interests || profile.majors || roleConfig.description,
    }
  }

  if (roleConfig.id === 'graduate') {
    return {
      ...base,
      baseLabel: 'Institute',
      baseValue: profile.institute || 'Add your institute',
      trackLabel: 'Discipline',
      trackValue: [profile.degree, profile.discipline].filter(Boolean).join(' - ') || 'Add your degree and discipline',
      note: profile.interests || roleConfig.description,
    }
  }

  if (roleConfig.id === 'industry') {
    return {
      ...base,
      baseLabel: 'Organization',
      baseValue: profile.organization || 'Add your organization',
      trackLabel: 'Role',
      trackValue: [profile.roleTitle, profile.jobDescription].filter(Boolean).join(' - ') || 'Add your professional role',
      note: profile.degree || roleConfig.description,
    }
  }

  if (roleConfig.id === 'faculty') {
    return {
      ...base,
      baseLabel: 'Institute',
      baseValue: profile.institute || 'Add your institute',
      trackLabel: 'Academic post',
      trackValue: [profile.designation, profile.post].filter(Boolean).join(' - ') || 'Add your designation',
      note: profile.researchInterest || roleConfig.description,
    }
  }

  if (roleConfig.id === 'researcher') {
    return {
      ...base,
      baseLabel: 'Institute',
      baseValue: profile.institute || 'Add your institute',
      trackLabel: 'Research focus',
      trackValue: profile.researchFocus || 'Add your research focus',
      note: profile.interests || roleConfig.description,
    }
  }

  return base
}

const formatDateLabel = (value) => {
  if (!value) return 'Recently joined'

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Recently joined'

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const StatCard = ({ label, value, tone, palette, isDayMode }) => (
  <motion.div
    variants={itemVariants}
    className="rounded-[28px] p-5 backdrop-blur-xl"
    style={{
      border: `1px solid ${palette.borderPrimary}`,
      backgroundColor: isDayMode ? 'rgba(255,255,255,0.76)' : 'rgba(0,0,0,0.2)',
    }}
  >
    <div className="type-labelText" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>{label}</div>
    <div
      className="type-statValue mt-4 break-words"
      style={{
        fontFamily: 'var(--font-heading)',
        color: tone || palette.textPrimary,
      }}
    >
      {value}
    </div>
  </motion.div>
)

const ActionCard = ({ icon: Icon, title, description, to, onClick, accent, palette, isDayMode }) => {
  const content = (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-[32px] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 md:p-7"
      style={{
        minHeight: 240,
        border: `1px solid ${palette.borderPrimary}`,
        background: isDayMode
          ? 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(247,247,245,0.88))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
        boxShadow: isDayMode ? '0 24px 90px rgba(15,23,42,0.06)' : 'none',
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[32px] opacity-0 transition-opacity duration-700 group-hover:opacity-100" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent} 0%, transparent 72%)` }} />
      <div className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${isDayMode ? 'rgba(46,197,138,0.35)' : 'rgba(110,231,183,0.35)'}, transparent)` }} />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary, boxShadow: isDayMode ? '0 0 20px rgba(46,197,138,0.08)' : '0 0 20px rgba(16,185,129,0.12)' }}>
          <Icon size={24} />
        </div>

        <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Quick action</div>
        <h3 className="type-cardHeading mt-4 leading-tight transition-colors duration-300" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
          {title}
        </h3>
        <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>{description}</p>

        <div className="mt-auto pt-8">
          <span className="inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:gap-3" style={{ color: isDayMode ? palette.accentDark : palette.accentLight }}>
            Open
            <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </div>
  )

  if (to) {
    return <Link to={to} className="block no-underline">{content}</Link>
  }

  return <button type="button" onClick={onClick} className="block w-full border-0 bg-transparent p-0 text-left">{content}</button>
}

const RouteCard = ({ icon: Icon, label, description, to, palette, isDayMode }) => (
  <Link
    to={to}
    className="group flex items-center gap-4 rounded-[24px] px-5 py-4 no-underline transition-all duration-300 hover:-translate-y-0.5"
    style={{
      border: `1px solid ${palette.borderPrimary}`,
      backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.03)',
      color: palette.textSecondary,
    }}
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl transition-colors" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
      <Icon size={18} />
    </span>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold transition-colors" style={{ color: palette.textPrimary }}>{label}</div>
      <div className="mt-1 text-xs leading-5" style={{ color: palette.textMuted }}>{description}</div>
    </div>
    <ArrowRight size={15} className="transition-all group-hover:translate-x-1" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }} />
  </Link>
)

const DashboardPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useMemo(() => location.state?.profile ?? readStoredProfile(), [location.state])
  const { theme } = useTheme()

  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const roleConfig = useMemo(() => {
    if (!profile?.role) return onboardingRoles[0]
    return onboardingRoles.find((role) => role.id === profile.role) ?? onboardingRoles[0]
  }, [profile])

  const completion = useMemo(() => getCompletion(profile, roleConfig.id), [profile, roleConfig.id])
  const profileSignal = useMemo(() => buildProfileSignal(profile || {}, roleConfig), [profile, roleConfig])
  const joinedLabel = useMemo(
    () => formatDateLabel(profile?.created_at || profile?.submittedAt),
    [profile],
  )
  const isStudentRole = String(roleConfig?.id || profile?.role || '').toLowerCase() === 'student'

  const profileEmail = profile?.emailAddress || profile?.email || 'Email not available'
  const profileAvatar = profile?.profileImage || profile?.avatarPreview || ''

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  if (!profile) {
    return (
      <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
        <Navbar currentPage="dashboard" />

        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
          <div className="absolute inset-0" style={{ opacity: isDayMode ? 0.56 : 0.4, background: isDayMode ? 'radial-gradient(circle at 20% 0%, rgba(46,197,138,0.14) 0%, transparent 42%)' : 'radial-gradient(circle at 20% 0%, rgba(16,185,129,0.18) 0%, transparent 42%)' }} />
          <div className="absolute inset-0" style={{ opacity: isDayMode ? 0.24 : 0.2, background: isDayMode ? 'radial-gradient(circle at 100% 0%, rgba(255,224,163,0.16) 0%, transparent 36%)' : 'radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12) 0%, transparent 36%)' }} />
        </div>

        <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-24 pt-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl rounded-[36px] p-8 text-center md:p-10"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode
                ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
              boxShadow: isDayMode ? '0 40px 120px rgba(15,23,42,0.08)' : '0 40px 120px rgba(0,0,0,0.45)',
            }}
          >
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[24px]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary, boxShadow: isDayMode ? '0 0 30px rgba(46,197,138,0.08)' : '0 0 30px rgba(16,185,129,0.12)' }}>
              <LayoutDashboard size={30} />
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Dashboard</div>
            <h1 className="type-heading-soft mt-4 max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
              Your control room is ready,
              <br />
              <span style={{ color: palette.accentPrimary }}>but your profile comes first.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
              Complete onboarding so QSphere can shape the dashboard around your role, your work, and the rooms that matter most to you.
            </p>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
              style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}
            >
              Start onboarding
              <ArrowRight size={16} />
            </button>
          </motion.div>
        </main>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer />
        </div>
      </div>
    )
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
            <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(255,224,163,0.18)' : 'rgba(6,182,212,0.10)' }} />

            <div className="relative z-10 grid gap-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
              <div>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary, boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.45)' : '0 0 18px rgba(16,185,129,0.8)' }} />
                    Personal Dashboard
                  </span>

                </div>

                <h1
                  className="type-heading-soft max-w-3xl xl:max-w-[54rem]"
                  style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary, textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.55)' : '0 0 40px rgba(16,185,129,0.08)' }}
                >
                  Your quantum control room,
                  <br />
                  <span style={{ color: palette.accentPrimary }}>shaped around your role.</span>
                </h1>

                <p className="mt-7 max-w-3xl text-base leading-8" style={{ color: palette.textSecondary }}>
                  Move quickly between publishing, collaboration, opportunities, and account controls without the dashboard feeling noisy or overloaded.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/account', { state: { profile } })}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
                    style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}
                  >
                    Manage account
                    <ArrowRight size={16} />
                  </button>
                  <a
                    href="#dashboard-actions"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                    style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                  >
                    Open actions
                    <ArrowRight size={16} />
                  </a>
                </div>

                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                  <StatCard label="Role track" value={roleConfig.label} tone={isDayMode ? palette.accentDark : palette.accentLight} palette={palette} isDayMode={isDayMode} />
                  <StatCard label="Profile completion" value={`${completion.percentage}%`} palette={palette} isDayMode={isDayMode} />
                  <StatCard label="Member since" value={joinedLabel} palette={palette} isDayMode={isDayMode} />
                </motion.div>
              </div>

              <div
                className="relative overflow-hidden rounded-[34px] p-6 md:p-7"
                style={{
                  border: `1px solid ${palette.borderPrimary}`,
                  background: isDayMode
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))'
                    : 'linear-gradient(180deg, rgba(5,10,8,0.92), rgba(4,8,7,0.74))',
                  boxShadow: isDayMode ? '0 24px 90px rgba(15,23,42,0.08)' : '0 24px 90px rgba(0,0,0,0.42)',
                }}
              >
                <div className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${isDayMode ? 'rgba(46,197,138,0.4)' : 'rgba(110,231,183,0.4)'}, transparent)` }} />
                <div className="absolute right-0 top-0 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(16,185,129,0.10)' }} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Profile signal</div>
                      <h2 className="type-cardHeading mt-4 leading-tight" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                        {profile.fullName || 'Explorer'}
                      </h2>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-lg font-bold shadow-[0_0_18px_rgba(16,185,129,0.18)]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.86)' : 'rgba(0,0,0,0.3)', color: palette.textPrimary }}>
                      {profileAvatar ? (
                        <img src={profileAvatar} alt={profile.fullName || 'Profile avatar'} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(profile.fullName)
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="inline-flex items-center rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}>
                      {roleConfig.eyebrow}
                    </span>
                    {profile.city && (
                      <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.04)', color: palette.textMuted }}>
                        <MapPin size={12} style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }} />
                        {profile.city}
                      </span>
                    )}
                  </div>

                  <p className="mt-6 text-base leading-8" style={{ color: palette.textSecondary }}>{profileSignal.note}</p>

                  <div className="mt-7 grid gap-3">
                    <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}>
                      <Building2 size={15} style={{ color: palette.accentPrimary }} />
                      <span className="text-sm font-medium" style={{ color: palette.textSecondary }}>{profileSignal.baseLabel}: {profileSignal.baseValue}</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}>
                      <Telescope size={15} style={{ color: palette.accentPrimary }} />
                      <span className="text-sm font-medium" style={{ color: palette.textSecondary }}>{profileSignal.trackLabel}: {profileSignal.trackValue}</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}>
                      <Mail size={15} style={{ color: palette.accentPrimary }} />
                      <span className="truncate text-sm font-medium" style={{ color: palette.textSecondary }}>{profileEmail}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/account', { state: { profile } })}
                    className="mt-7 inline-flex items-center gap-2 text-sm font-semibold transition-all hover:gap-3"
                    style={{ color: isDayMode ? palette.accentDark : palette.accentLight }}
                  >
                    Refine profile
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="mt-10 flex items-center gap-4 px-2"
            aria-hidden="true"
          >
            <div
              className="h-px flex-1"
              style={{
                background: `linear-gradient(to right, transparent, ${isDayMode ? 'rgba(46,197,138,0.18)' : 'rgba(110,231,183,0.2)'}, transparent)`,
              }}
            />
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em]"
              style={{
                border: `1px solid ${palette.borderPrimary}`,
                backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.03)',
                color: palette.textMuted,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: palette.accentPrimary,
                  boxShadow: isDayMode ? '0 0 10px rgba(46,197,138,0.25)' : '0 0 12px rgba(16,185,129,0.45)',
                }}
              />
              Next layer
            </div>
            <div
              className="h-px flex-1"
              style={{
                background: `linear-gradient(to right, transparent, ${isDayMode ? 'rgba(46,197,138,0.18)' : 'rgba(110,231,183,0.2)'}, transparent)`,
              }}
            />
          </motion.div>

          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            id="dashboard-actions"
            className="mt-10"
          >
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Command deck</div>
                <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  Go straight to the work that matters.
                </h2>
              </div>
            </div>

            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  icon: PenLine,
                  title: 'Write a blog',
                  description: 'Publish ideas, research notes, and technical insight with the same editorial surface used across the journal.',
                  to: '/blogs/new',
                  accent: isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(16,185,129,0.14)',
                },
                {
                  icon: Users2,
                  title: 'Create a group',
                  description: 'Open a focused collaboration room for research, members, and delivery around a shared objective.',
                  to: '/groups/new',
                  accent: isDayMode ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.12)',
                },
                !isStudentRole && {
                  icon: CalendarPlus,
                  title: 'Post an event',
                  description: 'Schedule a workshop, seminar, meetup, or signal-rich session for the broader community.',
                  to: '/events/new',
                  accent: isDayMode ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.12)',
                },
                !isStudentRole && {
                  icon: Briefcase,
                  title: 'Post an opening',
                  description: 'Share internships, research roles, and collaboration opportunities with stronger context upfront.',
                  to: '/positions/new',
                  accent: isDayMode ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.12)',
                },
                {
                  icon: MessageSquare,
                  title: 'Start a discussion',
                  description: 'Post a thread, ask a question, or share an idea with the quantum community.',
                  to: '/threads',
                  accent: isDayMode ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.12)',
                },
                {
                  icon: UserCog,
                  title: 'Manage account',
                  description: 'Update identity, role details, and profile completeness without leaving the premium account surface.',
                  onClick: () => navigate('/account', { state: { profile } }),
                  accent: isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(16,185,129,0.12)',
                },
              ].filter(Boolean).map((item) => (
                <motion.div key={item.title} variants={itemVariants}>
                  <ActionCard {...item} palette={palette} isDayMode={isDayMode} />
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="mt-8 px-2"
            aria-hidden="true"
          >
            <div
              className="relative h-px w-full overflow-hidden rounded-full"
              style={{
                background: isDayMode
                  ? 'linear-gradient(90deg, transparent 0%, rgba(46,197,138,0.08) 18%, rgba(46,197,138,0.35) 50%, rgba(46,197,138,0.08) 82%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(110,231,183,0.08) 18%, rgba(110,231,183,0.3) 50%, rgba(110,231,183,0.08) 82%, transparent 100%)',
              }}
            >
              <div
                className="absolute left-1/2 top-1/2 h-2.5 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
                style={{
                  backgroundColor: isDayMode ? 'rgba(46,197,138,0.22)' : 'rgba(110,231,183,0.22)',
                }}
              />
            </div>
          </motion.div>

          {!isStudentRole && (
            <>
              <motion.section
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="mt-10"
              >
                <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Manage events & positions</div>
                    <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                      Track every registration and application in one sweep.
                    </h2>
                  </div>
                </div>

                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-6 md:grid-cols-2">
                  {[
                    {
                      icon: CalendarPlus,
                      title: 'Manage events',
                      description: 'See everyone who registered for the events you posted and keep your attendee signal clean.',
                      to: '/dashboard/manage-events',
                      accent: isDayMode ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.12)',
                    },
                    {
                      icon: Briefcase,
                      title: 'Manage positions',
                      description: 'Review applicants, CV-assisted submissions, and candidate details for the openings you created.',
                      to: '/dashboard/manage-positions',
                      accent: isDayMode ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.12)',
                    },
                  ].map((item) => (
                    <motion.div key={item.title} variants={itemVariants}>
                      <ActionCard {...item} palette={palette} isDayMode={isDayMode} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>

              <motion.div
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="mt-8 px-2"
                aria-hidden="true"
              >
                <div
                  className="relative h-px w-full overflow-hidden rounded-full"
                  style={{
                    background: isDayMode
                      ? 'linear-gradient(90deg, transparent 0%, rgba(46,197,138,0.08) 18%, rgba(46,197,138,0.35) 50%, rgba(46,197,138,0.08) 82%, transparent 100%)'
                      : 'linear-gradient(90deg, transparent 0%, rgba(110,231,183,0.08) 18%, rgba(110,231,183,0.3) 50%, rgba(110,231,183,0.08) 82%, transparent 100%)',
                  }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 h-2.5 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
                    style={{
                      backgroundColor: isDayMode ? 'rgba(46,197,138,0.22)' : 'rgba(110,231,183,0.22)',
                    }}
                  />
                </div>
              </motion.div>
            </>
          )}

          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
          >
            <motion.div variants={itemVariants} className="rounded-[34px] p-7 md:p-8" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.90))' : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))', boxShadow: isDayMode ? '0 28px 100px rgba(15,23,42,0.08)' : '0 28px 100px rgba(0,0,0,0.42)' }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Profile readiness</div>
              <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Keep your signal sharp.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                Your profile becomes more useful when your role details, institution or organization, and focus areas stay current.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  {
                    icon: Sparkles,
                    label: 'Completion',
                    value: `${completion.completed}/${completion.total} fields`,
                  },
                  {
                    icon: GraduationCap,
                    label: profileSignal.baseLabel,
                    value: profileSignal.baseValue,
                  },
                  {
                    icon: Telescope,
                    label: profileSignal.trackLabel,
                    value: profileSignal.trackValue,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] p-4" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                        <item.icon size={16} />
                      </span>
                      <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.72)' }}>{item.label}</div>
                    </div>
                    <div className="mt-4 text-sm font-semibold leading-6" style={{ color: palette.textSecondary }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate('/account', { state: { profile } })}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all"
                style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}
              >
                Open account settings
                <ArrowRight size={15} />
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-[34px] p-7 backdrop-blur-xl md:p-8" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Workspace routes</div>
                  <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                    Step into the right room.
                  </h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.90)' : 'rgba(0,0,0,0.2)', color: palette.textMuted }}>
                  <LayoutDashboard size={13} style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }} />
                  Live routes
                </span>
              </div>

              <div className="mt-7 grid gap-4">
                <RouteCard icon={BookPlus} label="Browse blogs" description="Read the latest journal entries and community writing." to="/blogs" palette={palette} isDayMode={isDayMode} />
                <RouteCard icon={Users2} label="Explore groups" description="Find collaboration spaces and research communities." to="/groups" palette={palette} isDayMode={isDayMode} />
                <RouteCard icon={MessageSquare} label="Community threads" description="Ask questions, share ideas, and discuss quantum topics with the community." to="/threads" palette={palette} isDayMode={isDayMode} />
                <RouteCard icon={CalendarPlus} label="See events" description="Jump into workshops, sessions, and live community gatherings." to="/events" palette={palette} isDayMode={isDayMode} />
                <RouteCard icon={Briefcase} label="View positions" description="Review open roles, internships, and collaboration calls." to="/positions" palette={palette} isDayMode={isDayMode} />
              </div>
            </motion.div>
          </motion.section>
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>
    </div>
  )
}

export default DashboardPage
