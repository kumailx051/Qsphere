import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
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
  MapPin,
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
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import { onboardingCommonFields, onboardingRoleFields, onboardingRoles } from '../data/onboarding'

const storageKey = 'qsphere_onboarding_profile'
const prefsStorageKey = 'qsphere_account_preferences'

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

const formatDateLabel = (value) => {
  if (!value) return 'Recently joined'
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Recently joined'

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getInitials = (name) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'QS'
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() || '').join('')
}

const inputClassName =
  'qs-account-input mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-70'

const cardClassName =
  'qs-account-card rounded-[32px] border p-6 backdrop-blur-2xl md:p-7'

const tabButtonClassName = (active) =>
  `qs-account-tab inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? 'qs-account-tab-active' : ''}`

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
  <label className="qs-account-soft-panel flex items-start justify-between gap-4 rounded-2xl border px-4 py-3">
    <div>
      <div className="text-sm font-semibold qs-account-text-primary">{label}</div>
      <div className="mt-1 text-xs qs-account-text-muted">{description}</div>
    </div>
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative mt-0.5 h-7 w-12 rounded-full border transition ${
        checked
          ? 'qs-account-toggle-active'
          : 'qs-account-toggle-idle'
      } ${disabled ? 'cursor-not-allowed' : ''}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full qs-account-toggle-thumb transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  </label>
)

const AccountManagementPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
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
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const pageBg = isDayMode
    ? 'linear-gradient(180deg, #faf9f7 0%, #f4f2ec 48%, #eeece6 100%)'
    : palette.bgPrimary
  const ambientPrimary = isDayMode ? 'rgba(46,197,138,0.12)' : 'rgba(16,185,129,0.18)'
  const ambientSecondary = isDayMode ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.12)'
  const titleShadow = isDayMode ? '0 12px 36px rgba(255,255,255,0.55)' : '0 0 40px rgba(16,185,129,0.08)'
  const cardBackground = isDayMode
    ? 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,247,245,0.9))'
    : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))'
  const shellBackground = isDayMode
    ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,247,245,0.92))'
    : 'linear-gradient(180deg, rgba(5,10,8,0.92), rgba(4,8,7,0.74))'
  const accountThemeVars = {
    '--qs-ac-bg-primary': palette.bgPrimary,
    '--qs-ac-bg-secondary': palette.bgSecondary,
    '--qs-ac-bg-tertiary': palette.bgTertiary,
    '--qs-ac-surface': palette.bgSurface,
    '--qs-ac-surface-hover': palette.bgSurfaceHover,
    '--qs-ac-input': palette.bgInput,
    '--qs-ac-input-focus': palette.bgInputFocus,
    '--qs-ac-text': palette.textPrimary,
    '--qs-ac-text-secondary': palette.textSecondary,
    '--qs-ac-text-muted': palette.textMuted,
    '--qs-ac-text-faint': palette.textFaint,
    '--qs-ac-accent': palette.accentPrimary,
    '--qs-ac-accent-strong': isDayMode ? palette.accentDark : palette.accentLight,
    '--qs-ac-accent-soft': palette.accentSoft,
    '--qs-ac-accent-border': palette.accentBorder,
    '--qs-ac-border': palette.borderPrimary,
    '--qs-ac-border-soft': palette.borderSoft,
    '--qs-ac-border-input': palette.borderInput,
    '--qs-ac-border-focus': palette.borderInputFocus,
    '--qs-ac-shadow-card': isDayMode ? '0 28px 100px rgba(15,23,42,0.08)' : '0 28px 100px rgba(0,0,0,0.42)',
    '--qs-ac-shadow-hero': isDayMode ? '0 40px 120px rgba(15,23,42,0.08)' : '0 40px 120px rgba(0,0,0,0.45)',
    '--qs-ac-shadow-modal': palette.shadowDropdown,
    '--qs-ac-btn-primary-bg': palette.btnPrimaryBg,
    '--qs-ac-btn-primary-border': palette.btnPrimaryBorder,
    '--qs-ac-btn-primary-text': palette.btnPrimaryText,
    '--qs-ac-btn-primary-hover-bg': palette.btnPrimaryHoverBg,
    '--qs-ac-btn-primary-hover-border': palette.btnPrimaryHoverBorder,
    '--qs-ac-btn-primary-hover-text': palette.btnPrimaryHoverText,
    '--qs-ac-btn-secondary-bg': palette.btnSecondaryBg,
    '--qs-ac-btn-secondary-border': palette.btnSecondaryBorder,
    '--qs-ac-btn-secondary-text': palette.btnSecondaryText,
    '--qs-ac-btn-secondary-hover-bg': palette.btnSecondaryHoverBg,
    '--qs-ac-btn-secondary-hover-border': palette.btnSecondaryHoverBorder,
    '--qs-ac-btn-secondary-hover-text': palette.btnSecondaryHoverText,
    '--qs-ac-danger-bg': isDayMode ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.10)',
    '--qs-ac-danger-border': 'rgba(239,68,68,0.25)',
    '--qs-ac-danger-text': isDayMode ? '#b91c1c' : '#fecaca',
    '--qs-ac-editor-prose': palette.textPrimary,
    '--qs-ac-editor-placeholder': palette.textFaint,
  }
  const accountThemeStyles = `
    .qs-account-theme { color: var(--qs-ac-text); }
    .qs-account-theme .qs-account-card {
      border-color: var(--qs-ac-border) !important;
      background: ${cardBackground} !important;
      box-shadow: var(--qs-ac-shadow-card) !important;
    }
    .qs-account-theme .qs-account-soft-panel {
      border-color: var(--qs-ac-border-soft) !important;
      background: ${isDayMode ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.04)'} !important;
    }
    .qs-account-theme .qs-account-input {
      border-color: var(--qs-ac-border-input) !important;
      background: var(--qs-ac-input) !important;
      color: var(--qs-ac-text) !important;
    }
    .qs-account-theme .qs-account-input::placeholder {
      color: var(--qs-ac-editor-placeholder) !important;
    }
    .qs-account-theme .qs-account-input:focus {
      border-color: var(--qs-ac-border-focus) !important;
      background: var(--qs-ac-input-focus) !important;
      box-shadow: 0 0 0 4px ${isDayMode ? 'rgba(46,197,138,0.12)' : 'rgba(16,185,129,0.12)'} !important;
    }
    .qs-account-theme .qs-account-tab {
      border-color: var(--qs-ac-btn-secondary-border) !important;
      background: var(--qs-ac-btn-secondary-bg) !important;
      color: var(--qs-ac-btn-secondary-text) !important;
    }
    .qs-account-theme .qs-account-tab:hover {
      border-color: var(--qs-ac-btn-secondary-hover-border) !important;
      background: var(--qs-ac-btn-secondary-hover-bg) !important;
      color: var(--qs-ac-btn-secondary-hover-text) !important;
    }
    .qs-account-theme .qs-account-tab-active {
      border-color: var(--qs-ac-accent-border) !important;
      background: var(--qs-ac-accent-soft) !important;
      color: var(--qs-ac-accent-strong) !important;
      box-shadow: ${isDayMode ? '0 0 18px rgba(46,197,138,0.08)' : '0 0 18px rgba(16,185,129,0.08)'} !important;
    }
    .qs-account-theme .qs-account-primary-btn {
      border-color: var(--qs-ac-btn-primary-border) !important;
      background: var(--qs-ac-btn-primary-bg) !important;
      color: var(--qs-ac-btn-primary-text) !important;
    }
    .qs-account-theme .qs-account-primary-btn:hover {
      border-color: var(--qs-ac-btn-primary-hover-border) !important;
      background: var(--qs-ac-btn-primary-hover-bg) !important;
      color: var(--qs-ac-btn-primary-hover-text) !important;
    }
    .qs-account-theme .qs-account-secondary-btn {
      border-color: var(--qs-ac-btn-secondary-border) !important;
      background: var(--qs-ac-btn-secondary-bg) !important;
      color: var(--qs-ac-btn-secondary-text) !important;
    }
    .qs-account-theme .qs-account-secondary-btn:hover {
      border-color: var(--qs-ac-btn-secondary-hover-border) !important;
      background: var(--qs-ac-btn-secondary-hover-bg) !important;
      color: var(--qs-ac-btn-secondary-hover-text) !important;
    }
    .qs-account-theme .qs-account-solid-btn {
      border-color: var(--qs-ac-btn-primary-border) !important;
      background: var(--qs-ac-accent) !important;
      color: ${isDayMode ? '#ffffff' : '#000000'} !important;
    }
    .qs-account-theme .qs-account-solid-btn:hover {
      background: ${isDayMode ? palette.accentDark : palette.accentLight} !important;
      color: ${isDayMode ? '#ffffff' : '#000000'} !important;
    }
    .qs-account-theme .qs-account-danger-btn {
      border-color: var(--qs-ac-danger-border) !important;
      background: var(--qs-ac-danger-bg) !important;
      color: var(--qs-ac-danger-text) !important;
    }
    .qs-account-theme .qs-account-danger-btn:hover {
      background: ${isDayMode ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.20)'} !important;
    }
    .qs-account-theme .qs-account-loading,
    .qs-account-theme .qs-account-root,
    .qs-account-theme .qs-account-empty-root {
      color: var(--qs-ac-text);
    }
    .qs-account-theme .qs-account-text-primary { color: var(--qs-ac-text) !important; }
    .qs-account-theme .qs-account-text-secondary { color: var(--qs-ac-text-secondary) !important; }
    .qs-account-theme .qs-account-text-muted { color: var(--qs-ac-text-muted) !important; }
    .qs-account-theme .qs-account-text-faint { color: var(--qs-ac-text-faint) !important; }
    .qs-account-theme .qs-account-accent { color: var(--qs-ac-accent) !important; }
    .qs-account-theme .qs-account-accent-strong { color: var(--qs-ac-accent-strong) !important; }
    .qs-account-theme .qs-account-toggle-active {
      border-color: var(--qs-ac-accent-border) !important;
      background: ${isDayMode ? palette.accentPrimary : 'rgba(16,185,129,0.35)'} !important;
    }
    .qs-account-theme .qs-account-toggle-idle {
      border-color: var(--qs-ac-border-input) !important;
      background: ${isDayMode ? '#e7e5e1' : 'rgba(255,255,255,0.10)'} !important;
    }
    .qs-account-theme .qs-account-toggle-thumb {
      background: ${isDayMode ? '#ffffff' : '#ffffff'} !important;
      box-shadow: ${isDayMode ? '0 4px 10px rgba(15,23,42,0.12)' : 'none'};
    }
    .qs-account-theme .qs-account-editor-shell {
      border-color: var(--qs-ac-border-input) !important;
      background: ${isDayMode ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.02)'} !important;
    }
    .qs-account-theme .qs-account-editor-toolbar,
    .qs-account-theme .qs-account-editor-footer {
      border-color: var(--qs-ac-border-input) !important;
      background: ${isDayMode ? 'rgba(247,247,245,0.92)' : 'rgba(255,255,255,0.06)'} !important;
      color: var(--qs-ac-text-secondary) !important;
    }
    .qs-account-theme .qs-account-editor-toolbar button {
      color: var(--qs-ac-text-secondary) !important;
    }
    .qs-account-theme .qs-account-editor-toolbar button:hover {
      background: var(--qs-ac-surface-hover) !important;
      color: var(--qs-ac-text) !important;
    }
    .qs-account-theme .qs-account-editor {
      background: ${isDayMode ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.03)'} !important;
      color: var(--qs-ac-editor-prose) !important;
    }
    .qs-account-theme .qs-account-editor:focus {
      background: ${isDayMode ? '#ffffff' : 'rgba(255,255,255,0.05)'} !important;
    }
    .qs-account-theme .qs-account-editor a {
      color: var(--qs-ac-accent-strong) !important;
    }
    .qs-account-theme .qs-account-editor[data-placeholder]:empty::before {
      content: attr(data-placeholder);
      color: var(--qs-ac-editor-placeholder);
      pointer-events: none;
      float: left;
      height: 0;
    }
    .qs-account-theme .qs-account-editor.prose,
    .qs-account-theme .qs-account-editor.prose :where(h1,h2,h3,h4,strong,blockquote,p,li,span) {
      color: var(--qs-ac-editor-prose) !important;
    }
    .qs-account-theme .qs-account-editor.prose blockquote {
      border-left-color: var(--qs-ac-accent-border) !important;
    }
    .qs-account-theme .qs-account-dropdown {
      border-color: var(--qs-ac-border) !important;
      background: ${isDayMode ? 'rgba(255,255,255,0.96)' : 'rgba(8,18,13,0.95)'} !important;
      box-shadow: var(--qs-ac-shadow-modal) !important;
    }
    .qs-account-theme .qs-account-modal-panel {
      border-color: var(--qs-ac-border) !important;
      background: ${isDayMode ? 'rgba(255,255,255,0.98)' : '#0b1510'} !important;
      box-shadow: var(--qs-ac-shadow-modal) !important;
    }
    .qs-account-theme .qs-account-modal-overlay {
      background: ${isDayMode ? 'rgba(10,22,32,0.22)' : 'rgba(0,0,0,0.55)'} !important;
    }
  `

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
  const profileAvatar = profile?.profileImage || profile?.avatarPreview || ''
  const profileEmail = profile?.emailAddress || profile?.email || 'Email not available'
  const joinedLabel = formatDateLabel(profile?.created_at || profile?.submittedAt)

  const summaryLine = useMemo(() => {
    const values = [
      profile?.organization,
      profile?.institute,
      profile?.roleTitle,
      profile?.designation,
      profile?.researchFocus,
      profile?.researchInterest,
      profile?.degree,
    ].filter((value) => String(value || '').trim())

    return values[0] || roleConfig.description
  }, [profile, roleConfig.description])

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

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
          localStorage.setItem(storageKey, JSON.stringify(user))
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
      <div className="qs-account-theme qs-account-loading relative flex min-h-screen items-center justify-center overflow-hidden" style={{ ...accountThemeVars, background: pageBg }}>
        <style>{accountThemeStyles}</style>
        <div className="absolute inset-0" style={{ background: pageBg }} />
        <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 20% 0%, ${ambientPrimary} 0%, transparent 42%)` }} />
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${ambientSecondary} 0%, transparent 36%)` }} />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/70 border-t-transparent" />
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] qs-account-accent-strong">Loading account surface</div>
        </div>
      </div>
    )
  }

  if (!profile || Object.keys(profile).length === 0) {
    return (
      <div className="qs-account-theme qs-account-empty-root relative min-h-screen overflow-hidden" style={{ ...accountThemeVars, background: pageBg }}>
        <style>{accountThemeStyles}</style>
        <Navbar currentPage="dashboard" />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0" style={{ background: pageBg }} />
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${ambientPrimary} 0%, transparent 42%)` }} />
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${ambientSecondary} 0%, transparent 36%)` }} />
        </div>

        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-28 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-[36px] border p-8 text-center backdrop-blur-2xl md:p-10"
            style={{ border: `1px solid ${palette.borderPrimary}`, background: cardBackground, boxShadow: isDayMode ? '0 40px 120px rgba(15,23,42,0.08)' : '0 40px 120px rgba(0,0,0,0.45)' }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary, boxShadow: isDayMode ? '0 0 30px rgba(46,197,138,0.08)' : '0 0 30px rgba(16,185,129,0.12)' }}>
              <UserCog size={24} />
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Account management</div>
            <h1 className="mt-4 text-4xl font-bold leading-[0.95] md:text-5xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
              This account surface needs
              <br />
              <span style={{ color: palette.accentPrimary }}>your profile context first.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
              Complete onboarding, then come back here to manage your profile, security settings, blogs, and groups from one premium workspace.
            </p>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="qs-account-primary-btn mt-8 inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-all"
            >
              Go to onboarding
            </button>
          </motion.div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="qs-account-theme qs-account-root relative min-h-screen overflow-hidden" style={{ ...accountThemeVars, background: pageBg }}>
      <style>{accountThemeStyles}</style>
      <Navbar currentPage="dashboard" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ background: pageBg }} />
        <motion.div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 18% 0%, ${ambientPrimary} 0%, transparent 42%)`, y: glowY1 }} />
        <motion.div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 100% 0%, ${ambientSecondary} 0%, transparent 36%)`, y: glowY2 }} />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              isDayMode
                ? 'linear-gradient(rgba(10,22,32,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(10,22,32,0.05) 1px, transparent 1px)'
                : 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 18%, black 24%, transparent 88%)',
          }}
        />
      </div>

      <main className="relative z-10 w-full px-6 py-28 sm:px-8 lg:px-12 xl:px-20">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="qs-account-secondary-btn mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </button>

        <motion.section
          variants={heroVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="relative mb-6 overflow-hidden rounded-[38px] border p-7 backdrop-blur-2xl md:p-10 xl:p-12"
          style={{ border: `1px solid ${palette.borderPrimary}`, background: cardBackground, boxShadow: isDayMode ? '0 40px 120px rgba(15,23,42,0.08)' : '0 40px 120px rgba(0,0,0,0.45)' }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
          <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl bg-emerald-500/10" />
          <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl bg-cyan-500/10" />

          <div className="relative z-10 grid gap-10 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="inline-flex items-center gap-3 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary, boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.45)' : '0 0 18px rgba(16,185,129,0.8)' }} />
                  Account Management
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.btnSecondaryBg, color: palette.textMuted }}>
                  <Sparkles size={14} style={{ color: palette.accentPrimary }} />
                  Control layer
                </span>
              </div>

              <h1 className="max-w-5xl text-5xl font-bold leading-[0.9] md:text-6xl xl:text-[5.15rem]" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary, textShadow: titleShadow }}>
                Tune your profile,
                <br />
                <span style={{ color: palette.accentPrimary }}>content, and access from one room.</span>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 md:text-lg xl:text-[1.12rem]" style={{ color: palette.textSecondary }}>
                Switch between account details, blog management, and group management without dropping into a cluttered admin surface.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="qs-account-primary-btn inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-all"
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
                      className="qs-account-secondary-btn inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveProfile}
                      className="qs-account-primary-btn inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </>
                )}
              </div>

              <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Role track', value: roleConfig.label, tone: isDayMode ? palette.accentDark : palette.accentLight },
                  { label: 'Profile completion', value: `${completion}%`, tone: palette.textPrimary },
                  { label: 'Member since', value: joinedLabel, tone: palette.textPrimary },
                ].map((item) => (
                  <motion.div key={item.label} variants={itemVariants} className="rounded-[28px] border p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>{item.label}</div>
                    <div className="mt-4 text-4xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: item.tone }}>{item.value}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div className="relative overflow-hidden rounded-[34px] border p-6 md:p-7" style={{ border: `1px solid ${palette.borderPrimary}`, background: shellBackground, boxShadow: isDayMode ? '0 24px 90px rgba(15,23,42,0.08)' : '0 24px 90px rgba(0,0,0,0.42)' }}>
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full blur-3xl bg-emerald-500/10" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Identity signal</div>
                    <h2 className="mt-4 text-3xl font-bold leading-tight md:text-[2.1rem]" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                      {profile.fullName || 'Explorer'}
                    </h2>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-lg font-bold shadow-[0_0_18px_rgba(16,185,129,0.18)]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.86)' : 'rgba(0,0,0,0.3)', color: palette.textPrimary }}>
                    {profileAvatar ? (
                      <img src={profileAvatar} alt={profile.fullName || 'Profile avatar'} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(profile.fullName)
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center rounded-full border px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}>
                    {roleConfig.eyebrow}
                  </span>
                  {profile.city ? (
                    <span className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.04)', color: palette.textMuted }}>
                      <MapPin size={12} style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }} />
                      {profile.city}
                    </span>
                  ) : null}
                </div>

                <p className="mt-6 text-base leading-8" style={{ color: palette.textSecondary }}>{summaryLine}</p>

                <div className="mt-7 grid gap-3">
                  <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}>
                    <UserCog size={15} style={{ color: palette.accentPrimary }} />
                    <span className="text-sm font-medium" style={{ color: palette.textSecondary }}>Current role: {roleConfig.label}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}>
                    <CheckCircle2 size={15} style={{ color: palette.accentPrimary }} />
                    <span className="text-sm font-medium" style={{ color: palette.textSecondary }}>Profile completion: {completion}%</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}>
                    <Bell size={15} style={{ color: palette.accentPrimary }} />
                    <span className="truncate text-sm font-medium" style={{ color: palette.textSecondary }}>{profileEmail}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative z-10 mt-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
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
            </motion.div>

            {message ? (
              <motion.div variants={itemVariants} className="rounded-2xl border px-4 py-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }}>
                {message}
              </motion.div>
            ) : null}
          </motion.div>
        </motion.section>

        {activeTab === 'account' ? (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <div className={cardClassName}>
              <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Personal information</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { key: 'fullName', type: 'text', required: true },
                  { key: 'gender', type: 'select', options: ['Male', 'Female', 'Prefer not to say'] },
                  { key: 'dateOfBirth', type: 'date' },
                  { key: 'city', type: 'text' },
                ].map((field) => (
                  <div key={field.key} className={field.key === 'address' ? 'sm:col-span-2' : ''}>
                    <label className="text-sm" style={{ color: palette.textSecondary }}>
                      {fieldLabelMap[field.key] || onboardingCommonFields.find((f) => f.name === field.key)?.label || field.key}
                      {field.required ? <span style={{ color: palette.accentPrimary }}> *</span> : null}
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
                  <label className="text-sm" style={{ color: palette.textSecondary }}>Address</label>
                  <textarea
                    rows={3}
                    value={profile.address ?? ''}
                    onChange={(event) => handleProfileFieldChange('address', event.target.value)}
                    disabled={!editing}
                    className={`${inputClassName} resize-none`}
                  />
                </div>
              </div>

              <div className="qs-account-soft-panel mt-5 rounded-2xl border p-4">
                <div className="text-sm" style={{ color: palette.textPrimary }}>Profile photo</div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.95)' : 'rgba(255,255,255,0.05)' }}>
                    {profile.avatarPreview ? (
                      <img src={profile.avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: palette.textFaint }}>No image</div>
                    )}
                  </div>
                  {editing ? (
                    <label className="qs-account-primary-btn inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm transition">
                      Upload image
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  ) : (
                    <div className="text-xs" style={{ color: palette.textMuted }}>Enable edit mode to change avatar.</div>
                  )}
                </div>
              </div>
            </div>

            <div className={cardClassName}>
              <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Contact information</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {['emailAddress', 'cellMain', 'cellAlternative', 'cnic', 'passportNo'].map((key) => {
                  const field = onboardingCommonFields.find((f) => f.name === key || (key === 'emailAddress' && f.name === 'email') || (key === 'cellAlternative' && f.name === 'cellAlt') || (key === 'dateOfBirth' && f.name === 'dob'))
                  return (
                    <div key={key}>
                      <label className="text-sm" style={{ color: palette.textSecondary }}>{fieldLabelMap[key] || field?.label || key}</label>
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
              <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Role-specific information</div>
              <div className="mt-2 text-sm" style={{ color: palette.textMuted }}>Current role: <span style={{ color: palette.accentPrimary }}>{roleConfig.label}</span></div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {roleFields.map((field) => (
                  <div key={field.name} className={field.type === 'textarea' || field.span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="text-sm" style={{ color: palette.textSecondary }}>{field.label}</label>
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
              <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Security & preferences</div>

              <div className="qs-account-soft-panel mt-5 rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2" style={{ color: palette.textPrimary }}>
                  <KeyRound size={16} style={{ color: palette.accentPrimary }} />
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
                    className="qs-account-primary-btn mt-1 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
                  >
                    Update password
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
              </div>
            </div>
          </motion.section>
        ) : null}

        {activeTab === 'blogs' ? (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"
          >
            <div className={cardClassName}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Blog management</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: palette.textPrimary }}>Manage blog content</h2>
                </div>
                <BookOpen size={18} style={{ color: palette.accentPrimary }} />
              </div>
              <p className="mt-3 text-sm" style={{ color: palette.textMuted }}>
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
                        ? ''
                        : ''
                    }`}
                    style={selectedBlogId === blog.id
                      ? { border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }
                      : { border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.2)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>{blog.title}</div>
                        <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>{blog.category}</div>
                      </div>
                      <Pencil size={14} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={cardClassName}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Selected blog</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: palette.textPrimary }}>{selectedBlog?.title || 'No blog selected'}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveBlog}
                    disabled={blogSaving || !selectedBlog}
                    className="qs-account-solid-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Save size={16} />
                    {blogSaving ? 'Saving...' : 'Save blog'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteBlog}
                    disabled={!selectedBlog}
                    className="qs-account-danger-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              {selectedBlog ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Title</label>
                    <input
                      type="text"
                      value={blogDraft.title}
                      onChange={(event) => setBlogDraft((prev) => ({ ...prev, title: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Category</label>
                    <div className="relative mt-2" ref={categoryRef}>
                      <button
                        type="button"
                        onClick={() => setCategoryOpen(!categoryOpen)}
                        className="qs-account-input flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm outline-none transition"
                      >
                        <span style={{ color: categories.some(c => c.name === blogDraft.category) && blogDraft.category ? palette.textPrimary : palette.textMuted }}>
                          {categories.some(c => c.name === blogDraft.category) && blogDraft.category
                            ? blogDraft.category
                            : blogDraft.category || 'Select a category'}
                        </span>
                        <svg
                          className={`transition-transform ${categoryOpen ? 'rotate-180' : ''}`}
                          style={{ color: palette.textMuted }}
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
                        <div className="qs-account-dropdown absolute left-0 right-0 z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border p-1.5 backdrop-blur-2xl">
                          {categories.length === 0 && (
                            <div className="px-3 py-2 text-sm" style={{ color: palette.textMuted }}>Loading categories...</div>
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
                                  ? ''
                                  : ''
                              }`}
                              style={blogDraft.category === cat.name
                                ? { backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }
                                : { color: palette.textSecondary }}
                            >
                              {cat.name}
                            </button>
                          ))}
                          <div className="my-1 border-t" style={{ borderColor: palette.borderSoft }} />
                          <button
                            type="button"
                            onClick={() => {
                              setBlogDraft((prev) => ({ ...prev, category: '' }))
                              setCategoryOpen(false)
                            }}
                            className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                              !categories.some(c => c.name === blogDraft.category) && blogDraft.category
                                ? ''
                                : ''
                            }`}
                            style={!categories.some(c => c.name === blogDraft.category) && blogDraft.category
                              ? { backgroundColor: palette.accentSoft, color: isDayMode ? palette.accentDark : palette.accentLight }
                              : { color: palette.textMuted }}
                          >
                            Other...
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
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Excerpt</label>
                    <textarea
                      rows={3}
                      value={blogDraft.excerpt}
                      onChange={(event) => setBlogDraft((prev) => ({ ...prev, excerpt: event.target.value }))}
                      className={`${inputClassName} resize-none`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Cover image URL or data URI</label>
                    <div className="qs-account-soft-panel mt-2 rounded-2xl border p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="h-24 w-36 overflow-hidden rounded-2xl border" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.95)' : 'rgba(255,255,255,0.05)' }}>
                          {blogDraft.image ? (
                            <img src={blogDraft.image} alt={blogDraft.title || 'Blog cover'} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: palette.textFaint }}>No cover</div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3">
                          <label className="qs-account-primary-btn inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm transition">
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
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Body</label>
                    <div className="qs-account-editor-shell mt-2 rounded-2xl border backdrop-blur-xl overflow-hidden flex flex-col">
                      {/* TOOLBAR */}
                      <div className="qs-account-editor-toolbar flex flex-wrap items-center gap-1 border-b p-2">
                        <button type="button" onClick={() => execCmd('bold')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold" title="Bold"><Bold size={15} /></button>
                        <button type="button" onClick={() => execCmd('italic')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Italic"><Italic size={15} /></button>
                        <button type="button" onClick={() => execCmd('underline')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Underline"><Underline size={15} /></button>
                        <span className="w-[1px] h-5 mx-1" style={{ backgroundColor: palette.borderSoft }} />
                        <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Bullet List"><List size={15} /></button>
                        <button type="button" onClick={() => execCmd('insertOrderedList')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Numbered List"><ListOrdered size={15} /></button>
                        <span className="w-[1px] h-5 mx-1" style={{ backgroundColor: palette.borderSoft }} />
                        <button type="button" onClick={() => execCmd('formatBlock', '<h1>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 1"><Heading1 size={15} /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', '<h2>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 2"><Heading2 size={15} /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', '<h3>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 3"><Heading3 size={15} /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', '<p>')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Paragraph"><Text size={15} /></button>
                        <button type="button" onClick={() => execCmd('formatBlock', '<blockquote>')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Quote"><Quote size={15} /></button>
                        <span className="w-[1px] h-5 mx-1" style={{ backgroundColor: palette.borderSoft }} />
                        <button type="button" onClick={() => execCmd('justifyLeft')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Left"><AlignLeft size={15} /></button>
                        <button type="button" onClick={() => execCmd('justifyCenter')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Center"><AlignCenter size={15} /></button>
                        <button type="button" onClick={() => execCmd('justifyRight')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Right"><AlignRight size={15} /></button>
                        <button type="button" onClick={() => execCmd('justifyFull')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Justify"><AlignJustify size={15} /></button>
                        <span className="w-[1px] h-5 mx-1" style={{ backgroundColor: palette.borderSoft }} />
                        <button type="button" onClick={insertLink} className="p-2 rounded hover:bg-white/5 transition-colors" title="Insert Link"><LinkIcon size={15} /></button>
                        <span className="w-[1px] h-5 bg-white/10 mx-1" />
                        <button type="button" onClick={() => execCmd('undo')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Undo"><RotateCcw size={15} /></button>
                        <button type="button" onClick={() => execCmd('redo')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Redo"><RotateCw size={15} /></button>
                        <button type="button" onClick={() => execCmd('removeFormat')} className="p-2 rounded transition-colors" style={{ color: isDayMode ? '#b91c1c' : '#fca5a5' }} title="Clear Formatting"><Eraser size={15} /></button>
                      </div>

                      {/* EDITABLE BODY */}
                      <div
                        ref={editorRef}
                        contentEditable="true"
                        onInput={handleEditorChange}
                        onKeyUp={handleEditorChange}
                        onClick={handleEditorChange}
                        className={`qs-account-editor w-full min-h-[420px] p-6 leading-relaxed outline-none transition-all prose max-w-none ${isDayMode ? '' : 'prose-invert'}`}
                        style={{ overflowY: 'auto', fontFamily: "'Inter', sans-serif" }}
                        data-placeholder="Edit the article body..."
                      />

                      {/* EDITOR FOOTER */}
                      <div className="qs-account-editor-footer flex justify-between items-center border-t px-4 py-2 text-[10px] font-mono select-none">
                        <div className="flex items-center gap-1">
                          <FileText size={10} style={{ color: palette.accentPrimary }} />
                          <span>{activeTags.join(' › ')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>CHARS: {charCount}</span>
                          <span>WORDS: {wordCount}</span>
                          <span style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.6)' }}>POWERED BY QSPHERE EDITOR</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="qs-account-soft-panel mt-6 rounded-2xl border p-5 text-sm" style={{ color: palette.textMuted }}>
                  No blog records available.
                </div>
              )}
            </div>
          </motion.section>
        ) : null}

        {activeTab === 'groups' ? (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"
          >
            <div className={cardClassName}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Group management</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: palette.textPrimary }}>Manage groups</h2>
                </div>
                <Users2 size={18} style={{ color: palette.accentPrimary }} />
              </div>
              <p className="mt-3 text-sm" style={{ color: palette.textMuted }}>
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
                        ? ''
                        : ''
                    }`}
                    style={selectedGroupId === group.id
                      ? { border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft }
                      : { border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>{group.groupTitle || group.title}</div>
                        <div className="mt-1 text-xs" style={{ color: palette.textMuted }}>{group.owner}</div>
                      </div>
                      <Pencil size={14} className="mt-0.5" style={{ color: palette.accentPrimary }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={cardClassName}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }}>Selected group</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: palette.textPrimary }}>{selectedGroup?.groupTitle || selectedGroup?.title || 'No group selected'}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGroup}
                    disabled={groupSaving || !selectedGroup}
                    className="qs-account-solid-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Save size={16} />
                    {groupSaving ? 'Saving...' : 'Save group'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    disabled={!selectedGroup}
                    className="qs-account-danger-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              {selectedGroup ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Title</label>
                    <input
                      type="text"
                      value={groupDraft.title}
                      onChange={(event) => setGroupDraft((prev) => ({ ...prev, title: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Owner</label>
                    <input
                      type="text"
                      value={groupDraft.owner}
                      disabled
                      onChange={(event) => setGroupDraft((prev) => ({ ...prev, owner: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Description</label>
                    <textarea
                      rows={4}
                      value={groupDraft.description}
                      onChange={(event) => setGroupDraft((prev) => ({ ...prev, description: event.target.value }))}
                      className={`${inputClassName} resize-none`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm" style={{ color: palette.textSecondary }}>Avatar image</label>
                    <div className="qs-account-soft-panel mt-2 rounded-2xl border p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="h-20 w-20 overflow-hidden rounded-2xl border" style={{ border: `1px solid ${palette.borderSoft}`, backgroundColor: isDayMode ? 'rgba(247,247,245,0.95)' : 'rgba(255,255,255,0.05)' }}>
                          {groupDraft.avatar ? (
                            <img src={groupDraft.avatar} alt={groupDraft.title || 'Group avatar'} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: palette.textFaint }}>No image</div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3">
                          <label className="qs-account-primary-btn inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm transition">
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
                <div className="qs-account-soft-panel mt-6 rounded-2xl border p-5 text-sm" style={{ color: palette.textMuted }}>
                  No group records available.
                </div>
              )}
            </div>
          </motion.section>
        ) : null}
      </main>

      {/* Link insertion modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="qs-account-modal-overlay absolute inset-0" onClick={cancelLink} />
          <div className="qs-account-modal-panel relative z-60 w-full max-w-xl rounded-xl border p-6">
            <h3 className="mb-3 text-sm font-bold" style={{ color: palette.textPrimary }}>Insert Link</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs" style={{ color: palette.textMuted }}>URL</label>
                <div className="flex w-full items-center rounded-xl border px-3.5 py-2" style={{ backgroundColor: isDayMode ? 'rgba(247,247,245,0.95)' : 'rgba(255,255,255,0.04)', borderColor: palette.borderInput }}>
                  <span className="mr-1 select-none text-xs" style={{ color: palette.accentPrimary }}>https://</span>
                  <input
                    type="text"
                    value={linkUrl.replace(/^https:\/\//, '')}
                    onChange={(e) => setLinkUrl('https://' + e.target.value.replace(/^https?:\/\//, ''))}
                    className="flex-1 bg-transparent text-xs outline-none"
                    style={{ color: palette.textPrimary }}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: palette.textMuted }}>Link type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setLinkRel('dofollow')} className="rounded-xl px-3 py-1.5 text-xs" style={linkRel === 'dofollow' ? { backgroundColor: palette.accentPrimary, color: isDayMode ? '#ffffff' : '#000000' } : { backgroundColor: isDayMode ? 'rgba(247,247,245,0.95)' : 'rgba(255,255,255,0.06)', color: palette.textSecondary }}>Dofollow</button>
                  <button type="button" onClick={() => setLinkRel('nofollow')} className="rounded-xl px-3 py-1.5 text-xs" style={linkRel === 'nofollow' ? { backgroundColor: palette.accentPrimary, color: isDayMode ? '#ffffff' : '#000000' } : { backgroundColor: isDayMode ? 'rgba(247,247,245,0.95)' : 'rgba(255,255,255,0.06)', color: palette.textSecondary }}>Nofollow</button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={linkOpenInNewTab}
                  onChange={(e) => setLinkOpenInNewTab(e.target.checked)}
                  className="h-3.5 w-3.5 rounded"
                  style={{ accentColor: palette.accentPrimary }}
                />
                <span className="text-xs" style={{ color: palette.textSecondary }}>Open in new tab</span>
              </label>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={cancelLink} className="qs-account-secondary-btn rounded-xl border px-4 py-2">Cancel</button>
                <button type="button" onClick={applyLink} className="qs-account-solid-btn rounded-xl border px-4 py-2">Insert</button>
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
