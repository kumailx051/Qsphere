import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowLeft, Calendar, CheckCircle2, ChevronRight, ClipboardList, Clock, Download,
  Edit3, Eye, FileText, FolderOpen, Hash, Image as ImageIcon, LayoutGrid, MessageSquare, Mic,
  MoreVertical, Paperclip, Pin, Plus, Search, Send, SmilePlus, Sparkles, Trash2, Upload, Users2, Video, X, UserPlus
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import chatDoodleDay from '../assets/chatDoodleDay.png'
import chatDoodleNight from '../assets/chatDoodleNight.png'
import celebrationSound from '../assets/celebration.mp3'

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

const toInputDateValue = (value) => {
  const parsed = normalizeDate(value)
  if (!parsed) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeDate = (value) => {
  if (!value) return null
  const parsed = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

const addDaysToDate = (date, amount) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return nextDate
}

const differenceInCalendarDays = (start, end) => {
  const startDate = normalizeDate(start)
  const endDate = normalizeDate(end)
  if (!startDate || !endDate) return 0
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000)
}

const formatTimelineRange = (start, end) => {
  const startDate = normalizeDate(start)
  const endDate = normalizeDate(end)
  if (!startDate || !endDate) return 'Timeline unavailable'

  const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(startDate.getFullYear() !== endDate.getFullYear() ? { year: 'numeric' } : {}),
  })

  if (startDate.getTime() === endDate.getTime()) {
    return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return `${startLabel} - ${endLabel}`
}

const getTaskTimelineDate = (task = {}) =>
  normalizeDate(task.targetDate || task.startDate || task.created_at)

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)))

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

const formatDateTimeLabel = (value, fallback = 'Just now') => {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const celebrationBalloons = [
  { left: 10, color: '#22c55e', drift: 18, delay: 0 },
  { left: 20, color: '#38bdf8', drift: -12, delay: 0.08 },
  { left: 32, color: '#f59e0b', drift: 14, delay: 0.16 },
  { left: 44, color: '#fb7185', drift: -18, delay: 0.24 },
  { left: 58, color: '#a78bfa', drift: 12, delay: 0.32 },
  { left: 70, color: '#2ec58a', drift: -16, delay: 0.4 },
  { left: 82, color: '#f97316', drift: 10, delay: 0.48 },
]

const celebrationConfetti = Array.from({ length: 90 }, (_, index) => ({
  id: index,
  left: 1 + ((index * 1.17) % 98),
  delay: (index % 18) * 0.045,
  rotate: (index % 2 === 0 ? 1 : -1) * (80 + (index % 7) * 20),
  duration: 3 + (index % 5) * 0.4,
  size: 8 + (index % 4) * 4,
  color: ['#2ec58a', '#38bdf8', '#f59e0b', '#fb7185', '#a78bfa', '#f97316'][index % 6],
}))

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

const formatBytes = (value) => {
  const size = Number(value || 0)
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const formatTypingSummary = (names = []) => {
  const uniqueNames = [...new Set(names.filter(Boolean))]
  if (uniqueNames.length === 0) return ''
  if (uniqueNames.length === 1) return `${uniqueNames[0]} is typing...`
  if (uniqueNames.length === 2) return `${uniqueNames[0]} and ${uniqueNames[1]} are typing...`
  return `${uniqueNames[0]}, ${uniqueNames[1]}, and ${uniqueNames.length - 2} others are typing...`
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
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(location.search).get('tab') || 'details')
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
  const [taskSubmissions, setTaskSubmissions] = useState([])
  const [submissionReviewDrafts, setSubmissionReviewDrafts] = useState({})
  const [isTaskSubmissionsLoading, setIsTaskSubmissionsLoading] = useState(false)
  const [isCompletingProject, setIsCompletingProject] = useState(false)
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false)
  const completionTimeoutRef = useRef(null)
  const celebrationAudioRef = useRef(null)

  // Submit work popup
  const [submitTask, setSubmitTask] = useState(null)
  const [submitNotes, setSubmitNotes] = useState('')
  const [submitFile, setSubmitFile] = useState(null)
  const submitFileRef = useRef(null)

  // Review popup
  const [reviewSubmission, setReviewSubmission] = useState(null)

  // Chat
  const [chatInput, setChatInput] = useState('')
  const [chatEmojiOpen, setChatEmojiOpen] = useState(false)
  const [chatAttachmentMenuOpen, setChatAttachmentMenuOpen] = useState(false)
  const [chatReactionOpen, setChatReactionOpen] = useState(null)
  const [chatActionPos, setChatActionPos] = useState(null)
  const [pinnedMessageIds, setPinnedMessageIds] = useState(new Set())
  const [showAllPinned, setShowAllPinned] = useState(false)
  const [scrollToMessageId, setScrollToMessageId] = useState(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(-1)
  const inputRef = useRef(null)
  const [dmTarget, setDmTarget] = useState(null)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const [onlineMemberEmails, setOnlineMemberEmails] = useState([])
  const [typingMemberEmails, setTypingMemberEmails] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({ channelUnread: 0, directUnreadByEmail: {} })
  const [pendingAttachment, setPendingAttachment] = useState(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isSendingVoice, setIsSendingVoice] = useState(false)
  const chatEndRef = useRef(null)
  const chatEmojiRef = useRef(null)
  const chatAttachmentMenuRef = useRef(null)
  const chatActivityPollRef = useRef(null)
  const typingStopTimerRef = useRef(null)
  const chatImageInputRef = useRef(null)
  const chatVideoInputRef = useRef(null)
  const chatFileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaRecorderChunksRef = useRef([])
  const recordingStreamRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const voiceCancelledRef = useRef(false)

  const addReaction = async (msgId, emoji) => {
    setChatReactionOpen(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/chat/${msgId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: normalizedUserEmail,
          emoji,
        }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update reaction.')
      }

      setChatMessages((current) =>
        current.map((message) =>
          String(message.id) === String(msgId)
            ? { ...message, reactions: Array.isArray(result?.reactions) ? result.reactions : [] }
            : message,
        ),
      )
    } catch (error) {
      console.error(error)
      window.dispatchEvent(
        new CustomEvent('qsphere-snackbar', {
          detail: { message: error.message || 'Failed to update reaction.', type: 'error' },
        }),
      )
    }
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
    if (!chatAttachmentMenuOpen) return
    const handler = (e) => { if (chatAttachmentMenuRef.current && !chatAttachmentMenuRef.current.contains(e.target)) setChatAttachmentMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [chatAttachmentMenuOpen])
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
  const isProjectCompleted = String(project?.status || '').trim().toLowerCase() === 'completed'
  const discussionConversationType = dmTarget ? 'direct' : 'channel'
  const discussionTargetEmail = useMemo(() => String(dmTarget?.email || '').trim().toLowerCase(), [dmTarget?.email])
  const onlineMemberEmailSet = useMemo(
    () => new Set(onlineMemberEmails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean)),
    [onlineMemberEmails],
  )

  const today = toInputDateValue(new Date())
  const projectStartInputDate = useMemo(() => toInputDateValue(project?.startDate), [project?.startDate])
  const projectDueInputDate = useMemo(() => toInputDateValue(project?.dueDate), [project?.dueDate])
  const taskStartMinDate = useMemo(() => {
    if (!projectStartInputDate) return today
    return projectStartInputDate > today ? projectStartInputDate : today
  }, [projectStartInputDate, today])
  const taskTargetMinDate = useMemo(() => {
    const selectedStartDate = taskForm.startDate || taskStartMinDate
    return selectedStartDate > taskStartMinDate ? selectedStartDate : taskStartMinDate
  }, [taskForm.startDate, taskStartMinDate])
  const modifyTaskTargetMinDate = useMemo(() => {
    const baseStartDate = modifyForm.startDate || modifyTask?.startDate || taskStartMinDate
    const formattedBaseStartDate = toInputDateValue(baseStartDate)
    if (!formattedBaseStartDate) return taskStartMinDate
    return formattedBaseStartDate > taskStartMinDate ? formattedBaseStartDate : taskStartMinDate
  }, [modifyForm.startDate, modifyTask?.startDate, taskStartMinDate])

  const showSnackbar = useCallback((message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
  }, [])

  const markProjectChatRead = useCallback(async () => {
    if (!normalizedUserEmail) return
    try {
      await fetch(`/api/projects/${projectId}/chat/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readerEmail: normalizedUserEmail,
          conversationType: discussionConversationType,
          targetEmail: discussionTargetEmail || undefined,
        })
      })
    } catch (e) { console.error(e) }
  }, [discussionConversationType, discussionTargetEmail, normalizedUserEmail, projectId])

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) setProject(await res.json())
    } catch (e) { console.error(e) }
  }, [projectId])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
        return data
      }
    } catch (e) { console.error(e) }
    return []
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

  const fetchDiscussionUnreadCounts = useCallback(async () => {
    if (!normalizedUserEmail) return

    try {
      const res = await fetch(`/api/projects/${projectId}/discussion/unread?userEmail=${encodeURIComponent(normalizedUserEmail)}`)
      if (!res.ok) return
      const data = await res.json()
      setUnreadCounts({
        channelUnread: Number(data?.channelUnread || 0),
        directUnreadByEmail: data?.directUnreadByEmail && typeof data.directUnreadByEmail === 'object'
          ? data.directUnreadByEmail
          : {},
      })
    } catch (e) {
      console.error(e)
    }
  }, [normalizedUserEmail, projectId])

  const fetchChat = useCallback(async () => {
    try {
      const searchParams = new URLSearchParams()
      if (normalizedUserEmail) {
        searchParams.set('userEmail', normalizedUserEmail)
      }
      searchParams.set('conversationType', discussionConversationType)
      if (discussionTargetEmail) {
        searchParams.set('targetEmail', discussionTargetEmail)
      }
      const params = searchParams.toString() ? `?${searchParams.toString()}` : ''
      const res = await fetch(`/api/projects/${projectId}/chat${params}`)
      if (res.ok) {
        setChatMessages(await res.json())
        void markProjectChatRead().then(() => fetchDiscussionUnreadCounts())
      }
    } catch (e) { console.error(e) }
  }, [discussionConversationType, discussionTargetEmail, fetchDiscussionUnreadCounts, markProjectChatRead, normalizedUserEmail, projectId])

  const fetchDiscussionActivity = useCallback(async () => {
    if (!normalizedUserEmail) return

    try {
      const searchParams = new URLSearchParams({
        viewerEmail: normalizedUserEmail,
        conversationType: discussionConversationType,
      })

      if (discussionTargetEmail) {
        searchParams.set('targetEmail', discussionTargetEmail)
      }

      const res = await fetch(`/api/projects/${projectId}/discussion/activity?${searchParams.toString()}`)
      if (!res.ok) return

      const activity = await res.json()
      setOnlineMemberEmails(Array.isArray(activity?.onlineEmails) ? activity.onlineEmails : [])
      setTypingMemberEmails(Array.isArray(activity?.typingEmails) ? activity.typingEmails : [])
    } catch (e) {
      console.error(e)
    }
  }, [discussionConversationType, discussionTargetEmail, normalizedUserEmail, projectId])

  const sendDiscussionPresenceHeartbeat = useCallback(async () => {
    if (!normalizedUserEmail) return

    try {
      await fetch(`/api/projects/${projectId}/discussion/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: normalizedUserEmail }),
      })
    } catch (e) {
      console.error(e)
    }
  }, [normalizedUserEmail, projectId])

  const syncDiscussionPresence = useCallback(async () => {
    if (!normalizedUserEmail) return
    await Promise.all([sendDiscussionPresenceHeartbeat(), fetchDiscussionActivity()])
  }, [fetchDiscussionActivity, normalizedUserEmail, sendDiscussionPresenceHeartbeat])

  const setTypingStatus = useCallback(async (isTyping) => {
    if (!normalizedUserEmail) return

    try {
      await fetch(`/api/projects/${projectId}/discussion/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: normalizedUserEmail,
          conversationType: discussionConversationType,
          targetEmail: discussionTargetEmail || undefined,
          isTyping,
        }),
      })
    } catch (e) {
      console.error(e)
    }
  }, [discussionConversationType, discussionTargetEmail, normalizedUserEmail, projectId])

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
        return data
      }
    } catch (e) { console.error(e) }
    return []
  }, [projectId])

  const fetchSubmissions = useCallback(async (taskId) => {
    if (!taskId) {
      setTaskSubmissions([])
      return []
    }
    setIsTaskSubmissionsLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/submissions`)
      if (res.ok) {
        const data = await res.json()
        setTaskSubmissions(data)
        setSubmissionReviewDrafts((current) => (
          data.reduce((accumulator, submission) => {
            accumulator[submission.id] = current[submission.id] ?? submission.reviewRemarks ?? ''
            return accumulator
          }, {})
        ))
        return data
      }
    } catch (e) { console.error(e) }
    finally {
      setIsTaskSubmissionsLoading(false)
    }
    setTaskSubmissions([])
    return []
  }, [])

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

  useEffect(() => {
    celebrationAudioRef.current = new Audio(celebrationSound)
    celebrationAudioRef.current.preload = 'auto'
    celebrationAudioRef.current.volume = 1

    return () => {
      if (completionTimeoutRef.current) {
        window.clearTimeout(completionTimeoutRef.current)
      }
      if (celebrationAudioRef.current) {
        celebrationAudioRef.current.pause()
        celebrationAudioRef.current.currentTime = 0
      }
    }
  }, [])

  useEffect(() => {
    if (!viewTask?.id) {
      setTaskSubmissions([])
      setSubmissionReviewDrafts({})
      return
    }

    if (isOwner || String(viewTask.assignedToEmail || '').trim().toLowerCase() === normalizedUserEmail) {
      void fetchSubmissions(viewTask.id)
    } else {
      setTaskSubmissions([])
      setSubmissionReviewDrafts({})
    }
  }, [fetchSubmissions, isOwner, normalizedUserEmail, viewTask])

  useEffect(() => {
    if (!submitTask?.id) return
    void fetchSubmissions(submitTask.id)
  }, [fetchSubmissions, submitTask])

  // Poll chat every 3s when on discussion tab
  useEffect(() => {
    if (activeTab === 'discussion') {
      initialChatLoadedRef.current = false
      previousChatLengthRef.current = 0
      shouldStickToBottomRef.current = true
      setChatMessages([])
      setTypingMemberEmails([])
      fetchChat()
      syncDiscussionPresence()
      fetchDiscussionUnreadCounts()
      chatPollRef.current = setInterval(fetchChat, 3000)
      chatActivityPollRef.current = setInterval(syncDiscussionPresence, 1200)
    }
    return () => {
      if (chatPollRef.current) clearInterval(chatPollRef.current)
      if (chatActivityPollRef.current) clearInterval(chatActivityPollRef.current)
    }
  }, [activeTab, fetchChat, fetchDiscussionUnreadCounts, syncDiscussionPresence])

  useEffect(() => {
    if (activeTab === 'documents') fetchDocuments()
  }, [activeTab, fetchDocuments])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tabFromUrl = params.get('tab')
    const scrollTo = params.get('scroll')
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    } else if (scrollTo === 'discussion') {
      setActiveTab('discussion')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab)
      navigate(`${location.pathname}?${params.toString()}`, { replace: true })
    }
  }, [activeTab, location.pathname, navigate])

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

  useEffect(() => () => {
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current)
    }
  }, [])

  useEffect(() => () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
    }
    recordingStreamRef.current?.getTracks?.().forEach((track) => track.stop())
  }, [])

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl)
      }
    }
  }, [pendingAttachment])

  useEffect(() => {
    return () => {
      if (activeTab === 'discussion') {
        void setTypingStatus(false)
      }
    }
  }, [activeTab, setTypingStatus])

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
    const selectedStartDate = normalizeDate(taskForm.startDate || today)
    const selectedTargetDate = normalizeDate(taskForm.targetDate)
    const minimumStartDate = normalizeDate(taskStartMinDate)
    const minimumTargetDate = normalizeDate(taskTargetMinDate)
    const projectDueDate = normalizeDate(project?.dueDate)

    if (selectedStartDate && minimumStartDate && selectedStartDate < minimumStartDate) {
      if (taskStartMinDate === today) {
        showSnackbar('Start date cannot be in the past.', 'error')
      } else {
        showSnackbar(`Start date cannot be before project start date (${new Date(project.startDate).toLocaleDateString()}).`, 'error')
      }
      return
    }
    if (selectedStartDate && projectDueDate && selectedStartDate > projectDueDate) {
      showSnackbar(`Start date cannot exceed project deadline (${new Date(project.dueDate).toLocaleDateString()}).`, 'error')
      return
    }
    if (selectedTargetDate && minimumTargetDate && selectedTargetDate < minimumTargetDate) {
      if (taskForm.startDate) {
        showSnackbar('Target date cannot be before the selected start date.', 'error')
      } else if (taskStartMinDate === today) {
        showSnackbar('Target date cannot be in the past.', 'error')
      } else {
        showSnackbar(`Target date cannot be before project start date (${new Date(project.startDate).toLocaleDateString()}).`, 'error')
      }
      return
    }
    if (selectedTargetDate && projectDueDate && selectedTargetDate > projectDueDate) {
      showSnackbar(`Target date cannot exceed project deadline (${new Date(project.dueDate).toLocaleDateString()}).`, 'error')
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
    const selectedTargetDate = normalizeDate(modifyForm.targetDate)
    const minimumTargetDate = normalizeDate(modifyTaskTargetMinDate)
    const projectDueDate = normalizeDate(project?.dueDate)

    if (selectedTargetDate && minimumTargetDate && selectedTargetDate < minimumTargetDate) {
      if ((modifyForm.startDate || modifyTask?.startDate) && toInputDateValue(modifyForm.startDate || modifyTask?.startDate) > today) {
        showSnackbar('Target date cannot be before the task start date.', 'error')
      } else {
        showSnackbar('Target date cannot be in the past.', 'error')
      }
      return
    }

    if (selectedTargetDate && projectDueDate && selectedTargetDate > projectDueDate) {
      showSnackbar(`Target date cannot exceed project deadline (${new Date(project.dueDate).toLocaleDateString()}).`, 'error')
      return
    }

    try {
      await fetch(`/api/tasks/${modifyTask.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modifyForm) })
      await fetchTasks()
      setModifyTask(null)
    } catch (e) { console.error(e) }
  }

  const submitWork = async (e) => {
    e.preventDefault()
    if (isProjectCompleted) {
      showSnackbar('Completed projects are read-only.', 'error')
      return
    }
    const fd = new FormData()
    fd.append('submittedByEmail', userEmail)
    fd.append('notes', submitNotes)
    if (submitFile) fd.append('submissionFile', submitFile)
    try {
      await fetch(`/api/tasks/${submitTask.id}/submit`, { method: 'POST', body: fd })
      await fetchTasks()
      await fetchDocuments()
      setSubmitTask(null)
      setSubmitNotes('')
      setSubmitFile(null)
      setTaskSubmissions([])
    } catch (e) { console.error(e) }
  }

  const reviewWork = async (submissionId, status, remarks = '') => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          remarks,
          reviewedByEmail: userEmail,
        }),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok) throw new Error(result?.error || 'Failed to review submission.')
      await fetchTasks()
      if (viewTask?.id) {
        await fetchSubmissions(viewTask.id)
        setViewTask((current) => (
          current
            ? {
                ...current,
                status: status === 'Accepted' ? 'Completed' : status === 'Rework' ? 'Rework' : current.status,
              }
            : current
        ))
      }
      setReviewSubmission(null)
      showSnackbar(status === 'Accepted' ? 'Submission accepted.' : 'Rework instructions sent.', 'success')
    } catch (e) { console.error(e) }
  }

  const handleCompleteProject = useCallback(async () => {
    if (!project?.id || !project?.groupId || isCompletingProject) return

    let queuedNavigation = false

    try {
      setIsCompletingProject(true)
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed',
          userEmail,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to mark project as completed.')
      }

      setProject((current) => (current ? { ...current, ...result } : result))
      setShowCompletionCelebration(true)

      const finishCelebration = () => {
        setShowCompletionCelebration(false)
        setIsCompletingProject(false)
        navigate(`/groups/${result.groupId || project.groupId}?scroll=projects&section=completed`)
      }

      queuedNavigation = true

      const audio = celebrationAudioRef.current
      let hasFinished = false
      const safeFinish = () => {
        if (hasFinished) return
        hasFinished = true
        if (audio) {
          audio.onended = null
          audio.onerror = null
        }
        finishCelebration()
      }

      const fallbackDurationMs = Number.isFinite(audio?.duration) && audio.duration > 0
        ? Math.max(Math.ceil(audio.duration * 1000) + 450, 5200)
        : 7500

      completionTimeoutRef.current = window.setTimeout(safeFinish, fallbackDurationMs)

      if (audio) {
        audio.currentTime = 0
        audio.onended = safeFinish
        audio.onerror = safeFinish
        audio.play().catch(() => {})
      }
    } catch (error) {
      console.error(error)
      setIsCompletingProject(false)
      showSnackbar(error.message || 'Failed to mark project as completed.', 'error')
    } finally {
      if (!queuedNavigation) {
        setShowCompletionCelebration(false)
      }
    }
  }, [isCompletingProject, navigate, project?.groupId, project?.id, showSnackbar, userEmail])

  const clearPendingAttachment = useCallback(() => {
    setPendingAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl)
      }
      return null
    })
    if (chatImageInputRef.current) chatImageInputRef.current.value = ''
    if (chatVideoInputRef.current) chatVideoInputRef.current.value = ''
    if (chatFileInputRef.current) chatFileInputRef.current.value = ''
  }, [])

  const postChatMessage = useCallback(async ({ text = '', attachmentFile = null, attachmentCategory = '' } = {}) => {
    if (String(project?.status || '').trim().toLowerCase() === 'completed') {
      throw new Error('Discussion is locked for completed projects.')
    }
    const trimmedText = String(text || '').trim()
    if (!trimmedText && !attachmentFile) return false

    const formData = new FormData()
    formData.append('senderEmail', userEmail)
    formData.append('message', trimmedText)
    formData.append('conversationType', discussionConversationType)
    if (discussionTargetEmail) {
      formData.append('recipientEmail', discussionTargetEmail)
    }
    if (attachmentCategory) {
      formData.append('attachmentCategory', attachmentCategory)
    }
    if (attachmentFile) {
      formData.append('attachment', attachmentFile)
    }

    const res = await fetch(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.error || 'Failed to send message.')
    }

    const msg = await res.json()
    shouldStickToBottomRef.current = true
    setChatMessages((prev) => [...prev, msg])
    setChatInput('')
    setTypingMemberEmails([])
    clearPendingAttachment()
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current)
      typingStopTimerRef.current = null
    }
    await setTypingStatus(false)
    await fetchDiscussionUnreadCounts()
    return true
  }, [
    clearPendingAttachment,
    discussionConversationType,
    discussionTargetEmail,
    fetchDiscussionUnreadCounts,
    project?.status,
    projectId,
    setTypingStatus,
    userEmail,
  ])

  const sendChat = async (e) => {
    e.preventDefault()
    try {
      await postChatMessage({
        text: chatInput,
        attachmentFile: pendingAttachment?.file || null,
        attachmentCategory: pendingAttachment?.category || '',
      })
    } catch (e) {
      console.error(e)
      showSnackbar(e.message || 'Failed to send message.', 'error')
    }
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

  const handleChatInputChange = useCallback((value) => {
    setChatInput(value)

    const idx = value.lastIndexOf('@')
    if (idx !== -1 && (idx === 0 || value[idx - 1] === ' ')) {
      const after = value.slice(idx + 1)
      if (!after.includes(' ')) {
        setMentionOpen(true)
        setMentionQuery(after)
        setMentionIndex(idx)
      } else {
        setMentionOpen(false)
      }
    } else {
      setMentionOpen(false)
    }

    if (activeTab !== 'discussion') return

    const trimmed = value.trim()
    if (!trimmed) {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current)
        typingStopTimerRef.current = null
      }
      void setTypingStatus(false)
      return
    }

    void setTypingStatus(true)

    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current)
    }

    typingStopTimerRef.current = window.setTimeout(() => {
      void setTypingStatus(false)
      typingStopTimerRef.current = null
    }, 3200)
  }, [activeTab, setTypingStatus])

  const handleSelectChatAttachment = useCallback((event, category) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPendingAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl)
      }
      return {
        file,
        category,
        previewUrl: category === 'image' ? URL.createObjectURL(file) : '',
      }
    })
    setChatAttachmentMenuOpen(false)
  }, [])

  const startVoiceRecording = useCallback(async () => {
    if (isRecordingVoice) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderChunksRef.current = []
      recordingStreamRef.current = stream

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaRecorderChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        stream.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null

        const cancelled = voiceCancelledRef.current
        voiceCancelledRef.current = false

        const audioBlob = new Blob(mediaRecorderChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        mediaRecorderChunksRef.current = []
        setIsRecordingVoice(false)
        setRecordingSeconds(0)

        if (cancelled || !audioBlob.size) return

        const extension = (recorder.mimeType || 'audio/webm').includes('ogg') ? 'ogg' : 'webm'
        const voiceFile = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, { type: recorder.mimeType || 'audio/webm' })

        try {
          setIsSendingVoice(true)
          await postChatMessage({ text: chatInput, attachmentFile: voiceFile, attachmentCategory: 'voice' })
        } catch (error) {
          console.error(error)
          showSnackbar(error.message || 'Failed to send voice note.', 'error')
        } finally {
          setIsSendingVoice(false)
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecordingVoice(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1)
      }, 1000)
    } catch (error) {
      console.error(error)
      showSnackbar('Microphone access is required to record a voice note.', 'error')
    }
  }, [chatInput, isRecordingVoice, postChatMessage, showSnackbar])

  const stopVoiceRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    mediaRecorderRef.current.stop()
  }, [])

  const cancelVoiceRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    voiceCancelledRef.current = true
    mediaRecorderRef.current.stop()
  }, [])

  const toggleVoiceRecording = useCallback(async () => {
    if (isRecordingVoice) {
      stopVoiceRecording()
      return
    }
    await startVoiceRecording()
  }, [isRecordingVoice, startVoiceRecording, stopVoiceRecording])

  const renderMentionedText = useCallback((text = '') => (
    String(text)
      .split(/(@[^\s]+)/g)
      .filter((segment) => segment.length > 0)
      .map((segment, index) => (
        /^@[^\s]+$/.test(segment)
          ? (
            <span
              key={`mention-${index}`}
              style={{ color: isDayMode ? '#2563eb' : '#60a5fa', fontWeight: 700 }}
            >
              {segment}
            </span>
          )
          : <span key={`text-${index}`}>{segment}</span>
      ))
  ), [isDayMode])

  const renderChatAttachment = useCallback((msg) => {
    if (!msg?.attachmentUrl || msg?.deletedForEveryone) return null

    if (msg.attachmentType === 'image') {
      return (
        <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 block">
          <img
            src={msg.attachmentUrl}
            alt={msg.attachmentName || 'Shared image'}
            className="max-h-[320px] w-full rounded-[20px] object-cover"
          />
        </a>
      )
    }

    if (msg.attachmentType === 'video') {
      return (
        <video
          controls
          src={msg.attachmentUrl}
          className="mt-3 max-h-[320px] w-full rounded-[20px]"
        />
      )
    }

    if (msg.attachmentType === 'audio') {
      return (
        <div className="mt-3 rounded-[18px] border px-4 py-3" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.04)' }}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold" style={{ color: palette.textPrimary }}>
              {msg.attachmentName || 'Voice note'}
            </span>
            <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold" style={{ color: palette.accentPrimary }}>
              Download
            </a>
          </div>
          <audio controls src={msg.attachmentUrl} className="w-full" />
        </div>
      )
    }

    return (
      <a
        href={msg.attachmentUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center gap-3 rounded-[18px] border px-4 py-3 transition hover:opacity-90"
        style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.04)' }}
      >
        <FileText size={18} style={{ color: palette.accentPrimary }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" style={{ color: palette.textPrimary }}>
            {msg.attachmentName || 'Attachment'}
          </div>
          <div className="text-xs" style={{ color: palette.textMuted }}>
            {formatBytes(msg.attachmentSizeBytes) || 'File'}
          </div>
        </div>
      </a>
    )
  }, [isDayMode, palette.accentPrimary, palette.borderSoft, palette.textMuted, palette.textPrimary])

  const formatRecordingDuration = useCallback((seconds) => {
    const totalSeconds = Number(seconds || 0)
    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
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
  const weeklyProgress = useMemo(() => {
    const now = normalizeDate(new Date()) || new Date()
    const taskTimelineDates = tasks
      .map((task) => getTaskTimelineDate(task))
      .filter(Boolean)
      .sort((left, right) => left - right)

    const fallbackStart = taskTimelineDates[0] || now
    const fallbackEnd = taskTimelineDates[taskTimelineDates.length - 1] || fallbackStart
    const timelineStart = normalizeDate(project?.startDate) || fallbackStart
    const resolvedTimelineEnd = normalizeDate(project?.dueDate) || fallbackEnd || timelineStart
    const timelineEnd = resolvedTimelineEnd < timelineStart ? timelineStart : resolvedTimelineEnd
    const totalDays = differenceInCalendarDays(timelineStart, timelineEnd) + 1
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))

    const weeks = Array.from({ length: totalWeeks }, (_, index) => {
      const weekStart = addDaysToDate(timelineStart, index * 7)
      const calculatedWeekEnd = addDaysToDate(weekStart, 6)
      const weekEnd = calculatedWeekEnd > timelineEnd ? timelineEnd : calculatedWeekEnd
      const weekTasks = tasks
        .filter((task) => {
          const taskDate = getTaskTimelineDate(task)
          return taskDate && taskDate >= weekStart && taskDate <= weekEnd
        })
        .sort((left, right) => {
          const leftDate = getTaskTimelineDate(left)?.getTime() || 0
          const rightDate = getTaskTimelineDate(right)?.getTime() || 0
          return leftDate - rightDate
        })

      const completed = weekTasks.filter((task) => task.status === 'Completed').length
      const total = weekTasks.length
      const pending = Math.max(total - completed, 0)
      const completionRate = total ? clampPercent((completed / total) * 100) : 0
      const state = now < weekStart ? 'upcoming' : now > weekEnd ? 'closed' : 'current'

      return {
        index,
        label: `Week ${index + 1}`,
        rangeLabel: formatTimelineRange(weekStart, weekEnd),
        total,
        completed,
        pending,
        completionRate,
        state,
        tasks: weekTasks,
      }
    })

    const busiestWeekCount = Math.max(...weeks.map((week) => week.total), 1)
    const decoratedWeeks = weeks.map((week) => ({
      ...week,
      loadRate: week.total ? clampPercent((week.total / busiestWeekCount) * 100) : 0,
    }))

    const completedTaskCount = tasks.filter((task) => task.status === 'Completed').length
    const overallCompletionRate = tasks.length
      ? clampPercent((completedTaskCount / tasks.length) * 100)
      : 0
    const currentWeek =
      decoratedWeeks.find((week) => week.state === 'current') ||
      (now > timelineEnd ? decoratedWeeks[decoratedWeeks.length - 1] : decoratedWeeks[0])
    const completedWeeks = decoratedWeeks.filter(
      (week) => week.total > 0 && week.completed === week.total,
    ).length
    const visibleWeeks = decoratedWeeks.filter((week) => week.total > 0)
    const visibleWeeksCount = visibleWeeks.length
    const focusWeek =
      visibleWeeks.find((week) => week.state === 'current') ||
      visibleWeeks[visibleWeeks.length - 1] ||
      currentWeek
    const completedVisibleWeeks = visibleWeeks.filter((week) => week.completed === week.total).length

    return {
      timelineStart,
      timelineEnd,
      totalWeeks,
      overallCompletionRate,
      completedWeeks,
      currentWeek,
      focusWeek,
      visibleWeeks,
      visibleWeeksCount,
      completedVisibleWeeks,
      weeks: decoratedWeeks,
    }
  }, [project?.dueDate, project?.startDate, tasks])
  const readReceiptMessage = chatMessages.find(msg => msg.id === chatReadMessage?.id) || chatReadMessage
  const readReceiptEntries = (readReceiptMessage?.readBy || []).filter(reader => reader.emailAddress?.toLowerCase() !== normalizedUserEmail)
  const discussionChannels = useMemo(() => {
    const groupLabel = project?.groupTitle || 'General Discussion'
    return [{ name: groupLabel, active: true }]
  }, [project?.groupTitle])
  const directMessages = useMemo(() => members, [members])
  const pinnedMessages = useMemo(() => chatMessages.filter(msg => pinnedMessageIds.has(msg.id) && !msg.deletedForEveryone), [chatMessages, pinnedMessageIds])
  const visiblePinned = useMemo(() => pinnedMessages.slice(0, 2), [pinnedMessages])
  const sidebarTasks = useMemo(() => tasks.slice(0, 3), [tasks])
  const sharedDocs = useMemo(() => documents.slice(0, 3), [documents])
  const documentTimeline = useMemo(() => (
    [...documents].sort((left, right) => {
      const leftTime = new Date(left.documentDate || left.created_at || 0).getTime() || 0
      const rightTime = new Date(right.documentDate || right.created_at || 0).getTime() || 0
      return rightTime - leftTime
    })
  ), [documents])
  const latestReworkSubmission = useMemo(() => (
    [...taskSubmissions]
      .filter((submission) => submission.status === 'Rework')
      .sort((left, right) => {
        const leftTime = new Date(left.reviewedAt || left.created_at || 0).getTime() || 0
        const rightTime = new Date(right.reviewedAt || right.created_at || 0).getTime() || 0
        return rightTime - leftTime
      })[0] || null
  ), [taskSubmissions])
  const canCompleteProject = Boolean(isOwner && project && project.status !== 'Completed')
  const currentDiscussionName = dmTarget ? dmTarget.name || dmTarget.email : (project?.groupTitle || 'General Discussion')
  const displayedMessages = useMemo(() => chatMessages, [chatMessages])
  const isMemberOnline = useCallback(
    (email) => onlineMemberEmailSet.has(String(email || '').trim().toLowerCase()),
    [onlineMemberEmailSet],
  )
  const typingMemberNames = useMemo(() => (
    typingMemberEmails
      .map((email) => {
        const normalizedEmail = String(email || '').trim().toLowerCase()
        const member = members.find((item) => String(item.email || '').trim().toLowerCase() === normalizedEmail)
        return member?.name || member?.email || normalizedEmail
      })
      .filter(Boolean)
  ), [members, typingMemberEmails])
  const typingSummary = useMemo(() => formatTypingSummary(typingMemberNames), [typingMemberNames])
  const discussionSubtext = useMemo(() => {
    if (typingSummary) return typingSummary
    if (dmTarget) return isMemberOnline(dmTarget.email) ? 'Online' : 'Offline'
    return `Public channel • ${members.length || 0} members`
  }, [dmTarget, isMemberOnline, members.length, typingSummary])

  const { messageReactions, myReactions } = useMemo(() => {
    const nextReactions = {}
    const nextMyReactions = {}

    chatMessages.forEach((message) => {
      const reactions = Array.isArray(message?.reactions) ? message.reactions : []
      reactions.forEach((reaction) => {
        const emoji = String(reaction?.emoji || '').trim()
        if (!emoji) return

        const key = `${message.id}-${emoji}`
        nextReactions[key] = (nextReactions[key] || 0) + 1

        if (String(reaction?.userEmail || '').trim().toLowerCase() === normalizedUserEmail) {
          nextMyReactions[key] = true
        }
      })
    })

    return {
      messageReactions: nextReactions,
      myReactions: nextMyReactions,
    }
  }, [chatMessages, normalizedUserEmail])

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
            <h1 className="type-heading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
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
          <div className="qs-page-container">
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
                  className="type-heading"
                  style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}
                >
                  {project.title}
                </h1>
                <p className="type-bodyText mt-4 max-w-3xl" style={{ color: palette.textMuted }}>
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
                      <div className="flex flex-wrap items-center gap-2">
                        {canCompleteProject ? (
                          <button
                            type="button"
                            onClick={handleCompleteProject}
                            disabled={isCompletingProject}
                            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                            style={{
                              backgroundColor: '#fff',
                              color: '#000',
                              border: '1px solid rgba(0,0,0,0.12)',
                            }}>
                            <Sparkles size={14} />
                            {isCompletingProject ? 'Wrapping up...' : 'Project Completed'}
                          </button>
                        ) : null}
                        {isOwner && !isProjectCompleted && (
                          <button onClick={() => { setTaskForm({ taskName: '', taskType: 'Research', startDate: today, targetDate: '', details: '', assignedToEmail: '' }); setTaskFile(null); setShowTaskModal(true) }}
                            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
                            style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                            <Plus size={14} /> Add Task
                          </button>
                        )}
                      </div>
                    </div>

                    {tasks.length === 0 ? (
                      <p className="text-sm text-center py-8" style={{ color: palette.textFaint }}>No tasks created yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map(task => (
                          <button key={task.id} type="button" onClick={() => setViewTask(task)} className="relative flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition group"
                            style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.status === 'Completed' ? '#10b981' : taskTypeColors[task.taskType] || '#666' }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold truncate" style={{ color: palette.textPrimary }}>{task.taskName}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider ${statusBadge(task.status)}`}>{task.status}</span>
                              </div>
                              <div className="mt-1 text-xs" style={{ color: palette.textFaint }}>{task.assigneeName || 'Unassigned'} · {task.taskType || 'General'}</div>
                            </div>
                            {!isProjectCompleted ? (
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
                                  {isOwner && <DropItem icon={Edit3} label="Modify" onClick={() => { setModifyForm({ taskName: task.taskName, taskType: task.taskType, startDate: task.startDate || '', targetDate: task.targetDate || '', details: task.details || '' }); setModifyTask(task); setOpenDropdown(null) }} />}
                                </div>
                              )}
                              </div>
                            ) : null}
                          </button>
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
                <div
                  className="rounded-[28px] border p-6"
                  style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <div className="flex items-center gap-3" style={{ color: palette.accentPrimary }}>
                        <LayoutGrid size={18} />
                        <span className="text-xs font-semibold uppercase tracking-[0.28em]">Weekly Progress</span>
                      </div>
                      <h3 className="mt-4 type-sectionHeading leading-tight" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                        Task pulse across {weeklyProgress.visibleWeeksCount} active week{weeklyProgress.visibleWeeksCount === 1 ? '' : 's'}.
                      </h3>
                      <p className="mt-3 max-w-3xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                        The project window still runs from
                        {' '}
                        {formatDisplayDate(weeklyProgress.timelineStart, 'N/A')}
                        {' '}
                        to
                        {' '}
                        {formatDisplayDate(weeklyProgress.timelineEnd, 'N/A')}
                        , but only the weeks that actually contain tasks are shown below.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[440px]">
                      {[
                        {
                          label: 'Timeline span',
                          value: `${weeklyProgress.totalWeeks} week${weeklyProgress.totalWeeks === 1 ? '' : 's'}`,
                          hint: `${differenceInCalendarDays(weeklyProgress.timelineStart, weeklyProgress.timelineEnd) + 1} day window`,
                        },
                        {
                          label: 'Active lane',
                          value: weeklyProgress.focusWeek?.label || 'Week 1',
                          hint: weeklyProgress.focusWeek?.rangeLabel || 'Tracking now',
                        },
                        {
                          label: 'Overall progress',
                          value: `${weeklyProgress.overallCompletionRate}%`,
                          hint:
                            weeklyProgress.visibleWeeksCount > 0
                              ? `${weeklyProgress.completedVisibleWeeks}/${weeklyProgress.visibleWeeksCount} active weeks fully cleared`
                              : 'No scheduled task weeks yet',
                        },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-2xl border px-4 py-4"
                          style={{
                            borderColor: palette.borderSoft,
                            backgroundColor: isDayMode ? palette.bgInput : 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <div
                            className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                            style={{ color: palette.accentPrimary, opacity: 0.76 }}
                          >
                            {metric.label}
                          </div>
                          <div className="mt-3 text-xl font-black" style={{ color: palette.textPrimary }}>
                            {metric.value}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: palette.textFaint }}>
                            {metric.hint}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 overflow-x-auto pb-2">
                    <div className="relative min-w-max px-1 pt-2">
                      <div
                        className="absolute left-8 right-8 top-7 h-px"
                        style={{
                          background: `linear-gradient(to right, transparent, ${palette.accentPrimary}, transparent)`,
                          opacity: 0.28,
                        }}
                      />

                      <div
                        className="grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(weeklyProgress.visibleWeeks.length, 1)}, minmax(220px, 1fr))`,
                        }}
                      >
                        {weeklyProgress.visibleWeeks.length === 0 ? (
                          <div
                            className="rounded-[24px] border border-dashed px-5 py-10 text-sm"
                            style={{
                              borderColor: palette.borderInput,
                              backgroundColor: palette.bgInput,
                              color: palette.textFaint,
                            }}
                          >
                            No task has been placed on the project timeline yet. Once a task gets a target date or start date, its matching week card will appear here automatically.
                          </div>
                        ) : weeklyProgress.visibleWeeks.map((week) => {
                          const stateChipStyles =
                            week.state === 'current'
                              ? {
                                  borderColor: palette.accentBorder,
                                  backgroundColor: palette.accentSoft,
                                  color: palette.accentPrimary,
                                }
                              : week.state === 'closed'
                                ? {
                                    borderColor: palette.borderInput,
                                    backgroundColor: palette.bgSurface,
                                    color: palette.textMuted,
                                  }
                                : {
                                    borderColor: 'rgba(59,130,246,0.18)',
                                    backgroundColor: isDayMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.12)',
                                    color: isDayMode ? '#2563eb' : '#93c5fd',
                                  }

                          return (
                            <motion.div
                              key={week.label}
                              initial={{ opacity: 0, y: 18 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, margin: '-40px' }}
                              transition={{ duration: 0.42, delay: week.index * 0.04 }}
                              className="relative pt-5"
                            >
                              <div className="absolute left-5 top-0 flex items-center gap-3">
                                <span
                                  className="relative flex h-5 w-5 items-center justify-center rounded-full border"
                                  style={{
                                    borderColor: week.state === 'current' ? palette.accentPrimary : palette.borderInput,
                                    backgroundColor: week.state === 'current' ? palette.accentPrimary : palette.bgSurface,
                                  }}
                                >
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        week.state === 'current'
                                          ? '#ffffff'
                                          : week.state === 'closed'
                                            ? palette.textMuted
                                            : '#60a5fa',
                                    }}
                                  />
                                  {week.state === 'current' ? (
                                    <span
                                      className="absolute inset-0 rounded-full"
                                      style={{
                                        boxShadow: `0 0 0 8px ${isDayMode ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.18)'}`,
                                      }}
                                    />
                                  ) : null}
                                </span>
                                <span className="text-[11px] font-semibold" style={{ color: palette.textFaint }}>
                                  {week.rangeLabel}
                                </span>
                              </div>

                              <div
                                className="h-full rounded-[24px] border p-4"
                                style={{
                                  borderColor: week.state === 'current' ? palette.accentBorder : palette.borderSoft,
                                  backgroundColor:
                                    week.state === 'current'
                                      ? isDayMode
                                        ? 'rgba(16,185,129,0.08)'
                                        : 'rgba(16,185,129,0.06)'
                                      : palette.bgInput,
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div
                                      className="text-xs font-semibold uppercase tracking-[0.24em]"
                                      style={{ color: palette.accentPrimary, opacity: 0.78 }}
                                    >
                                      {week.label}
                                    </div>
                                    <div className="mt-2 text-sm" style={{ color: palette.textFaint }}>
                                      {week.total} task{week.total === 1 ? '' : 's'} mapped here
                                    </div>
                                  </div>

                                  <span
                                    className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                                    style={stateChipStyles}
                                  >
                                    {week.state === 'current' ? 'Live' : week.state === 'closed' ? 'Closed' : 'Upcoming'}
                                  </span>
                                </div>

                                <div className="mt-5 flex items-end gap-4">
                                  <div
                                    className="relative flex h-32 w-14 items-end overflow-hidden rounded-[22px] border p-2"
                                    style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}
                                  >
                                    <div
                                      className="absolute inset-x-2 bottom-2 rounded-[16px]"
                                      style={{
                                        top: `${Math.max(10, 100 - Math.max(week.loadRate, week.total ? 18 : 10))}%`,
                                        backgroundColor: isDayMode ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)',
                                      }}
                                    />
                                    <motion.div
                                      initial={{ height: 0 }}
                                      whileInView={{ height: `${Math.max(week.completionRate, week.total ? 12 : 0)}%` }}
                                      viewport={{ once: true }}
                                      transition={{ duration: 0.6, delay: week.index * 0.05 }}
                                      className="relative z-10 w-full rounded-[14px]"
                                      style={{
                                        background: `linear-gradient(180deg, ${isDayMode ? '#34d399' : '#6ee7b7'} 0%, ${palette.accentPrimary} 100%)`,
                                        boxShadow: `0 18px 32px ${isDayMode ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.16)'}`,
                                      }}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="text-[2rem] font-black" style={{ color: palette.textPrimary }}>
                                      {week.completionRate}%
                                    </div>
                                    <div className="mt-1 text-sm" style={{ color: palette.textSecondary }}>
                                      {week.completed}/{week.total} closed
                                      {week.total === 0 ? ' · no workload yet' : ''}
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                      <div
                                        className="rounded-2xl border px-3 py-2"
                                        style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}
                                      >
                                        <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.textFaint }}>
                                          Load
                                        </div>
                                        <div className="mt-1 text-sm font-semibold" style={{ color: palette.textPrimary }}>
                                          {week.total} task{week.total === 1 ? '' : 's'}
                                        </div>
                                      </div>
                                      <div
                                        className="rounded-2xl border px-3 py-2"
                                        style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}
                                      >
                                        <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.textFaint }}>
                                          In motion
                                        </div>
                                        <div className="mt-1 text-sm font-semibold" style={{ color: palette.textPrimary }}>
                                          {week.pending} open
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-5 space-y-2">
                                  {week.tasks.length === 0 ? (
                                    <div
                                      className="rounded-2xl border border-dashed px-3 py-3 text-xs"
                                      style={{ borderColor: palette.borderInput, color: palette.textFaint }}
                                    >
                                      No tasks land in this week yet. As new tasks are scheduled, they will appear in this lane automatically.
                                    </div>
                                  ) : (
                                    <>
                                      {week.tasks.slice(0, 3).map((task) => (
                                        <div
                                          key={task.id}
                                          className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px]"
                                          style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}
                                        >
                                          <span
                                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                            style={{
                                              backgroundColor:
                                                task.status === 'Completed'
                                                  ? '#10b981'
                                                  : taskTypeColors[task.taskType] || palette.textMuted,
                                            }}
                                          />
                                          <span className="truncate font-medium" style={{ color: palette.textPrimary }}>
                                            {task.taskName}
                                          </span>
                                          <span className="ml-auto truncate" style={{ color: palette.textFaint }}>
                                            {task.assigneeName || '—'}
                                          </span>
                                        </div>
                                      ))}
                                      {week.tasks.length > 3 ? (
                                        <div className="px-1 text-[11px]" style={{ color: palette.textFaint }}>
                                          +{week.tasks.length - 3} more task{week.tasks.length - 3 === 1 ? '' : 's'} in this week
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
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
                            setViewTask(task)
                          } else {
                            setViewTask(task)
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
                          onClick={() => setDmTarget(null)}
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition"
                          style={!dmTarget
                            ? {
                                background: isDayMode
                                  ? `linear-gradient(135deg, ${palette.accentPrimary}, ${palette.accentDark})`
                                  : 'linear-gradient(135deg, rgba(16,185,129,0.30), rgba(5,150,105,0.45))',
                                color: '#fff'
                              }
                            : { color: palette.textSecondary }}>
                          <Hash size={16} />
                          <span className="truncate">{channel.name}</span>
                          {unreadCounts.channelUnread > 0 ? (
                            <span
                              className="ml-auto inline-flex min-w-[1.4rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                              style={{
                                backgroundColor: !dmTarget ? 'rgba(255,255,255,0.22)' : palette.accentPrimary,
                                color: '#fff',
                              }}
                            >
                              {unreadCounts.channelUnread > 99 ? '99+' : unreadCounts.channelUnread}
                            </span>
                          ) : null}
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
                                  backgroundColor: isMemberOnline(member.email) ? palette.accentPrimary : '#9ca3af'
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-semibold" style={{ color: palette.textPrimary }}>{member.name || member.email}{member.isCurrentUser ? <span className="ml-1 text-xs font-normal" style={{ color: palette.textMuted }}>(you)</span> : null}</div>
                                {!member.isCurrentUser && Number(unreadCounts.directUnreadByEmail[String(member.email || '').trim().toLowerCase()] || 0) > 0 ? (
                                  <span
                                    className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                    style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}
                                  >
                                    {Number(unreadCounts.directUnreadByEmail[String(member.email || '').trim().toLowerCase()] || 0) > 99
                                      ? '99+'
                                      : Number(unreadCounts.directUnreadByEmail[String(member.email || '').trim().toLowerCase()] || 0)}
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs" style={{ color: isMemberOnline(member.email) ? palette.accentPrimary : palette.textFaint }}>
                                {isMemberOnline(member.email) ? 'Online' : 'Offline'}
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
                          <Hash size={18} style={{ color: palette.textPrimary }} />
                          <h3 className="text-[1.35rem] font-bold" style={{ color: palette.textPrimary }}>{currentDiscussionName}</h3>
                          <ChevronRight size={16} style={{ color: palette.textMuted }} />
                        </div>
                        <p className="mt-1 text-sm" style={{ color: typingSummary ? palette.accentPrimary : palette.textMuted }}>
                          {discussionSubtext}
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
                          <div className="mt-1 text-xs" style={{ color: typingSummary ? palette.accentPrimary : (isMemberOnline(dmTarget.email) ? palette.accentPrimary : palette.textMuted) }}>
                            {typingSummary || (isMemberOnline(dmTarget.email) ? 'Online' : 'Offline')}
                          </div>
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
                        const senderOnline = isMemberOnline(sender?.email || msg.senderEmail)

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
                                    backgroundColor: senderOnline ? palette.accentPrimary : '#a3a3a3'
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
                                {msg.message ? (
                                  <div
                                    className={`text-base leading-8 ${msg.deletedForEveryone ? 'italic' : ''}`}
                                    style={{ color: msg.deletedForEveryone ? palette.textMuted : palette.textPrimary, whiteSpace: 'pre-wrap' }}
                                  >
                                    {renderMentionedText(msg.message)}
                                  </div>
                                ) : null}
                                {renderChatAttachment(msg)}
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
                        {isProjectCompleted ? (
                          <div
                            className="mb-3 flex items-start gap-3 rounded-[20px] border px-4 py-3"
                            style={{
                              borderColor: palette.borderSoft,
                              backgroundColor: isDayMode ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <CheckCircle2 size={18} style={{ color: palette.accentPrimary }} />
                            <div>
                              <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>
                                Discussion locked
                              </div>
                              <div className="mt-1 text-xs leading-6" style={{ color: palette.textMuted }}>
                                This project has been completed, so members can still view the conversation history but cannot send new messages.
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {pendingAttachment ? (
                          <div className="mb-3 flex items-center gap-3 rounded-[20px] border px-4 py-3" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.04)' }}>
                            <div className="h-12 w-12 overflow-hidden rounded-2xl border" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                              {pendingAttachment.category === 'image' && pendingAttachment.previewUrl ? (
                                <img src={pendingAttachment.previewUrl} alt={pendingAttachment.file?.name || 'Selected image'} className="h-full w-full object-cover" />
                              ) : pendingAttachment.category === 'video' ? (
                                <div className="flex h-full w-full items-center justify-center"><Video size={18} style={{ color: palette.accentPrimary }} /></div>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center"><FileText size={18} style={{ color: palette.accentPrimary }} /></div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold" style={{ color: palette.textPrimary }}>{pendingAttachment.file?.name || 'Attachment selected'}</div>
                              <div className="text-xs" style={{ color: palette.textMuted }}>
                                {pendingAttachment.category === 'image' ? 'Image' : pendingAttachment.category === 'video' ? 'Video' : 'File'}
                                {pendingAttachment.file?.size ? ` • ${formatBytes(pendingAttachment.file.size)}` : ''}
                              </div>
                            </div>
                            <button type="button" onClick={clearPendingAttachment} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: palette.textMuted }}>
                              <X size={16} />
                            </button>
                          </div>
                        ) : null}
                        {typingSummary ? (
                          <div
                            className="mb-3 flex items-center gap-3 rounded-[20px] border px-4 py-3"
                            style={{
                              borderColor: palette.accentBorder,
                              backgroundColor: isDayMode ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.08)',
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              {[0, 1, 2].map((dot) => (
                                <span
                                  key={dot}
                                  className="h-2.5 w-2.5 rounded-full animate-pulse"
                                  style={{
                                    backgroundColor: palette.accentPrimary,
                                    animationDelay: `${dot * 0.18}s`,
                                  }}
                                />
                              ))}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: palette.accentPrimary }}>
                                Typing now
                              </div>
                              <div className="mt-1 truncate text-sm" style={{ color: palette.textPrimary }}>
                                {typingSummary}
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {isRecordingVoice ? (
                          <div className="mb-3 flex items-center justify-between rounded-[20px] border px-4 py-3" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft }}>
                            <div className="flex items-center gap-3">
                              <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#ef4444' }} />
                              <span className="text-sm font-semibold" style={{ color: palette.textPrimary }}>Recording voice note… {formatRecordingDuration(recordingSeconds)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={cancelVoiceRecording} className="rounded-xl px-3 py-1.5 text-sm font-semibold" style={{ backgroundColor: palette.bgSecondary, color: palette.textSecondary }}>
                                Cancel
                              </button>
                              <button type="button" onClick={stopVoiceRecording} className="rounded-xl px-3 py-1.5 text-sm font-semibold" style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                                Stop & send
                              </button>
                            </div>
                          </div>
                        ) : null}
                         <div className="relative flex items-center gap-3 rounded-[24px] border pl-3 pr-2 py-2" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? palette.bgSurface : 'rgba(255,255,255,0.02)' }}>
                          <div className="relative" ref={chatAttachmentMenuRef}>
                            <button type="button" disabled={isProjectCompleted} onClick={() => setChatAttachmentMenuOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:opacity-40" style={{ color: palette.textSecondary }}>
                              <Paperclip size={18} />
                            </button>
                            {chatAttachmentMenuOpen && (
                              <div className="absolute bottom-full left-0 mb-2 z-50 w-48 rounded-2xl border p-2 shadow-2xl" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgTertiary }}>
                                <button type="button" onClick={() => chatImageInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:opacity-80" style={{ color: palette.textPrimary }}>
                                  <ImageIcon size={16} style={{ color: palette.accentPrimary }} />
                                  Image
                                </button>
                                <button type="button" onClick={() => chatVideoInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:opacity-80" style={{ color: palette.textPrimary }}>
                                  <Video size={16} style={{ color: palette.accentPrimary }} />
                                  Video
                                </button>
                                <button type="button" onClick={() => chatFileInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:opacity-80" style={{ color: palette.textPrimary }}>
                                  <FileText size={16} style={{ color: palette.accentPrimary }} />
                                  File
                                </button>
                              </div>
                            )}
                            <input ref={chatImageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleSelectChatAttachment(event, 'image')} />
                            <input ref={chatVideoInputRef} type="file" accept="video/*" className="hidden" onChange={(event) => handleSelectChatAttachment(event, 'video')} />
                            <input ref={chatFileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.txt,.csv,.json,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.html,.css" className="hidden" onChange={(event) => handleSelectChatAttachment(event, 'file')} />
                          </div>
                          <input ref={inputRef} value={chatInput} disabled={isProjectCompleted} onChange={(e) => handleChatInputChange(e.target.value)} placeholder={isProjectCompleted ? 'Discussion is locked for this completed project' : 'Type a message...'}
                            className="flex-1 bg-transparent px-2 text-base outline-none disabled:cursor-not-allowed" style={{ color: palette.textPrimary }} />
                          <div className="relative" ref={chatEmojiRef}>
                            <button type="button" disabled={isProjectCompleted} onClick={() => setChatEmojiOpen(o => !o)} className="flex h-11 w-11 items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:opacity-40" style={{ color: palette.textSecondary }}>
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
                                      <button key={emoji} type="button" onClick={() => { handleChatInputChange(chatInput + emoji); setChatEmojiOpen(false) }}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:scale-110 transition">
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={toggleVoiceRecording} disabled={isSendingVoice || isProjectCompleted} className="flex h-11 w-11 items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:opacity-40" style={{ color: isRecordingVoice ? '#ef4444' : palette.textSecondary }}>
                            <Mic size={18} />
                          </button>
                          {mentionOpen && filteredMentions.length > 0 && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                              <div className="max-h-48 overflow-y-auto rounded-2xl border shadow-2xl" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgTertiary }}>
                                {filteredMentions.map(member => (
                                  <button key={member.email || member.id} type="button"
                                    onClick={() => {
                                      const before = chatInput.slice(0, mentionIndex)
                                      const after = chatInput.slice(mentionIndex).replace(/^@\S*/, `@${member.name || member.email} `)
                                      handleChatInputChange(before + after)
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
                          <button type="submit" disabled={isSendingVoice || isProjectCompleted} className="flex h-11 w-11 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-70" style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
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
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-3">
                    {documentTimeline.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between gap-4 rounded-2xl border p-4"
                        style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={18} className="flex-shrink-0" style={{ color: palette.accentPrimary, opacity: 0.6 }} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: palette.textPrimary }}>{doc.title}</div>
                            <div className="mt-1 text-xs font-semibold truncate" style={{ color: palette.accentPrimary }}>
                              {doc.source === 'Task Submission' ? 'Submitted by' : 'Shared by'}{' '}
                              {doc.ownerName
                                || members.find((member) => String(member.email || '').trim().toLowerCase() === String(doc.ownerEmail || '').trim().toLowerCase())?.name
                                || doc.ownerEmail
                                || 'Unknown member'}
                            </div>
                            <div className="mt-1 text-[10px]" style={{ color: palette.textFaint }}>
                              {formatDateTimeLabel(doc.documentDate, 'Recently added')}
                            </div>
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

                    <div className="rounded-[28px] border p-5" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                      <div className="flex items-center gap-3" style={{ color: palette.accentPrimary }}>
                        <Clock size={18} />
                        <span className="text-xs font-semibold uppercase tracking-[0.28em]">Document Timeline</span>
                      </div>
                      <div className="relative mt-6 space-y-5 pl-7">
                        <div className="absolute bottom-3 left-[12px] top-3 w-px" style={{ backgroundColor: palette.borderSoft }} />
                        {documentTimeline.map((doc, index) => {
                          const ownerLabel =
                            doc.ownerName
                            || members.find((member) => String(member.email || '').trim().toLowerCase() === String(doc.ownerEmail || '').trim().toLowerCase())?.name
                            || doc.ownerEmail
                            || 'Unknown member'

                          return (
                            <div key={`${doc.title}-${index}`} className="relative">
                              <span
                                className="absolute -left-7 top-2 flex h-6 w-6 items-center justify-center rounded-full border"
                                style={{ borderColor: palette.accentBorder, backgroundColor: palette.bgSurface, color: palette.accentPrimary }}>
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary }} />
                              </span>
                              <div className="rounded-2xl border p-4" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                                <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: palette.accentPrimary }}>
                                  {doc.source || 'Document'}
                                </div>
                                <div className="mt-2 text-sm font-bold" style={{ color: palette.textPrimary }}>
                                  {ownerLabel}
                                </div>
                                <div className="mt-1 text-sm" style={{ color: palette.textSecondary }}>
                                  {doc.title}
                                </div>
                                <div className="mt-2 text-xs" style={{ color: palette.textFaint }}>
                                  {formatDateTimeLabel(doc.documentDate, 'Recently added')}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </main>

      {showCompletionCelebration ? (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[4px]" />
          {celebrationConfetti.map((piece) => (
            <motion.div
              key={`confetti-${piece.id}`}
              initial={{ y: -140, x: 0, rotate: 0, opacity: 0 }}
              animate={{ y: '118vh', x: piece.rotate * 0.8, rotate: piece.rotate, opacity: [0, 1, 1, 0.92, 0] }}
              transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeIn' }}
              className="absolute top-[-100px]"
              style={{ left: `${piece.left}%` }}
            >
              <div
                style={{
                  width: `${piece.size}px`,
                  height: `${piece.size * 1.8}px`,
                  borderRadius: `${Math.max(4, piece.size / 2)}px`,
                  background: `linear-gradient(180deg, rgba(255,255,255,0.82), ${piece.color})`,
                  boxShadow: `0 10px 22px ${piece.color}55`,
                }}
              />
            </motion.div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center px-6 py-8">
            <div
              className="flex min-h-[320px] w-full max-w-[860px] flex-col items-center justify-center rounded-[40px] border px-10 py-12 text-center shadow-2xl md:min-h-[360px] md:px-16 md:py-14"
              style={{
                borderColor: 'rgba(255,255,255,0.18)',
                backgroundColor: isDayMode ? 'rgba(255,255,255,0.92)' : 'rgba(10,22,20,0.88)',
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary }}>
                Milestone cleared
              </div>
              <div className="mt-3 type-sectionHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Project completed successfully
              </div>
              <div className="mt-4 max-w-[620px] text-base leading-8 md:text-lg" style={{ color: palette.textSecondary }}>
                Great work — enjoy the celebration first. We&apos;ll move this project into the completed section right after it finishes.
              </div>
              <motion.div
                initial={{ opacity: 0.8, scale: 0.96 }}
                animate={{ opacity: [0.85, 1, 0.9], scale: [0.98, 1.04, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.3em]"
                style={{
                  color: palette.accentPrimary,
                  backgroundColor: `${palette.accentPrimary}14`,
                  border: `1px solid ${palette.accentBorder}`,
                  boxShadow: `0 0 40px ${palette.accentGlow}`,
                }}
              >
                <Sparkles size={15} />
                Celebration in progress
              </motion.div>
            </div>
          </div>
          {celebrationBalloons.map((balloon, index) => (
            <motion.div
              key={`${balloon.left}-${index}`}
              initial={{ y: '110vh', x: 0, opacity: 0 }}
              animate={{ y: '-20vh', x: balloon.drift, opacity: [0, 1, 1, 0.9, 0] }}
              transition={{ duration: 3.2, delay: balloon.delay, ease: 'easeOut' }}
              className="absolute bottom-[-120px]"
              style={{ left: `${balloon.left}%` }}
            >
              <div className="relative flex flex-col items-center">
                <div
                  className="h-20 w-16 rounded-[999px]"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.75), ${balloon.color})`,
                    boxShadow: `0 22px 48px ${balloon.color}66`,
                  }}
                />
                <div className="h-24 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.45)' }} />
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}

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
          <h3 className="mt-2 type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>Create Task</h3>
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
                min={taskStartMinDate}
                max={projectDueInputDate || ''}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }} />
            </div>
            <div>
              <label className="mb-2 block text-sm" style={{ color: palette.textSecondary }}>Target Date</label>
              <input type="date" value={taskForm.targetDate} onChange={(e) => setTaskForm(f => ({ ...f, targetDate: e.target.value }))}
                min={taskTargetMinDate}
                max={projectDueInputDate || ''}
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
        <ModalOverlay onClose={() => setViewTask(null)} maxWidthClassName="max-w-4xl">
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>Task Details</div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>{viewTask.taskName}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${statusBadge(viewTask.status)}`}>
                  {viewTask.status}
                </span>
                <span className="rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em]" style={{ borderColor: palette.borderSoft, color: palette.textMuted }}>
                  {viewTask.taskType || 'General'}
                </span>
              </div>
            </div>
            {(String(viewTask.assignedToEmail || '').trim().toLowerCase() === normalizedUserEmail) && (viewTask.status === 'Pending' || viewTask.status === 'Rework') ? (
              <button
                type="button"
                onClick={() => {
                  setSubmitTask(viewTask)
                  setSubmitNotes('')
                  setSubmitFile(null)
                }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                <Send size={14} />
                Submit work
              </button>
            ) : null}
          </div>
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

          <div className="mt-6 rounded-[24px] border p-5" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
            <div className="flex items-center gap-3" style={{ color: palette.accentPrimary }}>
              <Clock size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">Submission Timeline</span>
            </div>
            <div className="mt-5 space-y-4">
              {isTaskSubmissionsLoading ? (
                <p className="text-sm" style={{ color: palette.textMuted }}>Loading submissions...</p>
              ) : taskSubmissions.length === 0 ? (
                <p className="text-sm" style={{ color: palette.textFaint }}>No work has been submitted for this task yet.</p>
              ) : taskSubmissions.map((sub, index) => (
                <div key={sub.id} className="relative pl-8">
                  {index < taskSubmissions.length - 1 ? (
                    <span className="absolute left-[11px] top-7 bottom-[-22px] w-px" style={{ backgroundColor: palette.borderSoft }} />
                  ) : null}
                  <span
                    className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border"
                    style={{
                      borderColor: sub.status === 'Accepted' || sub.status === 'Completed' ? palette.accentBorder : palette.borderSoft,
                      backgroundColor: palette.bgSurface,
                    }}>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          sub.status === 'Accepted' || sub.status === 'Completed'
                            ? palette.accentPrimary
                            : sub.status === 'Rework'
                              ? '#f59e0b'
                              : '#60a5fa',
                      }}
                    />
                  </span>

                  <div className="rounded-2xl border p-4" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgSurface }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold" style={{ color: palette.textPrimary }}>
                          {sub.submitterName || sub.submittedByEmail || 'Unknown member'}
                        </div>
                        <div className="mt-1 text-xs" style={{ color: palette.textFaint }}>
                          Submitted {formatDateTimeLabel(sub.created_at)}
                          {sub.reviewedAt ? ` · Reviewed ${formatDateTimeLabel(sub.reviewedAt)}` : ''}
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${statusBadge(sub.status)}`}>
                        {sub.status}
                      </span>
                    </div>

                    {sub.notes ? (
                      <div className="mt-3 text-sm leading-6" style={{ color: palette.textSecondary }}>
                        {sub.notes}
                      </div>
                    ) : null}

                    {sub.reviewRemarks ? (
                      <div className="mt-3 rounded-2xl border px-4 py-3" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput }}>
                        <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: palette.accentPrimary }}>
                          {sub.status === 'Rework' ? 'Rework instructions' : 'Review remarks'}
                        </div>
                        <div className="mt-2 text-sm leading-6" style={{ color: palette.textSecondary }}>
                          {sub.reviewRemarks}
                        </div>
                        {sub.reviewedByName || sub.reviewedByEmail ? (
                          <div className="mt-2 text-[11px]" style={{ color: palette.textFaint }}>
                            By {sub.reviewedByName || sub.reviewedByEmail}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {sub.fileUrl ? (
                        <a href={sub.fileUrl} download className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                          style={{ backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                          <Download size={12} /> Download file
                        </a>
                      ) : null}

                      {isOwner && sub.status === 'Review' ? (
                        <>
                          <textarea
                            value={submissionReviewDrafts[sub.id] || ''}
                            onChange={(event) => setSubmissionReviewDrafts((current) => ({ ...current, [sub.id]: event.target.value }))}
                            rows={3}
                            placeholder="Add review remarks or rework instructions..."
                            className="min-h-[84px] w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                            style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                          />
                          <div className="flex w-full flex-wrap justify-end gap-2">
                            <button type="button" onClick={() => reviewWork(sub.id, 'Rework', submissionReviewDrafts[sub.id] || '')} className="rounded-xl px-4 py-2 text-xs font-semibold"
                              style={{ backgroundColor: 'rgba(245,158,11,0.18)', color: isDayMode ? '#b45309' : '#fdba74', border: '1px solid rgba(245,158,11,0.24)' }}>
                              Request rework
                            </button>
                            <button type="button" onClick={() => reviewWork(sub.id, 'Accepted', submissionReviewDrafts[sub.id] || '')} className="rounded-xl px-4 py-2 text-xs font-semibold"
                              style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                              Accept work
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══ SUBMIT WORK ═══ */}
      {submitTask && (
        <ModalOverlay onClose={() => setSubmitTask(null)}>
          <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary, opacity: 0.7 }}>Submit Work</div>
          <h3 className="mt-2 type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>{submitTask.taskName}</h3>
          {latestReworkSubmission?.reviewRemarks ? (
            <div className="mt-4 rounded-2xl border px-4 py-4" style={{ borderColor: 'rgba(245,158,11,0.24)', backgroundColor: isDayMode ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.10)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: isDayMode ? '#b45309' : '#fdba74' }}>
                Latest rework note
              </div>
              <div className="mt-2 text-sm leading-6" style={{ color: palette.textSecondary }}>
                {latestReworkSubmission.reviewRemarks}
              </div>
              <div className="mt-2 text-[11px]" style={{ color: palette.textFaint }}>
                {formatDateTimeLabel(latestReworkSubmission.reviewedAt, 'Recently reviewed')}
              </div>
            </div>
          ) : null}
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
          <h3 className="mt-2 type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>{reviewSubmission.taskName}</h3>
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
          <h3 className="mt-2 type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>Edit Task</h3>
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
            <ModalInput label="Target Date" type="date" value={modifyForm.targetDate || ''} onChange={(v) => setModifyForm(f => ({ ...f, targetDate: v }))} min={modifyTaskTargetMinDate} max={projectDueInputDate || ''} />
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
          <h3 className="mt-2 type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>Update your message</h3>
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
          <h3 className="mt-2 type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>Seen by</h3>
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
          <h3 className="mt-2 type-cardHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>All Pinned Messages</h3>
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

const ModalInput = ({ label, type = 'text', value, onChange, placeholder = '', required = false, min, max }) => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const p = isDayMode ? dayTheme : darkTheme
  return (
    <div>
      <label className="mb-2 block text-sm" style={{ color: p.textSecondary }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} min={min} max={max}
        className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
        style={{ borderColor: p.borderInput, backgroundColor: p.bgSurface, color: p.textPrimary, colorScheme: isDayMode ? 'light' : 'dark' }} />
    </div>
  )
}
