import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  LayoutGrid,
  Plus,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  Users2,
  UserPen,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
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

const makeInitialMembers = (group) => [
  {
    id: `${group.id}-owner`,
    name: group.owner,
    position: 'Project Admin',
    status: 'Active',
    email: `${String(group.owner || 'admin').toLowerCase().replace(/\s+/g, '.') }@qsphere.dev`,
    avatar: group.avatar,
    isAdmin: true,
  },
  {
    id: `${group.id}-1`,
    name: 'Ayesha Khan',
    position: 'Research Lead',
    status: 'Active',
    email: 'ayesha.khan@qsphere.dev',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayesha',
  },
  {
    id: `${group.id}-2`,
    name: 'Ali Raza',
    position: 'Quantum Analyst',
    status: 'Away',
    email: 'ali.raza@qsphere.dev',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali',
  },
  {
    id: `${group.id}-3`,
    name: 'Sara Noor',
    position: 'Developer',
    status: 'Active',
    email: 'sara.noor@qsphere.dev',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara',
  },
]

const makeInitialProjects = (group) => [
  {
    id: `${group.id}-p1`,
    title: `${group.title} Roadmap`,
    description: `A structured research and delivery roadmap for ${group.title}.`,
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

const memberStoreKey = (groupId) => `qsphere_group_members_${groupId}`
const projectStoreKey = (groupId) => `qsphere_group_projects_${groupId}`

const statusBadgeClass = (status) => {
  if (status === 'Active') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
  if (status === 'In Progress') return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
  if (status === 'Planning') return 'border-amber-400/30 bg-amber-500/10 text-amber-300'
  return 'border-white/10 bg-white/[0.04] text-white/70'
}

const GroupDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const groupId = Number(id)
  const [groups, setGroups] = useState(() => getStoredGroups())
  const profile = useMemo(() => readStoredProfile(), [])

  useEffect(() => {
    const syncGroups = () => setGroups(getStoredGroups())
    syncGroups()
    window.addEventListener('qsphere-groups-updated', syncGroups)
    return () => window.removeEventListener('qsphere-groups-updated', syncGroups)
  }, [])

  const group = useMemo(() => groups.find((item) => item.id === groupId) ?? null, [groups, groupId])
  const isAdmin = Boolean(group && profile && String(profile.fullName || '').trim().toLowerCase() === String(group.owner || '').trim().toLowerCase())

  const [activeTab, setActiveTab] = useState('details')
  const [managementTab, setManagementTab] = useState('members')
  const [members, setMembers] = useState([])
  const [projects, setProjects] = useState([])
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [projectForm, setProjectForm] = useState({ title: '', description: '', owner: '', dueDate: '', status: 'Planning' })
  const [memberPositions, setMemberPositions] = useState({})

  useEffect(() => {
    if (!group) return

    const storedMembers = readJson(memberStoreKey(group.id), null)
    const storedProjects = readJson(projectStoreKey(group.id), null)
    const nextMembers = Array.isArray(storedMembers) && storedMembers.length ? storedMembers : makeInitialMembers(group)
    const nextProjects = Array.isArray(storedProjects) && storedProjects.length ? storedProjects : makeInitialProjects(group)

    setMembers(nextMembers)
    setProjects(nextProjects)
    setMemberPositions(
      nextMembers.reduce((accumulator, member) => {
        accumulator[member.id] = member.position || 'Member'
        return accumulator
      }, {}),
    )
  }, [group])

  useEffect(() => {
    if (!group || !members.length) return
    writeJson(memberStoreKey(group.id), members)
  }, [group, members])

  useEffect(() => {
    if (!group || !projects.length) return
    writeJson(projectStoreKey(group.id), projects)
  }, [group, projects])

  const totalMembers = members.length
  const activeUsers = members.filter((member) => member.status === 'Active').length
  const totalProjects = projects.length

  const updateMemberPosition = (memberId, position) => {
    setMemberPositions((current) => ({ ...current, [memberId]: position }))
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, position } : member)),
    )
  }

  const removeMember = (memberId) => {
    setMembers((current) => current.filter((member) => member.id !== memberId))
  }

  const openProjectModal = () => {
    setProjectForm({ title: '', description: '', owner: group?.owner || '', dueDate: '', status: 'Planning' })
    setShowProjectModal(true)
  }

  const addProject = (event) => {
    event.preventDefault()

    if (!projectForm.title.trim() || !projectForm.description.trim()) return

    const newProject = {
      id: `project-${Date.now()}`,
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      owner: projectForm.owner.trim() || group?.owner || 'Group Admin',
      dueDate: projectForm.dueDate || '',
      status: projectForm.status,
      members: Math.max(1, Math.min(12, Math.round(Math.random() * 6) + 2)),
    }

    setProjects((current) => [newProject, ...current])
    setShowProjectModal(false)
  }

  if (!group) {
    return (
      <div className="relative min-h-screen bg-[#08120d] text-white">
        <Navbar currentPage="groups" />
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-28 sm:px-8">
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 hover:border-emerald-400/30 hover:text-emerald-300 transition"
          >
            <ArrowLeft size={16} />
            Back to groups
          </button>
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-8 backdrop-blur-2xl">
            <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Group not found</div>
            <h1 className="mt-3 text-3xl font-black">This group does not exist.</h1>
            <p className="mt-3 text-white/55">Return to the groups list and choose another project workspace.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#08120d] text-white">
      <Navbar currentPage="groups" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#08120d]" />
        <div className="absolute inset-0 opacity-45" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(6,182,212,0.16) 0%, transparent 50%)' }} />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-28 md:px-10 lg:px-14">
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 hover:border-emerald-400/30 hover:text-emerald-300 transition"
        >
          <ArrowLeft size={16} />
          Back to groups
        </button>

        <section className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_-35px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <div className="border-b border-white/[0.06] px-6 py-7 md:px-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 10px rgba(16,185,129,0.9)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400">Group workspace</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight md:text-5xl" style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}>
                  {group.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 md:text-base">{group.description}</p>
              </div>

              <div className="rounded-3xl border border-emerald-400/15 bg-emerald-500/10 px-5 py-4">
                <div className="flex items-center gap-3 text-emerald-200">
                  <Crown size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.24em]">Admin</span>
                </div>
                <div className="mt-2 text-lg font-bold text-white">{group.owner}</div>
                <div className="mt-1 text-xs text-white/50">Project owner and management access holder</div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <StatCard icon={Users2} label="Total Members" value={String(totalMembers)} accent />
              <StatCard icon={Sparkles} label="Active Users" value={String(activeUsers)} />
              <StatCard icon={LayoutGrid} label="Projects" value={String(totalProjects)} accent />
            </div>
          </div>

          <div className="px-6 py-6 md:px-8">
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
                      { label: 'Access', value: isAdmin ? 'Admin controls enabled' : 'Member view only' },
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
                    <MiniRow label="Project Title" value={group.title} />
                    <MiniRow label="Admin" value={group.owner} />
                    <MiniRow label="Members" value={String(totalMembers)} />
                    <MiniRow label="Projects" value={String(totalProjects)} />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'management' && isAdmin ? (
              <div className="mt-8">
                <div className="flex flex-wrap items-center gap-3">
                  <TabButton active={managementTab === 'members'} onClick={() => setManagementTab('members')} icon={UserPen} label="Members" />
                  <TabButton active={managementTab === 'projects'} onClick={() => setManagementTab('projects')} icon={LayoutGrid} label="Projects" />
                </div>

                {managementTab === 'members' ? (
                  <div className="mt-6 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
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
                        <div key={member.id} className="rounded-3xl border border-white/[0.06] bg-black/20 p-5">
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 overflow-hidden rounded-2xl border border-emerald-400/20 bg-white/5 p-0.5">
                                <img src={member.avatar} alt={member.name} className="h-full w-full rounded-[14px] object-cover" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-lg font-bold text-white">{member.name}</div>
                                  {member.isAdmin ? (
                                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                                      Admin
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
                              <select
                                value={memberPositions[member.id] || member.position || 'Member'}
                                onChange={(event) => updateMemberPosition(member.id, event.target.value)}
                                disabled={member.isAdmin}
                                className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {['Project Admin', 'Research Lead', 'Developer', 'Analyst', 'Member', 'Designer', 'Researcher'].map((position) => (
                                  <option key={position} value={position}>
                                    {position}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => removeMember(member.id)}
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
                  <div className="mt-6 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
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
                        <article key={project.id} className="group rounded-[26px] border border-white/[0.06] bg-black/20 p-5 transition hover:border-emerald-400/20 hover:bg-white/[0.05]">
                          <div className="flex items-start justify-between gap-4">
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
                            <MiniValue label="Owner" value={project.owner} />
                            <MiniValue label="Members" value={String(project.members)} />
                            <MiniValue label="Due" value={project.dueDate || 'TBD'} />
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
          </div>
        </section>
      </main>

      <Footer />

      {showProjectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[30px] border border-white/[0.09] bg-[#0d1611] p-6 shadow-[0_30px_120px_-40px_rgba(0,0,0,0.95)]">
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
              <FormField label="Project title" value={projectForm.title} onChange={(value) => setProjectForm((current) => ({ ...current, title: value }))} placeholder="Enter project title" />
              <FormField label="Owner" value={projectForm.owner} onChange={(value) => setProjectForm((current) => ({ ...current, owner: value }))} placeholder="Project owner" />
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-white/80">Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="Describe the project goals, scope, and deliverables"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40"
                />
              </div>
              <FormField label="Due date" type="date" value={projectForm.dueDate} onChange={(value) => setProjectForm((current) => ({ ...current, dueDate: value }))} />
              <div>
                <label className="mb-2 block text-sm text-white/80">Status</label>
                <select
                  value={projectForm.status}
                  onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40"
                >
                  {['Planning', 'In Progress', 'Review', 'Completed'].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
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
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 transition-all duration-300 hover:border-emerald-400/20 hover:bg-white/[0.04]">
    <div className="flex items-center gap-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/10 text-emerald-300">
        <Icon size={18} />
      </span>
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
      </div>
    </div>
  </div>
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