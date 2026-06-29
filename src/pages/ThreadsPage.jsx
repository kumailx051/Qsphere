import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock3,
  Flame,
  Hash,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users2,
  X,
  Edit3,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../themeColors'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem('qsphere_onboarding_profile')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const timeAgo = (date) => {
  const timestamp = new Date(date).getTime()
  if (Number.isNaN(timestamp)) return 'Recently'
  const diff = Date.now() - timestamp
  const mins = Math.max(1, Math.floor(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const heroVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const ThreadsPage = () => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const isLoggedIn = localStorage.getItem('qsphere_logged_in') === '1'
  const profile = readStoredProfile()
  const currentUserEmail = profile?.emailAddress || ''

  const [threads, setThreads] = useState([])
  const [communities, setCommunities] = useState([])
  const [stats, setStats] = useState({ totalThreads: 0, totalReplies: 0, totalVotes: 0 })
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState(searchParams.get('sort') || 'new')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [tag, setTag] = useState(searchParams.get('tag') || '')
  const [community, setCommunity] = useState(searchParams.get('community') || '')
  const [allTags, setAllTags] = useState([])

  const [showComposer, setShowComposer] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createBody, setCreateBody] = useState('')
  const [createTags, setCreateTags] = useState('')
  const [createCommunitySlug, setCreateCommunitySlug] = useState('')
  const [creating, setCreating] = useState(false)

  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [communityName, setCommunityName] = useState('')
  const [communityDescription, setCommunityDescription] = useState('')
  const [communityColor, setCommunityColor] = useState('#2EC58A')
  const [creatingCommunity, setCreatingCommunity] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editCommunitySlug, setEditCommunitySlug] = useState('')

  const activeCommunity = useMemo(
    () => communities.find((item) => item.slug === community) || null,
    [communities, community],
  )

  const threadStats = useMemo(() => {
    const hottestThread = threads.reduce((best, current) => {
      const bestSignal = Number(best?.score || 0) + Number(best?.replyCount || 0)
      const currentSignal = Number(current?.score || 0) + Number(current?.replyCount || 0)
      return currentSignal > bestSignal ? current : best
    }, null)

    return {
      totalThreads: stats.totalThreads || threads.length,
      totalReplies: stats.totalReplies || threads.reduce((sum, item) => sum + Number(item.replyCount || 0), 0),
      totalVotes: stats.totalVotes || threads.reduce((sum, item) => sum + Number(item.upvoteCount || 0) + Number(item.downvoteCount || 0), 0),
      hottestThread,
    }
  }, [stats, threads])

  const showSnackbar = useCallback((message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
  }, [])

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        sort,
        ...(search ? { search } : {}),
        ...(tag ? { tag } : {}),
        ...(community ? { community } : {}),
      })
      const res = await fetch(`/api/threads?${params.toString()}`)
      const data = await res.json().catch(() => null)
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
      const incomingCommunities = Array.isArray(data?.communities) ? data.communities : []

      setThreads(items)
      setCommunities(incomingCommunities)
      setStats(data?.stats || { totalThreads: items.length, totalReplies: 0, totalVotes: 0 })

      const tags = new Set()
      items.forEach((thread) => (thread.tags || []).forEach((value) => tags.add(value)))
      setAllTags(Array.from(tags).sort((a, b) => a.localeCompare(b)))

      if (!createCommunitySlug && incomingCommunities.length > 0) {
        setCreateCommunitySlug(incomingCommunities[0].slug)
      }
    } catch {
      setThreads([])
      setCommunities([])
      setStats({ totalThreads: 0, totalReplies: 0, totalVotes: 0 })
    } finally {
      setLoading(false)
    }
  }, [community, createCommunitySlug, search, sort, tag])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  useEffect(() => {
    const params = {}
    if (sort && sort !== 'new') params.sort = sort
    if (search) params.search = search
    if (tag) params.tag = tag
    if (community) params.community = community
    setSearchParams(params, { replace: true })
  }, [community, search, setSearchParams, sort, tag])

  const handleCreate = async () => {
    if (!createTitle.trim()) return
    setCreating(true)
    try {
      const tagsArray = createTags.split(',').map((item) => item.trim()).filter(Boolean)
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createTitle.trim(),
          body: createBody.trim(),
          tags: tagsArray,
          communitySlug: createCommunitySlug || communities[0]?.slug || 'general-questions',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showSnackbar(err.error || 'Failed to create discussion.', 'error')
        return
      }

      const createdThread = await res.json().catch(() => null)
      setCreateTitle('')
      setCreateBody('')
      setCreateTags('')
      setShowComposer(false)
      setSort('new')
      setSearch('')
      setTag('')
      setCommunity(createdThread?.communitySlug || createCommunitySlug || '')
      if (createdThread?.id) {
        setThreads((current) => [createdThread, ...current.filter((item) => item.id !== createdThread.id)])
      } else {
        fetchThreads()
      }
      showSnackbar('Discussion posted successfully.', 'success')
    } catch {
      showSnackbar('Network error while posting discussion.', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateCommunity = async () => {
    if (!communityName.trim()) return
    setCreatingCommunity(true)
    try {
      const res = await fetch('/api/threads/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: communityName.trim(),
          description: communityDescription.trim(),
          color: communityColor,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showSnackbar(err.error || 'Failed to create community.', 'error')
        return
      }

      const created = await res.json()
      setCommunities((current) => [created, ...current])
      setCommunity(created.slug)
      setCreateCommunitySlug(created.slug)
      setShowCommunityModal(false)
      setCommunityName('')
      setCommunityDescription('')
      setCommunityColor('#2EC58A')
      showSnackbar('Community created successfully.', 'success')
    } catch {
      showSnackbar('Network error while creating community.', 'error')
    } finally {
      setCreatingCommunity(false)
    }
  }

  const handleVote = async (threadId, currentVote, newValue) => {
    const effectiveVote = currentVote === newValue ? 0 : newValue

    setThreads((prev) => prev.map((thread) => {
      if (thread.id !== threadId) return thread
      let upvoteCount = Number(thread.upvoteCount || 0)
      let downvoteCount = Number(thread.downvoteCount || 0)

      if (currentVote === 1) upvoteCount = Math.max(0, upvoteCount - 1)
      if (currentVote === -1) downvoteCount = Math.max(0, downvoteCount - 1)
      if (effectiveVote === 1) upvoteCount += 1
      if (effectiveVote === -1) downvoteCount += 1

      return {
        ...thread,
        myVote: effectiveVote || null,
        upvoteCount,
        downvoteCount,
        score: upvoteCount - downvoteCount,
      }
    }))

    try {
      const res = await fetch(`/api/threads/${threadId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: effectiveVote || newValue }),
      })

      if (!res.ok) fetchThreads()
    } catch {
      fetchThreads()
    }
  }

  const handleDelete = async (threadId) => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showSnackbar(err.error || 'Failed to delete discussion.', 'error')
        return
      }
      setThreads((current) => current.filter((item) => item.id !== threadId))
      showSnackbar('Discussion deleted.', 'success')
    } catch {
      showSnackbar('Network error while deleting discussion.', 'error')
    }
  }

  const startEdit = (thread) => {
    setEditingId(thread.id)
    setEditTitle(thread.title)
    setEditBody(thread.body || '')
    setEditTags((thread.tags || []).join(', '))
    setEditCommunitySlug(thread.communitySlug || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditBody('')
    setEditTags('')
    setEditCommunitySlug('')
  }

  const handleUpdate = async (threadId) => {
    if (!editTitle.trim()) return
    try {
      const tagsArray = editTags.split(',').map((item) => item.trim()).filter(Boolean)
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          tags: tagsArray,
          communitySlug: editCommunitySlug || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showSnackbar(err.error || 'Failed to update discussion.', 'error')
        return
      }

      const updated = await res.json()
      setThreads((current) => current.map((item) => (item.id === threadId ? updated : item)))
      cancelEdit()
      showSnackbar('Discussion updated successfully.', 'success')
    } catch {
      showSnackbar('Network error while updating discussion.', 'error')
    }
  }

  const isOwnThread = (thread) =>
    Boolean(
      isLoggedIn &&
      currentUserEmail &&
      thread.authorEmail &&
      String(thread.authorEmail).trim().toLowerCase() === String(currentUserEmail).trim().toLowerCase(),
    )

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
      <Navbar currentPage="threads" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.52 : 0.38,
            background: isDayMode
              ? 'radial-gradient(circle at 14% 0%, rgba(46,197,138,0.14) 0%, transparent 38%)'
              : 'radial-gradient(circle at 14% 0%, rgba(16,185,129,0.18) 0%, transparent 38%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.18 : 0.14,
            backgroundImage: isDayMode
              ? 'linear-gradient(rgba(10,22,32,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(10,22,32,0.035) 1px, transparent 1px)'
              : 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 18%, black 24%, transparent 88%)',
          }}
        />
      </div>

      <main className="relative z-10 flex-1 px-5 pb-28 pt-32 md:px-10 xl:px-14">
        <div className="qs-page-container">
          <motion.section
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="rounded-[36px] border p-6 md:p-8"
            style={{
              borderColor: palette.borderPrimary,
              background: isDayMode
                ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.92))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))',
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}>
                  <Hash size={14} />
                  Community hub
                </div>
                <h1 className="mt-5 type-heading-soft max-w-3xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  Ask, answer, and build momentum
                  <span style={{ color: palette.accentPrimary }}> inside focused communities.</span>
                </h1>
                <p className="mt-5 max-w-3xl text-sm leading-7 md:text-base" style={{ color: palette.textSecondary }}>
                  Explore subreddit-style rooms for quantum basics, hardware, algorithms, careers, and research. Each thread belongs to a community so questions stay focused and discussions become easier to follow.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                {[
                  { label: 'Threads', value: threadStats.totalThreads },
                  { label: 'Replies', value: threadStats.totalReplies },
                  { label: 'Votes', value: threadStats.totalVotes },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border px-4 py-4" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? '#ffffff' : 'rgba(0,0,0,0.18)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.accentPrimary }}>{item.label}</div>
                    <div className="type-statValue mt-3" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
            <aside className="space-y-5">
              <div className="rounded-[30px] border p-5" style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.03)', boxShadow: palette.shadowCard }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Communities</div>
                    <div className="type-cardHeading mt-2" style={{ color: palette.textPrimary }}>Choose a room</div>
                  </div>
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => setShowCommunityModal(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border"
                      style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}
                      title="Create community"
                    >
                      <Plus size={16} />
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={() => setCommunity('')}
                    className="w-full rounded-2xl border px-4 py-3 text-left transition"
                    style={{
                      borderColor: !community ? palette.accentBorder : palette.borderSoft,
                      backgroundColor: !community ? palette.accentSoft : (isDayMode ? '#ffffff' : 'rgba(255,255,255,0.02)'),
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>All communities</div>
                        <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>Every discussion room in one feed</div>
                      </div>
                      <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: isDayMode ? '#f7f7f5' : 'rgba(255,255,255,0.06)', color: palette.textMuted }}>
                        {threadStats.totalThreads}
                      </span>
                    </div>
                  </button>

                  <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
                    {communities.map((item) => (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => setCommunity(item.slug)}
                        className="w-full rounded-2xl border px-4 py-3 text-left transition"
                        style={{
                          borderColor: community === item.slug ? palette.accentBorder : palette.borderSoft,
                          backgroundColor: community === item.slug ? palette.accentSoft : (isDayMode ? '#ffffff' : 'rgba(255,255,255,0.02)'),
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || palette.accentPrimary }} />
                              <div className="truncate text-sm font-semibold" style={{ color: palette.textPrimary }}>
                                q/{item.slug}
                              </div>
                            </div>
                            <div className="mt-1 text-xs font-medium" style={{ color: palette.textSecondary }}>{item.name}</div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5" style={{ color: palette.textMuted }}>{item.description}</div>
                          </div>
                          <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: isDayMode ? '#f7f7f5' : 'rgba(255,255,255,0.06)', color: palette.textMuted }}>
                            {Number(item.threadCount || 0)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <section className="min-w-0 space-y-5">
              <div className="rounded-[30px] border p-4 md:p-5" style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.03)', boxShadow: palette.shadowCard }}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { key: 'new', label: 'New', icon: Clock3 },
                      { key: 'top', label: 'Top', icon: ArrowUp },
                      { key: 'hot', label: 'Hot', icon: Flame },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSort(item.key)}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition"
                        style={{
                          border: `1px solid ${sort === item.key ? palette.accentBorder : palette.borderPrimary}`,
                          backgroundColor: sort === item.key ? palette.accentSoft : (isDayMode ? '#ffffff' : 'rgba(0,0,0,0.2)'),
                          color: sort === item.key ? (isDayMode ? palette.accentDark : palette.accentLight) : palette.textSecondary,
                        }}
                      >
                        <item.icon size={14} />
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full xl:w-80">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: palette.textMuted }} />
                    <input
                      type="text"
                      placeholder="Search discussions..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="w-full rounded-full border py-3 pl-10 pr-4 text-sm outline-none"
                      style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                    />
                  </div>
                </div>

                {allTags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: palette.borderSoft }}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>Tags</span>
                    <button
                      type="button"
                      onClick={() => setTag('')}
                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{
                        border: `1px solid ${!tag ? palette.accentBorder : palette.borderPrimary}`,
                        backgroundColor: !tag ? palette.accentSoft : 'transparent',
                        color: !tag ? (isDayMode ? palette.accentDark : palette.accentLight) : palette.textMuted,
                      }}
                    >
                      All
                    </button>
                    {allTags.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTag(tag === value ? '' : value)}
                        className="rounded-full px-3 py-1 text-[11px] font-semibold"
                        style={{
                          border: `1px solid ${tag === value ? palette.accentBorder : palette.borderPrimary}`,
                          backgroundColor: tag === value ? palette.accentSoft : 'transparent',
                          color: tag === value ? (isDayMode ? palette.accentDark : palette.accentLight) : palette.textSecondary,
                        }}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[30px] border p-5" style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.03)', boxShadow: palette.shadowCard }}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.accentPrimary }}>
                      {activeCommunity ? `q/${activeCommunity.slug}` : 'Open feed'}
                    </div>
                    <div className="type-cardHeading mt-2" style={{ color: palette.textPrimary }}>
                      {activeCommunity ? activeCommunity.name : 'Every conversation in one place'}
                    </div>
                    <div className="mt-2 text-sm leading-6" style={{ color: palette.textSecondary }}>
                      {activeCommunity?.description || 'Browse everything happening across QSphere communities, from beginner questions to active research discussion.'}
                    </div>
                  </div>

                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => setShowComposer((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
                      style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                    >
                      {showComposer ? <X size={16} /> : <Plus size={16} />}
                      {showComposer ? 'Close composer' : 'Start discussion'}
                    </button>
                  ) : null}
                </div>

                {showComposer && isLoggedIn ? (
                  <div className="mt-5 rounded-[24px] border p-4 md:p-5" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft }}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold" style={{ color: palette.textSecondary }}>Community</label>
                        <select
                          value={createCommunitySlug}
                          onChange={(event) => setCreateCommunitySlug(event.target.value)}
                          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                          style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
                        >
                          {communities.map((item) => (
                            <option key={item.slug} value={item.slug}>
                              {item.name} · q/{item.slug}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold" style={{ color: palette.textSecondary }}>Title</label>
                        <input
                          type="text"
                          value={createTitle}
                          onChange={(event) => setCreateTitle(event.target.value)}
                          placeholder="Ask a question, share a problem, or start a topic..."
                          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                          style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold" style={{ color: palette.textSecondary }}>Body</label>
                        <textarea
                          value={createBody}
                          onChange={(event) => setCreateBody(event.target.value)}
                          rows={5}
                          placeholder="Give context, share your thinking, and explain what kind of help or discussion you want."
                          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-none"
                          style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold" style={{ color: palette.textSecondary }}>Tags</label>
                        <input
                          type="text"
                          value={createTags}
                          onChange={(event) => setCreateTags(event.target.value)}
                          placeholder="quantum, research, help, internship"
                          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                          style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreate}
                        disabled={creating || !createTitle.trim()}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
                        style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                      >
                        {creating ? <Sparkles size={15} /> : <Plus size={15} />}
                        {creating ? 'Posting...' : 'Post discussion'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-[28px] border p-5 animate-pulse" style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.03)' }}>
                      <div className="flex gap-4">
                        <div className="h-28 w-16 rounded-[22px]" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                        <div className="flex-1">
                          <div className="h-4 w-40 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                          <div className="mt-4 h-8 w-3/4 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                          <div className="mt-3 h-3 w-5/6 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                          <div className="mt-5 h-9 w-48 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : threads.length === 0 ? (
                <div className="rounded-[34px] border px-5 py-20 text-center" style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.03)', boxShadow: palette.shadowCard }}>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                    <MessageSquare size={28} />
                  </div>
                  <div className="type-sectionHeading mt-5 mx-auto max-w-2xl" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                    No discussions yet
                  </div>
                  <div className="mx-auto mt-3 max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                    {activeCommunity
                      ? `No one has posted in ${activeCommunity.name} yet. Start the first discussion and shape the tone of this community.`
                      : 'There are no discussions yet. Start a conversation and turn this space into a high-signal QSphere discussion hub.'}
                  </div>
                </div>
              ) : (
                <motion.section variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
                  {threads.map((thread) => {
                    const isEditing = editingId === thread.id
                    const myVote = Number(thread.myVote || 0)
                    const score = Number(thread.score !== undefined ? thread.score : Number(thread.upvoteCount || 0) - Number(thread.downvoteCount || 0))

                    return (
                      <motion.article
                        key={thread.id}
                        variants={itemVariants}
                        className="overflow-hidden rounded-[28px] border"
                        style={{
                          borderColor: isDayMode ? '#dedad2' : palette.borderPrimary,
                          background: isDayMode
                            ? 'linear-gradient(145deg, rgba(255,255,255,1), rgba(250,249,247,0.98))'
                            : 'linear-gradient(145deg, rgba(15,22,18,0.96), rgba(7,11,9,0.98))',
                          boxShadow: isDayMode ? '0 22px 54px rgba(15,23,42,0.08)' : '0 24px 54px rgba(0,0,0,0.28)',
                        }}
                      >
                        {isEditing ? (
                          <div className="p-5 md:p-6">
                            <div className="grid gap-4">
                              <select
                                value={editCommunitySlug}
                                onChange={(event) => setEditCommunitySlug(event.target.value)}
                                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                              >
                                {communities.map((item) => (
                                  <option key={item.slug} value={item.slug}>
                                    {item.name} · q/{item.slug}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(event) => setEditTitle(event.target.value)}
                                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                              />
                              <textarea
                                value={editBody}
                                onChange={(event) => setEditBody(event.target.value)}
                                rows={4}
                                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-none"
                                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                              />
                              <input
                                type="text"
                                value={editTags}
                                onChange={(event) => setEditTags(event.target.value)}
                                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                              />
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => handleUpdate(thread.id)} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold" style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}>
                                  <Check size={15} />
                                  Save
                                </button>
                                <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold" style={{ border: `1px solid ${palette.btnSecondaryBorder}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}>
                                  <X size={15} />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-0">
                            <div className="flex w-[84px] shrink-0 flex-col items-center justify-start gap-2 border-r px-3 py-5" style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? '#f7f7f5' : 'rgba(255,255,255,0.03)' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isLoggedIn) { navigate('/auth', { state: { redirectTo: '/threads' } }); return }
                                  handleVote(thread.id, myVote, 1)
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl transition"
                                style={{ backgroundColor: myVote === 1 ? palette.accentSoft : 'transparent', color: myVote === 1 ? palette.accentPrimary : palette.textMuted }}
                              >
                                <ArrowUp size={18} />
                              </button>
                              <div className="text-center type-titleSm" style={{ fontFamily: 'var(--font-heading)', color: score > 0 ? palette.accentPrimary : score < 0 ? palette.error : palette.textPrimary }}>
                                {score}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isLoggedIn) { navigate('/auth', { state: { redirectTo: '/threads' } }); return }
                                  handleVote(thread.id, myVote, -1)
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl transition"
                                style={{ backgroundColor: myVote === -1 ? 'rgba(239,68,68,0.10)' : 'transparent', color: myVote === -1 ? palette.error : palette.textMuted }}
                              >
                                <ArrowDown size={18} />
                              </button>
                            </div>

                            <div className="min-w-0 flex-1 p-5 md:p-6">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${thread.communityColor ? `${thread.communityColor}33` : palette.accentBorder}`, backgroundColor: thread.communityColor ? `${thread.communityColor}14` : palette.accentSoft, color: thread.communityColor || palette.accentPrimary }}>
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: thread.communityColor || palette.accentPrimary }} />
                                  q/{thread.communitySlug || 'general-questions'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: palette.textMuted }}>
                                  <Users2 size={12} />
                                  {thread.authorName || thread.authorEmail?.split('@')[0] || 'Anonymous'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: palette.textMuted }}>
                                  <Clock3 size={12} />
                                  {timeAgo(thread.createdAt)}
                                </span>
                              </div>

                              <Link to={`/threads/${thread.id}`} className="no-underline">
                                <h2 className="type-cardHeading mt-4 leading-snug transition hover:opacity-80" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                                  {thread.title}
                                </h2>
                              </Link>

                              {thread.body ? (
                                <p className="mt-3 text-sm leading-7 line-clamp-3" style={{ color: isDayMode ? '#4E535C' : 'rgba(255,255,255,0.78)' }}>
                                  {thread.body}
                                </p>
                              ) : null}

                              {(thread.tags || []).length > 0 ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {thread.tags.map((value) => (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => setTag(value)}
                                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                                      style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? '#f7f7f5' : 'rgba(255,255,255,0.04)', color: palette.textSecondary }}
                                    >
                                      #{value}
                                    </button>
                                  ))}
                                </div>
                              ) : null}

                              <div className="mt-5 flex flex-wrap items-center gap-4 border-t pt-4" style={{ borderColor: palette.borderSoft }}>
                                <Link to={`/threads/${thread.id}`} className="inline-flex items-center gap-2 no-underline text-sm font-semibold" style={{ color: palette.accentPrimary }}>
                                  <MessageSquare size={15} />
                                  {thread.replyCount || 0} {(thread.replyCount || 0) === 1 ? 'reply' : 'replies'}
                                </Link>
                                {thread.isPinned ? (
                                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                                    Pinned
                                  </span>
                                ) : null}
                                {thread.isLocked ? (
                                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid rgba(239,68,68,0.18)`, backgroundColor: 'rgba(239,68,68,0.08)', color: palette.error }}>
                                    Locked
                                  </span>
                                ) : null}
                              </div>

                              {isOwnThread(thread) ? (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <button type="button" onClick={() => startEdit(thread)} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold" style={{ border: `1px solid ${palette.btnSecondaryBorder}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}>
                                    <Edit3 size={12} />
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => window.confirm('Delete this discussion?') && handleDelete(thread.id)} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold" style={{ border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.08)', color: palette.error }}>
                                    <Trash2 size={12} />
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </motion.article>
                    )
                  })}
                </motion.section>
              )}
            </section>

            <aside className="space-y-5">
              <div className="rounded-[30px] border p-5" style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.03)', boxShadow: palette.shadowCard }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Trending now</div>
                <div className="type-cardHeading mt-3" style={{ color: palette.textPrimary }}>
                  {threadStats.hottestThread?.title || 'No trending thread yet'}
                </div>
                <div className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                  High-signal threads rise with replies and votes, so the most active conversation surfaces naturally for the community.
                </div>
                {threadStats.hottestThread ? (
                  <Link to={`/threads/${threadStats.hottestThread.id}`} className="mt-5 inline-flex items-center gap-2 no-underline text-sm font-semibold" style={{ color: palette.accentPrimary }}>
                    Open discussion
                    <Sparkles size={15} />
                  </Link>
                ) : null}
              </div>

              <div className="rounded-[30px] border p-5" style={{ borderColor: palette.borderPrimary, backgroundColor: isDayMode ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.03)', boxShadow: palette.shadowCard }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Posting guide</div>
                <div className="mt-4 space-y-4">
                  {[
                    'Choose the right community before posting.',
                    'Use a clear title that explains the topic fast.',
                    'Add enough detail so others can actually help.',
                    'Use tags to improve discoverability across QSphere.',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary }} />
                      <span className="text-sm leading-7" style={{ color: palette.textSecondary }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>

      {showCommunityModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-[32px] border p-6 md:p-7" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgTertiary, boxShadow: palette.shadowDropdown }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>New community</div>
                <div className="type-sectionHeading mt-2 max-w-sm" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>Create a discussion room</div>
              </div>
              <button type="button" onClick={() => setShowCommunityModal(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}>
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <input
                type="text"
                value={communityName}
                onChange={(event) => setCommunityName(event.target.value)}
                placeholder="Community name"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
              />
              <textarea
                value={communityDescription}
                onChange={(event) => setCommunityDescription(event.target.value)}
                rows={4}
                placeholder="What kind of discussions should happen here?"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-none"
                style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
              />
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: palette.textSecondary }}>Accent color</label>
                <input type="color" value={communityColor} onChange={(event) => setCommunityColor(event.target.value)} className="h-12 w-full rounded-2xl border px-2 py-2" style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface }} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCommunityModal(false)} className="rounded-full px-5 py-3 text-sm font-semibold" style={{ border: `1px solid ${palette.btnSecondaryBorder}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}>
                Cancel
              </button>
              <button type="button" onClick={handleCreateCommunity} disabled={creatingCommunity || !communityName.trim()} className="rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}>
                {creatingCommunity ? 'Creating...' : 'Create community'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default ThreadsPage
