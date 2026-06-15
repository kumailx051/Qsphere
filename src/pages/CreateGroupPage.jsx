import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Users2, Sparkles } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import GhostInput from '../components/GhostInput'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem('qsphere_onboarding_profile')
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

const CreateGroupPage = () => {
  const navigate = useNavigate()
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
      .catch(err => console.error(err))
  }, [navigate])

  const handleTypeChange = async (event) => {
    const val = event.target.value
    if (val === '_new_') {
      setNewTypeInput('')
      setShowModal(true)
      // reset dropdown temporarily so it doesn't get stuck on '_new_' if they cancel
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
    } catch (err) {
      console.error(err)
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
    } catch (err) {
      console.error(err)
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
    } catch (error) {
      console.error('Failed to generate description:', error)
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
        } catch(err) {}
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
        } catch(e) {}
        throw new Error(errStr)
      }

      setMessage('Group created successfully!')
      setTimeout(() => {
        navigate('/groups')
      }, 1000)
    } catch (error) {
      console.error(error)
      setErrorMsg(error.message || 'Failed to create group.')
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#08120d] text-white">
      <Navbar currentPage="groups" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#08120d]" />
        <div
          className="absolute inset-0 opacity-45"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 65%)' }}
        />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-28 sm:px-8">
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 hover:border-emerald-400/30 hover:text-emerald-300 transition"
        >
          <ArrowLeft size={16} />
          Back to groups
        </button>

        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-6 shadow-[0_30px_90px_-35px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
              <Users2 size={20} />
            </span>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Create Group</div>
              <h1 className="text-3xl font-black tracking-tight text-white">Add Group</h1>
            </div>
          </div>

          {/* Info cards removed per UX update */}

          {/* Error Message */}
          {errorMsg ? (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">!</span>
              {errorMsg}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-white/80">Select Group Type:</label>
              <select
                value={groupType}
                onChange={handleTypeChange}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08]"
              >
                {groupTypes.map((type) => (
                  <option key={type} value={type} className="text-black">
                    {type}
                  </option>
                ))}
                <option value="_new_" className="text-black italic font-semibold">
                  + Create new type...
                </option>
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm text-white/80">Group Title:</label>
                <button
                  type="button"
                  onClick={handleOptimizeTitle}
                  disabled={!groupTitle.trim() || isOptimizingTitle}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition"
                >
                  <Sparkles size={14} />
                  {isOptimizingTitle ? 'Optimizing...' : 'AI Optimize (Under 10 words)'}
                </button>
              </div>
              <div className="w-full rounded-2xl border border-white/10 bg-white/[0.05] text-sm text-white transition focus-within:border-emerald-400/40 focus-within:bg-white/[0.08]">
                <GhostInput
                  value={groupTitle}
                  onChange={(v) => setGroupTitle(v)}
                  placeholder="Enter group title"
                  className="w-full px-4 py-3"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm text-white/80">Short Description:</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={!groupTitle.trim() || isGeneratingDescription}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition"
                >
                  <Sparkles size={14} />
                  {isGeneratingDescription ? 'Generating...' : 'AI Generate'}
                </button>
              </div>
              <textarea
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                placeholder="Enter a short description for your group"
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08] resize-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/80">Group Scope:</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={groupScope}
                  onChange={handleScopeChange}
                  onKeyDown={handleScopeKeyDown}
                  placeholder="Enter group scope"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 pr-[140px] text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08]"
                />
                {suggestion && (
                  <div className="absolute right-3 pointer-events-none flex items-center gap-2">
                    <span className="text-xs text-white/40 italic truncate max-w-[120px]">...{suggestion}</span>
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">Tab to accept</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3.5 text-sm font-semibold text-black shadow-[0_14px_40px_-12px_rgba(16,185,129,0.65)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Creating...' : 'Submit'}
            </button>
          </form>
        </section>
      </main>

      {/* Success Snackbar */}
      {message && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-5 z-50 rounded-full bg-emerald-500/90 px-6 py-3 text-sm font-medium text-white shadow-lg backdrop-blur flex items-center gap-2">
          <CheckCircle2 size={16} className="text-white/80" />
          {message}
        </div>
      )}

      {/* Custom Modal for New Group Type */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f0a] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8">
              <h3 className="mb-2 text-xl font-bold text-white">Create New Group Type</h3>
              <p className="mb-6 text-sm text-white/50">Enter the name for the new custom group category you want to create.</p>
              
              <div className="mb-6">
                <input
                  type="text"
                  autoFocus
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isCreatingType}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateType}
                  disabled={isCreatingType || !newTypeInput.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingType ? 'Creating...' : 'Create Type'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default CreateGroupPage