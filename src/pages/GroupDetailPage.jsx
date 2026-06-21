import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  LayoutGrid,
  Plus,
  Shield,
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
  const [managementTab, setManagementTab] = useState('members')
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
      const timer = setTimeout(() => {
        const el = document.getElementById(`group-${scrollParam}-section`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [location.search, members])

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
      <div className="relative overflow-hidden bg-[#060a06] text-white" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar currentPage="groups" />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0 bg-[#060a06]" />
          <motion.div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 18% 0%, rgba(16,185,129,0.18) 0%, transparent 42%)', y: glowY1 }} />
          <motion.div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12) 0%, transparent 36%)', y: glowY2 }} />
        </div>
        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-2xl rounded-[36px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))] p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,0.45)] md:p-10"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-emerald-400/18 bg-emerald-400/10 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.12)]">
              <Users2 size={28} />
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300/78">Group not found</div>
            <h1 className="mt-4 text-4xl font-bold leading-[0.95] text-white md:text-5xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              This group does not exist.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/56">Return to the groups list and choose another project workspace.</p>
            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-400/12 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all hover:border-emerald-300/30 hover:bg-emerald-400/16 hover:text-emerald-200"
            >
              <ArrowLeft size={16} />
              Back to groups
            </button>
          </motion.div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-[#060a06] text-white" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentPage="groups" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#060a06]" />
        <motion.div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 18% 0%, rgba(16,185,129,0.18) 0%, transparent 42%)', y: glowY1 }} />
        <motion.div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12) 0%, transparent 36%)', y: glowY2 }} />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
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
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 hover:border-emerald-400/30 hover:text-emerald-300 transition"
            >
              <ArrowLeft size={16} />
              Back to groups
            </motion.button>

            <motion.section
              variants={heroVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="relative overflow-hidden rounded-[40px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))] shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
              <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl bg-emerald-500/10" />
              <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl bg-cyan-500/10" />

              <div className="relative z-10 p-7 md:p-10 xl:p-12">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-3xl">
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-3 rounded-full border border-emerald-400/16 bg-emerald-400/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em] text-emerald-300">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.8)]" />
                        Group workspace
                      </span>
                      {group.groupType && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/52">
                          {group.groupType}
                        </span>
                      )}
                    </div>
                    <h1
                      className="text-5xl font-bold leading-[0.9] text-white md:text-6xl xl:text-[5rem]"
                      style={{ fontFamily: "'Syne', sans-serif", textShadow: '0 0 40px rgba(16,185,129,0.08)' }}
                    >
                      {group.groupTitle || group.title}
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-8 text-white/58 md:text-lg">{group.groupDescription || group.description}</p>
                  </div>

                  <div className="rounded-[34px] border border-emerald-400/15 bg-emerald-500/10 px-6 py-5">
                    <div className="flex items-center gap-3 text-emerald-200">
                      <Crown size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.28em]">Admin</span>
                    </div>
                    <div className="mt-3 text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{group.owner}</div>
                    <div className="mt-1 text-xs text-white/50">Project owner and management access holder</div>
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
              className="relative z-10 mt-8 rounded-[40px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.45)] md:p-10 xl:p-12"
            >
            <div className="flex flex-wrap items-center gap-3">
              <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={CheckCircle2} label="Group Details" />
              {isAdmin ? (
                <TabButton active={activeTab === 'management'} onClick={() => setActiveTab('management')} icon={Shield} label="Group Management" />
              ) : null}
            </div>

            {activeTab === 'details' ? (
              <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                  <div className="flex items-center gap-3 text-emerald-300">
                    <Sparkles size={18} />
                    <div className="text-xs font-semibold uppercase tracking-[0.28em]">Overview</div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/65">
                    This workspace is organized for research collaboration, project delivery, and member activity tracking. The admin can manage assignments, review project work, and expand the group with new initiatives.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                     {[
                       { label: 'Group Type', value: 'Research' },
                       { label: 'Visibility', value: 'Private workspace' },
                       { label: 'Access', value: isAdmin ? 'Admin controls enabled' : canViewWorkspace ? 'Workspace member access' : 'Overview only' },
                     ].map((item) => (
                       <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                         <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{item.label}</div>
                        <div className="mt-2 text-sm font-semibold text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                  <div className="flex items-center gap-3 text-emerald-300">
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

                {!isAdmin && canViewWorkspace ? (
                  <div className="lg:col-span-2 space-y-6">
                    <div id="group-members-section" className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/70">Workspace Members</div>
                          <h2 className="mt-2 text-2xl font-bold text-white">Members</h2>
                          <p className="mt-1 text-sm text-white/50">View who is active inside this research group.</p>
                        </div>
                        <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                          {members.length} members
                        </div>
                      </div>

                      <div className="space-y-4">
                        {members.map((member) => (
                          <div key={member.email} className="rounded-3xl border border-white/[0.06] bg-black/20 p-5">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-14 w-14 overflow-hidden rounded-2xl border border-emerald-400/20 bg-white/5 p-0.5">
                                  <img src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.name || 'U')}`} alt={member.name} className="h-full w-full rounded-[14px] object-cover" />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-lg font-bold text-white">{member.name}</div>
                                    {member.isAdmin ? (
                                      <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                                        Owner
                                      </span>
                                    ) : null}
                                    {member.isCurrentUser ? (
                                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                                        Me
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 text-sm text-white/50">{member.email}</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(member.status)}`}>
                                  {member.status}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-white/80">
                                  {member.position}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div id="group-projects-section" className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/70">Shared Work</div>
                          <h2 className="mt-2 text-2xl font-bold text-white">Projects</h2>
                          <p className="mt-1 text-sm text-white/50">Browse the current initiatives inside this group workspace.</p>
                        </div>
                        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                          {projects.length} projects
                        </div>
                      </div>

                      {projects.length > 0 ? (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                          {projects.map((project) => (
                            <article
                              key={project.id}
                              className="rounded-[26px] border border-white/[0.06] bg-black/20 p-5 transition hover:border-emerald-400/20 hover:bg-white/[0.05] cursor-pointer"
                              onClick={() => navigate(`/projects/${project.id}`)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/70">Project</div>
                                  <h3 className="mt-2 text-xl font-bold text-white transition hover:text-emerald-300">{project.title}</h3>
                                </div>
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(project.status)}`}>
                                  {project.status}
                                </span>
                              </div>
                              <p className="mt-4 text-sm leading-6 text-white/55">{project.description}</p>
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
                        <div className="rounded-3xl border border-white/[0.06] bg-black/20 px-5 py-10 text-center text-white/50">
                          No projects have been added to this workspace yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'management' && isAdmin ? (
              <div className="mt-8">
                <div className="flex flex-wrap items-center gap-3">
                  <TabButton active={managementTab === 'members'} onClick={() => setManagementTab('members')} icon={UserPen} label="Members" />
                  <TabButton active={managementTab === 'projects'} onClick={() => setManagementTab('projects')} icon={LayoutGrid} label="Projects" />
                </div>

                {managementTab === 'members' ? (
                  <div id="group-members-section" className="mt-6 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-white">Members</h2>
                        <p className="mt-1 text-sm text-white/50">Assign positions or remove members from the group.</p>
                      </div>
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                        {members.length} members
                      </div>
                    </div>

                    <div className="space-y-4">
                      {members.map((member) => (
                        <div key={member.email} className="rounded-3xl border border-white/[0.06] bg-black/20 p-5">
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 overflow-hidden rounded-2xl border border-emerald-400/20 bg-white/5 p-0.5">
                                <img src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.name || 'U')}`} alt={member.name} className="h-full w-full rounded-[14px] object-cover" />
                              </div>
                              <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-lg font-bold text-white">{member.name}</div>
                                    {member.isAdmin ? (
                                      <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                                        Owner
                                      </span>
                                    ) : null}
                                    {member.isCurrentUser ? (
                                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                                        Me
                                      </span>
                                    ) : null}
                                  </div>
                                <div className="mt-1 text-sm text-white/50">{member.email}</div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(member.status)}`}>
                                    {member.status}
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-white/80">
                                    {member.position}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              {member.status === 'Pending' ? (
                                <button
                                  type="button"
                                  onClick={() => acceptMember(member.email)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                                >
                                  <CheckCircle2 size={16} />
                                  Accept Request
                                </button>
                              ) : null}
                              <select
                                 value={memberPositions[member.email] || member.position || 'Member'}
                                 onChange={(event) => updateMemberPosition(member.email, event.target.value)}
                                 disabled={member.isAdmin}
                                 className="rounded-xl border border-emerald-400/20 bg-[#13211b] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/45 focus:bg-[#162820] disabled:cursor-not-allowed disabled:opacity-70"
                                 style={{ colorScheme: 'dark' }}
                               >
                                 {['Project Admin', 'Research Lead', 'Developer', 'Analyst', 'Member', 'Designer', 'Researcher'].map((position) => (
                                   <option key={position} value={position} className="bg-[#13211b] text-white">
                                     {position}
                                   </option>
                                 ))}
                               </select>
                              <button
                                type="button"
                                onClick={() => removeMember(member.email)}
                                disabled={member.isAdmin}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 size={16} />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {managementTab === 'projects' ? (
                  <div id="group-projects-section" className="mt-6 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white">Projects</h2>
                        <p className="mt-1 text-sm text-white/50">Create and showcase group projects in a polished workspace view.</p>
                      </div>
                      <button
                        type="button"
                        onClick={openProjectModal}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                      >
                        <Plus size={16} />
                        Add Project
                      </button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {projects.map((project) => (
                        <article
                          key={project.id}
                          className="group relative rounded-[26px] border border-white/[0.06] bg-black/20 p-5 transition hover:border-emerald-400/20 hover:bg-white/[0.05] cursor-pointer"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }}
                            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition hover:bg-red-500/25"
                            title="Delete project"
                          >
                            <Trash2 size={14} />
                          </button>
                          <div className="flex items-start justify-between gap-4 pr-8">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/70">Project</div>
                              <h3 className="mt-2 text-xl font-bold text-white group-hover:text-emerald-300 transition">{project.title}</h3>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(project.status)}`}>
                              {project.status}
                            </span>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-white/55">{project.description}</p>
                          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                            <MiniValue label="Owner" value={project.ownerName || project.owner || 'Admin'} />
                            <MiniValue label="Due" value={formatDisplayDate(project.dueDate, 'TBD')} />
                            <MiniValue label="Start" value={formatDisplayDate(project.startDate, 'N/A')} />
                            <MiniValue label="Access" value="Shared" />
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'management' && !isAdmin ? (
              <div className="mt-8 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                  <Shield size={22} />
                </div>
                <h2 className="mt-5 text-2xl font-bold text-white">Management is restricted</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">
                  Only the project admin can open the Group Management tab. You can still review the group details above.
                </p>
              </div>
            ) : null}
          </motion.section>
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        select option {
          background: #0a120c;
          color: #e2e8f0;
        }
        select option:hover,
        select option:focus,
        select option:checked {
          background: rgba(16,185,129,0.15);
          color: #6ee7b7;
        }
      `}</style>

      {showProjectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[30px] border border-white/[0.09] bg-[#0a120c] p-6 shadow-[0_30px_120px_-40px_rgba(0,0,0,0.95)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">New Project</div>
                <h3 className="mt-2 text-3xl font-black text-white">Add project</h3>
                <p className="mt-2 text-sm text-white/55">Create a new project card for this group workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/70 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={addProject} className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/80">Project title</label>
                <div className="w-full rounded-2xl border border-white/10 bg-white/[0.05] text-sm text-white transition focus-within:border-emerald-400/40">
                  <GhostInput 
                    value={projectForm.title} 
                    onChange={(v) => setProjectForm((current) => ({ ...current, title: v }))} 
                    placeholder="Enter project title" 
                    className="w-full px-4 py-3"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/80">Owner</label>
                <input
                  type="text"
                  value={projectForm.owner}
                  readOnly
                  disabled
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white/60 outline-none cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm text-white/80">Description</label>
                  <button
                    type="button"
                    onClick={suggestDescription}
                    disabled={!projectForm.title.trim() || isGeneratingDesc}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition"
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
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/80">Start Date</label>
                <input
                  type="date"
                  value={today}
                  readOnly
                  disabled
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white/60 outline-none cursor-not-allowed"
                />
              </div>
              <FormField label="Due date" type="date" value={projectForm.dueDate} onChange={(value) => setProjectForm((current) => ({ ...current, dueDate: value }))} placeholder="" />
              <div>
                <label className="mb-2 block text-sm text-white/80">Status</label>
                 <select
                   value={projectForm.status}
                   onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))}
                   className="w-full rounded-2xl border border-emerald-400/20 bg-[#13211b] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/45 focus:bg-[#162820]"
                   style={{ colorScheme: 'dark' }}
                 >
                   {['Planning', 'In Progress', 'Review', 'Completed'].map((status) => (
                     <option key={status} value={status} className="bg-[#13211b] text-white">{status}</option>
                   ))}
                 </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-white/80">Reference Material (PDF, Word, Images)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-4 transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
                >
                  <Upload size={18} className="text-emerald-300" />
                  <span className="text-sm text-white/60">{projectFile ? projectFile.name : 'Click to upload file...'}</span>
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
                <button type="button" onClick={() => setShowProjectModal(false)} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/75">
                  Cancel
                </button>
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black">
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

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white'}`}
  >
    <Icon size={15} />
    {label}
  </button>
)

const StatCard = ({ icon: Icon, label, value, accent = false }) => (
  <motion.div variants={itemVariants} className="rounded-[28px] border border-white/[0.07] bg-black/20 p-5 backdrop-blur-xl">
    <div className="flex items-center gap-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/10 text-emerald-300">
        <Icon size={18} />
      </span>
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
      </div>
    </div>
  </motion.div>
)

const MiniRow = ({ label, value }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
    <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{label}</div>
    <div className="mt-2 text-sm font-semibold text-white">{value}</div>
  </div>
)

const MiniValue = ({ label, value }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3 py-3">
    <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">{label}</div>
    <div className="mt-1 text-sm font-semibold text-white">{value}</div>
  </div>
)

const FormField = ({ label, type = 'text', value, onChange, placeholder = '' }) => (
  <div>
    <label className="mb-2 block text-sm text-white/80">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40"
    />
  </div>
)

const UserCardIcon = () => (
  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/10 text-emerald-300">
    <Users2 size={16} />
  </span>
)

export default GroupDetailPage
