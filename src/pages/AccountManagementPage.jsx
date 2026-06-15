import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  Bold,
  BookOpen,
  CheckCircle2,
  Eraser,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  KeyRound,
  List,
  ListOrdered,
  Pencil,
  Quote,
  RotateCcw,
  RotateCw,
  Save,
  ShieldCheck,
  Sparkles,
  Text,
  Trash2,
  Underline,
  Upload,
  User,
  UserCog,
  Users2,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { onboardingCommonFields, onboardingRoleFields, onboardingRoles } from '../data/onboarding'

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

  const mapKey = (key) => {
    if (key === 'email') return 'emailAddress'
    if (key === 'dob') return 'dateOfBirth'
    if (key === 'cellAlt') return 'cellAlternative'
    return key
  }

  const requiredCommon = ['fullName', ...onboardingCommonFields.filter((f) => f.required).map((f) => mapKey(f.name))]
  const requiredRole = roleFields.filter((f) => f.required).map((f) => mapKey(f.name))
  const required = [...requiredCommon, ...requiredRole]
  const filled = required.filter((key) => String(profile[key] ?? '').trim().length > 0).length
  return required.length ? Math.round((filled / required.length) * 100) : 100
}

const fieldLabelMap = {
  fullName: 'Full Name',
  roleLabel: 'Role',
  submittedAt: 'Joined',
  dateOfBirth: 'D.O.B',
  emailAddress: 'Email',
  cellAlternative: 'Cell No. (Alternative)',
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
  excerpt: blog?.excerpt ?? '',
  image: typeof blog?.coverImage === 'string' ? blog.coverImage : (typeof blog?.image === 'string' ? blog.image : ''),
  body: blog?.blogData ?? blog?.body ?? '',
})

const makeGroupDraft = (group) => ({
  id: group?.id ?? null,
  title: group?.groupTitle ?? group?.title ?? '',
  description: group?.groupScope ?? group?.description ?? '',
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

  const [profile, setProfile] = useState(initialProfile || {})
  const [profileLoading, setProfileLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [prefs, setPrefs] = useState(readStoredPrefs)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [activeTab, setActiveTab] = useState('account')
  const [blogs, setBlogs] = useState([])
  const [groups, setGroups] = useState([])
  
  useEffect(() => {
    const logged = localStorage.getItem('qsphere_logged_in') === '1'
    if (!logged) {
      navigate('/auth', { state: { redirectTo: '/account' } })
    }
  }, [navigate])
  const [selectedBlogId, setSelectedBlogId] = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [blogDraft, setBlogDraft] = useState(() => makeBlogDraft(null))
  const [groupDraft, setGroupDraft] = useState(() => makeGroupDraft(null))
  const [categories, setCategories] = useState([])
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef(null)
  // Editor state for inline rich text
  const editorRef = useRef(null)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [activeTags, setActiveTags] = useState(['P'])

  // Link modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkRel, setLinkRel] = useState('dofollow')
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true)
  const savedRangeRef = useRef(null)

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
    const fetchProfile = async () => {
      const email = initialProfile?.emailAddress || initialProfile?.email || localStorage.getItem('qsphere_email_to_verify')
      if (!email) {
        setProfileLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/users/profile/${encodeURIComponent(email)}`)
        if (res.ok) {
          const user = await res.json()
          setProfile(user)
        }
      } catch (err) {
        console.error('Failed to fetch profile', err)
      } finally {
        setProfileLoading(false)
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    const fetchUserBlogs = async () => {
      let email = profile?.email || profile?.emailAddress || localStorage.getItem('qsphere_email_to_verify')
      if (!email) return
      
      try {
        const res = await fetch(`/api/blogs/user/${email}`)
        if (res.ok) {
          const data = await res.json()
          setBlogs(data)
          if (data.length > 0 && !selectedBlogId) {
            setSelectedBlogId(data[0].id)
          }
        }
      } catch (e) {
        // ignore
      }
    }
    fetchUserBlogs()
  }, [profile])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetch('/api/blog-categories')
      .then(res => res.ok ? res.json() : [])
      .then(data => setCategories(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchUserGroups = async () => {
      let email = profile?.email || profile?.emailAddress || localStorage.getItem('qsphere_email_to_verify')
      if (!email) return
      
      try {
        const res = await fetch(`/api/groups/my/${encodeURIComponent(email)}`)
        if (res.ok) {
          const data = await res.json()
          setGroups(data)
          if (data.length > 0 && !selectedGroupId) {
            setSelectedGroupId(data[0].id)
          }
        }
      } catch (e) {
        // ignore
      }
    }
    fetchUserGroups()
  }, [profile])

  // Fetch full blog detail (including blogData) when a blog is selected
  useEffect(() => {
    if (!selectedBlogId) return
    let cancelled = false
    const fetchFullBlog = async () => {
      try {
        const res = await fetch(`/api/blogs/${selectedBlogId}`)
        if (res.ok) {
          const full = await res.json()
          if (cancelled) return
          const draft = makeBlogDraft(full)
          setBlogDraft(draft)
        }
      } catch (e) {
        // ignore
      }
    }
    fetchFullBlog()
    return () => { cancelled = true }
  }, [selectedBlogId])

  // Sync editor content when blogDraft.body changes OR selectedBlogId changes.
  // activeTab is also needed because the editor is only mounted when
  // activeTab === 'blogs'. Without it, the effect fires before the
  // editor exists (while the user is on the Account tab).
  useEffect(() => {
    if (!editorRef.current) return
    const body = blogDraft.body || ''
    const current = editorRef.current.innerHTML || ''
    if (current !== body) {
      editorRef.current.innerHTML = body
    }
  }, [selectedBlogId, blogDraft.body, activeTab])

  useEffect(() => {
    setGroupDraft(makeGroupDraft(selectedGroup))
  }, [selectedGroup])

  const handleProfileFieldChange = (fieldName, value) => {
    let formattedValue = value

    if (fieldName === 'cellMain' || fieldName === 'cellAlternative' || fieldName === 'cellAlt') {
      const digits = value.replace(/\D/g, '')
      if (digits.length <= 4) {
        formattedValue = digits
      } else {
        formattedValue = `${digits.slice(0, 4)}-${digits.slice(4, 11)}`
      }
    } else if (fieldName === 'cnic') {
      const digits = value.replace(/\D/g, '')
      if (digits.length <= 5) {
        formattedValue = digits
      } else if (digits.length <= 12) {
        formattedValue = `${digits.slice(0, 5)}-${digits.slice(5, 12)}`
      } else {
        formattedValue = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`
      }
    }

    setProfile((current) => ({ ...current, [fieldName]: formattedValue }))
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
      const email = profile?.emailAddress || profile?.email || localStorage.getItem('qsphere_email_to_verify')
      const payload = {
        ...profile,
        emailAddress: email
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const { user } = await res.json()
        setProfile(user)
        try {
          localStorage.setItem(prefsStorageKey, JSON.stringify(prefs))
        } catch {
          // ignore
        }
        setMessage('Account settings updated successfully.')
        setEditing(false)
      } else {
        const data = await res.json()
        setMessage(data.error || 'Failed to update profile.')
      }
    } catch {
      setMessage('Network error. Failed to update profile.')
    }

    setSaving(false)
  }

  const handleChangePassword = async () => {
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

    try {
      const email = profile?.emailAddress || profile?.email || localStorage.getItem('qsphere_email_to_verify')
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAddress: email,
          currentPassword: passwordForm.current,
          newPassword: passwordForm.next
        })
      })

      if (res.ok) {
        setPasswordForm({ current: '', next: '', confirm: '' })
        
        // Show success snackbar element if it exists in DOM or just set message
        setMessage('Password changed successfully.')
        
        // Find existing snackbar element if any, or create a simple temporary one
        const snackbar = document.createElement('div')
        snackbar.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-emerald-400/20 bg-emerald-500/90 backdrop-blur px-6 py-3 text-sm font-semibold text-white shadow-lg animate-in slide-in-from-bottom-5'
        snackbar.innerText = 'Password changed successfully.'
        document.body.appendChild(snackbar)
        setTimeout(() => snackbar.remove(), 4000)
      } else {
        const data = await res.json()
        setMessage(data.error || 'Failed to change password.')
      }
    } catch {
      setMessage('Network error. Failed to change password.')
    }
  }

  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value)
    if (editorRef.current) editorRef.current.focus()
    handleEditorChange()
  }

  // Link Modal Operations
  const insertLink = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0)
    }
    // Detect if selection is inside an existing link
    let existingUrl = ''
    let existingRel = 'dofollow'
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode
      while (node && node !== editorRef.current) {
        if (node.tagName === 'A') {
          existingUrl = node.getAttribute('href') || ''
          existingRel = (node.getAttribute('rel') || '').includes('nofollow') ? 'nofollow' : 'dofollow'
          break
        }
        node = node.parentElement
      }
    }
    setLinkUrl(existingUrl && /^https?:\/\//.test(existingUrl) ? existingUrl : (existingUrl ? 'https://' + existingUrl : 'https://'))
    setLinkRel(existingRel)
    setLinkOpenInNewTab(true)
    setLinkModalOpen(true)
  }

  const applyLink = () => {
    if (!editorRef.current) return
    editorRef.current.focus()

    const sel = window.getSelection()
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }

    if (!linkUrl) {
      setLinkModalOpen(false)
      return
    }

    const targetAttr = linkOpenInNewTab ? ' target="_blank"' : ''
    const relAttr = linkRel === 'nofollow' ? 'rel="nofollow noopener noreferrer"' : (linkOpenInNewTab ? 'rel="noopener noreferrer"' : '')

    if (sel && sel.isCollapsed) {
      const htmlText = `<a href="${linkUrl}"${targetAttr} ${relAttr}>${linkUrl}</a>`
      document.execCommand('insertHTML', false, htmlText)
    } else {
      document.execCommand('createLink', false, linkUrl)

      let anchorEl = null
      if (sel && sel.anchorNode) {
        let node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode
        while (node && node !== editorRef.current) {
          if (node.tagName === 'A') { anchorEl = node; break }
          node = node.parentElement
        }
      }
      if (anchorEl) {
        if (linkOpenInNewTab) {
          anchorEl.setAttribute('target', '_blank')
        } else {
          anchorEl.removeAttribute('target')
        }
        if (linkRel === 'nofollow') {
          anchorEl.setAttribute('rel', 'nofollow noopener noreferrer')
        } else if (linkOpenInNewTab) {
          anchorEl.setAttribute('rel', 'noopener noreferrer')
        } else {
          anchorEl.removeAttribute('rel')
        }
      }
    }

    handleEditorChange()
    setLinkModalOpen(false)
    setLinkUrl('')
    setLinkRel('dofollow')
    setLinkOpenInNewTab(true)
    savedRangeRef.current = null
  }

  const cancelLink = () => {
    setLinkModalOpen(false)
    setLinkUrl('')
    setLinkRel('dofollow')
    setLinkOpenInNewTab(true)
    savedRangeRef.current = null
  }

  const handleEditorChange = () => {
    if (!editorRef.current) return
    const content = editorRef.current.innerHTML || ''
    const text = editorRef.current.innerText || ''

    setBlogDraft((prev) => ({ ...prev, body: content }))

    const titleWords = blogDraft.title.trim().split(/\s+/).filter(Boolean).length
    const excerptWords = blogDraft.excerpt.trim().split(/\s+/).filter(Boolean).length
    const bodyWords = text.trim().split(/\s+/).filter(Boolean).length
    setWordCount(titleWords + excerptWords + bodyWords)
    setCharCount(text.length)

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      let node = selection.anchorNode
      const tags = []
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          tags.unshift(node.nodeName)
        }
        node = node.parentNode
      }
      if (tags.length === 0) tags.push('P')
      setActiveTags(tags)
    }
  }

  const handleSaveBlog = async () => {
    if (!blogDraft.id) return
    if (!blogDraft.title.trim() || !blogDraft.category.trim() || !blogDraft.excerpt.trim()) {
      setMessage('Please complete the blog title, category, and excerpt before saving.')
      return
    }

    setBlogSaving(true)
    const payload = {
      title: blogDraft.title.trim(),
      category: blogDraft.category.trim(),
      excerpt: blogDraft.excerpt.trim(),
      coverImage: blogDraft.image.trim() || selectedBlog?.coverImage || '',
      blogData: blogDraft.body.trim(),
    }

    try {
      const res = await fetch(`/api/blogs/${blogDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const updated = await res.json()
        setBlogs(prev => prev.map(b => b.id === updated.id ? updated : b))
        setSelectedBlogId(updated.id)
        setMessage('Blog updated successfully.')
      } else {
        setMessage('Blog update failed.')
      }
    } catch (e) {
      setMessage('Network error during blog update.')
    }
    setBlogSaving(false)
  }

  const handleDeleteBlog = async () => {
    if (!selectedBlog || !window.confirm(`Delete "${selectedBlog.title}"? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/blogs/${selectedBlog.id}`, { method: 'DELETE' })
      if (res.ok) {
        setBlogs(prev => {
          const refreshed = prev.filter(b => b.id !== selectedBlog.id)
          setSelectedBlogId(refreshed[0]?.id ?? null)
          return refreshed
        })
        setMessage('Blog deleted successfully.')
      } else {
        setMessage('Blog delete failed.')
      }
    } catch (e) {
      setMessage('Network error during blog delete.')
    }
  }

  const handleSaveGroup = async () => {
    if (!groupDraft.id) return
    if (!groupDraft.title.trim() || !groupDraft.description.trim()) {
      setMessage('Please complete the group title and description before saving.')
      return
    }

    setGroupSaving(true)
    const payload = {
      groupTitle: groupDraft.title.trim(),
      groupScope: groupDraft.description.trim()
    }

    try {
      const res = await fetch(`/api/groups/${groupDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const updated = await res.json()
        
        // We only receive the updated row from PUT, which lacks the joined owner/avatar. 
        // We can manually map it back to the existing group state preserving owner/avatar.
        setGroups(prev => prev.map(g => {
          if (g.id === updated.id) {
            return { ...g, groupTitle: updated.groupTitle, groupScope: updated.groupScope }
          }
          return g
        }))
        
        setSelectedGroupId(updated.id)
        setMessage('Group updated successfully.')
      } else {
        setMessage('Group update failed.')
      }
    } catch (e) {
      setMessage('Network error during group update.')
    }
    setGroupSaving(false)
  }

  const handleDeleteGroup = async () => {
    if (!selectedGroup || !window.confirm(`Delete "${selectedGroup.groupTitle || selectedGroup.title}"? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}`, { method: 'DELETE' })
      if (res.ok) {
        setGroups(prev => {
          const refreshed = prev.filter(g => g.id !== selectedGroup.id)
          setSelectedGroupId(refreshed[0]?.id ?? null)
          return refreshed
        })
        setMessage('Group deleted successfully.')
      } else {
        setMessage('Group delete failed.')
      }
    } catch (e) {
      setMessage('Network error during group delete.')
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

  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#030705]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (!profile || Object.keys(profile).length === 0) {
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
                value: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : profile.submittedAt ? new Date(profile.submittedAt).toLocaleDateString() : 'N/A',
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
                  { key: 'dateOfBirth', type: 'date' },
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
                {['emailAddress', 'cellMain', 'cellAlternative', 'cnic', 'passportNo'].map((key) => {
                  const field = onboardingCommonFields.find((f) => f.name === key || (key === 'emailAddress' && f.name === 'email') || (key === 'cellAlternative' && f.name === 'cellAlt') || (key === 'dateOfBirth' && f.name === 'dob'))
                  return (
                    <div key={key}>
                      <label className="text-sm text-white/70">{fieldLabelMap[key] || field?.label || key}</label>
                      <input
                        type={field?.type || 'text'}
                        value={profile[key] ?? ''}
                        onChange={(event) => handleProfileFieldChange(key, event.target.value)}
                        disabled={!editing || key === 'emailAddress'}
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
                        <div className="mt-1 text-xs text-white/45">{blog.category}</div>
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
                    <div className="relative mt-2" ref={categoryRef}>
                      <button
                        type="button"
                        onClick={() => setCategoryOpen(!categoryOpen)}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                      >
                        <span className={categories.some(c => c.name === blogDraft.category) && blogDraft.category ? 'text-white' : 'text-white/60'}>
                          {categories.some(c => c.name === blogDraft.category) && blogDraft.category
                            ? blogDraft.category
                            : blogDraft.category || 'Select a category'}
                        </span>
                        <svg
                          className={`text-white/40 transition-transform ${categoryOpen ? 'rotate-180' : ''}`}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {categoryOpen && (
                        <div                        className="absolute left-0 right-0 z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#08120d]/95 p-1.5 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                          {categories.length === 0 && (
                            <div className="px-3 py-2 text-sm text-white/40">Loading categories…</div>
                          )}
                          {categories.map((cat) => (
                            <button
                              key={cat.id || cat.name}
                              type="button"
                              onClick={() => {
                                setBlogDraft((prev) => ({ ...prev, category: cat.name }))
                                setCategoryOpen(false)
                              }}
                              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                                blogDraft.category === cat.name
                                  ? 'bg-emerald-500/15 text-emerald-200'
                                  : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                          <div className="my-1 border-t border-white/[0.06]" />
                          <button
                            type="button"
                            onClick={() => {
                              setBlogDraft((prev) => ({ ...prev, category: '' }))
                              setCategoryOpen(false)
                            }}
                            className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                              !categories.some(c => c.name === blogDraft.category) && blogDraft.category
                                ? 'bg-emerald-500/15 text-emerald-200'
                                : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            Other…
                          </button>
                        </div>
                      )}
                    </div>
                    {!categories.some(c => c.name === blogDraft.category) && (
                      <input
                        type="text"
                        value={blogDraft.category}
                        onChange={(e) => setBlogDraft((prev) => ({ ...prev, category: e.target.value }))}
                        className={`${inputClassName} mt-2`}
                        placeholder="Type a new category name"
                      />
                    )}
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
                    <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden flex flex-col">
                      {/* TOOLBAR */}
                      <div className="flex flex-wrap items-center gap-1 bg-white/[0.06] border-b border-white/10 p-2 text-white/85">
                        <button type="button" onClick={() => execCmd('bold')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold" title="Bold"><Bold size={15} /></button>
                        <button type="button" onClick={() => execCmd('italic')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Italic"><Italic size={15} /></button>
                        <button type="button" onClick={() => execCmd('underline')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Underline"><Underline size={15} /></button>
                        <span className="w-[1px] h-5 bg-white/10 mx-1" />
                        <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Bullet List"><List size={15} /></button>
                        <button type="button" onClick={() => execCmd('insertOrderedList')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Numbered List"><ListOrdered size={15} /></button>
                        <span className="w-[1px] h-5 bg-white/10 mx-1" />
                        <button type="button" onClick={() => execCmd('formatBlock', '<h1>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 1"><Heading1 size={15} /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', '<h2>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 2"><Heading2 size={15} /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', '<h3>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 3"><Heading3 size={15} /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', '<p>')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Paragraph"><Text size={15} /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', '<blockquote>')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Quote"><Quote size={15} /></button>
                        <span className="w-[1px] h-5 bg-white/10 mx-1" />
                        <button type="button" onClick={() => execCmd('justifyLeft')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Left"><AlignLeft size={15} /></button>
                        <button type="button" onClick={() => execCmd('justifyCenter')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Center"><AlignCenter size={15} /></button>
                        <button type="button" onClick={() => execCmd('justifyRight')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Right"><AlignRight size={15} /></button>
                        <button type="button" onClick={() => execCmd('justifyFull')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Justify"><AlignJustify size={15} /></button>
                        <span className="w-[1px] h-5 bg-white/10 mx-1" />
                        <button type="button" onClick={insertLink} className="p-2 rounded hover:bg-white/5 transition-colors" title="Insert Link"><LinkIcon size={15} /></button>
                        <span className="w-[1px] h-5 bg-white/10 mx-1" />
                        <button type="button" onClick={() => execCmd('undo')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Undo"><RotateCcw size={15} /></button>
                        <button type="button" onClick={() => execCmd('redo')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Redo"><RotateCw size={15} /></button>
                        <button type="button" onClick={() => execCmd('removeFormat')} className="p-2 rounded hover:bg-white/5 text-red-300 transition-colors" title="Clear Formatting"><Eraser size={15} /></button>
                      </div>

                      {/* EDITABLE BODY */}
                      <div
                        ref={editorRef}
                        contentEditable="true"
                        onInput={handleEditorChange}
                        onKeyUp={handleEditorChange}
                        onClick={handleEditorChange}
                        className="w-full min-h-[420px] bg-white/[0.03] text-white p-6 leading-relaxed outline-none focus:bg-white/[0.05] transition-all prose prose-invert max-w-none"
                        style={{ overflowY: 'auto', fontFamily: "'Inter', sans-serif" }}
                        data-placeholder="Edit the article body..."
                      />

                      {/* EDITOR FOOTER */}
                      <div className="flex justify-between items-center bg-white/[0.06] border-t border-white/10 px-4 py-2 text-[10px] text-white/60 font-mono select-none">
                        <div className="flex items-center gap-1">
                          <FileText size={10} className="text-emerald-400" />
                          <span>{activeTags.join(' › ')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>CHARS: {charCount}</span>
                          <span>WORDS: {wordCount}</span>
                          <span className="text-emerald-400/60">POWERED BY QSPHERE EDITOR</span>
                        </div>
                      </div>
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
                        <div className="text-sm font-semibold text-white">{group.groupTitle || group.title}</div>
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
                  <h2 className="mt-2 text-2xl font-black tracking-tight">{selectedGroup?.groupTitle || selectedGroup?.title || 'No group selected'}</h2>
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
                      disabled
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

      {/* Link insertion modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/55" onClick={cancelLink} />
          <div className="relative z-60 w-full max-w-xl rounded-xl border border-white/10 bg-[#0b1510] p-6 shadow-[0_30px_100px_-40px_rgba(0,0,0,0.9)]">
            <h3 className="text-sm font-bold text-white mb-3">Insert Link</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">URL</label>
                <div className="flex items-center w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2">
                  <span className="text-emerald-300 text-xs mr-1 select-none">https://</span>
                  <input
                    type="text"
                    value={linkUrl.replace(/^https:\/\//, '')}
                    onChange={(e) => setLinkUrl('https://' + e.target.value.replace(/^https?:\/\//, ''))}
                    placeholder="example.com"
                    className="flex-1 bg-transparent text-xs text-white placeholder-white/35 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Link type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setLinkRel('dofollow')} className={`px-3 py-1.5 rounded-xl text-xs ${linkRel === 'dofollow' ? 'bg-emerald-400 text-black' : 'bg-white/[0.06] text-white/70'}`}>Dofollow</button>
                  <button type="button" onClick={() => setLinkRel('nofollow')} className={`px-3 py-1.5 rounded-xl text-xs ${linkRel === 'nofollow' ? 'bg-emerald-400 text-black' : 'bg-white/[0.06] text-white/70'}`}>Nofollow</button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkOpenInNewTab}
                  onChange={(e) => setLinkOpenInNewTab(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.06] text-emerald-400 focus:ring-emerald-400/30"
                />
                <span className="text-xs text-white/60">Open in new tab</span>
              </label>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={cancelLink} className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/70">Cancel</button>
                <button type="button" onClick={applyLink} className="px-4 py-2 rounded-xl bg-emerald-400 text-black">Insert</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default AccountManagementPage