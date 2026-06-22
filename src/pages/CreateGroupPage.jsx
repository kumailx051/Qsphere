import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Hash, Sparkles, Tag, Text, Type, Users2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

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
  } catch {
    return null
  }
}

const CreateGroupPage = () => {
  const navigate = useNavigate()

  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const [groupType, setGroupType] = useState('Product & development')
  const [groupTitle, setGroupTitle] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupScope, setGroupScope] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [groupTypes, setGroupTypes] = useState(['Study', 'Research', 'Research & Development', 'Product & development'])
  const [showModal, setShowModal] = useState(false)
  const [newTypeInput, setNewTypeInput] = useState('')
  const [isCreatingType, setIsCreatingType] = useState(false)

  const [isOptimizingTitle, setIsOptimizingTitle] = useState(false)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [typingTimeout, setTypingTimeout] = useState(null)

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  useEffect(() => {
    const logged = localStorage.getItem('qsphere_logged_in') === '1'
    if (!logged) {
      navigate('/auth', { state: { redirectTo: '/groups/new' } })
      return
    }

    fetch('/api/group-types')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const fetchedNames = data.map(t => t.name)
          setGroupTypes(prev => Array.from(new Set([...prev, ...fetchedNames])))
        }
      })
      .catch(() => {})
  }, [navigate])

  const handleTypeChange = (event) => {
    const val = event.target.value
    if (val === '_new_') {
      setNewTypeInput('')
      setShowModal(true)
      setGroupType(groupTypes[0])
    } else {
      setGroupType(val)
    }
  }

  const handleCreateType = async () => {
    if (!newTypeInput || !newTypeInput.trim()) {
      setShowModal(false)
      return
    }

    setIsCreatingType(true)
    try {
      const res = await fetch('/api/group-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeInput.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setGroupTypes(prev => Array.from(new Set([...prev, data.name])))
        setGroupType(data.name)
      }
    } catch {
    } finally {
      setIsCreatingType(false)
      setShowModal(false)
    }
  }

  const handleOptimizeTitle = async () => {
    if (!groupTitle.trim()) return
    setIsOptimizingTitle(true)
    try {
      const res = await fetch('/api/ai/optimize-group-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: groupTitle })
      })
      const data = await res.json()
      if (res.ok && data.optimized) {
        setGroupTitle(data.optimized)
      }
    } catch {
    } finally {
      setIsOptimizingTitle(false)
    }
  }

  const handleGenerateDescription = async () => {
    if (!groupTitle.trim()) return

    setIsGeneratingDescription(true)
    try {
      const res = await fetch('/api/ai/generate-group-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: groupTitle })
      })
      const data = await res.json()
      if (res.ok && data.description) {
        setGroupDescription(data.description)
      }
    } catch {
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const handleScopeChange = (e) => {
    const val = e.target.value
    setGroupScope(val)
    setSuggestion('')

    if (typingTimeout) clearTimeout(typingTimeout)

    if (val.trim().length > 2) {
      const newTimeout = setTimeout(async () => {
        try {
          const res = await fetch('/api/ai/autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: val, context: `Group Title: ${groupTitle}` })
          })
          const data = await res.json()
          if (data.suggestion) {
            setSuggestion(data.suggestion)
          }
        } catch {}
      }, 500)
      setTypingTimeout(newTimeout)
    }
  }

  const handleScopeKeyDown = (e) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault()
      setGroupScope(prev => prev + (prev.endsWith(' ') ? '' : ' ') + suggestion)
      setSuggestion('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setErrorMsg('')
    setMessage('')

    if (!groupTitle.trim() || !groupScope.trim()) {
      setErrorMsg('Please complete the group title and scope.')
      return
    }

    setSaving(true)

    const profile = readStoredProfile()
    const ownerEmail = profile?.emailAddress || localStorage.getItem('qsphere_email')

    if (!ownerEmail) {
      setErrorMsg('User email not found. Please log in.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupType,
          groupTitle: groupTitle.trim(),
          groupDescription: groupDescription.trim(),
          groupScope: groupScope.trim(),
          ownerEmail
        })
      })

      if (!res.ok) {
        let errStr = 'Failed to create group'
        try {
          const errData = await res.json()
          errStr = errData.error || errStr
        } catch {}
        throw new Error(errStr)
      }

      setMessage('Group created successfully!')
      setTimeout(() => {
        navigate('/groups')
      }, 1000)
    } catch (error) {
      setErrorMsg(error.message || 'Failed to create group.')
      setSaving(false)
    }
  }

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
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
              type="button"
              onClick={() => navigate('/groups')}
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:border-emerald-400/30 hover:text-emerald-300 transition" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface, color: palette.textSecondary }}
            >
              <ArrowLeft size={16} />
              Back to groups
            </motion.button>

            <motion.section
              variants={heroVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="relative overflow-hidden rounded-[40px] border p-7 md:p-10 xl:p-12" style={{ borderColor: palette.borderPrimary, background: `linear-gradient(145deg, ${palette.bgSurface}, ${palette.bgPrimary})`, boxShadow: palette.shadowCard }}
            >
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${palette.accentLight}80, transparent)` }} />
              <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: palette.accentGlow }} />
              <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: palette.accentSecondaryGlow }} />

              <div className="relative z-10 mb-10">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}>
                    <span className="h-2.5 w-2.5 rounded-full bg-white" style={{ boxShadow: palette.shadowGlow }} />
                    Create Group
                  </span>
                </div>

                <h1
                  className="max-w-5xl text-5xl font-bold leading-[0.9] md:text-6xl xl:text-[5.35rem]"
                  style={{ fontFamily: "'Syne', sans-serif", textShadow: '0 0 40px rgba(16,185,129,0.08)', color: palette.textPrimary }}
                >
                  Start a focused
                  <br />
                  <span style={{ color: palette.accentPrimary }}>collaboration room.</span>
                </h1>

                <p className="mt-7 max-w-3xl text-base leading-8 md:text-lg xl:text-[1.12rem]" style={{ color: palette.textSecondary }}>
                  Define the type, scope, and purpose of your group so the right people can find it and contribute with clarity.
                </p>

                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    { label: 'Group type', value: groupType },
                    { label: 'AI assistance', value: 'Optimize + generate' },
                    { label: 'Autocomplete', value: 'Scope suggestions' },
                  ].map((item) => (
                    <motion.div key={item.label} variants={itemVariants} className="rounded-[28px] border p-5 backdrop-blur-xl" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSecondary }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.accentLight, opacity: 0.8 }}>{item.label}</div>
                      <div className="mt-4 text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>{item.value}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <div className="relative z-10 grid gap-10 xl:grid-cols-[1.08fr_0.92fr]">
                <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  {errorMsg && (
                    <motion.div variants={itemVariants} className="mb-6 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">!</span>
                      {errorMsg}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <motion.div variants={itemVariants}>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Select Group Type</label>
                      <div className="relative rounded-2xl border transition focus-within:border-emerald-400/40 focus-within:bg-white/[0.06]" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface }}>
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <Tag size={16} className="shrink-0" style={{ color: palette.accentPrimary }} />
                          <select
                            value={groupType}
                            onChange={handleTypeChange}
                            className="w-full bg-transparent text-sm outline-none appearance-none cursor-pointer" style={{ color: palette.textPrimary }}
                          >
                            {groupTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                            <option value="_new_">
                              + Create new type...
                            </option>
                          </select>
                        </div>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: palette.accentPrimary }} />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Group Title</label>
                        <button
                          type="button"
                          onClick={handleOptimizeTitle}
                          disabled={!groupTitle.trim() || isOptimizingTitle}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-50 transition"
                          style={{ color: palette.accentPrimary }}
                        >
                          <Sparkles size={12} />
                          {isOptimizingTitle ? 'Optimizing...' : 'AI Optimize'}
                        </button>
                      </div>
                      <div className="relative rounded-2xl border transition focus-within:border-emerald-400/40 focus-within:bg-white/[0.06]" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface }}>
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <Type size={16} className="shrink-0" style={{ color: palette.accentPrimary }} />
                          <input
                            type="text"
                            value={groupTitle}
                            onChange={(e) => setGroupTitle(e.target.value)}
                            placeholder="Enter group title"
                            className="w-full bg-transparent text-sm outline-none" style={{ color: palette.textPrimary }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Short Description</label>
                        <button
                          type="button"
                          onClick={handleGenerateDescription}
                          disabled={!groupTitle.trim() || isGeneratingDescription}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-50 transition"
                          style={{ color: palette.accentPrimary }}
                        >
                          <Sparkles size={12} />
                          {isGeneratingDescription ? 'Generating...' : 'AI Generate'}
                        </button>
                      </div>
                      <div className="relative rounded-2xl border transition focus-within:border-emerald-400/40 focus-within:bg-white/[0.06]" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface }}>
                        <div className="flex items-start gap-3 px-4 py-3.5">
                          <Text size={16} className="mt-0.5 shrink-0" style={{ color: palette.accentPrimary }} />
                          <textarea
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            placeholder="Enter a short description for your group"
                            rows={2}
                            className="w-full resize-none bg-transparent text-sm outline-none" style={{ color: palette.textPrimary }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: palette.accentPrimary }}>Group Scope</label>
                      <div className="relative rounded-2xl border transition focus-within:border-emerald-400/40 focus-within:bg-white/[0.06]" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface }}>
                        <div className="flex items-center gap-3 px-4 py-3.5">
                          <Hash size={16} className="shrink-0" style={{ color: palette.accentPrimary }} />
                          <input
                            type="text"
                            value={groupScope}
                            onChange={handleScopeChange}
                            onKeyDown={handleScopeKeyDown}
                            placeholder="Enter group scope"
                            className="w-full bg-transparent text-sm outline-none" style={{ color: palette.textPrimary }}
                          />
                          {suggestion && (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs italic truncate max-w-[120px]" style={{ color: palette.textMuted }}>...{suggestion}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: palette.bgSurfaceHover, color: palette.textSecondary }}>Tab</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45" style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}
                      >
                        <Users2 size={16} />
                        {saving ? 'Creating group...' : 'Create group'}
                      </button>
                    </motion.div>
                  </form>
                </motion.div>

                <motion.aside variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-5">
                  <motion.div variants={itemVariants} className="rounded-[30px] border p-6 backdrop-blur-xl" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: palette.shadowGlow }}>
                      <Sparkles size={20} />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: palette.accentPrimary }}>AI-powered setup</div>
                    <h3 className="mt-3 text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                      Smarter group creation
                    </h3>
                    <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      Use the AI Optimize button to sharpen your group title (under 10 words), generate a description automatically, and accept autocomplete suggestions for the scope field by pressing Tab.
                    </p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="rounded-[30px] border p-6 backdrop-blur-xl" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: palette.shadowGlow }}>
                      <Users2 size={20} />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: palette.accentPrimary }}>About groups</div>
                    <h3 className="mt-3 text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                      Purpose-driven rooms
                    </h3>
                    <p className="mt-3 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      Groups on QSphere are focused collaboration spaces built around research, study, development, or shared objectives. Define the scope clearly so members know exactly what the room is for.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/groups')}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold transition-all hover:gap-3" style={{ color: palette.accentPrimary }}
                    >
                      Browse existing groups
                      <ArrowRight size={15} />
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants} className="rounded-[30px] border p-6 backdrop-blur-xl" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: palette.shadowGlow }}>
                      <CheckCircle2 size={20} style={{ color: '#fff' }} />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: palette.accentPrimary }}>Tips</div>
                    <h3 className="mt-3 text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                      Strong groups start here
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: palette.accentPrimary }} />
                        Choose a type that reflects the group's core purpose.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: palette.accentPrimary }} />
                        Keep the title concise and descriptive.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: palette.accentPrimary }} />
                        Use the scope field to define goals, audience, and focus.
                      </li>
                    </ul>
                  </motion.div>
                </motion.aside>
              </div>
            </motion.section>
          </div>
        </div>
      </main>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-full px-6 py-3 text-sm font-medium shadow-lg backdrop-blur flex items-center gap-2" style={{ backgroundColor: palette.accentPrimary, color: '#fff' }}
        >
          <CheckCircle2 size={16} style={{ color: '#fff', opacity: 0.8 }} />
          {message}
        </motion.div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl animate-in zoom-in-95 duration-200" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgTertiary }}>
            <div className="p-6 md:p-8">
              <h3 className="mb-2 text-xl font-bold" style={{ color: palette.textPrimary }}>Create New Group Type</h3>
              <p className="mb-6 text-sm" style={{ color: palette.textMuted }}>Enter the name for the new custom group category you want to create.</p>

              <div className="mb-6">
                <input
                  type="text"
                  autoFocus
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition" style={{ borderColor: palette.borderPrimary, backgroundColor: palette.bgSurface, color: palette.textPrimary }}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isCreatingType}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold transition" style={{ color: palette.textSecondary }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateType}
                  disabled={isCreatingType || !newTypeInput.trim()}
                  className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: palette.accentPrimary, color: '#fff', boxShadow: palette.shadowGlow }}
                >
                  {isCreatingType ? 'Creating...' : 'Create Type'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          color: ${palette.accentLight};
        }
      `}</style>
    </div>
  )
}

export default CreateGroupPage
