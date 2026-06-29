import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowUp, ArrowDown, MessageSquare, ArrowLeft, Trash2, Edit3, Check, X, Send, User, Clock, Sparkles, CheckCircle2,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../themeColors'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem('qsphere_onboarding_profile')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const timeAgo = (date) => {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const ThreadDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [myVote, setMyVote] = useState(0)
  const [score, setScore] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [submittingReply, setSubmittingReply] = useState(false)
  const [editedReplyId, setEditedReplyId] = useState(null)
  const [editedReplyText, setEditedReplyText] = useState('')
  const [editThreadMode, setEditThreadMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editTags, setEditTags] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    const logged = localStorage.getItem('qsphere_logged_in') === '1'
    setIsLoggedIn(logged)
    setProfile(readStoredProfile())
  }, [])

  const fetchThread = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
      setNotFound(false)
    }
    try {
      const res = await fetch(`/api/threads/${id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
      if (!res.ok) {
        if (!silent) {
          setNotFound(true)
          setThread(null)
        }
        return
      }
      const data = await res.json()
      setThread(data)
      setScore(data.score ?? data.votes ?? 0)
      setMyVote(data.myVote ?? 0)
    } catch {
      if (!silent) {
        setNotFound(true)
        setThread(null)
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchThread() }, [fetchThread])

  useEffect(() => {
    if (loading || notFound) return undefined

    const eventSource = new EventSource(`/api/threads/${id}/stream`)
    const refreshReplies = () => {
      if (document.hidden) return
      void fetchThread({ silent: true })
    }

    eventSource.onmessage = () => {
      void fetchThread({ silent: true })
    }

    window.addEventListener('focus', refreshReplies)

    return () => {
      eventSource.close()
      window.removeEventListener('focus', refreshReplies)
    }
  }, [fetchThread, id, loading, notFound])

  const isOwnThread = profile && thread &&
    profile.emailAddress?.toLowerCase() === (thread.authorEmail || thread.author || '').toLowerCase()

  const handleVoteThread = async (value) => {
    if (!isLoggedIn) {
      navigate('/auth', { state: { redirectTo: `/threads/${id}` } })
      return
    }
    const prevVote = myVote
    const newVote = prevVote === value ? 0 : value
    setMyVote(newVote)
    setScore((s) => s + (newVote - prevVote))
    try {
      const res = await fetch(`/api/threads/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newVote }),
      })
      if (!res.ok) {
        setMyVote(prevVote)
        setScore((s) => s - (newVote - prevVote))
      }
    } catch {
      setMyVote(prevVote)
      setScore((s) => s - (newVote - prevVote))
    }
  }

  const handleVoteReply = async (replyId, currentVote, value) => {
    if (!isLoggedIn) {
      navigate('/auth', { state: { redirectTo: `/threads/${id}` } })
      return
    }
    setThread((prev) => {
      if (!prev) return prev
      const updateVote = (replies) => replies.map((r) => {
        if (r.id === replyId) {
          const oldVote = r.myVote ?? 0
          const newVote = oldVote === value ? 0 : value
          return { ...r, myVote: newVote, score: (r.score ?? 0) + (newVote - oldVote) }
        }
        if (r.children) return { ...r, children: updateVote(r.children) }
        return r
      })
      return { ...prev, replies: updateVote(prev.replies ?? []) }
    })
    try {
      await fetch(`/api/threads/${id}/replies/${replyId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
    } catch { fetchThread() }
  }

  const handleDeleteThread = async () => {
    try {
      const res = await fetch(`/api/threads/${id}`, { method: 'DELETE' })
      if (res.ok) navigate('/threads', { replace: true })
    } catch { fetchThread() }
  }

  const handleEditThread = async () => {
    if (!editTitle.trim() || !editBody.trim()) return
    try {
      const res = await fetch(`/api/threads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setThread(updated)
        setEditThreadMode(false)
      }
    } catch { fetchThread() }
  }

  const enterEditMode = () => {
    setEditTitle(thread.title)
    setEditBody(thread.body ?? thread.content ?? '')
    setEditTags((thread.tags ?? []).join(', '))
    setEditThreadMode(true)
  }

  const handleAddReply = async () => {
    const text = replyText.trim()
    if (!text || submittingReply) return
    if (!isLoggedIn) {
      navigate('/auth', { state: { redirectTo: `/threads/${id}` } })
      return
    }
    setSubmittingReply(true)
    try {
      const res = await fetch(`/api/threads/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, parentId: replyingTo }),
      })
      if (res.ok) {
        const newReply = await res.json()
        setThread((prev) => {
          if (!prev) return prev
          if (replyingTo) {
            const addChild = (replies) => replies.map((r) => {
              if (r.id === replyingTo) return { ...r, children: [...(r.children ?? []), newReply] }
              if (r.children) return { ...r, children: addChild(r.children) }
              return r
            })
            return {
              ...prev,
              replyCount: Number(prev.replyCount ?? prev.replies?.length ?? 0) + 1,
              replies: addChild(prev.replies ?? []),
            }
          }
          return {
            ...prev,
            replyCount: Number(prev.replyCount ?? prev.replies?.length ?? 0) + 1,
            replies: [...(prev.replies ?? []), newReply],
          }
        })
        setReplyText('')
        setReplyingTo(null)
        void fetchThread({ silent: true })
      }
    } catch { fetchThread() } finally {
      setSubmittingReply(false)
    }
  }

  const handleEditReply = async (replyId) => {
    const text = editedReplyText.trim()
    if (!text) return
    try {
      const res = await fetch(`/api/threads/${id}/replies/${replyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      if (res.ok) {
        setThread((prev) => {
          if (!prev) return prev
          const updateReply = (replies) => replies.map((r) => {
            if (r.id === replyId) return { ...r, body: text }
            if (r.children) return { ...r, children: updateReply(r.children) }
            return r
          })
          return { ...prev, replies: updateReply(prev.replies ?? []) }
        })
        setEditedReplyId(null)
        setEditedReplyText('')
      }
    } catch { fetchThread() }
  }

  const handleDeleteReply = async (replyId) => {
    try {
      const res = await fetch(`/api/threads/${id}/replies/${replyId}`, { method: 'DELETE' })
      if (res.ok) {
        setThread((prev) => {
          if (!prev) return prev
          const removeReply = (replies) => replies.filter((r) => r.id !== replyId).map((r) => {
            if (r.children) return { ...r, children: removeReply(r.children) }
            return r
          })
          return { ...prev, replies: removeReply(prev.replies ?? []) }
        })
      }
    } catch { fetchThread() }
  }

  const handleAcceptAnswer = async (replyId) => {
    try {
      const res = await fetch(`/api/threads/${id}/replies/${replyId}/accept`, { method: 'POST' })
      if (res.ok) fetchThread()
    } catch { fetchThread() }
  }

  const sortReplies = (replies) => {
    const sorted = [...(replies ?? [])].sort((a, b) => {
      if (a.isAcceptedAnswer) return -1
      if (b.isAcceptedAnswer) return 1
      return (b.score ?? 0) - (a.score ?? 0)
    })
    return sorted.map((r) => ({
      ...r,
      children: r.children ? sortReplies(r.children) : [],
    }))
  }

  const isOwnReply = (reply) => profile &&
    profile.emailAddress?.toLowerCase() === (reply.authorEmail || reply.author || '').toLowerCase()

  const renderReply = (reply, depth = 0) => {
    const isAccepted = Boolean(reply.isAcceptedAnswer)
    const isEditing = editedReplyId === reply.id
    const isOwnerOfReply = isOwnReply(reply)
    const replyVote = reply.myVote ?? 0
    const replyAuthor = reply.author || reply.authorName || 'Anonymous'
    const replyBody = reply.body || reply.text || ''
    const replyCreatedAt = reply.createdAt ?? reply.created_at ?? new Date()
    const depthOffset = depth > 0 ? Math.min(depth, 4) * 18 : 0
    const scoreColor = replyVote === -1 ? palette.error : replyVote === 1 ? palette.accentPrimary : palette.textSecondary

    return (
      <motion.div
        key={reply.id}
        variants={itemVariants}
        style={{ marginLeft: depthOffset }}
        className={`group/reply relative ${depth > 0 ? 'mt-3' : 'mt-4'}`}
      >
        <div
          className="overflow-hidden rounded-[18px] border transition-all duration-200 hover:-translate-y-0.5"
          style={{
            borderColor: isAccepted ? palette.accentPrimary : palette.borderSoft,
            backgroundColor: isAccepted
              ? palette.accentSoft
              : isDayMode
                ? 'rgba(255,255,255,0.86)'
                : 'rgba(255,255,255,0.035)',
            boxShadow: isAccepted ? `0 18px 44px ${palette.accentGlow}` : palette.shadowCard,
          }}
        >
          <div className="flex items-stretch">
            <div
              className="flex w-12 shrink-0 flex-col items-center border-r py-3 sm:w-14"
              style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? 'rgba(15,23,42,0.025)' : 'rgba(0,0,0,0.18)' }}
            >
              <button
                type="button"
                onClick={() => handleVoteReply(reply.id, replyVote, 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-emerald-500/15"
                style={{ color: replyVote === 1 ? palette.accentPrimary : palette.textFaint }}
              >
                <ArrowUp size={18} />
              </button>
              <span className="my-0.5 min-w-[2rem] text-center text-sm font-black leading-6" style={{ color: scoreColor }}>
                {reply.score ?? 0}
              </span>
              <button
                type="button"
                onClick={() => handleVoteReply(reply.id, replyVote, -1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-red-500/15"
                style={{ color: replyVote === -1 ? palette.error : palette.textFaint }}
              >
                <ArrowDown size={18} />
              </button>
            </div>

            <article className="min-w-0 flex-1 px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-black uppercase"
                  style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput, color: palette.accentPrimary }}
                >
                  {replyAuthor.slice(0, 1)}
                </span>
                <span className="text-sm font-bold" style={{ color: palette.textPrimary }}>
                  {replyAuthor}
                </span>
                <span className="text-xs" style={{ color: palette.textFaint }}>posted</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: palette.textMuted }}>
                  <Clock size={12} />
                  {timeAgo(replyCreatedAt)}
                </span>
                {isAccepted && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}
                  >
                    <CheckCircle2 size={12} />
                    Accepted
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="mt-3">
                  <textarea
                    value={editedReplyText}
                    onChange={(e) => setEditedReplyText(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border px-4 py-3 text-sm leading-6 outline-none transition"
                    style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditReply(reply.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition"
                      style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                    >
                      <Check size={14} />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditedReplyId(null); setEditedReplyText('') }}
                      className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition"
                      style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgSurface, color: palette.textSecondary }}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-7" style={{ color: palette.textSecondary }}>
                  {replyBody}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t pt-3" style={{ borderColor: palette.borderSoft }}>
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
                    style={{ color: replyingTo === reply.id ? palette.accentPrimary : palette.textMuted }}
                  >
                    <MessageSquare size={13} />
                    Reply
                  </button>
                )}
                {isOwnerOfReply && !isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setEditedReplyId(reply.id); setEditedReplyText(reply.body || reply.text || '') }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
                      style={{ color: palette.textMuted }}
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReply(reply.id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
                      style={{ color: palette.error }}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </>
                )}
                {isOwnThread && !reply.isAcceptedAnswer && (
                  <button
                    type="button"
                    onClick={() => handleAcceptAnswer(reply.id)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition"
                    style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}
                  >
                    <CheckCircle2 size={13} />
                    Accept
                  </button>
                )}
              </div>

              {replyingTo === reply.id && (
                <div className="mt-4 flex gap-3 rounded-2xl border p-2" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddReply() } }}
                    placeholder="Write a nested reply..."
                    className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none transition"
                    style={{ color: palette.textPrimary }}
                  />
                  <button
                    type="button"
                    onClick={handleAddReply}
                    disabled={submittingReply || !replyText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50"
                    style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              )}
            </article>
          </div>
        </div>

        {reply.children?.length > 0 && (
          <div className="ml-3 mt-2 border-l-2 pl-3 sm:ml-6 sm:pl-4" style={{ borderColor: isAccepted ? palette.accentBorder : palette.borderSoft }}>
            {sortReplies(reply.children).map((child) => renderReply(child, depth + 1))}
          </div>
        )}
      </motion.div>
    )
  }

  const sortedReplies = sortReplies(thread?.replies ?? [])
  const communityColor = thread?.communityColor || palette.accentPrimary
  const threadTags = thread?.tags ?? []
  const replyCount = Number(thread?.replyCount ?? thread?.replies?.length ?? 0)
  const threadAuthor = thread?.authorName || thread?.author || 'Anonymous'
  const topReply = sortedReplies[0] || null

  if (loading) {
    return (
      <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
        <Navbar currentPage="threads" />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${palette.accentGlow} 0%, transparent 42%)` }} />
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${palette.accentSecondaryGlow} 0%, transparent 36%)` }} />
        </div>
        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="w-full max-w-2xl rounded-[36px] border p-8 text-center"
            style={{ borderColor: palette.borderPrimary, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border" style={{ borderColor: palette.accentPrimary, backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: `0 0 30px ${palette.accentPrimary}1F` }}>
              <Sparkles size={28} />
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary }}>Loading</div>
            <h1 className="type-heading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
              Loading thread...
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7" style={{ color: palette.textMuted }}>Fetching the discussion and its replies from the network.</p>
          </motion.div>
        </main>
        <div style={{ position: 'relative', zIndex: 1 }}><Footer /></div>
      </div>
    )
  }

  if (notFound || !thread) {
    return (
      <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
        <Navbar currentPage="threads" />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${palette.accentGlow} 0%, transparent 42%)` }} />
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${palette.accentSecondaryGlow} 0%, transparent 36%)` }} />
        </div>
        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="w-full max-w-2xl rounded-[36px] border p-8 text-center"
            style={{ borderColor: palette.borderPrimary, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface, color: palette.textMuted }}>
              <MessageSquare size={28} />
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: palette.error }}>Not found</div>
            <h1 className="type-heading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
              Thread not found.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7" style={{ color: palette.textMuted }}>This thread may have been deleted or the URL may be incorrect.</p>
            <button
              type="button"
              onClick={() => navigate('/threads')}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all"
              style={{ backgroundColor: palette.accentPrimary, color: '#fff', border: `1px solid ${palette.accentPrimary}` }}
            >
              <ArrowLeft size={16} />
              Back to threads
            </button>
          </motion.div>
        </main>
        <div style={{ position: 'relative', zIndex: 1 }}><Footer /></div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
      <Navbar currentPage="threads" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${palette.accentGlow} 0%, transparent 42%)` }} />
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${palette.accentSecondaryGlow} 0%, transparent 36%)` }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.04 : 0.14,
            backgroundImage: `linear-gradient(${isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'} 1px, transparent 1px), linear-gradient(90deg, ${isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'} 1px, transparent 1px)`,
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
              type="button"
              onClick={() => navigate(-1)}
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
              style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textSecondary }}
            >
              <ArrowLeft size={16} />
              Back to discussions
            </motion.button>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-8">
                <motion.section
                  variants={itemVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-80px' }}
                  className="relative overflow-hidden rounded-[40px]"
                  style={{ border: `1px solid ${palette.borderPrimary}`, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
                >
                  <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${communityColor}90, transparent)` }} />
                  <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: palette.accentGlow }} />
                  <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: palette.accentSecondaryGlow }} />

                  <div className="relative z-10 p-7 md:p-10 xl:p-12">
                    <div className="flex flex-col gap-6 md:flex-row">
                      <div
                        className="flex flex-row items-center justify-between rounded-[28px] border p-4 md:w-[88px] md:flex-col md:justify-start"
                        style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? '#ffffffcc' : 'rgba(16,24,20,0.72)' }}
                      >
                        <button
                          type="button"
                          onClick={() => handleVoteThread(1)}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all hover:bg-emerald-500/15"
                          style={{ color: myVote === 1 ? communityColor : palette.textFaint }}
                        >
                          <ArrowUp size={22} />
                        </button>
                        <div className="text-center md:my-3">
                          <div className="type-statValue" style={{ color: myVote !== 0 ? communityColor : palette.textPrimary }}>{score}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>signal</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVoteThread(-1)}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all hover:bg-red-500/15"
                          style={{ color: myVote === -1 ? palette.error : palette.textFaint }}
                        >
                          <ArrowDown size={22} />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        {editThreadMode ? (
                          <div className="space-y-4">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Thread title"
                              className="w-full rounded-2xl border px-4 py-3 text-xl font-bold outline-none transition"
                              style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary, fontFamily: 'var(--font-heading)' }}
                            />
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              rows={5}
                              placeholder="Thread body"
                              className="w-full rounded-2xl border px-4 py-3 text-sm leading-6 outline-none transition"
                              style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                            />
                            <input
                              type="text"
                              value={editTags}
                              onChange={(e) => setEditTags(e.target.value)}
                              placeholder="Tags (comma separated)"
                              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
                              style={{ borderColor: palette.borderInput, backgroundColor: palette.bgInput, color: palette.textPrimary }}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={handleEditThread}
                                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition"
                                style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                              >
                                <Check size={16} />
                                Save changes
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditThreadMode(false)}
                                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition"
                                style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgSurface, color: palette.textSecondary }}
                              >
                                <X size={16} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-5 flex flex-wrap items-center gap-3">
                              <Link
                                to={thread.communitySlug ? `/threads?community=${thread.communitySlug}` : '/threads'}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] transition"
                                style={{ backgroundColor: `${communityColor}1A`, color: communityColor, border: `1px solid ${communityColor}33` }}
                              >
                                <Sparkles size={13} />
                                c/{thread.communitySlug || 'general'}
                              </Link>
                              <span
                                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em]"
                                style={{ backgroundColor: palette.bgInput, color: palette.textMuted, border: `1px solid ${palette.borderSoft}` }}
                              >
                                <MessageSquare size={12} />
                                Community discussion
                              </span>
                              {isOwnThread && (
                                <>
                                  <button
                                    type="button"
                                    onClick={enterEditMode}
                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
                                    style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgSurface, color: palette.textMuted }}
                                  >
                                    <Edit3 size={13} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(true)}
                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
                                    style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgSurface, color: palette.error }}
                                  >
                                    <Trash2 size={13} />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>

                            <h1
                              className="type-heading"
                              style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary, textShadow: `0 0 40px ${isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(16,185,129,0.08)'}` }}
                            >
                              {thread.title}
                            </h1>

                            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm" style={{ color: palette.textSecondary }}>
                              <span className="flex items-center gap-2 font-semibold">
                                <User size={15} style={{ color: communityColor }} />
                                {threadAuthor}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock size={14} style={{ color: communityColor }} />
                                {timeAgo(thread.createdAt ?? thread.created_at ?? new Date())}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MessageSquare size={14} style={{ color: communityColor }} />
                                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                              </span>
                            </div>

                            {threadTags.length > 0 && (
                              <div className="mt-5 flex flex-wrap gap-2">
                                {threadTags.map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => navigate(`/threads?tag=${encodeURIComponent(tag)}`)}
                                    className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold transition hover:brightness-105"
                                    style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}
                                  >
                                    #{tag}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div
                              className="mt-7 rounded-[28px] border p-5 md:p-6"
                              style={{ borderColor: palette.borderSoft, backgroundColor: isDayMode ? '#ffffffc7' : 'rgba(18,25,22,0.74)' }}
                            >
                              <p className="text-base leading-8 md:text-lg" style={{ color: palette.textSecondary }}>
                                {thread.body || thread.content || ''}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.section>

                <motion.section
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  className="relative z-10 rounded-[40px] p-7 md:p-10 xl:p-12"
                  style={{ border: `1px solid ${palette.borderPrimary}`, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
                >
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.34em]" style={{ color: palette.accentPrimary }}>
                        <MessageSquare size={14} />
                        Replies
                      </div>
                      <h2 className="type-statValue mt-2" style={{ color: palette.textPrimary }}>
                        {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
                      </h2>
                      <p className="mt-1 text-sm" style={{ color: palette.textMuted }}>
                        Keep the conversation moving with context-rich replies.
                      </p>
                    </div>

                    <div
                      className="rounded-[24px] border px-4 py-3 text-sm"
                      style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.textMuted }}>Best answer</div>
                      <div className="mt-1 font-semibold" style={{ color: palette.textPrimary }}>
                        {topReply?.isAcceptedAnswer ? (topReply.authorName || topReply.author || 'Community member') : 'Open discussion'}
                      </div>
                    </div>
                  </div>

                  {sortedReplies.length > 0 ? (
                    <div className="space-y-2">
                      {sortedReplies.map((reply) => renderReply(reply, 0))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border px-5 py-10 text-center" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput, color: palette.textMuted }}>
                      <MessageSquare size={32} className="mx-auto mb-4" style={{ color: palette.textFaint }} />
                      <p className="text-sm font-semibold" style={{ color: palette.textSecondary }}>No replies yet</p>
                      <p className="mt-1 text-xs">Be the first to start the conversation.</p>
                    </div>
                  )}

                  {isLoggedIn ? (
                    <div className="mt-8 rounded-[28px] border p-5" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                      <div className="mb-3 text-sm font-semibold" style={{ color: palette.textPrimary }}>
                        {replyingTo ? 'Replying deeper in the thread...' : 'Add to the discussion'}
                      </div>
                      {replyingTo && (
                        <button
                          type="button"
                          onClick={() => { setReplyingTo(null); setReplyText('') }}
                          className="mb-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                          style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgSurface, color: palette.textMuted }}
                        >
                          <X size={13} />
                          Cancel reply
                        </button>
                      )}
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={4}
                        placeholder="Add your perspective, answer the question, or share what helped you."
                        className="w-full rounded-2xl border px-4 py-3 text-sm leading-6 outline-none transition"
                        style={{ borderColor: palette.borderInput, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs" style={{ color: palette.textMuted }}>
                          Replies are posted from your QSphere profile.
                        </span>
                        <button
                          type="button"
                          onClick={handleAddReply}
                          disabled={submittingReply || !replyText.trim()}
                          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                          style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                        >
                          <Send size={15} />
                          {submittingReply ? 'Posting...' : 'Post reply'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 rounded-[28px] border border-dashed px-5 py-6" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft }}>
                      <div className="max-w-2xl">
                        <div className="type-statValue" style={{ color: palette.textPrimary }}>Sign in to join the discussion</div>
                        <p className="mt-2 text-sm leading-6" style={{ color: palette.textSecondary }}>
                          Only logged-in QSphere members can reply to threads. Sign in to share your thoughts.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/auth', { state: { redirectTo: `/threads/${id}` } })}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                          style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
                        >
                          Sign in to reply
                        </button>
                      </div>
                    </div>
                  )}
                </motion.section>
              </div>

              <motion.aside
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="space-y-6"
              >
                <motion.div
                  variants={itemVariants}
                  className="rounded-[34px] border p-6"
                  style={{ borderColor: palette.borderPrimary, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-2xl border"
                      style={{ borderColor: `${communityColor}44`, backgroundColor: `${communityColor}18` }}
                    />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: communityColor }}>Community</div>
                      <div className="mt-1 type-statValue" style={{ color: palette.textPrimary }}>
                        {thread.communityName || 'General questions'}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                    {thread.communityDescription || 'A focused room for questions, practical advice, and shared research signal.'}
                  </p>
                  <Link
                    to={thread.communitySlug ? `/threads?community=${thread.communitySlug}` : '/threads'}
                    className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition"
                    style={{ backgroundColor: `${communityColor}18`, color: communityColor, border: `1px solid ${communityColor}33` }}
                  >
                    Explore this community
                  </Link>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="rounded-[34px] border p-6"
                  style={{ borderColor: palette.borderPrimary, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Thread pulse</div>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>Score</div>
                      <div className="type-statValue mt-2" style={{ color: palette.textPrimary }}>{score}</div>
                    </div>
                    <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>Replies</div>
                      <div className="type-statValue mt-2" style={{ color: palette.textPrimary }}>{replyCount}</div>
                    </div>
                    <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: palette.borderSoft, backgroundColor: palette.bgInput }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.textMuted }}>Started by</div>
                      <div className="mt-2 text-base font-semibold" style={{ color: palette.textPrimary }}>{threadAuthor}</div>
                    </div>
                  </div>
                </motion.div>

                {threadTags.length > 0 && (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-[34px] border p-6"
                    style={{ borderColor: palette.borderPrimary, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Explore tags</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {threadTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => navigate(`/threads?tag=${encodeURIComponent(tag)}`)}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:brightness-105"
                          style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: palette.bgInput, color: palette.textSecondary }}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.aside>
            </div>
          </div>
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}><Footer /></div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-md rounded-[30px] border p-7 text-center"
            style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgTertiary, boxShadow: palette.shadowDropdown }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: isDayMode ? '#fef2f2' : 'rgba(220,38,38,0.15)' }}>
              <Trash2 size={30} style={{ color: isDayMode ? '#dc2626' : '#fca5a5' }} />
            </div>
            <h3 className="mt-5 text-xl font-bold" style={{ color: palette.textPrimary }}>
              Delete thread?
            </h3>
            <p className="mt-3 text-sm leading-6" style={{ color: palette.textSecondary }}>
              This will permanently remove this thread and all its replies. This action cannot be undone.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition"
                style={{ border: `1px solid ${palette.borderInput}`, backgroundColor: palette.bgSurface, color: palette.textSecondary }}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteThread}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-110"
                style={isDayMode
                  ? { backgroundColor: '#dc2626', color: '#fff', border: 'none' }
                  : { backgroundColor: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.25)' }
                }
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ThreadDetailPage
