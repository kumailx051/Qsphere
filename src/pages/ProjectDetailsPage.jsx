import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowLeft, Calendar, CheckCircle2, ChevronRight, ClipboardList, Clock, Download,
  Edit3, Eye, FileText, FolderOpen, Hash, LayoutGrid, MessageSquare, MoreVertical,
  Paperclip, Pin, Plus, Search, Send, SmilePlus, Sparkles, Trash2, Upload, Users2, X, UserPlus
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import chatDoodleDay from '../assets/chatDoodleDay.png'
import chatDoodleNight from '../assets/chatDoodleNight.png'

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

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem('qsphere_onboarding_profile')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const statusColors = {
  Pending: 'bg-yellow-500 text-white border-yellow-500/30',
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

const formatMessageTime = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const formatChatDateLabel = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const today = new Date()
  const inputDate = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
  const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const diffDays = Math.round((todayDate - inputDate) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useMemo(() => readStoredProfile(), [])
  const userEmail = profile?.emailAddress || ''
  const normalizedUserEmail = useMemo(() => userEmail.trim().toLowerCase(), [userEmail])

  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

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
  const [chatEmojiOpen, setChatEmojiOpen] = useState(false)
  const [chatReactionOpen, setChatReactionOpen] = useState(null)
  const [chatActionPos, setChatActionPos] = useState(null)
  const [pinnedMessageIds, setPinnedMessageIds] = useState(new Set())
  const [showAllPinned, setShowAllPinned] = useState(false)
  const [scrollToMessageId, setScrollToMessageId] = useState(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(-1)
  const [displayedMessages, setDisplayedMessages] = useState([])
  const inputRef = useRef(null)
  const [dmTarget, setDmTarget] = useState(null)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const [messageReactions, setMessageReactions] = useState({})
  const [myReactions, setMyReactions] = useState({})
  const chatEndRef = useRef(null)
  const chatEmojiRef = useRef(null)

  const addReaction = (msgId, emoji) => {
    const key = `${msgId}-${emoji}`
    const myPrevKey = Object.keys(myReactions).find(k => k.startsWith(`${msgId}-`))
    setMyReactions(prev => {
      const current = { ...prev }
      if (current[key]) {
        delete current[key]
      } else {
        if (myPrevKey) delete current[myPrevKey]
        current[key] = true
      }
      return current
    })
    setMessageReactions(prev => {
      const current = { ...prev }
      if (current[key]) {
        current[key] = (current[key] || 1) - 1
        if (current[key] <= 0) delete current[key]
      } else {
        if (myPrevKey) {
          current[myPrevKey] = (current[myPrevKey] || 1) - 1
          if (current[myPrevKey] <= 0) delete current[myPrevKey]
        }
        current[key] = (current[key] || 0) + 1
      }
      return current
    })
    setChatReactionOpen(null)
  }

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢']

  const emojiCategories = [
    { icon: '😀', emojis: ['😀','😁','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😋','😛','😜','🤪','😎','🤩','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'] },
    { icon: '✋', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄','💋'] },
    { icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶','💑','💏','👩‍❤️‍👨','👨‍❤️‍👨','👩‍❤️‍👩'] },
    { icon: '🎉', emojis: ['🎉','🎊','🥳','🎈','🎁','🎀','🪅','🪩','🎄','🎃','🎆','🎇','✨','🎯','🏆','🥇','🥈','🥈','🥉','🏅','🎖','🏵','🎗','🎟','🎫','🎬','🎭','🎨','🎪','🎤','🎧','🎶','🎵','🎼','🎹','🥁'] },
    { icon: '🚀', emojis: ['🚀','✈️','🛩','🛫','🛬','🚁','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🛴','🛵','🛺','🚲','🛹','🛼','🚏','⛽','🛣','🛤'] },
    { icon: '💡', emojis: ['💡','🔦','🔋','🔌','🔪','🗡','🪓','🪚','🔨','🪛','🔧','🪜','🛠','⚙️','🪤','🧰','💻','🖥','🖨','🖱','🖲','🕹','🗄','📀','💿','📀','📷','📸','📹','🎥','📽','🎞','📞','☎️','📟','📠','📺','📻','🎙','🎚','🎛','🧭','⏱','⏲','⏰','🕰'] },
  ]
  useEffect(() => {
    if (!chatEmojiOpen) return
    const handler = (e) => { if (chatEmojiRef.current && !chatEmojiRef.current.contains(e.target)) setChatEmojiOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [chatEmojiOpen])
  useEffect(() => {
    if (!mentionOpen) return
    const handler = (e) => { if (inputRef.current && !inputRef.current.closest('.relative')?.contains(e.target)) setMentionOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mentionOpen])
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
    const prevLen = previousChatLengthRef.current
    const newLen = chatMessages.length
    const isNewMessage = newLen > prevLen
    if (isNewMessage || prevLen === 0) {
      const el = chatListRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
    previousChatLengthRef.current = newLen
  }, [activeTab, chatMessages])

  useEffect(() => () => {
    if (chatLongPressRef.current) window.clearTimeout(chatLongPressRef.current)
  }, [])

  useEffect(() => {
    if (!scrollToMessageId || activeTab !== 'discussion') return
    const el = document.querySelector(`[data-msg-id="${scrollToMessageId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setScrollToMessageId(null)
  }, [scrollToMessageId, activeTab])

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

  const openChatActions = useCallback((msg, clientX, clientY) => {
    const hasActions = canEditChatMessage(msg) || canDeleteChatForMe(msg) || canDeleteChatForEveryone(msg) || canSeeChatReadBy(msg) || true
    if (!hasActions) return
    setChatActionMessage(msg)
    setChatActionPos({ x: clientX, y: clientY })
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
    const e = event
    chatLongPressRef.current = window.setTimeout(() => {
      openChatActions(msg, e.clientX || 0, e.clientY || 0)
      chatLongPressRef.current = null
    }, 500)
  }, [cancelChatLongPress, openChatActions])

  const closeChatActionMessage = useCallback(() => { setChatActionMessage(null); setChatActionPos(null) }, [])

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
  const discussionChannels = useMemo(() => {
    const groupLabel = project?.groupTitle || 'General Discussion'
    return [{ name: groupLabel, active: true }]
  }, [project?.groupTitle])
  const directMessages = useMemo(() => members.slice(0, 5), [members])
  const pinnedMessages = useMemo(() => chatMessages.filter(msg => pinnedMessageIds.has(msg.id) && !msg.deletedForEveryone), [chatMessages, pinnedMessageIds])
  const visiblePinned = useMemo(() => pinnedMessages.slice(0, 2), [pinnedMessages])
  const sidebarTasks = useMemo(() => tasks.slice(0, 3), [tasks])
  const sharedDocs = useMemo(() => documents.slice(0, 3), [documents])
  const currentDiscussionName = dmTarget ? dmTarget.name || dmTarget.email : (project?.groupTitle || 'General Discussion')

  useEffect(() => {
    if (!dmTarget) {
      setDisplayedMessages(chatMessages)
      return
    }
    const targetEmail = (dmTarget.email || '').toLowerCase()
    const targetName = (dmTarget.name || '').toLowerCase()
    setDisplayedMessages(chatMessages.filter(msg => {
      const senderEmail = (msg.senderEmail || '').toLowerCase()
      if (senderEmail === normalizedUserEmail || senderEmail === targetEmail) return true
      const senderName = (msg.senderName || '').toLowerCase()
      return senderName === targetName && senderName !== ''
    }))
  }, [chatMessages, dmTarget, normalizedUserEmail])

  const filteredMentions = useMemo(() => {
    if (!mentionQuery) return members
    const q = mentionQuery.toLowerCase()
    return members.filter(m => (m.name || m.email || '').toLowerCase().includes(q))
  }, [mentionQuery, members])

  if (loading) return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
      <Navbar currentPage="groups" />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${palette.accentGlow} 0%, transparent 42%)`, y: glowY1 }} />
        <motion.div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${palette.accentSecondaryGlow} 0%, transparent 36%)`, y: glowY2 }} />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: palette.accentPrimary, borderTopColor: 'transparent' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>
    </div>
  )

  if (!project) return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
      <Navbar currentPage="groups" />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${palette.accentGlow} 0%, transparent 42%)`, y: glowY1 }} />
        <motion.div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${palette.accentSecondaryGlow} 0%, transparent 36%)`, y: glowY2 }} />
      </div>
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pt-28 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl rounded-[36px] p-8 text-center md:p-10"
          style={{ borderColor: palette.borderPrimary, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px]" style={{ backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: `0 0 30px rgba(16,185,129,0.3)` }}>
              <ClipboardList size={28} />
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary }}>Project not found</div>
            <h1 className="mt-4 text-4xl font-bold leading-[0.95] md:text-5xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
              This project does not exist.
            </h1>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all border-0"
              style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}
            >
            <ArrowLeft size={16} />
            Go back
          </button>
        </motion.div>
      </main>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>
    </div>
  )

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
      <Navbar currentPage="groups" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${palette.accentGlow} 0%, transparent 42%)`, y: glowY1 }} />
        <motion.div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${palette.accentSecondaryGlow} 0%, transparent 36%)`, y: glowY2 }} />
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
              onClick={() => navigate(-1)}
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
              style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}
            >
              <ArrowLeft size={16} /> Back
            </motion.button>

            {/* ═══ TABS ───── */}
            <div className="rounded-[20px] border p-2 mb-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
              <div className="flex flex-wrap gap-2">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition`}
                    style={activeTab === t.key ? { backgroundColor: palette.accentPrimary, color: '#fff' } : { color: palette.textSecondary }}>
                    <t.icon size={15} /> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ═══ PROJECT TITLE + DESCRIPTION (only in details tab) ───── */}
            {activeTab === 'details' && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-[28px] border p-7 mb-6 md:p-9"
                style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}
              >
                <h1
                  className="text-4xl font-bold leading-[0.95] md:text-5xl"
                  style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}
                >
                  {project.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 md:text-lg" style={{ color: palette.textMuted }}>
                  {project.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border px-4 py-1.5 text-xs font-semibold" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                    Research in quantum computing
                  </span>
                  <span className="rounded-full border px-4 py-1.5 text-xs font-semibold" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                    Planning
                  </span>
                </div>
              </motion.div>
            )}

          <div className="pb-8">
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
                  <div className="rounded-[28px] p-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                    <div className="flex items-center gap-3 mb-4" style={{ color: palette.accentPrimary }}>
                      <FileText size={18} />
                      <span className="text-xs font-semibold uppercase tracking-[0.28em]">Reference Material</span>
                    </div>
                    <a href={project.referenceMaterialUrl} download className="inline-flex items-center gap-3 rounded-2xl px-5 py-3 text-sm transition"
                      style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                      <Download size={16} /> Download Reference File
                    </a>
                  </div>
                )}

                {/* Task Section */}
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-[28px] p-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3" style={{ color: palette.accentPrimary }}>
                        <ClipboardList size={18} />
                        <span className="text-xs font-semibold uppercase tracking-[0.28em]">Project Tasks</span>
                      </div>
                      {isOwner && (
                        <button onClick={() => { setTaskForm({ taskName: '', taskType: 'Research', startDate: today, targetDate: '', details: '', assignedToEmail: '' }); setTaskFile(null); setShowTaskModal(true) }}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
                          style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                          <Plus size={14} /> Add Task
                        </button>
                      )}
                    </div>

                    {tasks.length === 0 ? (
                      <p className="text-sm text-center py-8" style={{ color: palette.textFaint }}>No tasks created yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map(task => (
                          <div key={task.id} className="relative flex items-center gap-4 rounded-2xl border p-4 transition group"
                            style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.status === 'Completed' ? '#10b981' : taskTypeColors[task.taskType] || '#666' }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold truncate" style={{ color: palette.textPrimary }}>{task.taskName}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider ${statusBadge(task.status)}`}>{task.status}</span>
                              </div>
                              <div className="mt-1 text-xs" style={{ color: palette.textFaint }}>{task.assigneeName || 'Unassigned'} · {task.taskType || 'General'}</div>
                            </div>
                            <div className="relative">
                              <button onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === task.id ? null : task.id) }}
                                className="flex h-8 w-8 items-center justify-center rounded-full border transition"
                                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textMuted }}>
                                <MoreVertical size={14} />
                              </button>
                              {openDropdown === task.id && (
                                <div className="absolute right-0 top-10 z-30 w-44 rounded-2xl border p-1.5 shadow-2xl" onClick={(e) => e.stopPropagation()}
                                  style={{ borderColor: palette.borderInput, backgroundColor: palette.bgTertiary }}>
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
                  <div className="rounded-[28px] p-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                    <div className="flex items-center gap-3 mb-5" style={{ color: palette.accentPrimary }}>
                      <Users2 size={18} />
                      <span className="text-xs font-semibold uppercase tracking-[0.28em]">Team ({members.length})</span>
                    </div>
                    <div className="space-y-2">
                      {members.map(m => (
                        <div key={m.email} className="flex items-center gap-2.5 rounded-xl border px-3 py-2"
                          style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border"
                            style={{ borderColor: palette.accentBorder, backgroundColor: palette.bgSurface }}>
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.name || 'Member'} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold uppercase" style={{ color: palette.accentPrimary }}>{(m.name || m.email || '?').charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="text-sm font-semibold truncate" style={{ color: palette.textPrimary }}>{m.name || m.email}</span>
                            {m.isAdmin ? (
                              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em]"
                                style={isDayMode ? { backgroundColor: '#d97706', color: '#fff' } : { border: '1px solid rgba(251,191,36,0.20)', backgroundColor: 'rgba(245,158,11,0.10)', color: '#fbbf24' }}>Owner</span>
                            ) : null}
                            {m.isCurrentUser ? (
                              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em]"
                                style={isDayMode ? { backgroundColor: '#0891b2', color: '#fff' } : { border: '1px solid rgba(34,211,238,0.20)', backgroundColor: 'rgba(6,182,212,0.10)', color: '#a5f3fc' }}>Me</span>
                            ) : null}
                            <span className="rounded-full border px-1.5 py-0.5 text-[8px] font-semibold leading-none"
                              style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textMuted }}>{m.position || 'Member'}</span>
                          </div>
                        </div>
                      ))}
                      {members.length === 0 && <p className="text-sm text-center py-4" style={{ color: palette.textFaint }}>No members yet.</p>}
                    </div>
                  </div>
                </div>

                {/* Weekly Progress */}
                <div className="rounded-[28px] p-6" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                  <div className="flex items-center gap-3 mb-6" style={{ color: palette.accentPrimary }}>
                    <LayoutGrid size={18} />
                    <span className="text-xs font-semibold uppercase tracking-[0.28em]">Weekly Progress</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-4">
                    {weeklyData.map((week, i) => (
                      <div key={i} className="rounded-2xl border p-4"
                        style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: palette.accentPrimary, opacity: 0.7 }}>{week.label}</div>
                        <div className="mt-3 flex items-end gap-2">
                          <span className="text-2xl font-black" style={{ color: palette.textPrimary }}>{week.completed}</span>
                          <span className="text-sm" style={{ color: palette.textFaint }}>/ {week.total}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: palette.borderSoft }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: week.total ? `${(week.completed / week.total) * 100}%` : '0%', backgroundColor: palette.accentPrimary }} />
                        </div>
                        <div className="mt-3 space-y-1">
                          {week.tasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2 text-[10px]">
                              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.status === 'Completed' ? '#10b981' : '#555' }} />
                              <span style={{ color: t.status === 'Completed' ? palette.accentPrimary : palette.textMuted }}>{t.taskName}</span>
                              <span className="ml-auto" style={{ color: palette.textFaint }}>{t.assigneeName || '—'}</span>
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
                <div className="flex items-center gap-3 mb-6" style={{ color: palette.accentPrimary }}>
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.28em]">My Assigned Tasks</span>
                </div>
                {myTasks.length === 0 ? (
                  <p className="text-sm text-center py-12" style={{ color: palette.textFaint }}>No tasks assigned to you.</p>
                ) : (
                  <div className="space-y-3">
                    {myTasks.map(task => (
                      <div key={task.id} className="rounded-2xl border p-5 transition cursor-pointer"
                        style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}
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
                              <span className="text-sm font-semibold" style={{ color: palette.textPrimary }}>{task.taskName}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider ${statusBadge(task.status)}`}>{task.status}</span>
                            </div>
                            <div className="mt-1 text-xs" style={{ color: palette.textFaint }}>{task.taskType || 'General'} · Due: {formatDisplayDate(task.targetDate, 'N/A')}</div>
                          </div>
                          {(task.status === 'Pending' || task.status === 'Rework') && (
                            <span className="text-xs rounded-full border px-3 py-1"
                              style={{ color: palette.accentPrimary, opacity: 0.7, borderColor: palette.accentBorder }}>Submit Work →</span>
                          )}
                          {task.status === 'Review' && isOwner && (
                            <span className="text-xs text-purple-300/70 border border-purple-400/20 rounded-full px-3 py-1">Review →</span>
                          )}
                          {task.status === 'Completed' && (
                            <CheckCircle2 size={18} style={{ color: palette.accentPrimary }} />
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
                <div
                  className="grid overflow-hidden rounded-[30px] border xl:grid-cols-[260px_minmax(0,1fr)_320px]"
                  style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface, boxShadow: palette.shadowCard }}
                >
                  <aside className="border-b p-5 xl:border-b-0 xl:border-r overflow-y-auto" style={{ maxHeight: 'calc(60vh + 140px)', borderColor: palette.borderSoft, backgroundColor: isDayMode ? palette.bgSurface : 'rgba(0,0,0,0.12)' }}>
                    <h3 className="text-lg font-bold" style={{ color: palette.textPrimary }}>Channels</h3>

                    <div className="mt-5 space-y-2">
                      {discussionChannels.map(channel => (
                        <button
                          key={channel.name}
                          type="button"
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition"
                          style={channel.active
                            ? {
                                background: isDayMode
                                  ? `linear-gradient(135deg, ${palette.accentPrimary}, ${palette.accentDark})`
                                  : 'linear-gradient(135deg, rgba(16,185,129,0.30), rgba(5,150,105,0.45))',
                                color: '#fff'
                              }
                            : { color: palette.textSecondary }}
                        >
                          <Hash size={16} />
                          <span>{channel.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-8 border-t pt-6" style={{ borderColor: palette.borderSoft }}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold" style={{ color: palette.textPrimary }}>Direct Messages</h4>
                      </div>

                      <div className="mt-4 space-y-3">
                        {directMessages.map((member, index) => (
                          <button key={member.email || member.id || index} onClick={() => member.isCurrentUser ? null : setDmTarget(member)}
                            className={`flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition ${member.isCurrentUser ? '' : 'hover:opacity-80'}`}
                            style={!member.isCurrentUser && dmTarget?.email === member.email ? { backgroundColor: palette.accentSoft } : {}}>
                            <div className="relative h-11 w-11 overflow-hidden rounded-full border" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgTertiary }}>
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.name || member.email} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold" style={{ color: palette.accentPrimary }}>{getInitials(member.name || member.email)}</div>
                              )}
                              <span
                                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2"
                                style={{
                                  borderColor: palette.bgSurface,
                                  backgroundColor: member.status === 'Active' ? palette.accentPrimary : '#a3a3a3'
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold" style={{ color: palette.textPrimary }}>{member.name || member.email}{member.isCurrentUser ? <span className="ml-1 text-xs font-normal" style={{ color: palette.textMuted }}>(you)</span> : null}</div>
                              <div className="text-xs" style={{ color: member.status === 'Active' ? palette.accentPrimary : palette.textMuted }}>
                                {member.status === 'Active' ? 'Online' : 'Offline'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </aside>

                  <section className="min-w-0 border-b flex flex-col xl:border-b-0 xl:border-r" style={{ borderColor: palette.borderSoft }}>
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-5 md:px-6 shrink-0" style={{ borderColor: palette.borderSoft }}>
                      <div>
                        <div className="flex items-center gap-2">
                          {dmTarget && (
                            <button type="button" onClick={() => setDmTarget(null)}
                              className="mr-1 rounded-lg px-2 py-1 text-xs font-semibold transition"
                              style={{ backgroundColor: palette.bgTertiary, color: palette.textSecondary }}>
                              back
                            </button>
                          )}
                          <Hash size={18} style={{ color: palette.textPrimary }} />
                          <h3 className="text-[1.35rem] font-bold" style={{ color: palette.textPrimary }}>{currentDiscussionName}</h3>
                          <ChevronRight size={16} style={{ color: palette.textMuted }} />
                        </div>
                        <p className="mt-1 text-sm" style={{ color: palette.textMuted }}>
                          {dmTarget ? 'Direct conversation' : `Public channel • ${members.length || 0} members`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="inline-flex h-10 items-center gap-2 rounded-xl border px-4" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>
                          <Users2 size={16} />
                          <span>{members.length || 0}</span>
                        </button>
                      </div>
                    </div>

                    <div ref={chatListRef} onScroll={handleChatScroll} className="flex-1 min-h-0 overflow-y-auto px-5 md:px-6 space-y-7"
                      style={{
                        maxHeight: '60vh',
                        backgroundImage: `url(${isDayMode ? chatDoodleDay : chatDoodleNight})`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '400px',
                        backgroundPosition: '0 0',
                      }}>
                      {dmTarget && (
                        <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center">
                          <div className="h-16 w-16 overflow-hidden rounded-full border-2 mb-3"
                            style={{ borderColor: palette.accentPrimary, backgroundColor: palette.bgTertiary }}>
                            {dmTarget.avatar ? (
                              <img src={dmTarget.avatar} alt={dmTarget.name || ''} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-lg font-bold" style={{ color: palette.accentPrimary }}>{getInitials(dmTarget.name || dmTarget.email)}</div>
                            )}
                          </div>
                          <div className="text-base font-bold" style={{ color: palette.textPrimary }}>{dmTarget.name || dmTarget.email}</div>
                          <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>Direct conversation started</div>
                        </div>
                      )}
                      {displayedMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <p className="text-sm" style={{ color: palette.textFaint }}>{dmTarget ? 'Start a conversation' : 'No messages yet'}</p>
                        </div>
                      ) : displayedMessages.map((msg, index) => {
                        const isMine = isMyMessage(msg)
                        const readByOthers = (msg.readBy || []).filter(reader => reader.emailAddress?.toLowerCase() !== normalizedUserEmail)
                        const sender = members.find(member => member.email?.toLowerCase() === msg.senderEmail?.toLowerCase())
                        const senderName = msg.senderName || sender?.name || msg.senderEmail || 'Unknown member'
                        const prevMsg = index > 0 ? displayedMessages[index - 1] : null
                        const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : ''
                        const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at).toDateString() : ''
                        const showDateDivider = index === 0 || msgDate !== prevDate

                        return (
                          <>
                          {showDateDivider && (
                            <div key={`date-${index}`} className="flex items-center gap-4 pt-2 text-xs" style={{ color: palette.textFaint }}>
                              <div className="h-px flex-1" style={{ backgroundColor: palette.borderSoft }} />
                              <span>{formatChatDateLabel(msg.created_at)}</span>
                              <div className="h-px flex-1" style={{ backgroundColor: palette.borderSoft }} />
                            </div>
                          )}
                          <div key={msg.id || index} data-msg-id={msg.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                            {!isMine && (
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgTertiary }}>
                                {sender?.avatar ? (
                                  <img src={sender.avatar} alt={senderName} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm font-bold" style={{ color: palette.accentPrimary }}>{getInitials(senderName)}</div>
                                )}
                                <span
                                  className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2"
                                  style={{
                                    borderColor: palette.bgSurface,
                                    backgroundColor: sender?.status === 'Active' || isMine ? palette.accentPrimary : '#a3a3a3'
                                  }}
                                />
                              </div>
                            )}

                            <div className={`min-w-0 ${isMine ? 'max-w-[80%] ml-auto' : 'max-w-[80%]'}`}>
                              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${isMine ? 'justify-end' : ''}`}>
                                <span className="text-[1.08rem] font-bold" style={{ color: palette.textPrimary }}>{isMine ? 'You' : senderName}</span>
                                <span className="text-sm" style={{ color: palette.textMuted }}>{formatMessageTime(msg.created_at)}</span>
                              </div>

                              <div
                                onPointerDown={startChatLongPress(msg)}
                                onPointerUp={cancelChatLongPress}
                                onPointerLeave={cancelChatLongPress}
                                onPointerMove={cancelChatLongPress}
                                onPointerCancel={cancelChatLongPress}
                                onContextMenu={(e) => { e.preventDefault(); openChatActions(msg, e.clientX, e.clientY) }}
                                className={`mt-2 rounded-[22px] border px-5 py-4 transition ${canEditChatMessage(msg) || canDeleteChatForMe(msg) || canDeleteChatForEveryone(msg) || canSeeChatReadBy(msg) ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                                style={isMine
                                  ? {
                                      borderColor: palette.accentBorder,
                                      background: isDayMode
                                        ? `linear-gradient(135deg, ${palette.accentPrimary}26, ${palette.accentPrimary}12)`
                                        : 'linear-gradient(135deg, rgba(16,185,129,0.20), rgba(16,185,129,0.08))'
                                    }
                                  : {
                                      borderColor: palette.borderSoft,
                                      backgroundColor: isDayMode ? palette.bgTertiary : 'rgba(255,255,255,0.03)'
                                    }}
                              >
                                <div className={`text-lg leading-8 ${msg.deletedForEveryone ? 'italic' : ''}`} style={{ color: msg.deletedForEveryone ? palette.textMuted : palette.textPrimary }}>
                                  {msg.message}
                                </div>
                              </div>

                              <div className={`mt-3 flex flex-wrap items-center gap-1.5 ${isMine ? 'justify-end' : ''}`}>
                                {quickReactions.map(emoji => {
                                  const key = `${msg.id}-${emoji}`
                                  const count = messageReactions[key] || 0
                                  const isActive = myReactions[key]
                                  if (count === 0) return null
                                  return (
                                    <button key={emoji} type="button" onClick={() => addReaction(msg.id, emoji)}
                                      className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs transition hover:scale-110"
                                      style={{ borderColor: isActive ? palette.accentPrimary : palette.borderSoft, backgroundColor: isActive ? palette.accentSoft : palette.bgSurface, color: palette.textSecondary }}>
                                      <span className="text-sm leading-none">{emoji}</span>
                                      <span className="ml-1 text-[10px] font-semibold" style={{ color: isActive ? palette.accentPrimary : palette.textMuted }}>{count}</span>
                                    </button>
                                  )
                                })}
                                <div className="relative">
                                  <button type="button" onClick={() => setChatReactionOpen(chatReactionOpen === msg.id ? null : msg.id)}
                                    className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs transition hover:scale-110"
                                    style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>
                                    <SmilePlus size={14} />
                                  </button>
                                  {chatReactionOpen === msg.id && (
                                    <div className={`absolute z-50 ${index === displayedMessages.length - 1 ? 'bottom-full mb-1' : 'top-full mt-1'} ${isMine ? 'right-0' : 'left-0'}`}>
                                      <div className="flex items-center gap-1 rounded-xl border p-1.5 shadow-2xl" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgTertiary }}>
                                        {quickReactions.map(emoji => (
                                          <button key={emoji} type="button" onClick={() => addReaction(msg.id, emoji)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:scale-110 transition">
                                            {emoji}
                                          </button>
                                        ))}
                                        <span className="w-px h-6" style={{ backgroundColor: palette.borderSoft }} />
                                        <div className="relative">
                                          <button type="button" onClick={() => setChatReactionOpen(`more-${msg.id}`)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:scale-110 transition">
                                            <Plus size={14} />
                                          </button>
                                          {chatReactionOpen === `more-${msg.id}` && (
                                            <div className={`absolute top-full mt-1 z-50 ${isMine ? 'right-0' : 'left-0'}`}>
                                              <div className="grid grid-cols-6 gap-1 rounded-xl border p-2 shadow-2xl" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgTertiary }}>
                                                {['😀','😁','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😋','😛','😜','🤪','😎','🤩','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💞','💗','💖','💘','💝','💟','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','🤟','🤘','👌','✅','❌','⭐','🔥','💯','🎉','🎊','🥳','✨','💪','🚀','👀'].map(emoji => (
                                                  <button key={emoji} type="button" onClick={() => addReaction(msg.id, emoji)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:scale-110 transition">
                                                    {emoji}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          </>
                        )
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="border-t shrink-0" style={{ borderColor: palette.borderSoft }}>
                      <form onSubmit={sendChat} className="px-5 py-4 md:px-6">
                         <div className="relative flex items-center gap-3 rounded-[24px] border pl-3 pr-2 py-2" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? palette.bgSurface : 'rgba(255,255,255,0.02)' }}>
                          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ color: palette.textSecondary }}>
                            <Paperclip size={18} />
                          </button>
                          <input ref={inputRef} value={chatInput} onChange={(e) => {
                            const val = e.target.value
                            setChatInput(val)
                            const idx = val.lastIndexOf('@')
                            if (idx !== -1 && (idx === 0 || val[idx - 1] === ' ')) {
                              const after = val.slice(idx + 1)
                              if (!after.includes(' ')) {
                                setMentionOpen(true)
                                setMentionQuery(after)
                                setMentionIndex(idx)
                                return
                              }
                            }
                            setMentionOpen(false)
                          }} placeholder="Type a message..."
                            className="flex-1 bg-transparent px-2 text-base outline-none" style={{ color: palette.textPrimary }} />
                          <div className="relative" ref={chatEmojiRef}>
                            <button type="button" onClick={() => setChatEmojiOpen(o => !o)} className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ color: palette.textSecondary }}>
                              <SmilePlus size={18} />
                            </button>
                            {chatEmojiOpen && (
                              <div className="absolute bottom-full right-0 mb-2 z-50">
                                <div className="w-[320px] overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgTertiary }}>
                                  <div className="flex items-center border-b px-2 py-1.5" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                                    {emojiCategories.map((cat, i) => (
                                      <button key={i} type="button" onClick={() => setEmojiCategory(i)}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition"
                                        style={{ backgroundColor: emojiCategory === i ? palette.accentSoft : 'transparent' }}>
                                        {cat.icon}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-8 gap-0.5 overflow-y-auto p-3" style={{ maxHeight: '260px' }}>
                                    {emojiCategories[emojiCategory].emojis.map(emoji => (
                                      <button key={emoji} type="button" onClick={() => { setChatInput(p => p + emoji); setChatEmojiOpen(false) }}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:scale-110 transition">
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {mentionOpen && filteredMentions.length > 0 && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                              <div className="max-h-48 overflow-y-auto rounded-2xl border shadow-2xl" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgTertiary }}>
                                {filteredMentions.map(member => (
                                  <button key={member.email || member.id} type="button"
                                    onClick={() => {
                                      const before = chatInput.slice(0, mentionIndex)
                                      const after = chatInput.slice(mentionIndex).replace(/^@\S*/, `@${member.name || member.email} `)
                                      setChatInput(before + after)
                                      setMentionOpen(false)
                                      inputRef.current?.focus()
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition hover:opacity-80"
                                    style={{ color: palette.textPrimary, borderBottom: `1px solid ${palette.borderSoft}` }}>
                                    <div className="h-7 w-7 overflow-hidden rounded-full" style={{ backgroundColor: palette.bgSurface }}>
                                      {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] font-bold" style={{ color: palette.accentPrimary }}>{getInitials(member.name || member.email)}</div>}
                                    </div>
                                    <span>{member.name || member.email}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-2xl transition" style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                            <Send size={18} />
                          </button>
                        </div>
                      </form>
                    </div>
                  </section>

                  <aside className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(60vh + 140px)', backgroundColor: isDayMode ? palette.bgSurface : 'rgba(0,0,0,0.08)' }}>
                    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? palette.bgSurface : 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center gap-3">
                        <Search size={18} style={{ color: palette.textMuted }} />
                        <input type="text" placeholder="Search"
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: palette.textPrimary }} />
                      </div>
                    </div>

                    <div className="mt-6 space-y-6">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: palette.textPrimary }}>Pinned Messages</h4>
                          {pinnedMessages.length > 2 && (
                            <button onClick={() => setShowAllPinned(true)} className="text-sm font-semibold" style={{ color: palette.accentPrimary }}>View all</button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {visiblePinned.length === 0 ? (
                            <p className="text-sm py-4 text-center" style={{ color: palette.textFaint }}>No pinned messages</p>
                          ) : visiblePinned.map((msg, index) => {
                            const sender = members.find(member => member.email?.toLowerCase() === msg.senderEmail?.toLowerCase())
                            const senderName = msg.senderName || sender?.name || msg.senderEmail || 'Unknown member'
                            return (
                              <div key={msg.id || `pin-${index}`} className="group relative rounded-[20px] border p-4" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? palette.bgTertiary : 'rgba(255,255,255,0.02)' }}>
                                <button type="button" onClick={() => { setScrollToMessageId(msg.id); setActiveTab('discussion') }} className="w-full text-left">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                                      <Pin size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: palette.textPrimary }}>
                                        <span className="truncate">{senderName}</span>
                                        <span style={{ color: palette.textMuted }}>• {formatDisplayDate(msg.created_at, 'Today')}</span>
                                      </div>
                                      <p className="mt-1 text-sm leading-6" style={{ color: palette.textSecondary, maxHeight: '3rem', overflow: 'hidden' }}>{msg.message}</p>
                                    </div>
                                    <ChevronRight size={16} style={{ color: palette.textMuted }} />
                                  </div>
                                </button>
                                <button type="button" onClick={() => setPinnedMessageIds(prev => { const next = new Set(prev); next.delete(msg.id); return next })}
                                  className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full border shadow group-hover:flex"
                                  style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface, color: palette.textMuted }}>
                                  <X size={12} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: palette.textPrimary }}>Tasks</h4>
                          <button className="text-sm font-semibold" style={{ color: palette.accentPrimary }}>View all</button>
                        </div>
                        <div className="rounded-[24px] border overflow-hidden" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? palette.bgTertiary : 'rgba(255,255,255,0.02)' }}>
                          {sidebarTasks.length === 0 ? (
                            <div className="px-4 py-5 text-sm" style={{ color: palette.textMuted }}>No linked tasks yet.</div>
                          ) : sidebarTasks.map((task, index) => (
                            <div key={task.id || index} className="flex items-start gap-3 px-4 py-4" style={{ borderTop: index === 0 ? 'none' : `1px solid ${palette.borderSoft}` }}>
                              <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: task.status === 'Completed' ? palette.accentPrimary : palette.textMuted, color: task.status === 'Completed' ? palette.accentPrimary : 'transparent' }}>
                                <CheckCircle2 size={12} />
                              </span>
                              <div>
                                <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>{task.taskName}</div>
                                <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>Due {formatDisplayDate(task.targetDate, 'TBD')}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: palette.textPrimary }}>Shared Files</h4>
                          <button className="text-sm font-semibold" style={{ color: palette.accentPrimary }}>View all</button>
                        </div>
                        <div className="rounded-[24px] border overflow-hidden" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? palette.bgTertiary : 'rgba(255,255,255,0.02)' }}>
                          {sharedDocs.length === 0 ? (
                            <div className="px-4 py-5 text-sm" style={{ color: palette.textMuted }}>No shared files yet.</div>
                          ) : sharedDocs.map((doc, index) => (
                            <div key={`${doc.title}-${index}`} className="flex items-start gap-3 px-4 py-4" style={{ borderTop: index === 0 ? 'none' : `1px solid ${palette.borderSoft}` }}>
                              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: palette.bgSurface, color: palette.accentPrimary }}>
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold" style={{ color: palette.textPrimary }}>{doc.title}</div>
                                <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>{doc.source || 'Document'} • {doc.ownerEmail || 'Shared'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            )}

            {/* ═══ SECTION 4: DOCUMENTS ═══ */}
            {activeTab === 'documents' && (
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-6" style={{ color: palette.accentPrimary }}>
                  <FolderOpen size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.28em]">All Documents</span>
                </div>
                {documents.length === 0 ? (
                  <p className="text-sm text-center py-12" style={{ color: palette.textFaint }}>No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between gap-4 rounded-2xl border p-4"
                        style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={18} className="flex-shrink-0" style={{ color: palette.accentPrimary, opacity: 0.6 }} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: palette.textPrimary }}>{doc.title}</div>
                            <div className="text-[10px]" style={{ color: palette.textFaint }}>{doc.source} · {doc.ownerEmail || 'Unknown'}</div>
                          </div>
                        </div>
                        <a href={doc.referenceMaterialUrl} download className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                          style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                          <Download size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </main>

      <Footer />

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

      {/* ═══ ADD TASK MODAL ═══ */}
      {showTaskModal && (
        <ModalOverlay onClose={() => setShowTaskModal(false)}>
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>New Task</div>
          <h3 className="mt-2 text-2xl font-black" style={{ color: palette.textPrimary }}>Create Task</h3>
          <form onSubmit={createTask} className="mt-5 grid gap-4 md:grid-cols-2">
            <ModalInput label="Task Name" value={taskForm.taskName} onChange={(v) => setTaskForm(f => ({ ...f, taskName: v }))} placeholder="Enter task name" required />
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Task Type</label>
              <select value={taskForm.taskType} onChange={(e) => setTaskForm(f => ({ ...f, taskType: e.target.value }))}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgTertiary, color: palette.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }}>
                {['Research', 'Development', 'Design', 'Analysis', 'Review'].map(t => <option key={t} value={t} style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Start Date</label>
              <input type="date" value={taskForm.startDate || today} onChange={(e) => setTaskForm(f => ({ ...f, startDate: e.target.value }))}
                min={project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : today}
                max={project?.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }} />
            </div>
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Target Date</label>
              <input type="date" value={taskForm.targetDate} onChange={(e) => setTaskForm(f => ({ ...f, targetDate: e.target.value }))}
                min={today}
                max={project?.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Details</label>
              <textarea value={taskForm.details} onChange={(e) => setTaskForm(f => ({ ...f, details: e.target.value }))} rows={3}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" placeholder="Task details..."
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }} />
            </div>
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Assign To</label>
              <select value={taskForm.assignedToEmail} onChange={(e) => setTaskForm(f => ({ ...f, assignedToEmail: e.target.value }))}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgTertiary, color: palette.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }}>
                <option value="" style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>Unassigned</option>
                {members.filter(m => m.status === 'Active' && !m.isAdmin).map(m => <option key={m.email} value={m.email} style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>{m.name || m.email}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Reference File</label>
              <div onClick={() => taskFileRef.current?.click()} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-3 transition"
                style={{ borderColor: palette.accentBorder, backgroundColor: 'rgba(16,185,129,0.06)' }}>
                <Upload size={16} style={{ color: palette.accentPrimary }} />
                <span className="text-sm truncate" style={{ color: palette.textMuted }}>{taskFile ? taskFile.name : 'Upload...'}</span>
              </div>
              <input ref={taskFileRef} type="file" className="hidden" onChange={(e) => setTaskFile(e.target.files[0] || null)} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowTaskModal(false)} className="rounded-xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}><Plus size={14} /> Create Task</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ═══ VIEW TASK DETAILS ═══ */}
      {viewTask && (
        <ModalOverlay onClose={() => setViewTask(null)}>
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>Task Details</div>
          <h3 className="mt-2 text-2xl font-black" style={{ color: palette.textPrimary }}>{viewTask.taskName}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailRow label="Type" value={viewTask.taskType || 'General'} />
            <DetailRow label="Status" value={viewTask.status} />
            <DetailRow label="Start" value={formatDisplayDate(viewTask.startDate, 'N/A')} />
            <DetailRow label="Target" value={formatDisplayDate(viewTask.targetDate, 'N/A')} />
            <DetailRow label="Assigned To" value={viewTask.assigneeName || viewTask.assignedToEmail || 'Unassigned'} />
          </div>
          {viewTask.details && <p className="mt-4 text-sm leading-6" style={{ color: palette.textMuted }}>{viewTask.details}</p>}
          {viewTask.referenceMaterialUrl && (
            <a href={viewTask.referenceMaterialUrl} download className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition"
              style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
              <Download size={14} /> Download Reference
            </a>
          )}
        </ModalOverlay>
      )}

      {/* ═══ SUBMIT WORK ═══ */}
      {submitTask && (
        <ModalOverlay onClose={() => setSubmitTask(null)}>
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>Submit Work</div>
          <h3 className="mt-2 text-2xl font-black" style={{ color: palette.textPrimary }}>{submitTask.taskName}</h3>
          <form onSubmit={submitWork} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Notes</label>
              <textarea value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)} rows={3}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" placeholder="Describe your work..."
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }} />
            </div>
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Upload File</label>
              <div onClick={() => submitFileRef.current?.click()} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-3 transition"
                style={{ borderColor: palette.accentBorder, backgroundColor: 'rgba(16,185,129,0.06)' }}>
                <Upload size={16} style={{ color: palette.accentPrimary }} />
                <span className="text-sm truncate" style={{ color: palette.textMuted }}>{submitFile ? submitFile.name : 'Upload...'}</span>
              </div>
              <input ref={submitFileRef} type="file" className="hidden" onChange={(e) => setSubmitFile(e.target.files[0] || null)} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setSubmitTask(null)} className="rounded-xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}><Send size={14} /> Submit</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ═══ REVIEW SUBMISSION ═══ */}
      {reviewSubmission && (
        <ModalOverlay onClose={() => { setReviewSubmission(null); setTaskSubmissions([]) }}>
          <div className="text-[10px] uppercase tracking-[0.3em] text-purple-300/70">Review Submission</div>
          <h3 className="mt-2 text-2xl font-black" style={{ color: palette.textPrimary }}>{reviewSubmission.taskName}</h3>
          <div className="mt-5 space-y-3 max-h-64 overflow-y-auto">
            {taskSubmissions.length === 0 ? <p className="text-sm" style={{ color: palette.textFaint }}>No submissions yet.</p> : taskSubmissions.map(sub => (
              <div key={sub.id} className="rounded-2xl border p-4" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>{sub.submitterName || sub.submittedByEmail}</div>
                    <div className="text-xs mt-1" style={{ color: palette.textFaint }}>{sub.notes || 'No notes'}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase ${statusBadge(sub.status)}`}>{sub.status}</span>
                </div>
                {sub.fileUrl && <a href={sub.fileUrl} download className="mt-2 inline-flex items-center gap-2 text-xs" style={{ color: palette.accentPrimary }}><Download size={12} /> Download</a>}
                {sub.status === 'Review' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => reviewWork(sub.id, 'Accepted')} className="rounded-lg px-3 py-1.5 text-xs"
                      style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>Accept</button>
                    <button onClick={() => reviewWork(sub.id, 'Rework')} className="rounded-lg px-3 py-1.5 text-xs"
                      style={{ backgroundColor: 'rgba(245,158,11,0.20)', borderColor: 'rgba(251,146,60,0.30)', color: '#fdba74', borderWidth: 1 }}>Rework</button>
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
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>Modify Task</div>
          <h3 className="mt-2 text-2xl font-black" style={{ color: palette.textPrimary }}>Edit Task</h3>
          <form onSubmit={modifyTaskSave} className="mt-5 space-y-4">
            <ModalInput label="Task Name" value={modifyForm.taskName || ''} onChange={(v) => setModifyForm(f => ({ ...f, taskName: v }))} />
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Task Type</label>
              <select value={modifyForm.taskType || ''} onChange={(e) => setModifyForm(f => ({ ...f, taskType: e.target.value }))}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgTertiary, color: palette.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }}>
                {['Research', 'Development', 'Design', 'Analysis', 'Review'].map(t => <option key={t} value={t} style={{ backgroundColor: palette.bgTertiary, color: palette.textPrimary }}>{t}</option>)}
              </select>
            </div>
            <ModalInput label="Target Date" type="date" value={modifyForm.targetDate || ''} onChange={(v) => setModifyForm(f => ({ ...f, targetDate: v }))} />
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Details</label>
              <textarea value={modifyForm.details || ''} onChange={(e) => setModifyForm(f => ({ ...f, details: e.target.value }))} rows={3}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModifyTask(null)} className="rounded-xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}><CheckCircle2 size={14} /> Save Changes</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {chatActionMessage && chatActionPos && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeChatActionMessage} />
          <div
            className="fixed z-50 w-56 overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              left: Math.min(chatActionPos.x, window.innerWidth - 240),
              top: Math.min(chatActionPos.y, window.innerHeight - 320),
              borderColor: palette.borderSoft,
              backgroundColor: palette.bgTertiary,
            }}
          >
            <div className="border-b px-4 py-3" style={{ borderColor: palette.borderSoft }}>
              <p className="text-sm line-clamp-2" style={{ color: palette.textSecondary }}>
                {chatActionMessage.deletedForEveryone ? 'This message was deleted for everyone.' : chatActionMessage.message}
              </p>
            </div>
            <div className="p-1.5 space-y-0.5">
              {canEditChatMessage(chatActionMessage) && (
                <ContextAction icon={Edit3} label="Edit message" onClick={() => { closeChatActionMessage(); beginEditChatMessage(chatActionMessage) }} />
              )}
              <ContextAction icon={Pin} label={pinnedMessageIds.has(chatActionMessage.id) ? 'Unpin message' : 'Pin message'} onClick={() => {
                setPinnedMessageIds(prev => {
                  const next = new Set(prev)
                  if (next.has(chatActionMessage.id)) next.delete(chatActionMessage.id)
                  else next.add(chatActionMessage.id)
                  return next
                })
                closeChatActionMessage()
              }} />
              {canDeleteChatForMe(chatActionMessage) && (
                <ContextAction icon={Trash2} label="Delete for me" onClick={() => { closeChatActionMessage(); deleteChatMessage(chatActionMessage, 'me') }} danger />
              )}
              {canDeleteChatForEveryone(chatActionMessage) && (
                <ContextAction icon={Trash2} label="Delete for everyone" onClick={() => { closeChatActionMessage(); deleteChatMessage(chatActionMessage, 'everyone') }} danger />
              )}
              {canSeeChatReadBy(chatActionMessage) && (
                <ContextAction icon={Eye} label="See read by" onClick={() => { closeChatActionMessage(); openChatReadBy(chatActionMessage) }} />
              )}
            </div>
          </div>
        </>
      )}

      {chatEditMessage && (
        <ModalOverlay onClose={() => { setChatEditMessage(null); setChatEditValue('') }} maxWidthClassName="max-w-xl">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>Edit Message</div>
          <h3 className="mt-2 text-2xl font-black" style={{ color: palette.textPrimary }}>Update your message</h3>
          <form onSubmit={saveEditedChatMessage} className="mt-5 space-y-4">
            <textarea value={chatEditValue} onChange={(e) => setChatEditValue(e.target.value)} rows={4}
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
              placeholder="Edit your message..." />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setChatEditMessage(null); setChatEditValue('') }} className="rounded-xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}><CheckCircle2 size={14} /> Save Message</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {chatReadMessage && (
        <ModalOverlay onClose={() => setChatReadMessage(null)} maxWidthClassName="max-w-lg">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>Read Receipts</div>
          <h3 className="mt-2 text-2xl font-black" style={{ color: palette.textPrimary }}>Seen by</h3>
          <div className="mt-5 space-y-3 max-h-72 overflow-y-auto pr-1">
            {readReceiptEntries.length === 0 ? (
              <p className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput, color: palette.textMuted }}>No one else has read this message yet.</p>
            ) : readReceiptEntries.map((reader) => (
              <div key={`${reader.emailAddress}-${reader.readAt}`} className="rounded-2xl border px-4 py-3" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>{reader.fullName || reader.emailAddress}</div>
                <div className="mt-1 text-xs" style={{ color: palette.textFaint }}>{new Date(reader.readAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </ModalOverlay>
      )}

      {showAllPinned && (
        <ModalOverlay onClose={() => setShowAllPinned(false)} maxWidthClassName="max-w-xl">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>Pinned</div>
          <h3 className="mt-2 text-2xl font-black" style={{ color: palette.textPrimary }}>All Pinned Messages</h3>
          <div className="mt-5 space-y-3 max-h-72 overflow-y-auto pr-1">
            {pinnedMessages.length === 0 ? (
              <p className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput, color: palette.textMuted }}>No pinned messages.</p>
            ) : pinnedMessages.map(msg => {
              const sender = members.find(member => member.email?.toLowerCase() === msg.senderEmail?.toLowerCase())
              const senderName = msg.senderName || sender?.name || msg.senderEmail || 'Unknown member'
              return (
                <div key={msg.id} className="group relative rounded-2xl border px-4 py-3" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                  <button type="button" onClick={() => { setShowAllPinned(false); setScrollToMessageId(msg.id) }} className="w-full text-left">
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: palette.textPrimary }}>
                      <Pin size={12} style={{ color: palette.accentPrimary }} />
                      <span className="truncate">{senderName}</span>
                      <span style={{ color: palette.textMuted }}>• {formatDisplayDate(msg.created_at, 'Today')}</span>
                    </div>
                    <p className="mt-1 text-sm line-clamp-2" style={{ color: palette.textSecondary }}>{msg.message}</p>
                  </button>
                  <button type="button" onClick={() => setPinnedMessageIds(prev => { const next = new Set(prev); next.delete(msg.id); return next })}
                    className="absolute -top-2 -right-2 hidden h-6 w-6 items-center justify-center rounded-full border shadow group-hover:flex"
                    style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface, color: palette.textMuted }}>
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </ModalOverlay>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>
    </div>
  )
}

// ─── Small Components ───

const InfoCard = ({ label, value, icon: Icon, accent }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: p.borderSoft, backgroundColor: p.bgSurface }}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: p.accentPrimary, color: '#fff' }}><Icon size={16} /></span>
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: p.textFaint }}>{label}</div>
          <div className="mt-1 text-lg font-bold" style={{ color: accent ? p.error : p.textPrimary }}>{value}</div>
        </div>
      </div>
    </div>
  )
}

const DetailRow = ({ label, value }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: p.borderSoft, backgroundColor: p.bgInput }}>
      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: p.textFaint }}>{label}</div>
      <div className="mt-1 text-sm font-semibold" style={{ color: p.textPrimary }}>{value}</div>
    </div>
  )
}

const DropItem = ({ icon: Icon, label, onClick, danger }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition"
      style={{ color: danger ? p.error : p.textSecondary }}>
      <Icon size={14} /> {label}
    </button>
  )
}

const ModalOverlay = ({ children, onClose, maxWidthClassName = 'max-w-2xl' }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md" onClick={onClose}>
      <div className={`relative w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto rounded-[30px] border p-6`}
        style={{ borderColor: p.borderPrimary, backgroundColor: p.bgTertiary, boxShadow: p.shadowDropdown }}
        onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border"
          style={{ borderColor: p.borderInput, backgroundColor: p.bgSurface, color: p.textMuted }}>
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

const SheetAction = ({ icon: Icon, label, onClick, danger = false }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition"
      style={danger ? { borderColor: 'rgba(239,68,68,0.20)', backgroundColor: 'rgba(239,68,68,0.10)', color: '#fca5a5' } : { borderColor: p.borderSoft, backgroundColor: p.bgSurface, color: p.textSecondary }}>
      <Icon size={16} /> {label}
    </button>
  )
}

const ContextAction = ({ icon: Icon, label, onClick, danger = false }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
      style={{ color: danger ? '#f87171' : p.textPrimary }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = p.bgSurface}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
      <Icon size={15} /> {label}
    </button>
  )
}

const ModalInput = ({ label, type = 'text', value, onChange, placeholder = '', required = false }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <div>
      <label className="mb-2 block text-sm" style={{ color: p.textSecondary }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
        style={{ borderColor: p.borderInput, backgroundColor: p.bgSurface, color: p.textPrimary }} />
    </div>
  )
}
