import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import qubiImg from '../assets/Qubi.png'
import qubiWaveVideo from '../assets/QubiWave.webm'

const storageKey = 'qsphere_onboarding_profile'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const Navbar = ({ currentPage = 'home', homeBrandRef = null }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile] = useState(readStoredProfile)
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
  const dropdownRef = useRef(null)
  const blogsMenuRef = useRef(null)
  const groupsMenuRef = useRef(null)
  const hoverCloseTimerRef = useRef(null)
  const navigate = useNavigate()

  const isHomePage = currentPage === 'home'
  const isAboutPage = currentPage === 'about'
  const isContactPage = currentPage === 'contact'
  const isBlogPage = currentPage === 'blogs'
  const isGroupsPage = currentPage === 'groups'

  const isLoggedIn = !!profile

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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem(storageKey)
    localStorage.removeItem('qsphere_logged_in')
    setProfile(null)
    setDropdownOpen(false)
    setMenuOpen(false)
    navigate('/')
  }

  const handleAccountManagement = () => {
    setDropdownOpen(false)
    setMenuOpen(false)
    navigate('/account', { state: { profile } })
  }

  const handleAssistantSend = (event) => {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text) return

    setChatMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text },
      { id: Date.now() + 1, role: 'assistant', text: 'AI replies will be connected here once you share the API.' },
    ])
    setChatInput('')
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

  const navItemClassName = (active) => active ? 'relative text-emerald-200' : 'hover:text-emerald-200 transition-colors'
  const submenuClassName = 'absolute left-1/2 top-full mt-3 w-44 -translate-x-1/2 rounded-2xl border border-emerald-400/20 bg-black/90 p-2 text-left shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-all duration-200'

  return (
    <>
      {/* Desktop + Tablet Navbar */}
      <div className="fixed left-0 right-0 top-0 z-50 pointer-events-none">
        <div className="pointer-events-auto mx-auto w-full max-w-7xl px-6 pt-6">
          <div className="flex items-center justify-between rounded-full border border-emerald-400/35 bg-black/70 px-5 py-3.5 backdrop-blur-2xl shadow-[0_0_36px_rgba(16,185,129,0.28)]">
            {/* Logo */}
            <div className="flex items-center">
              <div
                ref={homeBrandRef}
                className="text-[10px] tracking-[0.34em] font-semibold text-emerald-100 transition-opacity duration-200"
                style={{ opacity: isHomePage ? 0 : 1, visibility: isHomePage ? 'hidden' : 'visible' }}
              >
                QSPHERE
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-10 text-[13px] tracking-[0.2em] text-white/90">
              <Link to="/" className={isHomePage ? "relative text-emerald-200" : "hover:text-emerald-200 transition-colors"}>
                Home
                {isHomePage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
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
                {isLoggedIn ? (
                  <div
                    className={`${submenuClassName} ${blogsMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                    onMouseEnter={() => clearHoverCloseTimer()}
                    onMouseLeave={() => scheduleHoverClose(setBlogsMenuOpen)}
                  >
                    <Link
                      to="/blogs/new"
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] tracking-[0.18em] text-white/75 transition hover:bg-emerald-500/10 hover:text-emerald-200"
                      onClick={() => setBlogsMenuOpen(false)}
                    >
                      <span>Add Blog</span>
                      <span className="text-emerald-300">+</span>
                    </Link>
                  </div>
                ) : null}
              </div>
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
                {isLoggedIn ? (
                  <div
                    className={`${submenuClassName} ${groupsMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                    onMouseEnter={() => clearHoverCloseTimer()}
                    onMouseLeave={() => scheduleHoverClose(setGroupsMenuOpen)}
                  >
                    <Link
                      to="/groups/new"
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] tracking-[0.18em] text-white/75 transition hover:bg-emerald-500/10 hover:text-emerald-200"
                      onClick={() => setGroupsMenuOpen(false)}
                    >
                      <span>Add Group</span>
                      <span className="text-emerald-300">+</span>
                    </Link>
                  </div>
                ) : null}
              </div>
              <Link to="/about" className={isAboutPage ? "relative text-emerald-200" : "hover:text-emerald-200 transition-colors"}>
                About
                {isAboutPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/contact" className={isContactPage ? "relative text-emerald-200" : "hover:text-emerald-200 transition-colors"}>
                Contact
                {isContactPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
            </nav>

            {/* CTA / Profile Avatar + Menu Button */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                /* ── Logged-in: Profile Avatar with hover dropdown ── */
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
                    className="flex items-center gap-2.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 pl-1.5 pr-4 py-1.5 transition-all duration-300 hover:bg-emerald-500/25 hover:shadow-[0_0_22px_rgba(16,185,129,0.35)]"
                    onClick={() => setDropdownOpen(prev => !prev)}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-emerald-400/30 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                      {profile.avatarPreview ? (
                        <img
                          src={profile.avatarPreview}
                          alt={`${profile.fullName || 'User'} avatar`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-200 leading-none">{initials}</span>
                      )}
                    </div>
                    <span className="hidden sm:block text-[11px] tracking-[0.12em] font-semibold text-emerald-100 max-w-[100px] truncate">
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
                      className={`text-emerald-300/70 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  <div
                    className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border border-emerald-400/20 bg-black/90 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.12)] overflow-hidden transition-all duration-200 origin-top-right ${
                      dropdownOpen
                        ? 'opacity-100 scale-100 pointer-events-auto'
                        : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                    style={{ zIndex: 999 }}
                    onMouseEnter={() => clearHoverCloseTimer()}
                    onMouseLeave={() => scheduleHoverClose(setDropdownOpen)}
                  >
                    {/* User info header */}
                    <div className="px-4 py-3.5 border-b border-white/[0.06]">
                      <div className="text-sm font-semibold text-white truncate">{profile.fullName || 'Explorer'}</div>
                      <div className="text-[11px] text-emerald-300/60 mt-0.5 truncate">{profile.email || 'Community member'}</div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      <button
                        type="button"
                        onClick={() => { setDropdownOpen(false); navigate('/dashboard') }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                        </svg>
                        Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={handleAccountManagement}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Account Management
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-white/[0.06] py-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Not logged-in: Join Community button ── */
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-[11px] tracking-[0.2em] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30 transition-colors"
                >
                  Join Community
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/20 text-emerald-200">
                    →
                  </span>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 hover:bg-white/20 transition-colors md:hidden"
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

      {/* Floating Qubi Assistant */}
      {isLoggedIn && assistantVisible ? (
        <div className="fixed bottom-5 right-5 z-[70]">
          {assistantOpen ? (
            <div className="w-[min(92vw,320px)] overflow-hidden rounded-[28px] border border-emerald-400/20 bg-black/90 shadow-[0_25px_80px_-24px_rgba(0,0,0,0.95),0_0_40px_rgba(16,185,129,0.18)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-emerald-300/70">Qubi Assistant</div>
                  <div className="text-sm font-semibold text-white">Ask me anything</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Close assistant"
                >
                  ×
                </button>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'bg-emerald-400 text-black' : 'bg-white/5 text-white/80 border border-white/[0.06]'}`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAssistantSend} className="border-t border-white/[0.06] p-3">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    type="text"
                    placeholder="Write a message..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-300"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setAssistantOpen((current) => !current)}
            className="group relative flex h-[140px] w-[140px] items-end justify-end rounded-none bg-transparent p-0 shadow-none backdrop-blur-0 transition"
            aria-label="Open Qubi assistant"
          >
            {assistantWaving ? (
              <span className="absolute bottom-[118px] left-1/2 -translate-x-1/2 rounded-full border border-emerald-400/15 bg-emerald-500/8 px-3 py-1 text-center text-[11px] leading-5 text-emerald-50 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
                <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-emerald-400/10 bg-emerald-500/8" />
                <span className="block font-medium">Hi, I am Qubi, your AI assistant</span>
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            className="absolute right-4 top-4 bottom-4 flex w-[min(90vw,360px)] flex-col rounded-3xl border border-emerald-400/25 bg-black/75 p-6 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-emerald-400/30 bg-black/40 shadow-[0_0_18px_rgba(16,185,129,0.35)]">
                  <img src={logoImg} alt="QSphere logo" className="h-full w-full object-contain p-1" />
                </div>
                <div className="text-[11px] tracking-[0.45em] font-semibold text-emerald-100">
                  QSPHERE
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/90 hover:bg-white/20 transition-colors"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <span className="text-lg leading-none">x</span>
              </button>
            </div>

            {/* Mobile user info (when logged in) */}
            {isLoggedIn && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-emerald-400/30 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  {profile.avatarPreview ? (
                    <img src={profile.avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-emerald-200">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{profile.fullName || 'Explorer'}</div>
                  <div className="text-[11px] text-emerald-300/60 truncate">{profile.email || 'Member'}</div>
                </div>
              </div>
            )}

            <nav className="mt-8 flex flex-col gap-5 text-base text-white/90">
              <Link to="/" className={isHomePage ? "flex items-center justify-between text-emerald-200" : "hover:text-emerald-200 transition-colors"} onClick={() => setMenuOpen(false)}>
                Home
                {isHomePage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/blogs" className={isBlogPage ? "flex items-center justify-between text-emerald-200" : "hover:text-emerald-200 transition-colors"} onClick={() => setMenuOpen(false)}>
                Blogs
                {isBlogPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/groups" className={isGroupsPage ? "flex items-center justify-between text-emerald-200" : "hover:text-emerald-200 transition-colors"} onClick={() => setMenuOpen(false)}>
                Groups
                {isGroupsPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/about" className={isAboutPage ? "flex items-center justify-between text-emerald-200" : "hover:text-emerald-200 transition-colors"} onClick={() => setMenuOpen(false)}>
                About
                {isAboutPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/contact" className={isContactPage ? "flex items-center justify-between text-emerald-200" : "hover:text-emerald-200 transition-colors"} onClick={() => setMenuOpen(false)}>
                Contact
                {isContactPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>

              {/* Mobile-only: Dashboard, Account, Logout when logged in */}
              {isLoggedIn && (
                <>
                  <div className="h-px bg-white/[0.06] my-1" />
                  <Link to="/dashboard" className="hover:text-emerald-200 transition-colors" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button type="button" onClick={handleAccountManagement} className="text-left hover:text-emerald-200 transition-colors">
                    Account Management
                  </button>
                  <button type="button" onClick={handleLogout} className="text-left text-red-400/80 hover:text-red-400 transition-colors">
                    Log Out
                  </button>
                </>
              )}
            </nav>

            <div className="mt-auto pt-8">
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="inline-flex w-full items-center justify-between rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-[12px] tracking-[0.2em] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30 transition-colors"
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
                  className="inline-flex w-full items-center justify-between rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-[12px] tracking-[0.2em] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30 transition-colors"
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
    </>
  )
}

export default Navbar
