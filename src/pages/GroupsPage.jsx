import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, Layers3, Shield, Sparkles, UserRound, Users } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

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

const readCurrentUserEmail = () => {
  if (typeof window === 'undefined') return ''

  try {
    const profile = JSON.parse(localStorage.getItem('qsphere_onboarding_profile') || '{}')
    return String(profile.emailAddress || localStorage.getItem('qsphere_email') || '').trim().toLowerCase()
  } catch {
    return String(localStorage.getItem('qsphere_email') || '').trim().toLowerCase()
  }
}

const buildOwnerAvatar = (group) => {
  return group.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(group.owner || 'U')}`
}

const GroupsPage = () => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const [filters, setFilters] = useState({
    all: true,
    my: true,
    requested: true,
  })
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [requestingGroupIds, setRequestingGroupIds] = useState({})
  const [membershipStatusByGroupId, setMembershipStatusByGroupId] = useState({})

  const navigate = useNavigate()
  const currentUserEmail = readCurrentUserEmail()

  useEffect(() => {
    let isCancelled = false

    const loadGroups = async () => {
      try {
        const response = await fetch('/api/groups')
        const data = await response.json().catch(() => [])
        if (!isCancelled && Array.isArray(data)) {
          setGroups(data)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching groups:', error)
          setGroups([])
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadGroups()

    return () => {
      isCancelled = true
    }
  }, [])

  const fetchMembershipStatus = async (groupId) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`)
      if (!response.ok) return null

      const members = await response.json()
      const currentMember = Array.isArray(members)
        ? members.find((member) => String(member.email || '').trim().toLowerCase() === currentUserEmail)
        : null

      return currentMember?.status || null
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!currentUserEmail || groups.length === 0) return

    let isCancelled = false

    const loadMembershipStatuses = async () => {
      try {
        const statuses = await Promise.all(
          groups.map(async (group) => {
            const status = await fetchMembershipStatus(group.id)
            return [group.id, status]
          }),
        )

        if (isCancelled) return

        setMembershipStatusByGroupId(
          statuses.reduce((accumulator, [groupId, status]) => {
            if (status) accumulator[groupId] = status
            return accumulator
          }, {}),
        )
      } catch {
        if (!isCancelled) {
          setMembershipStatusByGroupId({})
        }
      }
    }

    loadMembershipStatuses()

    return () => {
      isCancelled = true
    }
  }, [groups, currentUserEmail])

  const showSnackbar = (message, type = 'success') => {
    if (typeof window === 'undefined') return

    window.dispatchEvent(
      new CustomEvent('qsphere-snackbar', {
        detail: { message, type },
      }),
    )
  }

  const toggleFilter = (key) => {
    setFilters((previous) => ({ ...previous, [key]: !previous[key] }))
  }

  const filterConfig = useMemo(
    () => [
      { key: 'all', label: 'All Groups' },
      { key: 'my', label: 'My Groups' },
      { key: 'requested', label: 'Requested Groups' },
    ],
    [],
  )

  const featuredGroup = groups[0] || null

  const visibleGroups = useMemo(() => {
    return groups.filter((group) => {
      if (filters.all) return true

      const status = membershipStatusByGroupId[group.id]
      if (filters.my && status === 'Active') return true
      if (filters.requested && status === 'Pending') return true
      return false
    })
  }, [filters, groups, membershipStatusByGroupId])

  const ownedGroupsCount = groups.filter(
    (group) => currentUserEmail && String(group.ownerEmail || '').trim().toLowerCase() === currentUserEmail,
  ).length
  const joinedGroupsCount = Object.values(membershipStatusByGroupId).filter((status) => status === 'Active').length
  const pendingGroupsCount = Object.values(membershipStatusByGroupId).filter((status) => status === 'Pending').length

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
      <Navbar currentPage="groups" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.6 : 0.4, background: isDayMode ? 'radial-gradient(circle at 14% 0%, rgba(46,197,138,0.14) 0%, transparent 42%)' : 'radial-gradient(circle at 14% 0%, rgba(16,185,129,0.2) 0%, transparent 42%)', y: glowY1 }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.26 : 0.2, background: isDayMode ? 'radial-gradient(circle at 100% 100%, rgba(255,224,163,0.22) 0%, transparent 36%)' : 'radial-gradient(circle at 100% 100%, rgba(6,182,212,0.15) 0%, transparent 36%)', y: glowY2 }} />
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

      <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto max-w-[1500px]">
          <motion.section
            variants={heroVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="relative overflow-hidden rounded-[38px] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.45)] md:p-10 xl:p-12"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,247,245,0.88))' : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: isDayMode ? 'linear-gradient(to right, transparent, rgba(46,197,138,0.55), transparent)' : 'linear-gradient(to right, transparent, rgba(110,231,183,0.5), transparent)' }} />
            <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.12)' : 'rgba(16,185,129,0.1)' }} />
            <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(255,224,163,0.2)' : 'rgba(6,182,212,0.1)' }} />

            <div className="relative z-10 grid gap-10 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary, boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.45)' : '0 0 18px rgba(16,185,129,0.8)' }} />
                    Community
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)', color: palette.textMuted }}>
                    <Sparkles size={14} style={{ color: palette.accentPrimary }} />
                    Collaboration network
                  </span>
                </div>

                <h1
                  className="max-w-5xl text-5xl font-bold leading-[0.9] md:text-6xl xl:text-[5.35rem]"
                  style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary, textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.6)' : '0 0 40px rgba(16,185,129,0.08)' }}
                >
                  Research groups with
                  <br />
                  <span style={{ color: palette.accentPrimary }}>real collaborative gravity.</span>
                </h1>

                <p className="mt-7 max-w-3xl text-base leading-8 md:text-lg xl:text-[1.12rem]" style={{ color: palette.textSecondary }}>
                  Discover focused workspaces, join live quantum initiatives, and move from passive browsing into meaningful research collaboration.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/groups/new')}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
                    style={{ border: `1px solid ${isDayMode ? 'transparent' : palette.btnPrimaryBorder}`, backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText, boxShadow: isDayMode ? '0 20px 45px rgba(30,158,107,0.18)' : 'none' }}
                  >
                    Create a group
                    <ArrowUpRight size={16} />
                  </button>
                  <a
                    href="#group-grid"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                    style={{ border: `1px solid ${palette.btnSecondaryBorder}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                  >
                    Browse groups
                    <ArrowUpRight size={16} />
                  </a>
                </div>

                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    { label: 'Total groups', value: String(groups.length).padStart(2, '0') },
                    { label: 'Joined groups', value: String(joinedGroupsCount).padStart(2, '0') },
                    { label: 'Your groups', value: String(ownedGroupsCount).padStart(2, '0') },
                  ].map((item) => (
                    <motion.div key={item.label} variants={itemVariants} className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.2)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>{item.label}</div>
                      <div className="mt-4 text-4xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                        {item.value}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {featuredGroup && (
                <div
                  className="relative overflow-hidden rounded-[34px] p-6 md:p-7"
                  style={{
                    border: `1px solid ${palette.borderPrimary}`,
                    background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,247,245,0.88))' : 'linear-gradient(180deg, rgba(5,10,8,0.92), rgba(4,8,7,0.74))',
                    boxShadow: isDayMode ? '0 24px 90px rgba(15,23,42,0.06)' : '0 24px 90px rgba(0,0,0,0.42)',
                  }}
                >
                  <div className="absolute inset-x-8 top-0 h-px" style={{ background: isDayMode ? 'linear-gradient(to right, transparent, rgba(46,197,138,0.4), transparent)' : 'linear-gradient(to right, transparent, rgba(110,231,183,0.4), transparent)' }} />
                  <div className="absolute right-0 top-0 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.1)' : 'rgba(16,185,129,0.1)' }} />

                  <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Featured group</div>

                    <div className="mt-6 flex items-start justify-between gap-4">
                      <div>
                        <div
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                          style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}
                        >
                          {featuredGroup.groupType || 'Research Group'}
                        </div>
                        <h2 className="mt-5 text-3xl font-bold leading-tight" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                          {featuredGroup.groupTitle}
                        </h2>
                      </div>
                      <div
                        className="h-16 w-16 overflow-hidden rounded-full p-1"
                        style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)', boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.1)' : '0 0 18px rgba(16,185,129,0.18)' }}
                      >
                        <img
                          src={buildOwnerAvatar(featuredGroup)}
                          alt={featuredGroup.owner || 'Group owner'}
                          className="h-full w-full rounded-full object-cover"
                        />
                      </div>
                    </div>

                    <p className="mt-5 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      {featuredGroup.groupDescription || 'A focused space for quantum collaboration, shared research direction, and ambitious problem-solving.'}
                    </p>

                    <div className="mt-6 grid gap-3">
                      <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                        <Shield size={15} style={{ color: palette.accentPrimary }} />
                        <span className="text-sm font-medium" style={{ color: palette.textSecondary }}>Owner: {featuredGroup.owner || 'Community lead'}</span>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                        <Layers3 size={15} style={{ color: palette.accentPrimary }} />
                        <span className="text-sm font-medium" style={{ color: palette.textSecondary }}>Scope: {featuredGroup.groupScope || 'Scope coming soon'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/groups/${featuredGroup.id}`)}
                      className="mt-7 inline-flex items-center gap-2 text-sm font-semibold transition-all hover:gap-3"
                      style={{ color: palette.accentPrimary }}
                    >
                      Open featured group
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_1.95fr]"
          >
            <div className="rounded-[30px] p-6 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)' }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Filtering layer</div>
              <h2 className="mt-4 text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                Narrow the field fast.
              </h2>
              <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                Use these toggles to move between the full network, groups you already belong to, and requests still waiting for approval.
              </p>
            </div>

            <div className="rounded-[30px] p-6 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)' }}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  {filterConfig.map((filter) => {
                    const count =
                      filter.key === 'all'
                        ? groups.length
                        : filter.key === 'my'
                          ? joinedGroupsCount
                          : pendingGroupsCount

                    return (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => toggleFilter(filter.key)}
                        className={`inline-flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all`}
                        style={{
                          borderColor: filters[filter.key] ? palette.accentBorder : palette.borderPrimary,
                          backgroundColor: filters[filter.key] ? palette.accentSoft : (isDayMode ? '#ffffff' : 'rgba(0,0,0,0.2)'),
                          color: filters[filter.key] ? (isDayMode ? palette.accentDark : palette.accentLight) : palette.textSecondary,
                          boxShadow: filters[filter.key] ? (isDayMode ? '0 0 18px rgba(46,197,138,0.1)' : '0 0 18px rgba(16,185,129,0.08)') : 'none',
                        }}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: filters[filter.key] ? palette.accentPrimary : (isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                            color: filters[filter.key] ? '#ffffff' : palette.textMuted,
                          }}
                        >
                          {count}
                        </span>
                        {filter.label}
                      </button>
                    )
                  })}
                </div>

                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em]"
                  style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? '#ffffff' : 'rgba(0,0,0,0.2)', color: palette.textMuted }}
                >
                  <Users size={14} style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }} />
                  {visibleGroups.length} visible now
                </div>
              </div>
            </div>
          </motion.section>

          {loading ? (
            <motion.section
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-10 grid gap-6 lg:grid-cols-2"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="overflow-hidden rounded-[32px] p-6 animate-pulse"
                  style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.03)' }}
                >
                  <div className="h-5 w-32 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }} />
                  <div className="mt-5 h-10 w-3/4 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }} />
                  <div className="mt-4 h-16 rounded-[20px]" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }} />
                  <div className="mt-6 flex justify-between gap-4">
                    <div className="h-12 w-40 rounded-[18px]" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }} />
                    <div className="h-14 w-14 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }} />
                  </div>
                </motion.div>
              ))}
            </motion.section>
          ) : visibleGroups.length === 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mt-10 flex flex-col items-center justify-center rounded-[34px] py-28 text-center backdrop-blur-xl"
              style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)' }}
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>
                <Users size={32} style={{ color: palette.textFaint }} />
              </div>
              <h3 className="mb-3 text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                No groups match these filters.
              </h3>
              <p className="max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                Turn more filters back on or create a fresh research space to start building the network you want to see.
              </p>
              <button
                type="button"
                onClick={() => navigate('/groups/new')}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
                style={{ border: `1px solid ${isDayMode ? 'transparent' : palette.btnPrimaryBorder}`, backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText, boxShadow: isDayMode ? '0 20px 45px rgba(30,158,107,0.18)' : 'none' }}
              >
                Create a group
                <ArrowUpRight size={16} />
              </button>
            </motion.section>
          ) : (
            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              id="group-grid"
              className="mt-10"
            >
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Group grid</div>
                  <h2 className="mt-4 text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                    Collaborative rooms worth stepping into.
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                  Each card gives you faster context on what the group does, who leads it, and whether you can join immediately or already have a request in motion.
                </p>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3"
                style={{ perspective: '1000px' }}
              >
                {visibleGroups.map((group, index) => {
                  const isRequesting = Boolean(requestingGroupIds[group.id])
                  const membershipStatus = membershipStatusByGroupId[group.id]
                  const isRequestSent = membershipStatus === 'Pending'
                  const isJoined = membershipStatus === 'Active'
                  const isOwner = currentUserEmail && String(group.ownerEmail || '').trim().toLowerCase() === currentUserEmail

                  return (
                    <motion.div
                      key={group.id}
                      variants={itemVariants}
                      className="group relative flex h-full flex-col overflow-hidden rounded-[32px] p-6 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 md:p-7"
                      style={{
                        border: `1px solid ${palette.borderPrimary}`,
                        background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.92))' : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                        boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.28)',
                      }}
                    >
                      <div className="absolute inset-0 rounded-[32px] opacity-0 transition-opacity duration-500 pointer-events-none group-hover:opacity-100" style={{ boxShadow: isDayMode ? 'inset 0 0 30px rgba(46,197,138,0.1)' : 'inset 0 0 30px rgba(16,185,129,0.06)' }} />
                      <div className="absolute inset-x-8 top-0 h-px" style={{ background: isDayMode ? 'linear-gradient(to right, transparent, rgba(46,197,138,0.35), transparent)' : 'linear-gradient(to right, transparent, rgba(110,231,183,0.35), transparent)' }} />

                      <div className="relative z-10 flex h-full flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span
                              className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                              style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}
                            >
                              {group.groupType || 'Research Group'}
                            </span>
                            <h3 className="mt-5 text-2xl font-bold leading-tight transition-colors duration-300" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                              {group.groupTitle}
                            </h3>
                          </div>

                          <div
                            className="h-14 w-14 overflow-hidden rounded-full p-1 transition-all"
                            style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)', boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.1)' : '0 0 18px rgba(16,185,129,0.16)' }}
                          >
                            <img
                              src={buildOwnerAvatar(group)}
                              alt={group.owner || 'Group owner'}
                              className="h-full w-full rounded-full object-cover"
                            />
                          </div>
                        </div>

                        {group.groupDescription && (
                          <p className="mt-5 text-sm leading-7 line-clamp-4" style={{ color: palette.textSecondary }}>
                            {group.groupDescription}
                          </p>
                        )}

                        <div className="mt-6 grid gap-3">
                          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                            <Layers3 size={15} style={{ color: palette.accentPrimary }} />
                            <span className="truncate" style={{ color: palette.textSecondary }}>{group.groupScope || 'Scope coming soon'}</span>
                          </div>
                          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                            <UserRound size={15} style={{ color: palette.accentPrimary }} />
                            <span className="truncate" style={{ color: palette.textSecondary }}>Led by {group.owner || 'Community lead'}</span>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                          {isOwner && (
                            <span
                              className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                              style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}
                            >
                              Owner
                            </span>
                          )}
                          {isJoined && (
                            <span
                              className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                              style={{ border: `1px solid ${isDayMode ? 'rgba(6,182,212,0.25)' : 'rgba(34,211,238,0.2)'}`, backgroundColor: isDayMode ? 'rgba(6,182,212,0.1)' : 'rgba(34,211,238,0.1)', color: isDayMode ? '#0891b2' : '#a5f3fc' }}
                            >
                              Joined
                            </span>
                          )}
                          {isRequestSent && !isJoined && (
                            <span
                              className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                              style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', color: palette.textSecondary }}
                            >
                              Request Pending
                            </span>
                          )}
                        </div>

                        <div className="mt-auto pt-7">
                          <div className="flex flex-wrap items-center gap-3 pt-5" style={{ borderTop: `1px solid ${palette.borderPrimary}` }}>
                            <button
                              type="button"
                              onClick={() => {
                                const logged = typeof window !== 'undefined' && localStorage.getItem('qsphere_logged_in') === '1'
                                if (!logged) {
                                  navigate('/auth', { state: { redirectTo: `/groups/${group.id}` } })
                                  return
                                }

                                navigate(`/groups/${group.id}`)
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all"
                              style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? '#ffffff' : 'rgba(255,255,255,0.03)', color: palette.textSecondary }}
                            >
                              Open details
                              <ArrowUpRight size={15} />
                            </button>

                            {!isOwner && (
                              isJoined ? (
                                <span
                                  className="inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold"
                                  style={{ border: `1px solid ${isDayMode ? 'rgba(6,182,212,0.25)' : 'rgba(34,211,238,0.2)'}`, backgroundColor: isDayMode ? 'rgba(6,182,212,0.1)' : 'rgba(34,211,238,0.1)', color: isDayMode ? '#0891b2' : '#a5f3fc' }}
                                >
                                  Joined
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isRequesting || isRequestSent}
                                  onClick={async () => {
                                    const logged = typeof window !== 'undefined' && localStorage.getItem('qsphere_logged_in') === '1'
                                    if (!logged) {
                                      navigate('/auth', { state: { redirectTo: '/groups' } })
                                      return
                                    }

                                    if (!currentUserEmail) {
                                      showSnackbar('Unable to identify your account', 'error')
                                      return
                                    }

                                    if (isRequesting || isRequestSent) return

                                    setRequestingGroupIds((previous) => ({ ...previous, [group.id]: true }))

                                    try {
                                      const response = await fetch(`/api/groups/${group.id}/members`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userEmail: currentUserEmail }),
                                      })
                                      const data = await response.json().catch(() => null)

                                      if (!response.ok) {
                                        const errorMessage = data?.error || 'Failed to send request'
                                        const alreadyRequested = /already exists|already in group/i.test(errorMessage)

                                        if (alreadyRequested) {
                                          const latestStatus = await fetchMembershipStatus(group.id)
                                          setMembershipStatusByGroupId((previous) => ({
                                            ...previous,
                                            [group.id]: latestStatus || 'Pending',
                                          }))
                                          showSnackbar('Request is sent successfully', 'success')
                                          return
                                        }

                                        showSnackbar(errorMessage, 'error')
                                        return
                                      }

                                      setMembershipStatusByGroupId((previous) => ({ ...previous, [group.id]: 'Pending' }))
                                      showSnackbar('Request is sent successfully', 'success')
                                    } catch {
                                      showSnackbar('Network error', 'error')
                                    } finally {
                                      setRequestingGroupIds((previous) => {
                                        const next = { ...previous }
                                        delete next[group.id]
                                        return next
                                      })
                                    }
                                  }}
                                  className={`inline-flex items-center rounded-2xl border px-5 py-3 text-sm font-semibold transition-all ${isRequestSent ? 'cursor-not-allowed' : ''} ${isRequesting ? 'cursor-wait opacity-80' : ''}`}
                                  style={
                                    isRequestSent
                                      ? { borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', color: palette.textMuted }
                                      : { border: `1px solid ${palette.btnPrimaryBorder}`, backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }
                                  }
                                >
                                  {isRequestSent ? 'Request Sent' : isRequesting ? 'Sending...' : 'Request to Join'}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </motion.section>
          )}
        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default GroupsPage
