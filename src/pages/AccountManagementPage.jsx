import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  BookOpen,
  KeyRound,
  Pencil,
  Upload,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCog,
  Users2,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import RichTextEditor from '../components/RichTextEditor'
import { onboardingCommonFields, onboardingRoleFields, onboardingRoles } from '../data/onboarding'
import { deleteStoredBlog, getStoredBlogs, updateStoredBlog } from '../utils/blogStore'
import { deleteStoredGroup, getStoredGroups, updateStoredGroup } from '../utils/groupStore'

const storageKey = 'qsphere_onboarding_profile'
const prefsStorageKey = 'qsphere_account_preferences'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const readStoredPrefs = () => {
  try {
    const raw = localStorage.getItem(prefsStorageKey)
    return raw
      ? JSON.parse(raw)
      : {
          emailUpdates: true,
          groupInvites: true,
          marketingEmails: false,
          assistantTips: true,
        }
  } catch {
    return {
      emailUpdates: true,
      groupInvites: true,
      marketingEmails: false,
      assistantTips: true,
    }
  }
}

const getCompletion = (profile, roleFields) => {
  if (!profile) return 0
  const requiredCommon = ['fullName', ...onboardingCommonFields.filter((f) => f.required).map((f) => f.name)]
  const requiredRole = roleFields.filter((f) => f.required).map((f) => f.name)
  const required = [...requiredCommon, ...requiredRole]
  const filled = required.filter((key) => String(profile[key] ?? '').trim().length > 0).length
  return required.length ? Math.round((filled / required.length) * 100) : 100
}

const fieldLabelMap = {
  fullName: 'Full Name',
  roleLabel: 'Role',
  submittedAt: 'Joined',
}

const inputClassName =
  'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)] disabled:opacity-70'

const cardClassName =
  'rounded-3xl border border-white/[0.08] bg-white/[0.05] p-6 shadow-[0_20px_70px_-35px_rgba(0,0,0,0.8)] backdrop-blur-2xl'

const tabButtonClassName = (active) =>
  `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
    active
      ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
      : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white'
  }`

const makeBlogDraft = (blog) => ({
  id: blog?.id ?? null,
  title: blog?.title ?? '',
  category: blog?.category ?? '',
  readTime: blog?.readTime ?? '',
  excerpt: blog?.excerpt ?? '',
  image: typeof blog?.image === 'string' ? blog.image : '',
  author: blog?.author ?? '',
  body: blog?.body ?? '',
})

const makeGroupDraft = (group) => ({
  id: group?.id ?? null,
  title: group?.title ?? '',
  description: group?.description ?? '',
  owner: group?.owner ?? '',
  avatar: group?.avatar ?? '',
})

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

const ToggleRow = ({ label, description, checked, onChange, disabled }) => (
  <label className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
    <div>
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="mt-1 text-xs text-white/45">{description}</div>
    </div>
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative mt-0.5 h-7 w-12 rounded-full border transition ${
        checked
          ? 'border-emerald-400/50 bg-emerald-500/35'
          : 'border-white/20 bg-white/10'
      } ${disabled ? 'cursor-not-allowed' : ''}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  </label>
)

const AccountManagementPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const initialProfile = location.state?.profile ?? readStoredProfile()
  const initialBlogs = useMemo(() => getStoredBlogs(), [])
  const initialGroups = useMemo(() => getStoredGroups(), [])

  const [profile, setProfile] = useState(initialProfile)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [prefs, setPrefs] = useState(readStoredPrefs)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [activeTab, setActiveTab] = useState('account')
  const [blogs, setBlogs] = useState(initialBlogs)
  const [groups, setGroups] = useState(initialGroups)
  const [selectedBlogId, setSelectedBlogId] = useState(initialBlogs[0]?.id ?? null)
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroups[0]?.id ?? null)
  const [blogDraft, setBlogDraft] = useState(() => makeBlogDraft(initialBlogs[0]))
  const [groupDraft, setGroupDraft] = useState(() => makeGroupDraft(initialGroups[0]))
  const [blogSaving, setBlogSaving] = useState(false)
  const [groupSaving, setGroupSaving] = useState(false)

  const roleConfig = useMemo(() => {
    if (!profile?.role) return onboardingRoles[0]
    return onboardingRoles.find((role) => role.id === profile.role) ?? onboardingRoles[0]
  }, [profile])

  const selectedBlog = useMemo(
    () => blogs.find((blog) => blog.id === selectedBlogId) ?? null,
    [blogs, selectedBlogId],
  )

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  )

  const roleFields = onboardingRoleFields[roleConfig.id] ?? []
  const completion = getCompletion(profile, roleFields)

  useEffect(() => {
    setBlogDraft(makeBlogDraft(selectedBlog))
  }, [selectedBlog])

  useEffect(() => {
    setGroupDraft(makeGroupDraft(selectedGroup))
  }, [selectedGroup])

  const handleProfileFieldChange = (fieldName, value) => {
    setProfile((current) => ({ ...current, [fieldName]: value }))
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      handleProfileFieldChange('avatarPreview', String(reader.result || ''))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    if (!profile?.fullName?.trim()) {
      setMessage('Full name is required to save profile changes.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      localStorage.setItem(storageKey, JSON.stringify(profile))
      localStorage.setItem(prefsStorageKey, JSON.stringify(prefs))
    } catch {
      // localStorage may be blocked in strict privacy mode.
    }

    await new Promise((resolve) => window.setTimeout(resolve, 500))
    setSaving(false)
    setEditing(false)
    setMessage('Account settings updated successfully.')
  }

  const handleChangePassword = () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setMessage('Please complete all password fields.')
      return
    }
    if (passwordForm.next.length < 8) {
      setMessage('New password must be at least 8 characters.')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setMessage('New password and confirm password do not match.')
      return
    }

    setPasswordForm({ current: '', next: '', confirm: '' })
    setMessage('Password change request captured. Connect backend API to finalize updates.')
  }

  const handleSaveBlog = () => {
    if (!blogDraft.id) return
    if (!blogDraft.title.trim() || !blogDraft.category.trim() || !blogDraft.excerpt.trim()) {
      setMessage('Please complete the blog title, category, and excerpt before saving.')
      return
    }

    setBlogSaving(true)
    const updated = updateStoredBlog(blogDraft.id, {
      title: blogDraft.title.trim(),
      category: blogDraft.category.trim(),
      readTime: blogDraft.readTime.trim() || selectedBlog?.readTime || '5 min read',
      excerpt: blogDraft.excerpt.trim(),
      image: blogDraft.image.trim() || selectedBlog?.image || '',
      author: blogDraft.author.trim() || 'QSphere Team',
      body: blogDraft.body.trim(),
    })

    setBlogs(getStoredBlogs())
    if (updated) {
      setSelectedBlogId(updated.id)
      setMessage('Blog updated successfully.')
    } else {
      setMessage('Blog update failed.')
    }
    setBlogSaving(false)
  }

  const handleDeleteBlog = () => {
    if (!selectedBlog || !window.confirm(`Delete "${selectedBlog.title}"? This cannot be undone.`)) {
      return
    }

    const success = deleteStoredBlog(selectedBlog.id)
    if (success) {
      const refreshed = getStoredBlogs()
      setBlogs(refreshed)
      setSelectedBlogId(refreshed[0]?.id ?? null)
      setMessage('Blog deleted successfully.')
    } else {
      setMessage('Blog delete failed.')
    }
  }

  const handleSaveGroup = () => {
    if (!groupDraft.id) return
    if (!groupDraft.title.trim() || !groupDraft.description.trim()) {
      setMessage('Please complete the group title and description before saving.')
      return
    }

    setGroupSaving(true)
    const updated = updateStoredGroup(groupDraft.id, {
      title: groupDraft.title.trim(),
      description: groupDraft.description.trim(),
      owner: groupDraft.owner.trim() || 'QSphere Member',
      avatar: groupDraft.avatar.trim(),
    })

    setGroups(getStoredGroups())
    if (updated) {
      setSelectedGroupId(updated.id)
      setMessage('Group updated successfully.')
    } else {
      setMessage('Group update failed.')
    }
    setGroupSaving(false)
  }

  const handleDeleteGroup = () => {
    if (!selectedGroup || !window.confirm(`Delete "${selectedGroup.title}"? This cannot be undone.`)) {
      return
    }

    const success = deleteStoredGroup(selectedGroup.id)
    if (success) {
      const refreshed = getStoredGroups()
      setGroups(refreshed)
      setSelectedGroupId(refreshed[0]?.id ?? null)
      setMessage('Group deleted successfully.')
    } else {
      setMessage('Group delete failed.')
    }
  }

  const handleGroupAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const dataUrl = await fileToDataUrl(file)
      setGroupDraft((prev) => ({ ...prev, avatar: dataUrl }))
      setMessage('Group avatar image loaded. Save the group to keep it.')
    } catch {
      setMessage('Unable to read the selected avatar image.')
    }
  }

  const handleBlogCoverUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const dataUrl = await fileToDataUrl(file)
      setBlogDraft((prev) => ({ ...prev, image: dataUrl }))
      setMessage('Blog cover image loaded. Save the blog to keep it.')
    } catch {
      setMessage('Unable to read the selected cover image.')
    }
  }

  if (!profile) {
    return (
      <div className="relative min-h-screen bg-[#08120d] text-white">
        <Navbar currentPage="dashboard" />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0 bg-[#08120d]" />
          <div
            className="absolute inset-0 opacity-45"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
          />
        </div>

        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-28 sm:px-8">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-8 text-center shadow-[0_30px_90px_-35px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
              <UserCog size={24} />
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight">Account management needs profile data</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/55">
              Complete onboarding first, then return here to manage your account information and security preferences.
            </p>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
            >
              Go to onboarding
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#08120d] text-white">
      <Navbar currentPage="dashboard" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#08120d]" />
        <div
          className="absolute inset-0 opacity-45"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 65%)' }}
        />
        <div
          className="absolute inset-0 opacity-24"
          style={{ background: 'radial-gradient(circle at 100% 100%, rgba(6,182,212,0.16) 0%, transparent 50%)' }}
        />
      </div>

      <main className="relative z-10 w-full px-6 py-28 sm:px-8 lg:px-10">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/75 transition hover:border-emerald-400/30 hover:text-emerald-300"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </button>

        <section className="mb-6 rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-6 shadow-[0_30px_90px_-35px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Account management</div>
              <h1 className="mt-2 text-4xl font-black tracking-tight">Manage your account</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/55">
                Switch between account, blog, and group management without leaving this page.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                >
                  <User size={16} />
                  Edit profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setProfile(readStoredProfile())
                      setPrefs(readStoredPrefs())
                      setEditing(false)
                      setMessage('')
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveProfile}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { id: 'account', label: 'Account', icon: UserCog },
              { id: 'blogs', label: 'Blog management', icon: BookOpen },
              { id: 'groups', label: 'Group management', icon: Users2 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setMessage('')
                }}
                className={tabButtonClassName(activeTab === tab.id)}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Role', value: roleConfig.label, icon: Sparkles },
              {
                label: 'Profile completion',
                value: `${completion}%`,
                icon: CheckCircle2,
              },
              {
                label: 'Joined',
                value: profile.submittedAt ? new Date(profile.submittedAt).toLocaleDateString() : 'N/A',
                icon: ShieldCheck,
              },
              { label: 'Status', value: 'Active', icon: Bell },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-emerald-300">
                  <item.icon size={16} />
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">{item.label}</div>
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}
        </section>

        {activeTab === 'account' ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className={cardClassName}>
              <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Personal information</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { key: 'fullName', type: 'text', required: true },
                  { key: 'gender', type: 'select', options: ['Male', 'Female', 'Prefer not to say'] },
                  { key: 'dob', type: 'date' },
                  { key: 'city', type: 'text' },
                ].map((field) => (
                  <div key={field.key} className={field.key === 'address' ? 'sm:col-span-2' : ''}>
                    <label className="text-sm text-white/70">
                      {fieldLabelMap[field.key] || onboardingCommonFields.find((f) => f.name === field.key)?.label || field.key}
                      {field.required ? <span className="text-emerald-300"> *</span> : null}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={profile[field.key] ?? ''}
                        onChange={(event) => handleProfileFieldChange(field.key, event.target.value)}
                        disabled={!editing}
                        className={inputClassName}
                      >
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={profile[field.key] ?? ''}
                        onChange={(event) => handleProfileFieldChange(field.key, event.target.value)}
                        disabled={!editing}
                        className={inputClassName}
                      />
                    )}
                  </div>
                ))}

                <div className="sm:col-span-2">
                  <label className="text-sm text-white/70">Address</label>
                  <textarea
                    rows={3}
                    value={profile.address ?? ''}
                    onChange={(event) => handleProfileFieldChange('address', event.target.value)}
                    disabled={!editing}
                    className={`${inputClassName} resize-none`}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm text-white/80">Profile photo</div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
                    {profile.avatarPreview ? (
                      <img src={profile.avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No image</div>
                    )}
                  </div>
                  {editing ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20">
                      Upload image
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  ) : (
                    <div className="text-xs text-white/45">Enable edit mode to change avatar.</div>
                  )}
                </div>
              </div>
            </div>

            <div className={cardClassName}>
              <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Contact information</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {['email', 'cellMain', 'cellAlt', 'cnic', 'passportNo'].map((key) => {
                  const field = onboardingCommonFields.find((f) => f.name === key)
                  return (
                    <div key={key}>
                      <label className="text-sm text-white/70">{field?.label || key}</label>
                      <input
                        type={field?.type || 'text'}
                        value={profile[key] ?? ''}
                        onChange={(event) => handleProfileFieldChange(key, event.target.value)}
                        disabled={!editing}
                        className={inputClassName}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={cardClassName}>
              <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Role-specific information</div>
              <div className="mt-2 text-sm text-white/45">Current role: <span className="text-emerald-300">{roleConfig.label}</span></div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {roleFields.map((field) => (
                  <div key={field.name} className={field.type === 'textarea' || field.span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="text-sm text-white/70">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={profile[field.name] ?? ''}
                        onChange={(event) => handleProfileFieldChange(field.name, event.target.value)}
                        disabled={!editing}
                        className={`${inputClassName} resize-none`}
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={profile[field.name] ?? ''}
                        onChange={(event) => handleProfileFieldChange(field.name, event.target.value)}
                        disabled={!editing}
                        className={inputClassName}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={cardClassName}>
              <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Security & preferences</div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-white">
                  <KeyRound size={16} className="text-emerald-300" />
                  <div className="text-sm font-semibold">Change password</div>
                </div>
                <div className="grid gap-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={passwordForm.current}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, current: event.target.value }))}
                    className={inputClassName}
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={passwordForm.next}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, next: event.target.value }))}
                    className={inputClassName}
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordForm.confirm}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))}
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/12 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                  >
                    Update password
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <ToggleRow
                  label="Email updates"
                  description="Receive updates about account activity and platform changes."
                  checked={prefs.emailUpdates}
                  onChange={() => editing && setPrefs((prev) => ({ ...prev, emailUpdates: !prev.emailUpdates }))}
                  disabled={!editing}
                />
                <ToggleRow
                  label="Group invitations"
                  description="Get notified when someone invites you to a group."
                  checked={prefs.groupInvites}
                  onChange={() => editing && setPrefs((prev) => ({ ...prev, groupInvites: !prev.groupInvites }))}
                  disabled={!editing}
                />
                <ToggleRow
                  label="Product announcements"
                  description="Receive occasional release notes and improvements."
                  checked={prefs.marketingEmails}
                  onChange={() => editing && setPrefs((prev) => ({ ...prev, marketingEmails: !prev.marketingEmails }))}
                  disabled={!editing}
                />
                <ToggleRow
                  label="Qubi assistant tips"
                  description="Show proactive hints from Qubi while browsing dashboard pages."
                  checked={prefs.assistantTips}
                  onChange={() => editing && setPrefs((prev) => ({ ...prev, assistantTips: !prev.assistantTips }))}
                  disabled={!editing}
                />
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'blogs' ? (
          <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className={cardClassName}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Blog management</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Manage blog content</h2>
                </div>
                <BookOpen size={18} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-sm text-white/50">
                Select a post to edit its title, metadata, excerpt, and body content, then save or delete it.
              </p>

              <div className="mt-5 space-y-3">
                {blogs.map((blog) => (
                  <button
                    key={blog.id}
                    type="button"
                    onClick={() => setSelectedBlogId(blog.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedBlogId === blog.id
                        ? 'border-emerald-400/30 bg-emerald-500/12'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{blog.title}</div>
                        <div className="mt-1 text-xs text-white/45">{blog.category} · {blog.readTime || 'No read time'}</div>
                      </div>
                      <Pencil size={14} className="mt-0.5 text-emerald-300/70" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={cardClassName}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Selected blog</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">{selectedBlog?.title || 'No blog selected'}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveBlog}
                    disabled={blogSaving || !selectedBlog}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Save size={16} />
                    {blogSaving ? 'Saving...' : 'Save blog'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteBlog}
                    disabled={!selectedBlog}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              {selectedBlog ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-white/70">Title</label>
                    <input
                      type="text"
                      value={blogDraft.title}
                      onChange={(event) => setBlogDraft((prev) => ({ ...prev, title: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Category</label>
                    <input
                      type="text"
                      value={blogDraft.category}
                      onChange={(event) => setBlogDraft((prev) => ({ ...prev, category: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Read time</label>
                    <input
                      type="text"
                      value={blogDraft.readTime}
                      onChange={(event) => setBlogDraft((prev) => ({ ...prev, readTime: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Author</label>
                    <input
                      type="text"
                      value={blogDraft.author}
                      onChange={(event) => setBlogDraft((prev) => ({ ...prev, author: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-white/70">Excerpt</label>
                    <textarea
                      rows={3}
                      value={blogDraft.excerpt}
                      onChange={(event) => setBlogDraft((prev) => ({ ...prev, excerpt: event.target.value }))}
                      className={`${inputClassName} resize-none`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-white/70">Cover image URL or data URI</label>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="h-24 w-36 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
                          {blogDraft.image ? (
                            <img src={blogDraft.image} alt={blogDraft.title || 'Blog cover'} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No cover</div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3">
                          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20">
                            <Upload size={16} />
                            Upload cover
                            <input type="file" accept="image/*" className="hidden" onChange={handleBlogCoverUpload} />
                          </label>
                          <input
                            type="text"
                            value={blogDraft.image}
                            onChange={(event) => setBlogDraft((prev) => ({ ...prev, image: event.target.value }))}
                            className={inputClassName}
                            placeholder="Or paste a cover URL"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-white/70">Body</label>
                    <div className="mt-2">
                      <RichTextEditor
                        value={blogDraft.body}
                        onChange={(nextBody) => setBlogDraft((prev) => ({ ...prev, body: nextBody }))}
                        placeholder="Edit the article body with the same rich editor used on the add blog page..."
                        minHeight={420}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/60">
                  No blog records available.
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'groups' ? (
          <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className={cardClassName}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Group management</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Manage groups</h2>
                </div>
                <Users2 size={18} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-sm text-white/50">
                Review group details, update descriptions, and remove groups you no longer need.
              </p>

              <div className="mt-5 space-y-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedGroupId === group.id
                        ? 'border-emerald-400/30 bg-emerald-500/12'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{group.title}</div>
                        <div className="mt-1 text-xs text-white/45">{group.owner}</div>
                      </div>
                      <Pencil size={14} className="mt-0.5 text-emerald-300/70" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={cardClassName}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Selected group</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">{selectedGroup?.title || 'No group selected'}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGroup}
                    disabled={groupSaving || !selectedGroup}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Save size={16} />
                    {groupSaving ? 'Saving...' : 'Save group'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    disabled={!selectedGroup}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              {selectedGroup ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-white/70">Title</label>
                    <input
                      type="text"
                      value={groupDraft.title}
                      onChange={(event) => setGroupDraft((prev) => ({ ...prev, title: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Owner</label>
                    <input
                      type="text"
                      value={groupDraft.owner}
                      onChange={(event) => setGroupDraft((prev) => ({ ...prev, owner: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-white/70">Description</label>
                    <textarea
                      rows={4}
                      value={groupDraft.description}
                      onChange={(event) => setGroupDraft((prev) => ({ ...prev, description: event.target.value }))}
                      className={`${inputClassName} resize-none`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-white/70">Avatar image</label>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
                          {groupDraft.avatar ? (
                            <img src={groupDraft.avatar} alt={groupDraft.title || 'Group avatar'} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No image</div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3">
                          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20">
                            <Upload size={16} />
                            Upload avatar
                            <input type="file" accept="image/*" className="hidden" onChange={handleGroupAvatarUpload} />
                          </label>
                          <input
                            type="text"
                            value={groupDraft.avatar}
                            onChange={(event) => setGroupDraft((prev) => ({ ...prev, avatar: event.target.value }))}
                            className={inputClassName}
                            placeholder="Or paste an avatar URL"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/60">
                  No group records available.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}

export default AccountManagementPage