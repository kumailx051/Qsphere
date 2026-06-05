import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Users2, Sparkles, ShieldCheck } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { saveNewGroup } from '../utils/groupStore'

const groupTypes = ['Study', 'Research', 'Research & Development', 'Product & development']

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
  const [groupScope, setGroupScope] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!groupTitle.trim() || !groupScope.trim()) {
      setMessage('Please complete the group title and scope.')
      return
    }

    setSaving(true)

    const profile = readStoredProfile()

    const nextGroup = {
      type: groupType,
      title: groupTitle.trim(),
      description: groupScope.trim(),
      scope: groupScope.trim(),
      status: 'Active',
      owner: profile?.fullName?.trim() || 'QSphere Member',
      avatar: profile?.fullName
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.fullName.trim())}`
        : '',
      createdAt: new Date().toISOString(),
    }

    try {
      saveNewGroup(nextGroup)
    } catch (error) {
      // localStorage may be unavailable in restricted contexts.
    }

    await new Promise((resolve) => window.setTimeout(resolve, 500))
    setSaving(false)
    navigate('/groups')
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

          {message ? (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <CheckCircle2 size={18} />
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-white/80">Select Group Type:</label>
              <select
                value={groupType}
                onChange={(event) => setGroupType(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08]"
              >
                {groupTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/80">Group Title:</label>
              <input
                type="text"
                value={groupTitle}
                onChange={(event) => setGroupTitle(event.target.value)}
                placeholder="Enter group title"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/80">Group Scope:</label>
              <input
                type="text"
                value={groupScope}
                onChange={(event) => setGroupScope(event.target.value)}
                placeholder="Enter group scope"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08]"
              />
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

      <Footer />
    </div>
  )
}

export default CreateGroupPage