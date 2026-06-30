import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import qubiImg from '../assets/Qubi.png'
import logoImg from '../assets/logo.png'
import qubiWaveVideo from '../assets/QubiWave.webm'
import notificationSound from '../assets/notification.mp3'

const storageKey = 'qsphere_onboarding_profile'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const getProfileAvatar = (profile) => profile?.profileImage || profile?.avatarPreview || ''
const getProfileEmail = (profile) => profile?.emailAddress || profile?.email || ''

const mapNotificationItem = (item) => ({
  id: item.id,
  title: item.title,
  description: item.message,
  time: formatNotificationTime(item.created_at),
  unread: !item.isRead,
  linkUrl: item.linkUrl || item.linkurl || '',
  type: item.type || 'general',
  blogId: item.blogId || item.blogid || null,
  commentId: item.commentId || item.commentid || null,
  groupId: item.groupId || item.groupid || null,
})

const resolveNotificationLink = (notification) => {
  if (notification.type === 'blog_comment' && notification.blogId && notification.commentId) {
    return `/blogs/${notification.blogId}?commentId=${notification.commentId}`
  }

  return notification.linkUrl || ''
}

const formatNotificationTime = (dateValue) => {
  if (!dateValue) return ''

  const timestamp = new Date(dateValue).getTime()
  if (Number.isNaN(timestamp)) return ''

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return new Date(dateValue).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const Navbar = ({ currentPage = 'home', homeBrandRef = null, homeNavFrameRef = null }) => {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile] = useState(readStoredProfile)
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [blogsMenuOpen, setBlogsMenuOpen] = useState(false)
  const [groupsMenuOpen, setGroupsMenuOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantVisible, setAssistantVisible] = useState(false)
  const [assistantWaving, setAssistantWaving] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { id: 1, role: 'assistant', text: 'Hi, I am Qubi, your AI assistant.' },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [typedGreeting, setTypedGreeting] = useState('')
  const typingTimerRef = useRef(null)
  const dropdownRef = useRef(null)
  const notificationsRef = useRef(null)
  const blogsMenuRef = useRef(null)
  const groupsMenuRef = useRef(null)
  const hoverCloseTimerRef = useRef(null)
  const notificationAudioRef = useRef(null)
  const hasLoadedNotificationsRef = useRef(false)
  const hasFetchedNotificationsRef = useRef(false)
  const previousUnreadIdsRef = useRef([])
  const navigate = useNavigate()

  const [showThemeHint, setShowThemeHint] = useState(false)

  // Draggable Qubi avatar state
  const [avatarPos, setAvatarPos] = useState(() => {
    try {
      const saved = localStorage.getItem('qsphere_avatar_position')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0, moved: false, currentX: 0, currentY: 0 })

  // Clamp saved position if window resizes
  useEffect(() => {
    const handleResize = () => {
      setAvatarPos(prev => {
        if (!prev) return null
        const clamped = {
          x: Math.min(prev.x, window.innerWidth - 160),
          y: Math.min(prev.y, window.innerHeight - 200),
        }
        if (clamped.x !== prev.x || clamped.y !== prev.y) {
          localStorage.setItem('qsphere_avatar_position', JSON.stringify(clamped))
          return clamped
        }
        return prev
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isHomePage = currentPage === 'home'
  const isAboutPage = currentPage === 'about'
  const isContactPage = currentPage === 'contact'
  const isBlogPage = currentPage === 'blogs'
  const isGroupsPage = currentPage === 'groups'
  const isThreadsPage = currentPage === 'threads'
  const isEventsPage = currentPage === 'events'
  const isPositionsPage = currentPage === 'positions'
  const isDashboardPage = currentPage === 'dashboard'

  const isLoggedIn = !!profile
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin'
  const isStudent = String(profile?.role || '').toLowerCase() === 'student'
  const profileAvatar = getProfileAvatar(profile)
  const profileEmail = getProfileEmail(profile)
  const unreadNotifications = notifications.filter((item) => item.unread).length
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  useEffect(() => {
    if (theme === 'dark' && !localStorage.getItem('qsphere_theme_hint_seen')) {
      const timer = setTimeout(() => setShowThemeHint(true), 2500)
      const hideTimer = setTimeout(() => {
        setShowThemeHint(false)
        try { localStorage.setItem('qsphere_theme_hint_seen', '1') } catch {}
      }, 12000)
      return () => { clearTimeout(timer); clearTimeout(hideTimer) }
    }
  }, [theme])

  const handleThemeToggle = () => {
    toggleTheme()
    setShowThemeHint(false)
    try { localStorage.setItem('qsphere_theme_hint_seen', '1') } catch {}
  }

  const themeHintBubble = showThemeHint && (
    <div className="absolute right-0 top-full mt-3 w-[240px] rounded-2xl p-3.5 text-sm backdrop-blur-xl shadow-[0_0_24px_rgba(16,185,129,0.3)] animate-in fade-in slide-in-from-top-2 z-[100]" style={{ backgroundColor: palette.bgSecondary, border: `1px solid ${palette.borderPrimary}`, color: palette.textPrimary }}>
      <div className="flex items-start gap-2.5">
        <span className="text-lg leading-none shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.6))' }}>💡</span>
        <span className="font-semibold leading-snug">Too much dark? Try day mode!</span>
      </div>
      <div className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t" style={{ backgroundColor: palette.bgSecondary, borderColor: palette.borderPrimary }}></div>
    </div>
  )

  // Qubi avatar drag handlers
  const handleDragStart = (e) => {
    e.preventDefault()
    const fallback = { x: window.innerWidth - 160, y: window.innerHeight - 200 }
    const currentPos = avatarPos || fallback
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentPos.x,
      posY: currentPos.y,
      moved: false,
      currentX: currentPos.x,
      currentY: currentPos.y,
    }
    setIsDragging(true)
  }

  const handleTouchDragStart = (e) => {
    const touch = e.touches[0]
    if (!touch) return
    const fallback = { x: window.innerWidth - 160, y: window.innerHeight - 200 }
    const currentPos = avatarPos || fallback
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      posX: currentPos.x,
      posY: currentPos.y,
      moved: false,
      currentX: currentPos.x,
      currentY: currentPos.y,
    }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e) => {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      if (!clientX && !clientY) return

      const dx = clientX - dragRef.current.startX
      const dy = clientY - dragRef.current.startY

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true
      }

      const newX = Math.max(0, Math.min(window.innerWidth - 160, dragRef.current.posX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.posY + dy))

      dragRef.current.currentX = newX
      dragRef.current.currentY = newY
      setAvatarPos({ x: newX, y: newY })
    }

    const handleEnd = () => {
      if (dragRef.current.moved) {
        localStorage.setItem('qsphere_avatar_position', JSON.stringify({
          x: dragRef.current.currentX,
          y: dragRef.current.currentY,
        }))
      }
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging])

  const clearHoverCloseTimer = () => {
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
  }

  const scheduleHoverClose = (setter, delay = 180) => {
    clearHoverCloseTimer()
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setter(false)
      hoverCloseTimerRef.current = null
    }, delay)
  }

  // Re-check profile on storage changes (e.g. login/logout in another tab or same tab)
  useEffect(() => {
    const handleStorage = () => setProfile(readStoredProfile())
    window.addEventListener('storage', handleStorage)

    // Also poll briefly in case same-tab writes
    const interval = setInterval(() => {
      const current = readStoredProfile()
      setProfile(prev => {
        const prevStr = prev ? JSON.stringify(prev) : null
        const curStr = current ? JSON.stringify(current) : null
        return prevStr === curStr ? prev : current
      })
    }, 1000)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const email = getProfileEmail(profile)
    if (!email) return

    let isCancelled = false

    const syncProfile = async () => {
      try {
        const res = await fetch(`/api/users/profile/${encodeURIComponent(email)}`)
        if (!res.ok) return

        const user = await res.json()
        if (isCancelled) return

        const mergedProfile = {
          ...profile,
          ...user,
          avatarPreview: user.avatarPreview || user.profileImage || profile?.avatarPreview || '',
          profileImage: user.profileImage || profile?.profileImage || '',
        }

        setProfile((current) => {
          const currentProfile = current || {}
          const nextProfile = {
            ...currentProfile,
            ...mergedProfile,
          }

          const currentStr = JSON.stringify(currentProfile)
          const nextStr = JSON.stringify(nextProfile)
          return currentStr === nextStr ? current : nextProfile
        })

        try {
          localStorage.setItem(storageKey, JSON.stringify(mergedProfile))
        } catch {
          // ignore storage update failures
        }
      } catch {
        // ignore profile refresh failures in navbar
      }
    }

    syncProfile()

    return () => {
      isCancelled = true
    }
  }, [profile])

  useEffect(() => {
    const email = String(profileEmail || '').trim().toLowerCase()
    if (typeof window === 'undefined' || !email) {
      notificationAudioRef.current = null
      return undefined
    }

    const audio = new Audio(notificationSound)
    audio.preload = 'auto'
    notificationAudioRef.current = audio

    return () => {
      audio.pause()
      audio.currentTime = 0

      if (notificationAudioRef.current === audio) {
        notificationAudioRef.current = null
      }
    }
  }, [profileEmail])

  useEffect(() => {
    const email = String(profileEmail || '').trim().toLowerCase()
    hasLoadedNotificationsRef.current = false
    hasFetchedNotificationsRef.current = false
    previousUnreadIdsRef.current = []

    if (!email) {
      setNotifications([])
      return undefined
    }

    let isCancelled = false

    const loadNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications/${encodeURIComponent(email)}`)
        if (!res.ok) return

        const data = await res.json()
        if (isCancelled) return

        hasFetchedNotificationsRef.current = true
        setNotifications(Array.isArray(data) ? data.map(mapNotificationItem) : [])
      } catch {
        if (!isCancelled) {
          hasFetchedNotificationsRef.current = true
          setNotifications([])
        }
      }
    }

    loadNotifications()
    const interval = window.setInterval(loadNotifications, 8000)

    return () => {
      isCancelled = true
      window.clearInterval(interval)
    }
  }, [profileEmail])

  useEffect(() => {
    if (!hasFetchedNotificationsRef.current) return

    const unreadIds = notifications
      .filter((item) => item.unread)
      .map((item) => String(item.id))

    if (!hasLoadedNotificationsRef.current) {
      hasLoadedNotificationsRef.current = true
      previousUnreadIdsRef.current = unreadIds
      return
    }

    const previousUnreadSet = new Set(previousUnreadIdsRef.current)
    const hasNewUnread = unreadIds.some((id) => !previousUnreadSet.has(id))

    if (hasNewUnread && notificationAudioRef.current) {
      notificationAudioRef.current.currentTime = 0
      notificationAudioRef.current.play().catch(() => {})
    }

    previousUnreadIdsRef.current = unreadIds
  }, [notifications])

  useEffect(() => {
    if (!notificationsOpen || !profileEmail) return undefined

    const refreshOnFocus = () => {
      const email = String(profileEmail || '').trim().toLowerCase()
      if (!email) return

      fetch(`/api/notifications/${encodeURIComponent(email)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          setNotifications(Array.isArray(data) ? data.map(mapNotificationItem) : [])
        })
        .catch(() => {})
    }

    window.addEventListener('focus', refreshOnFocus)
    return () => window.removeEventListener('focus', refreshOnFocus)
  }, [notificationsOpen, profileEmail])

  useEffect(() => {
    if (!profile) {
      setAssistantVisible(false)
      setAssistantOpen(false)
      return
    }

    const timer = window.setTimeout(() => {
      setAssistantVisible(true)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [profile])

  const greetingText = 'Hi, I am Qubi, your AI assistant'

  // Typing animation for the hover greeting
  useEffect(() => {
    if (!assistantWaving || assistantOpen) {
      setTypedGreeting('')
      return
    }

    let index = 0
    typingTimerRef.current = setInterval(() => {
      index++
      setTypedGreeting(greetingText.slice(0, index))
      if (index >= greetingText.length) {
        clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
      }
    }, 45)

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
      }
    }
  }, [assistantWaving, assistantOpen])

  // Auto-hide waving after 6.2s
  useEffect(() => {
    if (!assistantWaving) return undefined
    const timer = window.setTimeout(() => setAssistantWaving(false), 6200)
    return () => window.clearTimeout(timer)
  }, [assistantWaving])

  useEffect(() => () => clearHoverCloseTimer(), [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }

      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem(storageKey)
    localStorage.removeItem('qsphere_logged_in')
    localStorage.removeItem('qsphere_email')
    localStorage.removeItem('qsphere_onboarding_profile')
    setProfile(null)
    setDropdownOpen(false)
    setMenuOpen(false)
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Logged out successfully', type: 'error' } }))
    navigate('/')
  }

  const handleAccountManagement = () => {
    if (profile) {
      try {
        localStorage.setItem('qsphere_logged_in', '1')
        localStorage.setItem(storageKey, JSON.stringify(profile))
      } catch {
        // ignore storage sync failures and still navigate
      }
    }

    setDropdownOpen(false)
    setMenuOpen(false)
    navigate('/account', { state: { profile } })
  }

  const handleClearAllNotifications = async () => {
    const email = String(profileEmail || '').trim().toLowerCase()
    if (!email) return

    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(email)}/read-all`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setNotifications((current) => current.map((item) => ({ ...item, unread: false })))
      }
    } catch {
      // Best effort
    }
  }

  const handleNotificationRead = async (notification) => {
    setNotifications((currentNotifications) => currentNotifications.map((item) => (
      item.id === notification.id ? { ...item, unread: false } : item
    )))

    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'PATCH',
      })
    } catch {
      // Keep optimistic UI state even if read sync fails.
    }

    setNotificationsOpen(false)
    const destination = resolveNotificationLink(notification)
    if (destination) {
      navigate(destination)
    }
  }

  const handleAssistantSend = async (event) => {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text) return

    setChatMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text },
    ])
    setChatInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      if (res.ok) {
        setChatMessages((current) => [
          ...current,
          { id: Date.now() + 1, role: 'assistant', text: data.reply }
        ])
      } else {
        setChatMessages((current) => [
          ...current,
          { id: Date.now() + 1, role: 'assistant', text: 'Sorry, I am having trouble connecting to my neural net.' }
        ])
      }
    } catch (err) {
      setChatMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', text: 'Network error. Please try again later.' }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  // Get initials for avatar fallback
  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  // Determine chat panel anchor direction based on avatar position
  // Avatar on right half → right-0 (extends leftward, away from right edge)
  // Avatar on left half → left-0 (extends rightward, away from left edge)
  const chatAlignRight = avatarPos
    ? (avatarPos.x + 70) >= window.innerWidth / 2
    : true // default bottom-right → right-0 (extends leftward)

  const navItemClassName = (active) => active ? 'qs-nav-link qs-nav-link-active relative font-semibold' : 'qs-nav-link font-semibold transition-colors'
  const mobileNavItemClassName = (active) => active ? 'qs-nav-link qs-nav-link-active flex items-center justify-between font-semibold' : 'qs-nav-link font-semibold transition-colors'
  const submenuClassName = 'qs-nav-panel absolute left-1/2 top-full mt-3 w-44 -translate-x-1/2 rounded-2xl p-2 text-left backdrop-blur-2xl transition-all duration-200'
  const navVars = {
    '--qs-nav-shell-bg': isDayMode ? 'rgba(247,247,247,0.88)' : 'rgba(0,0,0,0.70)',
    '--qs-nav-shell-border': isDayMode ? palette.borderPrimary : 'rgba(16,185,129,0.35)',
    '--qs-nav-shell-shadow': isDayMode ? '0 20px 48px rgba(15,23,42,0.08)' : '0 0 36px rgba(16,185,129,0.28)',
    '--qs-nav-text': isDayMode ? palette.textPrimary : 'rgba(255,255,255,0.9)',
    '--qs-nav-text-strong': isDayMode ? palette.textPrimary : '#ffffff',
    '--qs-nav-muted': isDayMode ? palette.textMuted : 'rgba(110,231,183,0.7)',
    '--qs-nav-divider': isDayMode ? palette.borderSoft : 'rgba(255,255,255,0.06)',
    '--qs-nav-accent': palette.accentPrimary,
    '--qs-nav-accent-soft': palette.accentSoft,
    '--qs-nav-accent-border': palette.accentBorder,
    '--qs-nav-accent-strong': isDayMode ? palette.accentDark : palette.accentLight,
    '--qs-nav-dot-shadow': isDayMode ? '0 0 8px rgba(46,197,138,0.45)' : '0 0 8px rgba(16,185,129,0.8)',
    '--qs-nav-button-bg': isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.45)',
    '--qs-nav-button-border': isDayMode ? palette.borderPrimary : 'rgba(16,185,129,0.3)',
    '--qs-nav-button-hover-bg': isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.12)',
    '--qs-nav-button-hover-border': isDayMode ? 'rgba(46,197,138,0.26)' : 'rgba(110,231,183,0.5)',
    '--qs-nav-button-text': isDayMode ? palette.textPrimary : '#a7f3d0',
    '--qs-nav-panel-bg': isDayMode ? 'rgba(255,255,255,0.96)' : '#07120e',
    '--qs-nav-panel-border': isDayMode ? palette.borderPrimary : 'rgba(16,185,129,0.2)',
    '--qs-nav-panel-shadow': isDayMode ? '0 24px 80px -24px rgba(15,23,42,0.16)' : '0 24px 80px -24px rgba(0,0,0,0.95), 0 0 30px rgba(16,185,129,0.12)',
    '--qs-nav-surface': isDayMode ? 'rgba(247,247,245,0.78)' : 'rgba(255,255,255,0.03)',
    '--qs-nav-surface-strong': isDayMode ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.05)',
    '--qs-nav-surface-hover': isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.12)',
    '--qs-nav-mobile-overlay': isDayMode ? 'rgba(250,249,247,0.76)' : 'rgba(0,0,0,0.70)',
    '--qs-nav-mobile-sheet': isDayMode ? 'rgba(255,255,255,0.94)' : 'rgba(0,0,0,0.75)',
    '--qs-nav-mobile-sheet-shadow': isDayMode ? '0 20px 60px rgba(15,23,42,0.12)' : '0 0 40px rgba(16,185,129,0.2)',
  }

  return (
    <div className="qs-nav-theme" style={navVars}>
      {/* Desktop + Tablet Navbar */}
      <div className="fixed left-0 right-0 top-0 z-50 pointer-events-none">
        <div className="pointer-events-auto mx-auto w-full max-w-[90rem] px-6 pt-6">
          <div ref={homeNavFrameRef} className="qs-nav-shell flex items-center justify-between rounded-full border border-emerald-400/35 bg-black/70 px-6 py-4 backdrop-blur-2xl shadow-[0_0_36px_rgba(16,185,129,0.28)]">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <div
                ref={homeBrandRef}
                className="qs-nav-brand text-[1.35rem] font-bold leading-none transition-opacity duration-200"
                style={{ opacity: isHomePage ? 0 : 1, visibility: isHomePage ? 'hidden' : 'visible', marginRight: isHomePage ? '2.5rem' : '0' }}
              >
                <span className="qs-nav-brand-mark">Q</span>
                <span className="qs-nav-brand-rest">Sphere</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className={`type-navText hidden md:flex flex-1 items-center justify-center gap-8`}>
              <Link to="/" className={navItemClassName(isHomePage)}>
                Home
                {isHomePage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              {isLoggedIn && !isAdmin && (
                <Link to="/dashboard" className={navItemClassName(isDashboardPage)}>
                  Dashboard
                  {isDashboardPage && (
                    <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  )}
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link to="/admin" className={navItemClassName(location.pathname === '/admin')}>
                    Admin Dashboard
                    {location.pathname === '/admin' && (
                      <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    )}
                  </Link>
                  <Link to="/admin/users" className={navItemClassName(location.pathname.startsWith('/admin/users'))}>
                    Users
                    {location.pathname.startsWith('/admin/users') && (
                      <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    )}
                  </Link>
                  <Link to="/admin/blog-management" className={navItemClassName(location.pathname.startsWith('/admin/blog-management'))}>
                    Blog Management
                    {location.pathname.startsWith('/admin/blog-management') && (
                      <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    )}
                  </Link>
                </>
              )}
              {!isAdmin && (
              <div
                ref={blogsMenuRef}
                className="relative"
                onMouseEnter={() => {
                  clearHoverCloseTimer()
                  setBlogsMenuOpen(true)
                }}
                onMouseLeave={() => scheduleHoverClose(setBlogsMenuOpen)}
              >
                <Link to="/blogs" className={navItemClassName(isBlogPage)}>
                  Blogs
                  {isBlogPage && (
                    <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  )}
                </Link>
                {isLoggedIn && !isAdmin ? (
                  <div
                    className={`${submenuClassName} ${blogsMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                    onMouseEnter={() => clearHoverCloseTimer()}
                    onMouseLeave={() => scheduleHoverClose(setBlogsMenuOpen)}
                  >
                    <Link
                      to="/blogs/new"
                      className="qs-nav-submenu-item flex items-center justify-between rounded-xl px-3 py-2 text-[11px] tracking-[0.18em] text-white/75 transition hover:bg-emerald-500/10 hover:text-emerald-200"
                      onClick={() => setBlogsMenuOpen(false)}
                    >
                      <span>Add Blog</span>
                      <span className="text-emerald-300">+</span>
                    </Link>
                  </div>
                ) : null}
              </div>
              )}
              {!isAdmin && (
              <div
                ref={groupsMenuRef}
                className="relative"
                onMouseEnter={() => {
                  clearHoverCloseTimer()
                  setGroupsMenuOpen(true)
                }}
                onMouseLeave={() => scheduleHoverClose(setGroupsMenuOpen)}
              >
                <Link to="/groups" className={navItemClassName(isGroupsPage)}>
                  Groups
                  {isGroupsPage && (
                    <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  )}
                </Link>
                {isLoggedIn && !isAdmin && !isStudent ? (
                  <div
                    className={`${submenuClassName} ${groupsMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                    onMouseEnter={() => clearHoverCloseTimer()}
                    onMouseLeave={() => scheduleHoverClose(setGroupsMenuOpen)}
                  >
                    <Link
                      to="/groups/new"
                      className="qs-nav-submenu-item flex items-center justify-between rounded-xl px-3 py-2 text-[11px] tracking-[0.18em] text-white/75 transition hover:bg-emerald-500/10 hover:text-emerald-200"
                      onClick={() => setGroupsMenuOpen(false)}
                    >
                      <span>Add Group</span>
                      <span className="text-emerald-300">+</span>
                    </Link>
                  </div>
                ) : null}
              </div>
              )}
              {!isAdmin && (
              <Link to="/threads" className={navItemClassName(isThreadsPage)}>
                Threads
                {isThreadsPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              )}
              {!isAdmin && (
              <Link to="/events" className={navItemClassName(isEventsPage)}>
                Events
                {isEventsPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              )}
              {!isAdmin && (
              <Link to="/positions" className={navItemClassName(isPositionsPage)}>
                Positions
                {isPositionsPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              )}
              <Link to="/about" className={navItemClassName(isAboutPage)}>
                About
                {isAboutPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/contact" className={navItemClassName(isContactPage)}>
                Contact
                {isContactPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
            </nav>

            {/* CTA / Profile Avatar + Menu Button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {isLoggedIn ? (
                /* ── Logged-in: Profile Avatar with hover dropdown ── */
                <div className="flex items-center gap-2">
                  {/* Theme Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleThemeToggle}
                      className="qs-nav-icon-button relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 hover:shadow-[0_0_18px_rgba(16,185,129,0.2)]"
                      style={{ borderColor: isDayMode ? palette.borderPrimary : 'rgba(16,185,129,0.3)', backgroundColor: isDayMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)', color: isDayMode ? palette.textSecondary : '#a7f3d0' }}
                      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                      {theme === 'dark' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2" />
                          <path d="M12 20v2" />
                          <path d="m4.93 4.93 1.41 1.41" />
                          <path d="m17.66 17.66 1.41 1.41" />
                          <path d="M2 12h2" />
                          <path d="M20 12h2" />
                          <path d="m6.34 17.66-1.41 1.41" />
                          <path d="m19.07 4.93-1.41 1.41" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                      )}
                    </button>
                    {themeHintBubble}
                  </div>
                  <div ref={notificationsRef} className="relative">
                    <button
                      type="button"
                      className="qs-nav-icon-button relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 hover:shadow-[0_0_18px_rgba(16,185,129,0.2)]"
                      style={{ borderColor: isDayMode ? palette.borderPrimary : 'rgba(16,185,129,0.3)', backgroundColor: isDayMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)', color: isDayMode ? palette.textSecondary : '#a7f3d0' }}
                      aria-label="Notifications"
                      title="Notifications"
                      aria-haspopup="dialog"
                      aria-expanded={notificationsOpen}
                      onClick={async () => {
                        const nextOpen = !notificationsOpen
                        if (nextOpen && profileEmail) {
                          try {
                            const res = await fetch(`/api/notifications/${encodeURIComponent(String(profileEmail).trim().toLowerCase())}`)
                            if (res.ok) {
                              const data = await res.json()
                              setNotifications(Array.isArray(data) ? data.map(mapNotificationItem) : [])
                            }
                          } catch {
                            // ignore notification refresh failures on open
                          }
                        }
                        setNotificationsOpen(nextOpen)
                        setDropdownOpen(false)
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                        <path d="M10 21a2 2 0 0 0 4 0" />
                      </svg>
                      {unreadNotifications > 0 ? (
                        <>
                          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-400 px-1 text-[10px] font-bold text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                            {unreadNotifications}
                          </span>
                        </>
                      ) : null}
                    </button>

                    <div
                      className={`qs-nav-panel absolute right-0 top-full mt-2 w-[min(92vw,360px)] overflow-hidden rounded-[26px] border backdrop-blur-2xl transition-all duration-200 origin-top-right ${
                        notificationsOpen
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                      }`}
                      style={{ zIndex: 999, borderColor: isDayMode ? palette.borderPrimary : 'rgba(16,185,129,0.2)', backgroundColor: isDayMode ? 'rgba(255,255,255,0.97)' : '#07120e', boxShadow: isDayMode ? palette.shadowDropdown : '0 24px 80px -24px rgba(0,0,0,0.95), 0 0 30px rgba(16,185,129,0.12)' }}
                    >
                      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${isDayMode ? palette.borderPrimary : 'rgba(255,255,255,0.06)'}` }}>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Notifications</div>
                          <div className="mt-1 text-sm font-semibold" style={{ color: palette.textPrimary }}>Recent activity</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadNotifications > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={handleClearAllNotifications}
                                className="text-[11px] font-medium tracking-[0.04em] transition"
                                style={{ color: palette.accentPrimary }}
                              >
                                Clear all
                              </button>
                              <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                                {unreadNotifications} new
                              </span>
                            </>
                          ) : (
                            <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? palette.bgInput : 'rgba(255,255,255,0.05)', color: palette.textMuted }}>
                              All caught up
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto p-2" style={{ backgroundColor: isDayMode ? 'rgba(255,255,255,0.97)' : '#07120e' }}>
                        {notifications.length === 0 ? (
                          <div className="rounded-2xl px-4 py-5 text-sm" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? palette.bgInput : 'rgba(255,255,255,0.03)', color: palette.textSecondary }}>
                            No notifications yet.
                          </div>
                        ) : notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNotificationRead(item)}
                            className="flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition"
                            style={{ borderColor: isDayMode ? palette.borderPrimary : 'rgba(255,255,255,0.05)', backgroundColor: isDayMode ? palette.bgSurface : 'rgba(255,255,255,0.03)' }}
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border" style={{ borderColor: item.unread ? palette.accentBorder : palette.borderPrimary, backgroundColor: item.unread ? palette.accentSoft : (isDayMode ? palette.bgInput : 'rgba(255,255,255,0.06)'), color: item.unread ? palette.accentPrimary : palette.textMuted }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3a6 6 0 0 0-6 6v3.2a2 2 0 0 1-.6 1.4L4 15h16l-1.4-1.4a2 2 0 0 1-.6-1.4V9a6 6 0 0 0-6-6Z" />
                              </svg>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold" style={{ color: palette.textPrimary }}>{item.title}</span>
                                {item.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" /> : null}
                              </span>
                              <span className="mt-1 block text-sm leading-5" style={{ color: palette.textSecondary }}>{item.description}</span>
                              <span className="mt-2 block text-[11px] uppercase tracking-[0.18em]" style={{ color: palette.accentPrimary }}>{item.time}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    ref={dropdownRef}
                    className="relative"
                    onMouseEnter={() => {
                      clearHoverCloseTimer()
                      setDropdownOpen(true)
                    }}
                    onMouseLeave={() => scheduleHoverClose(setDropdownOpen)}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-2.5 rounded-full border pl-1.5 pr-4 py-1.5 transition-all duration-300"
                      style={{ borderColor: isDayMode ? palette.accentPrimary : 'rgba(16,185,129,0.4)', backgroundColor: isDayMode ? palette.accentPrimary : 'rgba(16,185,129,0.15)' }}
                      onClick={() => {
                        setNotificationsOpen(false)
                        setDropdownOpen(prev => !prev)
                      }}
                      aria-haspopup="true"
                      aria-expanded={dropdownOpen}
                    >
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: isDayMode ? 'rgba(255,255,255,0.3)' : 'rgba(16,185,129,0.3)', backgroundColor: isDayMode ? 'rgba(255,255,255,0.2)' : 'rgba(16,185,129,0.2)' }}>
                        {profileAvatar ? (
                          <img
                            src={profileAvatar}
                            alt={`${profile.fullName || 'User'} avatar`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] font-bold leading-none" style={{ color: '#fff' }}>{initials}</span>
                        )}
                      </div>
                      <span className="hidden sm:block text-[11px] tracking-[0.12em] font-semibold max-w-[100px] truncate" style={{ color: '#fff' }}>
                        {profile.fullName || 'Profile'}
                      </span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                        style={{ color: isDayMode ? '#fff' : 'rgba(110,231,183,0.7)' }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    <div
                      className={`qs-nav-panel absolute right-0 top-full mt-2 w-56 rounded-2xl border backdrop-blur-2xl overflow-hidden transition-all duration-200 origin-top-right ${
                        dropdownOpen
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                      }`}
                      style={{ zIndex: 999, borderColor: isDayMode ? palette.borderPrimary : 'rgba(16,185,129,0.2)', backgroundColor: isDayMode ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.9)', boxShadow: isDayMode ? palette.shadowDropdown : '0 20px 60px -15px rgba(0,0,0,0.9), 0 0 30px rgba(16,185,129,0.12)' }}
                      onMouseEnter={() => clearHoverCloseTimer()}
                      onMouseLeave={() => scheduleHoverClose(setDropdownOpen)}
                    >
                      {/* User info header */}
                      <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${isDayMode ? palette.borderPrimary : 'rgba(255,255,255,0.06)'}` }}>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold truncate" style={{ color: palette.textPrimary }}>{profile.fullName || 'Explorer'}</div>
                          {isAdmin && (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] mt-0.5 truncate" style={{ color: palette.accentPrimary }}>{getProfileEmail(profile) || 'Community member'}</div>
                      </div>

                      {/* Menu items */}
                      <div className="py-1.5">
                        <button
                          type="button"
                          onClick={handleAccountManagement}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: palette.textSecondary }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          Account Management
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="py-1.5" style={{ borderTop: `1px solid ${isDayMode ? palette.borderPrimary : 'rgba(255,255,255,0.06)'}` }}>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: isDayMode ? '#dc2626' : 'rgba(248,113,113,0.8)' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Log Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Not logged-in: Theme toggle + Join Community button ── */
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleThemeToggle}
                      className="qs-nav-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 transition-all duration-300 hover:border-emerald-300/50 hover:bg-emerald-500/12 hover:text-emerald-200 hover:shadow-[0_0_18px_rgba(16,185,129,0.2)]"
                      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                      {theme === 'dark' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2" />
                          <path d="M12 20v2" />
                          <path d="m4.93 4.93 1.41 1.41" />
                          <path d="m17.66 17.66 1.41 1.41" />
                          <path d="M2 12h2" />
                          <path d="M20 12h2" />
                          <path d="m6.34 17.66-1.41 1.41" />
                          <path d="m19.07 4.93-1.41 1.41" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                      )}
                    </button>
                    {themeHintBubble}
                  </div>
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold tracking-wide text-white transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95"
                    style={{ backgroundColor: palette.accentPrimary, boxShadow: isDayMode ? '0 10px 25px -5px rgba(16,185,129,0.3)' : '0 0 22px rgba(16,185,129,0.35)' }}
                  >
                    Join Community
                    <span className="flex items-center justify-center text-white transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                    className="qs-nav-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 hover:bg-white/20 transition-colors md:hidden"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-haspopup="dialog"
                onClick={() => setMenuOpen(true)}
              >
                <div className="space-y-1.5">
                  <span className="block h-0.5 w-4 bg-white/80" />
                  <span className="block h-0.5 w-4 bg-white/80" />
                  <span className="block h-0.5 w-4 bg-white/80" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Draggable Floating Qubi Assistant */}
      {isLoggedIn && assistantVisible ? (
        <div
          className="z-[70]"
          style={{
            position: 'fixed',
            ...(avatarPos
              ? { top: avatarPos.y, left: avatarPos.x }
              : { bottom: '1.25rem', right: '1.25rem' }
            ),
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {assistantOpen ? (
            <div className={`absolute bottom-[150px] ${chatAlignRight ? 'right-0' : 'left-0'} w-[min(92vw,320px)] overflow-hidden rounded-[28px] backdrop-blur-2xl`}
              style={{
                border: `1px solid ${isDayMode ? palette.borderPrimary : 'rgba(16,185,129,0.20)'}`,
                backgroundColor: isDayMode ? palette.bgTertiary : 'rgba(0,0,0,0.90)',
                boxShadow: isDayMode ? palette.shadowCard : '0_25px_80px_-24px_rgba(0,0,0,0.95),0_0_40px_rgba(16,185,129,0.18)',
              }}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${isDayMode ? palette.borderSoft : 'rgba(255,255,255,0.06)'}` }}>
                <div>
                  <div className="text-xs uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentPrimary : 'rgba(110,231,183,0.70)' }}>Qubi Assistant</div>
                  <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>Ask me anything</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChatMessages([{ id: Date.now(), role: 'assistant', text: 'Hi, I am Qubi, your AI assistant.' }])}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={{
                      border: `1px solid ${isDayMode ? palette.borderPrimary : 'rgba(255,255,255,0.10)'}`,
                      backgroundColor: isDayMode ? palette.bgSurfaceHover : 'rgba(255,255,255,0.05)',
                      color: isDayMode ? palette.textMuted : 'rgba(255,255,255,0.70)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = isDayMode ? palette.bgInput : 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = palette.textPrimary }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = isDayMode ? palette.bgSurfaceHover : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = isDayMode ? palette.textMuted : 'rgba(255,255,255,0.70)' }}
                    aria-label="New chat"
                    title="New Chat"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssistantOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={{
                      border: `1px solid ${isDayMode ? palette.borderPrimary : 'rgba(255,255,255,0.10)'}`,
                      backgroundColor: isDayMode ? palette.bgSurfaceHover : 'rgba(255,255,255,0.05)',
                      color: isDayMode ? palette.textMuted : 'rgba(255,255,255,0.70)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = isDayMode ? palette.bgInput : 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = palette.textPrimary }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = isDayMode ? palette.bgSurfaceHover : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = isDayMode ? palette.textMuted : 'rgba(255,255,255,0.70)' }}
                    aria-label="Close assistant"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6"
                      style={message.role === 'user' ? { backgroundColor: palette.accentPrimary, color: '#000' } : { border: `1px solid ${isDayMode ? palette.accentBorder : 'rgba(255,255,255,0.06)'}`, backgroundColor: isDayMode ? palette.bgInput : 'rgba(255,255,255,0.05)', color: palette.textSecondary }}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 flex items-center gap-1.5"
                      style={{
                        border: `1px solid ${isDayMode ? palette.borderSoft : 'rgba(255,255,255,0.06)'}`,
                        backgroundColor: isDayMode ? palette.bgInput : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]" style={{ backgroundColor: isDayMode ? palette.accentPrimary : 'rgba(255,255,255,0.50)', animationDelay: '-0.32s' }} />
                      <span className="h-1.5 w-1.5 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]" style={{ backgroundColor: isDayMode ? palette.accentPrimary : 'rgba(255,255,255,0.50)', animationDelay: '-0.16s' }} />
                      <span className="h-1.5 w-1.5 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]" style={{ backgroundColor: isDayMode ? palette.accentPrimary : 'rgba(255,255,255,0.50)' }} />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAssistantSend} className="p-3" style={{ borderTop: `1px solid ${isDayMode ? palette.borderSoft : 'rgba(255,255,255,0.06)'}` }}>
                <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ border: `1px solid ${isDayMode ? palette.borderPrimary : 'rgba(255,255,255,0.10)'}`, backgroundColor: isDayMode ? palette.bgInput : 'rgba(0,0,0,0.40)' }}>
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    type="text"
                    placeholder="Write a message..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    style={{ color: palette.textPrimary }}
                  />
                  <button
                    type="submit"
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                    style={{ backgroundColor: palette.accentPrimary, color: '#000' }}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (!dragRef.current.moved) {
                setAssistantOpen((current) => !current)
              }
              dragRef.current.moved = false
            }}
            onDoubleClick={() => {
              setAvatarPos(null)
              localStorage.removeItem('qsphere_avatar_position')
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleTouchDragStart}
            className="group relative flex h-[140px] w-[140px] items-end justify-end rounded-none bg-transparent p-0 shadow-none backdrop-blur-0 transition"
            aria-label="Open Qubi assistant"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {assistantWaving && !assistantOpen ? (
              <span className="absolute bottom-[118px] left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-center text-[11px] leading-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                style={{
                  backgroundColor: isDayMode ? palette.bgSurface : 'rgba(16,185,129,0.08)',
                  border: `1px solid ${isDayMode ? palette.accentBorder : 'rgba(16,185,129,0.15)'}`,
                  color: isDayMode ? palette.textPrimary : '#ecfdf5',
                }}
              >
                <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b"
                  style={{
                    borderColor: isDayMode ? palette.accentBorder : 'rgba(16,185,129,0.10)',
                    backgroundColor: isDayMode ? palette.bgSurface : 'rgba(16,185,129,0.08)',
                  }}
                />
                <span className="block font-medium min-w-[60px]">
                  {typedGreeting}
                  <span className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-pulse"
                    style={{ backgroundColor: isDayMode ? palette.accentPrimary : 'rgba(110,231,183,0.7)' }}
                  />
                </span>
              </span>
            ) : null}

            <span
              className="absolute bottom-0 right-0 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-transparent shadow-none"
              onMouseEnter={() => setAssistantWaving(true)}
              onMouseLeave={() => setAssistantWaving(false)}
            >
              {assistantWaving ? (
                <video
                  src={qubiWaveVideo}
                  autoPlay
                  muted
                  playsInline
                  loop
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src={qubiImg} alt="Qubi assistant" className="h-full w-full object-cover" />
              )}
            </span>
          </button>
        </div>
      ) : null}

      {/* Mobile Navigation */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="qs-nav-mobile-overlay absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            className="qs-nav-mobile-sheet absolute right-4 top-4 bottom-4 flex w-[min(90vw,360px)] flex-col rounded-3xl border border-emerald-400/25 bg-black/75 p-6 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="qs-nav-mobile-logo flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-emerald-400/30 bg-black/40 shadow-[0_0_18px_rgba(16,185,129,0.35)]">
                  <img src={logoImg} alt="QSphere logo" className="h-full w-full object-contain p-1" />
                </div>
                <div className="qs-nav-brand text-[1.18rem] font-bold leading-none">
                  <span className="qs-nav-brand-mark">Q</span>
                  <span className="qs-nav-brand-rest">Sphere</span>
                </div>
              </div>
              <button
                type="button"
                className="qs-nav-icon-button inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/90 hover:bg-white/20 transition-colors"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <span className="text-lg leading-none">x</span>
              </button>
            </div>

            {/* Mobile user info (when logged in) */}
            {isLoggedIn && (
              <div className="qs-nav-mobile-user mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] px-4 py-3">
                <div className="qs-nav-mobile-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-emerald-400/30 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="qs-nav-mobile-initials text-xs font-bold text-emerald-200">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="qs-nav-mobile-name text-sm font-semibold text-white truncate">{profile.fullName || 'Explorer'}</div>
                    {isAdmin && (
                      <span className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] bg-emerald-500/20 text-emerald-300">Admin</span>
                    )}
                  </div>
                  <div className="qs-nav-mobile-email text-[11px] text-emerald-300/60 truncate">{getProfileEmail(profile) || 'Member'}</div>
                </div>
              </div>
            )}

            <nav className="font-heading mt-8 flex flex-col gap-5 text-[1.05rem] tracking-[0.06em]">
              <Link to="/" className={mobileNavItemClassName(isHomePage)} onClick={() => setMenuOpen(false)}>
                Home
                {isHomePage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              {!isAdmin && (
              <Link to="/blogs" className={mobileNavItemClassName(isBlogPage)} onClick={() => setMenuOpen(false)}>
                Blogs
                {isBlogPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              )}
              {!isAdmin && (
              <Link to="/groups" className={mobileNavItemClassName(isGroupsPage)} onClick={() => setMenuOpen(false)}>
                Groups
                {isGroupsPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              )}
              {!isAdmin && (
              <Link to="/threads" className={mobileNavItemClassName(isThreadsPage)} onClick={() => setMenuOpen(false)}>
                Threads
                {isThreadsPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              )}
              {!isAdmin && (
              <Link to="/events" className={mobileNavItemClassName(isEventsPage)} onClick={() => setMenuOpen(false)}>
                Events
                {isEventsPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              )}
              {!isAdmin && (
              <Link to="/positions" className={mobileNavItemClassName(isPositionsPage)} onClick={() => setMenuOpen(false)}>
                Positions
                {isPositionsPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              )}
              <Link to="/about" className={mobileNavItemClassName(isAboutPage)} onClick={() => setMenuOpen(false)}>
                About
                {isAboutPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/contact" className={mobileNavItemClassName(isContactPage)} onClick={() => setMenuOpen(false)}>
                Contact
                {isContactPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              {isLoggedIn && !isAdmin && (
                <Link to="/dashboard" className={mobileNavItemClassName(isDashboardPage)} onClick={() => setMenuOpen(false)}>
                  Dashboard
                  {isDashboardPage && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  )}
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link to="/admin" className={mobileNavItemClassName(location.pathname === '/admin')} onClick={() => setMenuOpen(false)}>
                    Admin Dashboard
                    {location.pathname === '/admin' && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    )}
                  </Link>
                  <Link to="/admin/users" className={mobileNavItemClassName(location.pathname.startsWith('/admin/users'))} onClick={() => setMenuOpen(false)}>
                    Users
                    {location.pathname.startsWith('/admin/users') && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    )}
                  </Link>
                  <Link to="/admin/blog-management" className={mobileNavItemClassName(location.pathname.startsWith('/admin/blog-management'))} onClick={() => setMenuOpen(false)}>
                    Blog Management
                    {location.pathname.startsWith('/admin/blog-management') && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    )}
                  </Link>
                </>
              )}

              {/* Mobile-only: Account, Logout when logged in */}
              {isLoggedIn && (
                <>
                  <div className="my-1 h-px" style={{ background: 'var(--qs-nav-divider)' }} />
                  <button type="button" onClick={handleAccountManagement} className="qs-nav-link text-left font-semibold transition-colors">
                    Account Management
                  </button>
                  <button type="button" onClick={handleLogout} className="text-left font-semibold text-red-400/80 hover:text-red-400 transition-colors">
                    Log Out
                  </button>
                </>
              )}

              {/* Mobile-only: Theme Toggle */}
              <div className="my-1 h-px" style={{ background: 'var(--qs-nav-divider)' }} />
              <button
                type="button"
                onClick={toggleTheme}
                className="qs-nav-link flex items-center gap-3 font-semibold transition-colors"
              >
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                )}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </nav>

            <div className="mt-auto pt-8">
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="qs-nav-cta inline-flex w-full items-center justify-between rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-[12px] tracking-[0.2em] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Go to Dashboard
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/20 text-emerald-200">
                    →
                  </span>
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="qs-nav-cta inline-flex w-full items-center justify-between rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-[12px] tracking-[0.2em] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Join Community
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/20 text-emerald-200">
                    →
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .qs-nav-theme .qs-nav-shell {
          border-color: var(--qs-nav-shell-border) !important;
          background: var(--qs-nav-shell-bg) !important;
          box-shadow: var(--qs-nav-shell-shadow) !important;
        }

        .qs-nav-theme .qs-nav-brand {
          display: inline-flex;
          align-items: baseline;
          gap: 0.04em;
          font-family: var(--font-heading);
          letter-spacing: -0.04em;
          text-transform: none;
        }

        .qs-nav-theme .qs-nav-brand-mark {
          color: var(--qs-nav-accent) !important;
          text-shadow: ${isDayMode ? '0 8px 24px rgba(46,197,138,0.12)' : '0 0 24px rgba(16,185,129,0.22)'};
        }

        .qs-nav-theme .qs-nav-brand-rest {
          color: ${isDayMode ? '#0A1620' : '#ffffff'} !important;
        }

        .qs-nav-theme .qs-nav-link {
          color: var(--qs-nav-text) !important;
        }

        .qs-nav-theme .qs-nav-link:hover,
        .qs-nav-theme .qs-nav-link-active {
          color: var(--qs-nav-accent-strong) !important;
        }

        .qs-nav-theme .qs-nav-panel {
          border-color: var(--qs-nav-panel-border) !important;
          background: var(--qs-nav-panel-bg) !important;
          box-shadow: var(--qs-nav-panel-shadow) !important;
        }

        .qs-nav-theme .qs-nav-submenu-item,
        .qs-nav-theme .qs-nav-menu-item {
          color: var(--qs-nav-text) !important;
        }

        .qs-nav-theme .qs-nav-submenu-item:hover,
        .qs-nav-theme .qs-nav-menu-item:hover {
          background: var(--qs-nav-surface-hover) !important;
          color: var(--qs-nav-accent-strong) !important;
        }

        .qs-nav-theme .qs-nav-icon-button {
          border-color: var(--qs-nav-button-border) !important;
          background: var(--qs-nav-button-bg) !important;
          color: var(--qs-nav-button-text) !important;
        }

        .qs-nav-theme .qs-nav-icon-button:hover {
          border-color: var(--qs-nav-button-hover-border) !important;
          background: var(--qs-nav-button-hover-bg) !important;
        }

        .qs-nav-theme .qs-nav-cta {
          border-color: var(--qs-nav-accent-border) !important;
          background: var(--qs-nav-accent-soft) !important;
          color: var(--qs-nav-accent-strong) !important;
          box-shadow: ${isDayMode ? '0 20px 40px rgba(30,158,107,0.14)' : '0 0 22px rgba(16,185,129,0.35)'} !important;
        }

        .qs-nav-theme .qs-nav-mobile-overlay {
          background: var(--qs-nav-mobile-overlay) !important;
        }

        .qs-nav-theme .qs-nav-mobile-sheet {
          border-color: var(--qs-nav-panel-border) !important;
          background: var(--qs-nav-mobile-sheet) !important;
          box-shadow: var(--qs-nav-mobile-sheet-shadow) !important;
        }

        .qs-nav-theme .qs-nav-mobile-logo,
        .qs-nav-theme .qs-nav-mobile-avatar {
          border-color: var(--qs-nav-accent-border) !important;
          background: var(--qs-nav-accent-soft) !important;
          box-shadow: none !important;
        }

        .qs-nav-theme .qs-nav-mobile-initials,
        .qs-nav-theme .qs-nav-mobile-email {
          color: var(--qs-nav-accent-strong) !important;
        }

        .qs-nav-theme .qs-nav-mobile-name {
          color: var(--qs-nav-text-strong) !important;
        }
      `}</style>
    </div>
  )
}

export default Navbar
