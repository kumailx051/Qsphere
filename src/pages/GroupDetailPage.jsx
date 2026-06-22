import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  LayoutGrid,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users2,
  UserPen,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import GhostInput from '../components/GhostInput'
import { getStoredGroups } from '../utils/groupStore'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem('qsphere_onboarding_profile')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const makeInitialProjects = (group) => {
  const title = group.groupTitle || group.title || 'Project'
  return [
    {
      id: `${group.id}-p1`,
      title: `${title} Roadmap`,
      description: `A structured research and delivery roadmap for ${title}.`,
      owner: group.owner,
      status: 'In Progress',
      members: 4,
      dueDate: '2026-08-30',
    },
    {
      id: `${group.id}-p2`,
      title: 'Prototype Validation',
      description: 'Testing the latest proof-of-concept with internal review milestones.',
      owner: group.owner,
      status: 'Planning',
      members: 3,
      dueDate: '2026-09-18',
    },
  ]
}

const projectStoreKey = (groupId) => `qsphere_group_projects_${groupId}`

const statusBadgeClass = (status) => {
  if (status === 'Active') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
  if (status === 'In Progress') return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
  if (status === 'Planning') return 'border-amber-400/30 bg-amber-500/10 text-amber-300'
  return 'border-white/10 bg-white/[0.04] text-white/70'
}

const formatDisplayDate = (value, fallback = 'N/A') => {
  if (!value) return fallback
  if (typeof value === 'string') return value.includes('T') ? value.split('T')[0] : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString().split('T')[0]
}

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

const GroupDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const groupId = Number(id)
  const [groups, setGroups] = useState(() => getStoredGroups())
  const profile = useMemo(() => readStoredProfile(), [])

  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  useEffect(() => {
    const logged = localStorage.getItem('qsphere_logged_in') === '1'
    if (!logged) {
      navigate('/auth', { state: { redirectTo: `/groups/${groupId}` } })
      return
    }

    const syncGroups = () => setGroups(getStoredGroups())
    syncGroups()
    window.addEventListener('qsphere-groups-updated', syncGroups)
    return () => window.removeEventListener('qsphere-groups-updated', syncGroups)
  }, [navigate, groupId])

  const group = useMemo(() => groups.find((item) => item.id === groupId) ?? null, [groups, groupId])
  const isAdmin = Boolean(group && profile && String(profile.fullName || '').trim().toLowerCase() === String(group.owner || '').trim().toLowerCase())
  const currentUserEmail = String(profile?.emailAddress || localStorage.getItem('qsphere_email') || '').trim().toLowerCase()

  const [activeTab, setActiveTab] = useState('details')
  const [members, setMembers] = useState([])
  const [projects, setProjects] = useState([])
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [projectForm, setProjectForm] = useState({ title: '', description: '', dueDate: '', status: 'Planning', owner: profile?.emailAddress || '' })
  const [projectFile, setProjectFile] = useState(null)
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
  const fileInputRef = useRef(null)
  const today = new Date().toISOString().split('T')[0]
  const [memberPositions, setMemberPositions] = useState({})

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/members`)
      if (res.ok) {
        const data = await res.json()
        const ownerEmail = String(group.ownerEmail || '').trim().toLowerCase()
        const mappedMembers = data.map(m => ({
          ...m,
          name: m.name || m.email,
          isAdmin: m.email?.toLowerCase() === ownerEmail,
          isCurrentUser: String(m.email || '').trim().toLowerCase() === currentUserEmail,
        }))

        const hasOwnerInMembers = ownerEmail
          ? mappedMembers.some((member) => String(member.email || '').trim().toLowerCase() === ownerEmail)
          : false

        let ownerProfile = null
        if (!hasOwnerInMembers && ownerEmail) {
          try {
            const ownerRes = await fetch(`/api/users/profile/${encodeURIComponent(group.ownerEmail)}`)
            if (ownerRes.ok) {
              ownerProfile = await ownerRes.json()
            }
          } catch {
            ownerProfile = null
          }
        }

        const membersWithOwner = !hasOwnerInMembers && ownerEmail
          ? [
              {
                id: `owner-${group.id}`,
                email: group.ownerEmail,
                name: ownerProfile?.fullName || group.owner || group.ownerEmail,
                avatar: ownerProfile?.profileImage || ownerProfile?.avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(group.owner || 'Owner')}`,
                status: 'Active',
                position: 'Owner',
                isAdmin: true,
                isCurrentUser: ownerEmail === currentUserEmail,
              },
              ...mappedMembers,
            ]
          : mappedMembers

        setMembers(membersWithOwner)
        setMemberPositions(
          membersWithOwner.reduce((accumulator, member) => {
            accumulator[member.email] = member.position || 'Member'
            return accumulator
          }, {}),
        )
      }
    } catch (err) {
      console.error('Failed to fetch members', err)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/projects`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (err) {
      console.error('Failed to fetch projects', err)
    }
  }

  useEffect(() => {
    if (!group) return
    fetchMembers()
    fetchProjects()
  }, [group])

  useEffect(() => {
    const scrollParam = new URLSearchParams(location.search).get('scroll')
    if (scrollParam === 'members' || scrollParam === 'projects') {
      setActiveTab(scrollParam)
    }
  }, [location.search])

  const totalMembers = members.length
  const activeUsers = members.filter((member) => member.status === 'Active').length
  const totalProjects = projects.length
  const currentMember = useMemo(
    () => members.find((member) => String(member.email || '').trim().toLowerCase() === currentUserEmail) ?? null,
    [members, currentUserEmail],
  )
  const canViewWorkspace = isAdmin || currentMember?.status === 'Active'

  const updateMemberPosition = async (memberEmail, position) => {
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${memberEmail}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position })
      })
      if (res.ok) {
        setMemberPositions((current) => ({ ...current, [memberEmail]: position }))
        setMembers((current) =>
          current.map((member) => (member.email === memberEmail ? { ...member, position } : member)),
        )
      }
    } catch (err) {
      console.error('Failed to update position', err)
    }
  }

  const acceptMember = async (memberEmail) => {
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${memberEmail}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' })
      })
      if (res.ok) {
        fetchMembers()
      }
    } catch (err) {
      console.error('Failed to accept member', err)
    }
  }

  const removeMember = async (memberEmail) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${memberEmail}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setMembers((current) => current.filter((member) => member.email !== memberEmail))
      }
    } catch (err) {
      console.error('Failed to remove member', err)
    }
  }

  const openProjectModal = () => {
    setProjectForm({ title: '', description: '', owner: group?.owner || '', dueDate: '', status: 'Planning' })
    setProjectFile(null)
    setShowProjectModal(true)
  }

  const suggestDescription = async () => {
    if (!projectForm.title.trim()) return
    setIsGeneratingDesc(true)
    try {
      const res = await fetch('/api/ai/suggest-project-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: projectForm.title })
      })
      if (res.ok) {
        const data = await res.json()
        setProjectForm(prev => ({ ...prev, description: data.description || prev.description }))
      }
    } catch (error) {
      console.error('Failed to generate description', error)
    } finally {
      setIsGeneratingDesc(false)
    }
  }

  const addProject = async (event) => {
    event.preventDefault()
    if (!projectForm.title.trim() || !projectForm.description.trim()) return

    const formData = new FormData()
    formData.append('title', projectForm.title.trim())
    formData.append('description', projectForm.description.trim())
    formData.append('ownerEmail', profile?.emailAddress || group?.ownerEmail || '')
    formData.append('startDate', today)
    formData.append('dueDate', projectForm.dueDate || '')
    formData.append('status', projectForm.status)
    if (projectFile) formData.append('referenceFile', projectFile)

    try {
      const res = await fetch(`/api/groups/${group.id}/projects`, { method: 'POST', body: formData })
      if (res.ok) {
        await fetchProjects()
        setShowProjectModal(false)
      }
    } catch (err) {
      console.error('Failed to create project', err)
    }
  }

  const deleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) setProjects((current) => current.filter((p) => p.id !== projectId))
    } catch (err) {
      console.error('Failed to delete project', err)
    }
  }

  if (!group) {
    return (
      <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
        <Navbar currentPage="groups" />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
          <motion.div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${palette.accentGlow} 0%, transparent 42%)`, y: glowY1 }} />
          <motion.div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${palette.accentSecondaryGlow} 0%, transparent 36%)`, y: glowY2 }} />
        </div>
        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl rounded-[36px] border p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,0.45)] md:p-10"
            style={{ borderColor: palette.borderPrimary, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})` }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border" style={{ borderColor: palette.accentPrimary, backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: `0 0 30px ${palette.accentPrimary}1F` }}>
              <Users2 size={28} />
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary }}>Group not found</div>
            <h1 className="mt-4 text-4xl font-bold leading-[0.95] md:text-5xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
              This group does not exist.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7" style={{ color: palette.textMuted }}>Return to the groups list and choose another project workspace.</p>
            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
              style={{ backgroundColor: palette.accentPrimary, color: '#fff', border: `1px solid ${palette.accentPrimary}` }}
            >
              <ArrowLeft size={16} />
              Back to groups
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
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
      <Navbar currentPage="groups" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${palette.accentGlow} 0%, transparent 42%)`, y: glowY1 }} />
        <motion.div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${palette.accentSecondaryGlow} 0%, transparent 36%)`, y: glowY2 }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.04 : 0.14,
            backgroundImage:
              `linear-gradient(${isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'} 1px, transparent 1px), linear-gradient(90deg, ${isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'} 1px, transparent 1px)`,
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 18%, black 24%, transparent 88%)',
          }}
        />
      </div>

      <main className="relative z-10 flex-grow w-full pt-32 pb-24">
        <div className="px-6 md:px-12 lg:px-20 xl:px-28">
          <div className="mx-auto max-w-[1500px]">
            <motion.button
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              type="button"
              onClick={() => navigate('/groups')}
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:border-emerald-400/30 hover:text-emerald-300 transition"
              style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}
            >
              <ArrowLeft size={16} />
              Back to groups
            </motion.button>

            <motion.section
              variants={heroVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="relative overflow-hidden rounded-[40px]"
              style={{ border: `1px solid ${palette.borderPrimary}`, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
            >
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${palette.accentLight}80, transparent)` }} />
              <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: palette.accentGlow }} />
              <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: palette.accentSecondaryGlow }} />

              <div className="relative z-10 p-7 md:p-10 xl:p-12">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-3xl">
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#fff', boxShadow: `0 0 18px ${palette.accentPrimary}` }} />
                        Group workspace
                      </span>
                      {group.groupType && (
                        <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textMuted }}>
                          {group.groupType}
                        </span>
                      )}
                    </div>
                    <h1
                      className="text-5xl font-bold leading-[0.9] md:text-6xl xl:text-[5rem]"
                      style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary, textShadow: `0 0 40px ${isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.08)'}` }}
                    >
                      {group.groupTitle || group.title}
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-8 md:text-lg" style={{ color: palette.textSecondary }}>{group.groupDescription || group.description}</p>
                  </div>

                  <div className="rounded-[34px] border px-6 py-5" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft }}>
                    <div className="flex items-center gap-3" style={{ color: palette.accentLight }}>
                      <Crown size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Admin</span>
                    </div>
                    <div className="mt-3 text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>{group.owner}</div>
                    <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>Project owner and management access holder</div>
                  </div>
                </div>

                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                  <StatCard icon={Users2} label="Total Members" value={String(totalMembers)} accent />
                  <StatCard icon={Sparkles} label="Active Users" value={String(activeUsers)} />
                  <StatCard icon={LayoutGrid} label="Projects" value={String(totalProjects)} accent />
                </motion.div>
              </div>

            </motion.section>

            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="relative z-10 mt-8 rounded-[40px] p-7 md:p-10 xl:p-12"
              style={{ border: `1px solid ${palette.borderPrimary}`, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
            >
            <div className="flex flex-wrap items-center gap-3">
              <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={CheckCircle2} label="Group Details" />
              {canViewWorkspace ? <TabButton active={activeTab === 'members'} onClick={() => setActiveTab('members')} icon={UserPen} label="Members" /> : null}
              {canViewWorkspace ? <TabButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={LayoutGrid} label="Projects" /> : null}
            </div>

            {activeTab === 'details' ? (
              <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[28px] border p-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                  <div className="flex items-center gap-3" style={{ color: palette.accentPrimary }}>
                    <Sparkles size={18} />
                    <div className="text-xs font-semibold uppercase tracking-[0.28em]">Overview</div>
                  </div>
                  <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                    This workspace is organized for research collaboration, project delivery, and member activity tracking. The admin can manage assignments, review project work, and expand the group with new initiatives.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {[
                      { label: 'Group Type', value: 'Research' },
                      { label: 'Visibility', value: 'Private workspace' },
                      { label: 'Access', value: isAdmin ? 'Admin controls enabled' : canViewWorkspace ? 'Workspace member access' : 'Overview only' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border p-4" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                        <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: palette.textFaint }}>{item.label}</div>
                        <div className="mt-2 text-sm font-semibold" style={{ color: palette.textPrimary }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border p-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                  <div className="flex items-center gap-3" style={{ color: palette.accentPrimary }}>
                    <UserCardIcon />
                    <div className="text-xs font-semibold uppercase tracking-[0.28em]">Top line</div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <MiniRow label="Project Title" value={group.groupTitle || group.title} />
                    <MiniRow label="Admin" value={group.owner} />
                    <MiniRow label="Members" value={String(totalMembers)} />
                    <MiniRow label="Projects" value={String(totalProjects)} />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'members' && canViewWorkspace ? (
              <div id="group-members-section" className="mt-8 rounded-[28px] border p-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Workspace Members</div>
                    <h2 className="mt-2 text-2xl font-bold" style={{ color: palette.textPrimary }}>Members</h2>
                    <p className="mt-1 text-sm" style={{ color: palette.textMuted }}>{isAdmin ? 'Assign positions or remove members from the group.' : 'View who is active inside this research group.'}</p>
                  </div>
                  <div className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                    {members.length} members
                  </div>
                </div>

                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.email} className="rounded-3xl border p-5" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 overflow-hidden rounded-2xl border p-0.5" style={{ borderColor: palette.accentBorder, backgroundColor: palette.bgSurface }}>
                            <img src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.name || 'U')}`} alt={member.name} className="h-full w-full rounded-[14px] object-cover" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-bold" style={{ color: palette.textPrimary }}>{member.name}</div>
                              {member.isAdmin ? (
                                <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                                  style={isDayMode
                                    ? { backgroundColor: '#d97706', color: '#fff' }
                                    : { backgroundColor: 'rgba(217,119,6,0.20)', color: '#fde68a', border: '1px solid rgba(217,119,6,0.35)' }
                                  }>
                                  Owner
                                </span>
                              ) : null}
                              {member.isCurrentUser ? (
                                <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                                  style={isDayMode
                                    ? { backgroundColor: '#0891b2', color: '#fff' }
                                    : { backgroundColor: 'rgba(8,145,178,0.20)', color: '#a5f3fc', border: '1px solid rgba(8,145,178,0.35)' }
                                  }>
                                  Me
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm" style={{ color: palette.textMuted }}>{member.email}</div>
                            {!isAdmin ? (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(member.status)}`}>
                                  {member.status}
                                </span>
                                <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>
                                  {member.position}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {isAdmin ? (
                          <div className="flex flex-wrap items-center gap-3">
                            {member.status === 'Pending' ? (
                              <button
                                type="button"
                                onClick={() => acceptMember(member.email)}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-emerald-500/20"
                                style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}
                              >
                                <CheckCircle2 size={16} />
                                Accept Request
                              </button>
                            ) : null}
                            <select
                              value={memberPositions[member.email] || member.position || 'Member'}
                              onChange={(event) => updateMemberPosition(member.email, event.target.value)}
                              disabled={member.isAdmin}
                              className="rounded-xl border px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-70"
                              style={{ borderColor: palette.accentBorder, backgroundColor: palette.bgTertiary, color: palette.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }}
                            >
                              {['Project Admin', 'Research Lead', 'Developer', 'Analyst', 'Member', 'Designer', 'Researcher'].map((position) => (
                                <option key={position} value={position} style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>
                                  {position}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeMember(member.email)}
                              disabled={member.isAdmin}
                              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                              style={isDayMode
                                ? { backgroundColor: '#dc2626', color: '#fff', border: 'none' }
                                : { backgroundColor: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.25)' }
                              }
                            >
                              <Trash2 size={16} />
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(member.status)}`}>
                              {member.status}
                            </span>
                            <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>
                              {member.position}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === 'projects' && canViewWorkspace ? (
              <div id="group-projects-section" className="mt-8 rounded-[28px] border p-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Shared Work</div>
                    <h2 className="mt-2 text-2xl font-bold" style={{ color: palette.textPrimary }}>Projects</h2>
                    <p className="mt-1 text-sm" style={{ color: palette.textMuted }}>{isAdmin ? 'Create and showcase group projects in a polished workspace view.' : 'Browse the current initiatives inside this group workspace.'}</p>
                  </div>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={openProjectModal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition hover:bg-emerald-500/25"
                      style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}
                    >
                      <Plus size={16} />
                      Add Project
                    </button>
                  ) : (
                    <div className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                      {projects.length} projects
                    </div>
                  )}
                </div>

                {projects.length > 0 ? (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => (
                      <article
                        key={project.id}
                        className="group relative rounded-[26px] border p-5 transition cursor-pointer"
                        style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = palette.accentBorder; e.currentTarget.style.backgroundColor = palette.bgSurfaceHover }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = palette.borderSoft; e.currentTarget.style.backgroundColor = palette.bgInput }}
                      >
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }}
                            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition hover:bg-red-500/25"
                            title="Delete project"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                        <div className={`flex items-start justify-between gap-4 ${isAdmin ? 'pr-8' : ''}`}>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.accentPrimary }}>Project</div>
                            <h3 className="mt-2 text-xl font-bold transition" style={{ color: palette.textPrimary }}>{project.title}</h3>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-6" style={{ color: palette.textSecondary }}>{project.description}</p>
                        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                          <MiniValue label="Owner" value={project.ownerName || project.owner || 'Admin'} />
                          <MiniValue label="Due" value={formatDisplayDate(project.dueDate, 'TBD')} />
                          <MiniValue label="Start" value={formatDisplayDate(project.startDate, 'N/A')} />
                          <MiniValue label="Access" value="Shared" />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border px-5 py-10 text-center" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput, color: palette.textMuted }}>
                    No projects have been added to this workspace yet.
                  </div>
                )}
              </div>
            ) : null}
          </motion.section>
          </div>
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>

      <style>{`
        select option {
          background: ${palette.bgTertiary};
          color: ${palette.textSecondary};
        }
        select option:hover,
        select option:focus,
        select option:checked {
          background: ${palette.accentSoft};
          color: ${palette.accentPrimary};
        }
      `}</style>

      {showProjectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[30px] border p-6" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgTertiary, boxShadow: palette.shadowDropdown }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary }}>New Project</div>
                <h3 className="mt-2 text-3xl font-black" style={{ color: palette.textPrimary }}>Add project</h3>
                <p className="mt-2 text-sm" style={{ color: palette.textMuted }}>Create a new project card for this group workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="rounded-full border px-3 py-2 text-sm"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}
              >
                Close
              </button>
            </div>

            <form onSubmit={addProject} className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Project title</label>
                <div className="w-full rounded-2xl border transition" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface }}>
                  <GhostInput 
                    value={projectForm.title} 
                    onChange={(v) => setProjectForm((current) => ({ ...current, title: v }))} 
                    placeholder="Enter project title" 
                    className="w-full px-4 py-3"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Owner</label>
                <input
                  type="text"
                  value={projectForm.owner}
                  readOnly
                  disabled
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none cursor-not-allowed"
                  style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurfaceHover, color: palette.textMuted }}
                />
              </div>
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm" style={{ color: palette.textSecondary }}>Description</label>
                  <button
                    type="button"
                    onClick={suggestDescription}
                    disabled={!projectForm.title.trim() || isGeneratingDesc}
                    className="flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 transition"
                    style={{ color: palette.accentPrimary }}
                  >
                    <Sparkles size={14} />
                    {isGeneratingDesc ? 'Generating...' : 'Qubi Suggest'}
                  </button>
                </div>
                <textarea
                  value={projectForm.description}
                  onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="Describe the project goals, scope, and deliverables"
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
                  style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Start Date</label>
                <input
                  type="date"
                  value={today}
                  readOnly
                  disabled
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none cursor-not-allowed"
                  style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurfaceHover, color: palette.textMuted }}
                />
              </div>
              <FormField label="Due date" type="date" value={projectForm.dueDate} onChange={(value) => setProjectForm((current) => ({ ...current, dueDate: value }))} placeholder="" />
              <div>
                <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Status</label>
                 <select
                   value={projectForm.status}
                   onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))}
                   className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
                   style={{ borderColor: palette.accentBorder, backgroundColor: palette.bgTertiary, color: palette.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }}
                 >
                   {['Planning', 'In Progress', 'Review', 'Completed'].map((status) => (
                     <option key={status} value={status} style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>{status}</option>
                   ))}
                 </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Reference Material (PDF, Word, Images)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-4 transition"
                  style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft }}
                >
                  <Upload size={18} style={{ color: palette.accentPrimary }} />
                  <span className="text-sm" style={{ color: palette.textSecondary }}>{projectFile ? projectFile.name : 'Click to upload file...'}</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                  className="hidden"
                  onChange={(e) => setProjectFile(e.target.files[0] || null)}
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowProjectModal(false)} className="rounded-xl border px-5 py-3 text-sm font-semibold"
                  style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>
                  Cancel
                </button>
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                  style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                  <Plus size={16} />
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const TabButton = ({ active, onClick, icon: Icon, label }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
      style={active
        ? { backgroundColor: p.accentPrimary, color: '#fff', borderColor: p.accentPrimary }
        : { borderColor: p.borderInput, backgroundColor: p.bgSurface, color: p.textSecondary }
      }
    >
      <Icon size={15} />
      {label}
    </button>
  )
}

const StatCard = ({ icon: Icon, label, value, accent = false }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <motion.div variants={itemVariants} className="rounded-[28px] border p-5 backdrop-blur-xl"
      style={{ borderColor: p.borderPrimary, backgroundColor: p.bgInput }}>
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border"
          style={{ borderColor: p.accentBorder, backgroundColor: p.accentPrimary, color: '#fff' }}>
          <Icon size={18} />
        </span>
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: p.textFaint }}>{label}</div>
          <div className="mt-1 text-2xl font-bold" style={{ color: accent ? p.accentPrimary : p.textPrimary }}>{value}</div>
        </div>
      </div>
    </motion.div>
  )
}

const MiniRow = ({ label, value }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: p.borderSoft, backgroundColor: p.bgInput }}>
      <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: p.textFaint }}>{label}</div>
      <div className="mt-2 text-sm font-semibold" style={{ color: p.textPrimary }}>{value}</div>
    </div>
  )
}

const MiniValue = ({ label, value }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <div className="rounded-2xl border px-3 py-3" style={{ borderColor: p.borderSoft, backgroundColor: p.bgSurface }}>
      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: p.textFaint }}>{label}</div>
      <div className="mt-1 text-sm font-semibold" style={{ color: p.textPrimary }}>{value}</div>
    </div>
  )
}

const FormField = ({ label, type = 'text', value, onChange, placeholder = '' }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <div>
      <label className="mb-2 block text-sm" style={{ color: p.textSecondary }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
        style={{ borderColor: p.borderInput, backgroundColor: p.bgSurface, color: p.textPrimary }}
      />
    </div>
  )
}

const UserCardIcon = () => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl border"
      style={{ borderColor: p.accentBorder, backgroundColor: p.accentPrimary, color: '#fff' }}>
      <Users2 size={16} />
    </span>
  )
}

export default GroupDetailPage
