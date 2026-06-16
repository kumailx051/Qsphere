import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Clock, Download, FileText, LayoutGrid, MessageSquare, MoreVertical,
  Plus, Send, Sparkles, Trash2, Upload, Users2, X, Calendar, ClipboardList, FolderOpen, Edit3, UserPlus, Eye
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem('qsphere_onboarding_profile')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const statusColors = {
  Pending: 'border-yellow-400/30 bg-yellow-500/10 text-yellow-300',
  'In Progress': 'border-blue-400/30 bg-blue-500/10 text-blue-300',
  Review: 'border-purple-400/30 bg-purple-500/10 text-purple-300',
  Rework: 'border-orange-400/30 bg-orange-500/10 text-orange-300',
  Completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  Accepted: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
}
const statusBadge = (s) => statusColors[s] || 'border-white/10 bg-white/5 text-white/60'

const taskTypeColors = {
  Research: '#6366f1', Development: '#10b981', Design: '#f59e0b', Analysis: '#3b82f6', Review: '#a855f7'
}

const TABS = [
  { key: 'details', label: 'Project Details', icon: ClipboardList },
  { key: 'myTasks', label: 'My Tasks', icon: CheckCircle2 },
  { key: 'discussion', label: 'Discussion', icon: MessageSquare },
  { key: 'documents', label: 'Documents', icon: FolderOpen },
]

const formatDisplayDate = (value, fallback = 'N/A') => {
  if (!value) return fallback
  if (typeof value === 'string') return value.includes('T') ? value.split('T')[0] : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString().split('T')[0]
}

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useMemo(() => readStoredProfile(), [])
  const userEmail = profile?.emailAddress || ''
  const normalizedUserEmail = useMemo(() => userEmail.trim().toLowerCase(), [userEmail])

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [documents, setDocuments] = useState([])
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ taskName: '', taskType: 'Research', startDate: '', targetDate: '', details: '', assignedToEmail: '' })
  const [taskFile, setTaskFile] = useState(null)
  const taskFileRef = useRef(null)

  // Task dropdown
  const [openDropdown, setOpenDropdown] = useState(null)

  // Task details popup
  const [viewTask, setViewTask] = useState(null)

  // Submit work popup
  const [submitTask, setSubmitTask] = useState(null)
  const [submitNotes, setSubmitNotes] = useState('')
  const [submitFile, setSubmitFile] = useState(null)
  const submitFileRef = useRef(null)

  // Review popup
  const [reviewSubmission, setReviewSubmission] = useState(null)
  const [taskSubmissions, setTaskSubmissions] = useState([])

  // Chat
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)
  const chatListRef = useRef(null)
  const chatPollRef = useRef(null)
  const chatLongPressRef = useRef(null)
  const shouldStickToBottomRef = useRef(true)
  const previousChatLengthRef = useRef(0)
  const initialChatLoadedRef = useRef(false)
  const [chatActionMessage, setChatActionMessage] = useState(null)
  const [chatEditMessage, setChatEditMessage] = useState(null)
  const [chatEditValue, setChatEditValue] = useState('')
  const [chatReadMessage, setChatReadMessage] = useState(null)

  // Modify task popup
  const [modifyTask, setModifyTask] = useState(null)
  const [modifyForm, setModifyForm] = useState({})

  const isOwner = project && (userEmail.toLowerCase() === (project.ownerEmail || project.groupOwnerEmail || '').toLowerCase())

  const today = new Date().toISOString().split('T')[0]

  const markProjectChatRead = useCallback(async () => {
    if (!normalizedUserEmail) return
    try {
      await fetch(`/api/projects/${projectId}/chat/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerEmail: normalizedUserEmail })
      })
    } catch (e) { console.error(e) }
  }, [normalizedUserEmail, projectId])

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) setProject(await res.json())
    } catch (e) { console.error(e) }
  }, [projectId])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`)
      if (res.ok) setTasks(await res.json())
    } catch (e) { console.error(e) }
  }, [projectId])

  const fetchMembers = useCallback(async (groupId, groupOwnerEmail) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`)
      if (res.ok) {
        const rawData = await res.json()
        const ownerEmail = String(groupOwnerEmail || '').trim().toLowerCase()
        const mappedMembers = rawData.map(m => ({
          ...m,
          name: m.name || m.email,
          isAdmin: m.email?.toLowerCase() === ownerEmail,
          isCurrentUser: String(m.email || '').trim().toLowerCase() === normalizedUserEmail,
        }))

        const hasOwnerInMembers = ownerEmail
          ? mappedMembers.some(m => String(m.email || '').trim().toLowerCase() === ownerEmail)
          : false

        let ownerProfile = null
        if (!hasOwnerInMembers && ownerEmail) {
          try {
            const ownerRes = await fetch(`/api/users/profile/${encodeURIComponent(groupOwnerEmail)}`)
            if (ownerRes.ok) ownerProfile = await ownerRes.json()
          } catch { /* ignore */ }
        }

        const membersWithOwner = !hasOwnerInMembers && ownerEmail
          ? [
              {
                id: `owner-${groupId}`,
                email: groupOwnerEmail,
                name: ownerProfile?.fullName || groupOwnerEmail,
                avatar: ownerProfile?.profileImage || ownerProfile?.avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(groupOwnerEmail)}`,
                status: 'Active',
                position: 'Owner',
                isAdmin: true,
                isCurrentUser: ownerEmail === normalizedUserEmail,
              },
              ...mappedMembers,
            ]
          : mappedMembers

        setMembers(membersWithOwner)
      }
    } catch (e) { console.error(e) }
  }, [normalizedUserEmail])

  const fetchChat = useCallback(async () => {
    try {
      const params = normalizedUserEmail ? `?userEmail=${encodeURIComponent(normalizedUserEmail)}` : ''
      const res = await fetch(`/api/projects/${projectId}/chat${params}`)
      if (res.ok) {
        setChatMessages(await res.json())
        void markProjectChatRead()
      }
    } catch (e) { console.error(e) }
  }, [markProjectChatRead, normalizedUserEmail, projectId])

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`)
      if (res.ok) setDocuments(await res.json())
    } catch (e) { console.error(e) }
  }, [projectId])

  useEffect(() => {
    const logged = localStorage.getItem('qsphere_logged_in') === '1'
    if (!logged) { navigate('/auth'); return }
    ;(async () => {
      await fetchProject()
      await fetchTasks()
      setLoading(false)
    })()
  }, [fetchProject, fetchTasks, navigate])

  useEffect(() => {
    if (project?.groupId) fetchMembers(project.groupId, project.groupOwnerEmail)
  }, [project?.groupId, project?.groupOwnerEmail, fetchMembers])

  // Poll chat every 3s when on discussion tab
  useEffect(() => {
    if (activeTab === 'discussion') {
      initialChatLoadedRef.current = false
      previousChatLengthRef.current = 0
      shouldStickToBottomRef.current = true
      fetchChat()
      chatPollRef.current = setInterval(fetchChat, 3000)
    }
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current) }
  }, [activeTab, fetchChat])

  useEffect(() => {
    if (activeTab === 'documents') fetchDocuments()
  }, [activeTab, fetchDocuments])

  useEffect(() => {
    const scrollTo = new URLSearchParams(location.search).get('scroll')
    if (scrollTo === 'discussion') {
      setActiveTab('discussion')
    }
  }, [location.search])

  useEffect(() => {
    if (activeTab !== 'discussion') return
    const nextLength = chatMessages.length
    const previousLength = previousChatLengthRef.current
    const lastMessage = chatMessages[nextLength - 1]
    const hasCountChanged = nextLength !== previousLength
    const appendedMine = nextLength > previousLength && lastMessage?.senderEmail?.toLowerCase() === normalizedUserEmail
    const shouldScroll = !initialChatLoadedRef.current || (hasCountChanged && (shouldStickToBottomRef.current || appendedMine))

    if (shouldScroll) {
      chatEndRef.current?.scrollIntoView({ behavior: initialChatLoadedRef.current ? 'smooth' : 'auto' })
    }

    initialChatLoadedRef.current = true
    previousChatLengthRef.current = nextLength
  }, [activeTab, chatMessages, normalizedUserEmail])

  useEffect(() => () => {
    if (chatLongPressRef.current) window.clearTimeout(chatLongPressRef.current)
  }, [])

  // ─── Handlers ───
  const createTask = async (e) => {
    e.preventDefault()
    if (!taskForm.taskName.trim()) return
    if (taskForm.startDate && project?.startDate && new Date(taskForm.startDate) < new Date(project.startDate)) {
      showSnackbar(`Start date cannot be before project start date (${new Date(project.startDate).toLocaleDateString()}).`, 'error')
      return
    }
    if (taskForm.startDate && project?.dueDate && new Date(taskForm.startDate) > new Date(project.dueDate)) {
      showSnackbar(`Start date cannot exceed project deadline (${new Date(project.dueDate).toLocaleDateString()}).`, 'error')
      return
    }
    if (taskForm.targetDate && project?.dueDate && new Date(taskForm.targetDate) > new Date(project.dueDate)) {
      showSnackbar(`Target date cannot exceed project deadline (${new Date(project.dueDate).toLocaleDateString()}).`, 'error')
      return
    }
    if (taskForm.targetDate && new Date(taskForm.targetDate) < new Date(today)) {
      showSnackbar('Target date cannot be before the start date.', 'error')
      return
    }
    const fd = new FormData()
    fd.append('taskName', taskForm.taskName)
    fd.append('taskType', taskForm.taskType)
    fd.append('startDate', taskForm.startDate || today)
    fd.append('targetDate', taskForm.targetDate)
    fd.append('details', taskForm.details)
    fd.append('assignedToEmail', taskForm.assignedToEmail)
    if (taskFile) fd.append('referenceFile', taskFile)

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { method: 'POST', body: fd })
      if (res.ok) {
        await fetchTasks()
        setShowTaskModal(false)
        setTaskForm({ taskName: '', taskType: 'Research', startDate: '', targetDate: '', details: '', assignedToEmail: '' })
        setTaskFile(null)
      }
    } catch (e) { console.error(e) }
  }

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      await fetchTasks()
    } catch (e) { console.error(e) }
  }

  const updateTaskStatus = async (taskId, status) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      await fetchTasks()
    } catch (e) { console.error(e) }
  }

  const assignTask = async (taskId, email) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedToEmail: email }) })
      await fetchTasks()
    } catch (e) { console.error(e) }
  }

  const modifyTaskSave = async (e) => {
    e.preventDefault()
    try {
      await fetch(`/api/tasks/${modifyTask.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modifyForm) })
      await fetchTasks()
      setModifyTask(null)
    } catch (e) { console.error(e) }
  }

  const submitWork = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('submittedByEmail', userEmail)
    fd.append('notes', submitNotes)
    if (submitFile) fd.append('submissionFile', submitFile)
    try {
      await fetch(`/api/tasks/${submitTask.id}/submit`, { method: 'POST', body: fd })
      await fetchTasks()
      setSubmitTask(null)
      setSubmitNotes('')
      setSubmitFile(null)
    } catch (e) { console.error(e) }
  }

  const fetchSubmissions = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/submissions`)
      if (res.ok) setTaskSubmissions(await res.json())
    } catch (e) { console.error(e) }
  }

  const reviewWork = async (submissionId, status) => {
    try {
      await fetch(`/api/submissions/${submissionId}/review`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      await fetchTasks()
      setReviewSubmission(null)
      setTaskSubmissions([])
    } catch (e) { console.error(e) }
  }

  const sendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail: userEmail, message: chatInput.trim() })
      })
      if (res.ok) {
        const msg = await res.json()
        shouldStickToBottomRef.current = true
        setChatMessages((prev) => [...prev, msg])
        setChatInput('')
      }
    } catch (e) { console.error(e) }
  }

  const handleChatScroll = useCallback(() => {
    const el = chatListRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldStickToBottomRef.current = distanceFromBottom < 72
  }, [])

  const isMyMessage = useCallback((msg) => msg.senderEmail?.toLowerCase() === normalizedUserEmail, [normalizedUserEmail])
  const canEditChatMessage = useCallback((msg) => isMyMessage(msg) && !msg.deletedForEveryone, [isMyMessage])
  const canDeleteChatForEveryone = useCallback((msg) => (isMyMessage(msg) || isOwner) && !msg.deletedForEveryone, [isMyMessage, isOwner])
  const canDeleteChatForMe = useCallback((msg) => Boolean(msg?.id), [])
  const canSeeChatReadBy = useCallback((msg) => isMyMessage(msg), [isMyMessage])

  const openChatActions = useCallback((msg) => {
    const hasActions = canEditChatMessage(msg) || canDeleteChatForMe(msg) || canDeleteChatForEveryone(msg) || canSeeChatReadBy(msg)
    if (!hasActions) return
    setChatActionMessage(msg)
  }, [canDeleteChatForEveryone, canDeleteChatForMe, canEditChatMessage, canSeeChatReadBy])

  const cancelChatLongPress = useCallback(() => {
    if (chatLongPressRef.current) {
      window.clearTimeout(chatLongPressRef.current)
      chatLongPressRef.current = null
    }
  }, [])

  const startChatLongPress = useCallback((msg) => (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    cancelChatLongPress()
    chatLongPressRef.current = window.setTimeout(() => {
      openChatActions(msg)
      chatLongPressRef.current = null
    }, 500)
  }, [cancelChatLongPress, openChatActions])

  const closeChatActionMessage = useCallback(() => setChatActionMessage(null), [])

  const showSnackbar = useCallback((message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
  }, [])

  const beginEditChatMessage = useCallback((msg) => {
    setChatActionMessage(null)
    setChatEditMessage(msg)
    setChatEditValue(msg.message || '')
  }, [])

  const saveEditedChatMessage = async (e) => {
    e.preventDefault()
    if (!chatEditMessage || !chatEditValue.trim()) return
    try {
      const res = await fetch(`/api/projects/${projectId}/chat/${chatEditMessage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: normalizedUserEmail, message: chatEditValue.trim() })
      })
      if (res.ok) {
        await fetchChat()
        setChatEditMessage(null)
        setChatEditValue('')
      }
    } catch (e) { console.error(e) }
  }

  const deleteChatMessage = async (msg, scope) => {
    if (!msg?.id) return
    try {
      const res = await fetch(`/api/projects/${projectId}/chat/${msg.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: normalizedUserEmail, scope })
      })
      if (res.ok) {
        setChatActionMessage(null)
        if (chatReadMessage?.id === msg.id) setChatReadMessage(null)
        await fetchChat()
        showSnackbar(scope === 'everyone' ? 'Message deleted for everyone.' : 'Message deleted for you.')
      } else {
        const data = await res.json().catch(() => null)
        showSnackbar(data?.error || 'Failed to delete message.', 'error')
      }
    } catch (e) {
      console.error(e)
      showSnackbar('Failed to delete message.', 'error')
    }
  }

  const openChatReadBy = useCallback((msg) => {
    setChatActionMessage(null)
    setChatReadMessage(msg)
  }, [])

  // ─── Derived ───
  const daysLeft = project?.dueDate ? Math.max(0, Math.ceil((new Date(project.dueDate) - new Date()) / 86400000)) : null
  const myTasks = tasks.filter(t => t.assignedToEmail?.toLowerCase() === userEmail.toLowerCase())
  const completedTasks = tasks.filter(t => t.status === 'Completed')
  const weeklyData = useMemo(() => {
    const weeks = []
    const now = new Date()
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (i * 7 + now.getDay()))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      const weekTasks = tasks.filter(t => {
        const d = new Date(t.created_at)
        return d >= weekStart && d < weekEnd
      })
      weeks.push({
        label: `Week ${4 - i}`,
        total: weekTasks.length,
        completed: weekTasks.filter(t => t.status === 'Completed').length,
        tasks: weekTasks
      })
    }
    return weeks
  }, [tasks])
  const readReceiptMessage = chatMessages.find(msg => msg.id === chatReadMessage?.id) || chatReadMessage
  const readReceiptEntries = (readReceiptMessage?.readBy || []).filter(reader => reader.emailAddress?.toLowerCase() !== normalizedUserEmail)

  if (loading) return (
    <div className="relative min-h-screen bg-[#08120d] text-white">
      <Navbar currentPage="groups" />
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    </div>
  )

  if (!project) return (
    <div className="relative min-h-screen bg-[#08120d] text-white">
      <Navbar currentPage="groups" />
      <main className="mx-auto max-w-4xl px-6 pt-28 pb-24">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80"><ArrowLeft size={16} />Back</button>
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.05] p-8">
          <h1 className="text-3xl font-black">Project not found</h1>
        </div>
      </main>
      <Footer />
    </div>
  )

  return (
    <div className="relative min-h-screen bg-[#08120d] text-white">
      <Navbar currentPage="groups" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#08120d]" />
        <div className="absolute inset-0 opacity-45" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 65%)' }} />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-28 md:px-10 lg:px-14">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 hover:border-emerald-400/30 hover:text-emerald-300 transition">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <section className="rounded-[32px] border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_-35px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden">
          <div className="border-b border-white/[0.06] px-6 py-7 md:px-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 10px rgba(16,185,129,0.9)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400">{project.groupTitle || 'Project'}</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">{project.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{project.description}</p>
              </div>
              <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${statusBadge(project.status)}`}>{project.status}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 py-4 md:px-8">
            <div className="flex flex-wrap gap-3">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${activeTab === t.key ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white'}`}>
                  <t.icon size={15} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-8 md:px-8">
            {/* ═══ SECTION 1: PROJECT DETAILS ═══ */}
            {activeTab === 'details' && (
              <div className="mt-4 space-y-8">
                {/* Date info */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <InfoCard label="Start Date" value={formatDisplayDate(project.startDate, 'N/A')} icon={Calendar} />
                  <InfoCard label="Due Date" value={formatDisplayDate(project.dueDate, 'TBD')} icon={Clock} />
                  <InfoCard label="Days Remaining" value={daysLeft !== null ? `${daysLeft} days` : 'N/A'} icon={Sparkles} accent={daysLeft !== null && daysLeft <= 7} />
                </div>

                {/* Reference Material */}
                {project.referenceMaterialUrl && (
                  <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                    <div className="flex items-center gap-3 text-emerald-300 mb-4">
                      <FileText size={18} />
                      <span className="text-xs font-semibold uppercase tracking-[0.28em]">Reference Material</span>
                    </div>
                    <a href={project.referenceMaterialUrl} download className="inline-flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-300 hover:bg-emerald-500/20 transition">
                      <Download size={16} /> Download Reference File
                    </a>
                  </div>
                )}

                {/* Task Section */}
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3 text-emerald-300">
                        <ClipboardList size={18} />
                        <span className="text-xs font-semibold uppercase tracking-[0.28em]">Project Tasks</span>
                      </div>
                      {isOwner && (
                        <button onClick={() => { setTaskForm({ taskName: '', taskType: 'Research', startDate: today, targetDate: '', details: '', assignedToEmail: '' }); setTaskFile(null); setShowTaskModal(true) }}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 transition">
                          <Plus size={14} /> Add Task
                        </button>
                      )}
                    </div>

                    {tasks.length === 0 ? (
                      <p className="text-sm text-white/40 text-center py-8">No tasks created yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map(task => (
                          <div key={task.id} className="relative flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-black/20 p-4 hover:border-emerald-400/15 transition group">
                            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.status === 'Completed' ? '#10b981' : taskTypeColors[task.taskType] || '#666' }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white truncate">{task.taskName}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider ${statusBadge(task.status)}`}>{task.status}</span>
                              </div>
                              <div className="mt-1 text-xs text-white/40">{task.assigneeName || 'Unassigned'} · {task.taskType || 'General'}</div>
                            </div>
                            <div className="relative">
                              <button onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === task.id ? null : task.id) }}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/50 hover:text-white transition">
                                <MoreVertical size={14} />
                              </button>
                              {openDropdown === task.id && (
                                <div className="absolute right-0 top-10 z-30 w-44 rounded-2xl border border-white/10 bg-[#0d1611] p-1.5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                  <DropItem icon={Eye} label="Details" onClick={() => { setViewTask(task); setOpenDropdown(null) }} />
                                  {isOwner && <DropItem icon={UserPlus} label="Assign" onClick={() => { const email = window.prompt('Enter member email:'); if (email) assignTask(task.id, email); setOpenDropdown(null) }} />}
                                  {isOwner && <DropItem icon={Trash2} label="Remove" danger onClick={() => { deleteTask(task.id); setOpenDropdown(null) }} />}
                                  {isOwner && <DropItem icon={Edit3} label="Modify" onClick={() => { setModifyForm({ taskName: task.taskName, taskType: task.taskType, targetDate: task.targetDate || '', details: task.details || '' }); setModifyTask(task); setOpenDropdown(null) }} />}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Team Members */}
                  <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                    <div className="flex items-center gap-3 text-emerald-300 mb-5">
                      <Users2 size={18} />
                      <span className="text-xs font-semibold uppercase tracking-[0.28em]">Team ({members.length})</span>
                    </div>
                    <div className="space-y-2">
                      {members.map(m => (
                        <div key={m.email} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-emerald-400/20 bg-white/5">
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.name || 'Member'} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-300 uppercase">{(m.name || m.email || '?').charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">{m.name || m.email}</span>
                            {m.isAdmin ? (
                              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-300">Owner</span>
                            ) : null}
                            {m.isCurrentUser ? (
                              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Me</span>
                            ) : null}
                            <span className="rounded-full border px-1.5 py-0.5 text-[8px] font-semibold leading-none text-white/60 border-white/10 bg-white/[0.04]">{m.position || 'Member'}</span>
                          </div>
                        </div>
                      ))}
                      {members.length === 0 && <p className="text-sm text-white/40 text-center py-4">No members yet.</p>}
                    </div>
                  </div>
                </div>

                {/* Weekly Progress */}
                <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6">
                  <div className="flex items-center gap-3 text-emerald-300 mb-6">
                    <LayoutGrid size={18} />
                    <span className="text-xs font-semibold uppercase tracking-[0.28em]">Weekly Progress</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-4">
                    {weeklyData.map((week, i) => (
                      <div key={i} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                        <div className="text-xs font-semibold text-emerald-300/70 uppercase tracking-wider">{week.label}</div>
                        <div className="mt-3 flex items-end gap-2">
                          <span className="text-2xl font-black text-white">{week.completed}</span>
                          <span className="text-sm text-white/40">/ {week.total}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: week.total ? `${(week.completed / week.total) * 100}%` : '0%' }} />
                        </div>
                        <div className="mt-3 space-y-1">
                          {week.tasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2 text-[10px]">
                              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.status === 'Completed' ? '#10b981' : '#555' }} />
                              <span className={t.status === 'Completed' ? 'text-emerald-300' : 'text-white/50'}>{t.taskName}</span>
                              <span className="text-white/30 ml-auto">{t.assigneeName || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SECTION 2: MY TASKS ═══ */}
            {activeTab === 'myTasks' && (
              <div className="mt-4">
                <div className="flex items-center gap-3 text-emerald-300 mb-6">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.28em]">My Assigned Tasks</span>
                </div>
                {myTasks.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-12">No tasks assigned to you.</p>
                ) : (
                  <div className="space-y-3">
                    {myTasks.map(task => (
                      <div key={task.id} className="rounded-2xl border border-white/[0.06] bg-black/20 p-5 hover:border-emerald-400/15 transition cursor-pointer"
                        onClick={() => {
                          if (task.status === 'Pending' || task.status === 'Rework') {
                            setSubmitTask(task); setSubmitNotes(''); setSubmitFile(null)
                          } else if (task.status === 'Review' && isOwner) {
                            setReviewSubmission(task); fetchSubmissions(task.id)
                          }
                        }}>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{task.taskName}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider ${statusBadge(task.status)}`}>{task.status}</span>
                            </div>
                            <div className="mt-1 text-xs text-white/40">{task.taskType || 'General'} · Due: {formatDisplayDate(task.targetDate, 'N/A')}</div>
                          </div>
                          {(task.status === 'Pending' || task.status === 'Rework') && (
                            <span className="text-xs text-emerald-300/70 border border-emerald-400/20 rounded-full px-3 py-1">Submit Work →</span>
                          )}
                          {task.status === 'Review' && isOwner && (
                            <span className="text-xs text-purple-300/70 border border-purple-400/20 rounded-full px-3 py-1">Review →</span>
                          )}
                          {task.status === 'Completed' && (
                            <CheckCircle2 size={18} className="text-emerald-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ SECTION 3: DISCUSSION ═══ */}
            {activeTab === 'discussion' && (
              <div className="mt-4">
                <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] overflow-hidden flex flex-col" style={{ height: '520px' }}>
                  <div className="border-b border-white/[0.06] px-5 py-3 flex items-center gap-3">
                    <MessageSquare size={16} className="text-emerald-300" />
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Group Discussion</span>
                    <span className="ml-auto text-xs text-white/30">{chatMessages.length} messages</span>
                  </div>
                  <div className="border-b border-white/[0.04] px-5 py-2 text-[10px] uppercase tracking-[0.24em] text-white/30">
                    Long press or right click a message for actions
                  </div>
                  <div ref={chatListRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {chatMessages.map(msg => {
                      const isMine = isMyMessage(msg)
                      const readByOthers = (msg.readBy || []).filter(reader => reader.emailAddress?.toLowerCase() !== normalizedUserEmail)
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            onPointerDown={startChatLongPress(msg)}
                            onPointerUp={cancelChatLongPress}
                            onPointerLeave={cancelChatLongPress}
                            onPointerMove={cancelChatLongPress}
                            onPointerCancel={cancelChatLongPress}
                            onContextMenu={(e) => { e.preventDefault(); openChatActions(msg) }}
                            className={`max-w-[75%] rounded-2xl px-4 py-3 transition ${isMine ? 'bg-emerald-500/20 border border-emerald-400/20' : 'bg-white/[0.06] border border-white/[0.06]'} ${canEditChatMessage(msg) || canDeleteChatForMe(msg) || canDeleteChatForEveryone(msg) || canSeeChatReadBy(msg) ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                          >
                            {!isMine && <div className="text-[10px] font-semibold text-emerald-300/70 mb-1">{msg.senderName || msg.senderEmail}</div>}
                            <div className={`text-sm ${msg.deletedForEveryone ? 'italic text-white/45' : 'text-white/85'}`}>{msg.message}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-white/25">
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {msg.editedAt && !msg.deletedForEveryone && <span>· edited</span>}
                              {isMine && readByOthers.length > 0 && <span>· seen by {readByOthers.length}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={sendChat} className="border-t border-white/[0.06] px-5 py-3 flex items-center gap-3">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..."
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-emerald-400/40" />
                    <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-black hover:bg-emerald-300 transition">
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ═══ SECTION 4: DOCUMENTS ═══ */}
            {activeTab === 'documents' && (
              <div className="mt-4">
                <div className="flex items-center gap-3 text-emerald-300 mb-6">
                  <FolderOpen size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.28em]">All Documents</span>
                </div>
                {documents.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-12">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={18} className="text-emerald-300/60 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{doc.title}</div>
                            <div className="text-[10px] text-white/40">{doc.source} · {doc.ownerEmail || 'Unknown'}</div>
                          </div>
                        </div>
                        <a href={doc.referenceMaterialUrl} download className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition flex-shrink-0">
                          <Download size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* ═══ ADD TASK MODAL ═══ */}
      {showTaskModal && (
        <ModalOverlay onClose={() => setShowTaskModal(false)}>
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">New Task</div>
          <h3 className="mt-2 text-2xl font-black text-white">Create Task</h3>
          <form onSubmit={createTask} className="mt-5 grid gap-4 md:grid-cols-2">
            <ModalInput label="Task Name" value={taskForm.taskName} onChange={(v) => setTaskForm(f => ({ ...f, taskName: v }))} placeholder="Enter task name" required />
            <div>
              <label className="mb-2 block text-sm text-white/80">Task Type</label>
              <select value={taskForm.taskType} onChange={(e) => setTaskForm(f => ({ ...f, taskType: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#1a2a22] px-4 py-3 text-sm text-white outline-none" style={{ colorScheme: 'dark' }}>
                {['Research', 'Development', 'Design', 'Analysis', 'Review'].map(t => <option key={t} value={t} className="bg-[#1a2a22] text-white">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/80">Start Date</label>
              <input type="date" value={taskForm.startDate || today} onChange={(e) => setTaskForm(f => ({ ...f, startDate: e.target.value }))}
                min={project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : today}
                max={project?.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 [color-scheme:dark]" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/80">Target Date</label>
              <input type="date" value={taskForm.targetDate} onChange={(e) => setTaskForm(f => ({ ...f, targetDate: e.target.value }))}
                min={today}
                max={project?.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 [color-scheme:dark]" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-white/80">Details</label>
              <textarea value={taskForm.details} onChange={(e) => setTaskForm(f => ({ ...f, details: e.target.value }))} rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-emerald-400/40" placeholder="Task details..." />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/80">Assign To</label>
              <select value={taskForm.assignedToEmail} onChange={(e) => setTaskForm(f => ({ ...f, assignedToEmail: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#1a2a22] px-4 py-3 text-sm text-white outline-none" style={{ colorScheme: 'dark' }}>
                <option value="" className="bg-[#1a2a22] text-white">Unassigned</option>
                {members.filter(m => m.status === 'Active' && !m.isAdmin).map(m => <option key={m.email} value={m.email} className="bg-[#1a2a22] text-white">{m.name || m.email}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/80">Reference File</label>
              <div onClick={() => taskFileRef.current?.click()} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-3 hover:border-emerald-400/50 transition">
                <Upload size={16} className="text-emerald-300" />
                <span className="text-sm text-white/60 truncate">{taskFile ? taskFile.name : 'Upload...'}</span>
              </div>
              <input ref={taskFileRef} type="file" className="hidden" onChange={(e) => setTaskFile(e.target.files[0] || null)} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowTaskModal(false)} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/75">Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black"><Plus size={14} /> Create Task</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ═══ VIEW TASK DETAILS ═══ */}
      {viewTask && (
        <ModalOverlay onClose={() => setViewTask(null)}>
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Task Details</div>
          <h3 className="mt-2 text-2xl font-black text-white">{viewTask.taskName}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailRow label="Type" value={viewTask.taskType || 'General'} />
            <DetailRow label="Status" value={viewTask.status} />
            <DetailRow label="Start" value={formatDisplayDate(viewTask.startDate, 'N/A')} />
            <DetailRow label="Target" value={formatDisplayDate(viewTask.targetDate, 'N/A')} />
            <DetailRow label="Assigned To" value={viewTask.assigneeName || viewTask.assignedToEmail || 'Unassigned'} />
          </div>
          {viewTask.details && <p className="mt-4 text-sm text-white/60 leading-6">{viewTask.details}</p>}
          {viewTask.referenceMaterialUrl && (
            <a href={viewTask.referenceMaterialUrl} download className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 transition">
              <Download size={14} /> Download Reference
            </a>
          )}
        </ModalOverlay>
      )}

      {/* ═══ SUBMIT WORK ═══ */}
      {submitTask && (
        <ModalOverlay onClose={() => setSubmitTask(null)}>
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Submit Work</div>
          <h3 className="mt-2 text-2xl font-black text-white">{submitTask.taskName}</h3>
          <form onSubmit={submitWork} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/80">Notes</label>
              <textarea value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)} rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-emerald-400/40" placeholder="Describe your work..." />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/80">Upload File</label>
              <div onClick={() => submitFileRef.current?.click()} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-3 hover:border-emerald-400/50 transition">
                <Upload size={16} className="text-emerald-300" />
                <span className="text-sm text-white/60 truncate">{submitFile ? submitFile.name : 'Upload...'}</span>
              </div>
              <input ref={submitFileRef} type="file" className="hidden" onChange={(e) => setSubmitFile(e.target.files[0] || null)} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setSubmitTask(null)} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/75">Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black"><Send size={14} /> Submit</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ═══ REVIEW SUBMISSION ═══ */}
      {reviewSubmission && (
        <ModalOverlay onClose={() => { setReviewSubmission(null); setTaskSubmissions([]) }}>
          <div className="text-[10px] uppercase tracking-[0.3em] text-purple-300/70">Review Submission</div>
          <h3 className="mt-2 text-2xl font-black text-white">{reviewSubmission.taskName}</h3>
          <div className="mt-5 space-y-3 max-h-64 overflow-y-auto">
            {taskSubmissions.length === 0 ? <p className="text-sm text-white/40">No submissions yet.</p> : taskSubmissions.map(sub => (
              <div key={sub.id} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{sub.submitterName || sub.submittedByEmail}</div>
                    <div className="text-xs text-white/40 mt-1">{sub.notes || 'No notes'}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase ${statusBadge(sub.status)}`}>{sub.status}</span>
                </div>
                {sub.fileUrl && <a href={sub.fileUrl} download className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-300"><Download size={12} /> Download</a>}
                {sub.status === 'Review' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => reviewWork(sub.id, 'Accepted')} className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/30">Accept</button>
                    <button onClick={() => reviewWork(sub.id, 'Rework')} className="rounded-lg bg-orange-500/20 border border-orange-400/30 px-3 py-1.5 text-xs text-orange-300 hover:bg-orange-500/30">Rework</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ModalOverlay>
      )}

      {/* ═══ MODIFY TASK ═══ */}
      {modifyTask && (
        <ModalOverlay onClose={() => setModifyTask(null)}>
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Modify Task</div>
          <h3 className="mt-2 text-2xl font-black text-white">Edit Task</h3>
          <form onSubmit={modifyTaskSave} className="mt-5 space-y-4">
            <ModalInput label="Task Name" value={modifyForm.taskName || ''} onChange={(v) => setModifyForm(f => ({ ...f, taskName: v }))} />
            <div>
              <label className="mb-2 block text-sm text-white/80">Task Type</label>
              <select value={modifyForm.taskType || ''} onChange={(e) => setModifyForm(f => ({ ...f, taskType: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#1a2a22] px-4 py-3 text-sm text-white outline-none" style={{ colorScheme: 'dark' }}>
                {['Research', 'Development', 'Design', 'Analysis', 'Review'].map(t => <option key={t} value={t} className="bg-[#1a2a22] text-white">{t}</option>)}
              </select>
            </div>
            <ModalInput label="Target Date" type="date" value={modifyForm.targetDate || ''} onChange={(v) => setModifyForm(f => ({ ...f, targetDate: v }))} />
            <div>
              <label className="mb-2 block text-sm text-white/80">Details</label>
              <textarea value={modifyForm.details || ''} onChange={(e) => setModifyForm(f => ({ ...f, details: e.target.value }))} rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/40" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModifyTask(null)} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/75">Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black"><CheckCircle2 size={14} /> Save Changes</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {chatActionMessage && (
        <ModalOverlay onClose={closeChatActionMessage} maxWidthClassName="max-w-md">
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Message Actions</div>
          <h3 className="mt-2 text-2xl font-black text-white">Choose an action</h3>
          <p className="mt-3 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-white/65">
            {chatActionMessage.deletedForEveryone ? 'This message was deleted for everyone.' : chatActionMessage.message}
          </p>
          <div className="mt-5 space-y-2">
            {canEditChatMessage(chatActionMessage) && (
              <SheetAction icon={Edit3} label="Edit message" onClick={() => beginEditChatMessage(chatActionMessage)} />
            )}
            {canDeleteChatForMe(chatActionMessage) && (
              <SheetAction icon={Trash2} label="Delete for me" onClick={() => deleteChatMessage(chatActionMessage, 'me')} danger />
            )}
            {canDeleteChatForEveryone(chatActionMessage) && (
              <SheetAction icon={Trash2} label="Delete for everyone" onClick={() => deleteChatMessage(chatActionMessage, 'everyone')} danger />
            )}
            {canSeeChatReadBy(chatActionMessage) && (
              <SheetAction icon={Eye} label="See read by" onClick={() => openChatReadBy(chatActionMessage)} />
            )}
          </div>
        </ModalOverlay>
      )}

      {chatEditMessage && (
        <ModalOverlay onClose={() => { setChatEditMessage(null); setChatEditValue('') }} maxWidthClassName="max-w-xl">
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Edit Message</div>
          <h3 className="mt-2 text-2xl font-black text-white">Update your message</h3>
          <form onSubmit={saveEditedChatMessage} className="mt-5 space-y-4">
            <textarea value={chatEditValue} onChange={(e) => setChatEditValue(e.target.value)} rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-emerald-400/40"
              placeholder="Edit your message..." />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setChatEditMessage(null); setChatEditValue('') }} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/75">Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black"><CheckCircle2 size={14} /> Save Message</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {chatReadMessage && (
        <ModalOverlay onClose={() => setChatReadMessage(null)} maxWidthClassName="max-w-lg">
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Read Receipts</div>
          <h3 className="mt-2 text-2xl font-black text-white">Seen by</h3>
          <div className="mt-5 space-y-3 max-h-72 overflow-y-auto pr-1">
            {readReceiptEntries.length === 0 ? (
              <p className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-4 text-sm text-white/45">No one else has read this message yet.</p>
            ) : readReceiptEntries.map((reader) => (
              <div key={`${reader.emailAddress}-${reader.readAt}`} className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3">
                <div className="text-sm font-semibold text-white">{reader.fullName || reader.emailAddress}</div>
                <div className="mt-1 text-xs text-white/40">{new Date(reader.readAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

// ─── Small Components ───

const InfoCard = ({ label, value, icon: Icon, accent }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/10 text-emerald-300"><Icon size={16} /></span>
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{label}</div>
        <div className={`mt-1 text-lg font-bold ${accent ? 'text-red-400' : 'text-white'}`}>{value}</div>
      </div>
    </div>
  </div>
)

const DetailRow = ({ label, value }) => (
  <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
    <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">{label}</div>
    <div className="mt-1 text-sm font-semibold text-white">{value}</div>
  </div>
)

const DropItem = ({ icon: Icon, label, onClick, danger }) => (
  <button type="button" onClick={onClick}
    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white/75 hover:bg-emerald-500/10 hover:text-emerald-200'}`}>
    <Icon size={14} /> {label}
  </button>
)

const ModalOverlay = ({ children, onClose, maxWidthClassName = 'max-w-2xl' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md" onClick={onClose}>
    <div className={`relative w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto rounded-[30px] border border-white/[0.09] bg-[#0d1611] p-6 shadow-[0_30px_120px_-40px_rgba(0,0,0,0.95)]`} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onClose} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 hover:text-white">
        <X size={16} />
      </button>
      {children}
    </div>
  </div>
)

const SheetAction = ({ icon: Icon, label, onClick, danger = false }) => (
  <button type="button" onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${danger ? 'border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15' : 'border-white/[0.06] bg-white/[0.03] text-white/80 hover:border-emerald-400/20 hover:bg-emerald-500/10 hover:text-emerald-200'}`}>
    <Icon size={16} /> {label}
  </button>
)

const ModalInput = ({ label, type = 'text', value, onChange, placeholder = '', required = false }) => (
  <div>
    <label className="mb-2 block text-sm text-white/80">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40" />
  </div>
)
