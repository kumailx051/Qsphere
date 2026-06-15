import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Settings,
  AlertCircle,
  Upload,
  Trash2,
  Check,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Quote,
  Heading,
  RotateCcw,
  RotateCw,
  Sparkles,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Text,
  FileText,
  X,
  CornerDownRight
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import GhostInput from '../components/GhostInput'

export default function CreateBlogPage() {
  const navigate = useNavigate()
  const editorRef = useRef(null)

  // Main post metadata
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [author, setAuthor] = useState('')
  const [excerpt, setExcerpt] = useState('')
  

  // Cover image file (base64)
  const [coverImageBase64, setCoverImageBase64] = useState('')
  const [imageFileName, setImageFileName] = useState('')

  // Custom created categories list
  const [customCategories, setCustomCategories] = useState([])
  
  // Real-time statistics
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [activeTags, setActiveTags] = useState(['P'])

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const logged = localStorage.getItem('qsphere_logged_in') === '1'
    if (!logged) {
      navigate('/auth', { state: { redirectTo: '/blogs/new' } })
    }
  }, [navigate])
  // SEO panel state
  const [seoOpen, setSeoOpen] = useState(false)
  const [seoResults, setSeoResults] = useState(null)
  // Modal for incomplete SEO checks
  const [seoIncompleteModalOpen, setSeoIncompleteModalOpen] = useState(false)
  const [missingSeoChecks, setMissingSeoChecks] = useState([])
  
  // AI assistant state
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiExcerptGenerating, setAiExcerptGenerating] = useState(false)
  const [aiContentGenerating, setAiContentGenerating] = useState(false)

  // Link modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkRel, setLinkRel] = useState('dofollow')
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true)
  const savedRangeRef = useRef(null)

  // Floating AI Toolbar state
  const [floatingToolbarProps, setFloatingToolbarProps] = useState(null)
  const [floatingPrompt, setFloatingPrompt] = useState('')
  const [isModifyingText, setIsModifyingText] = useState(false)

  // Image properties state
  const [selectedImageNode, setSelectedImageNode] = useState(null)
  const [imageAltText, setImageAltText] = useState('')

  // Title suggestions state
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)
  const [suggestedTitles, setSuggestedTitles] = useState([])

  // Auto Save States
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const savedPref = localStorage.getItem('qsphere_autosave_preference')
    return savedPref !== 'false' // default to true
  })
  const [lastSavedTime, setLastSavedTime] = useState('')
  const [hasDraftToRestore, setHasDraftToRestore] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [draftsList, setDraftsList] = useState([])
  const [showDraftsModal, setShowDraftsModal] = useState(false)

  // Load custom categories from API, author profile, and check for draft
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/blog-categories')
        if (res.ok) {
          const cats = await res.json()
          setCustomCategories(cats.map(c => c.name))
        }
      } catch (e) {
        // fallback: keep empty
      }
    }
    loadCategories()

    try {
      const profileRaw = localStorage.getItem('qsphere_onboarding_profile')
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw)
        if (parsed.fullName) {
          setAuthor(parsed.fullName)
        }
      }
    } catch (e) {
      // ignore
    }

    // Check for existing drafts
    const draftsRaw = localStorage.getItem('qsphere_blog_drafts')
    if (draftsRaw) {
      try {
        const parsed = JSON.parse(draftsRaw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDraftsList(parsed)
          setHasDraftToRestore(true)
        }
      } catch (e) {}
    }
  }, [])

  // Restore specific draft content
  const restoreSpecificDraft = (draft) => {
    setCurrentDraftId(draft.id)
    setTitle(draft.title || '')
    setExcerpt(draft.excerpt || '')
    setCategory(draft.category || '')
    setCoverImageBase64(draft.coverImageBase64 || '')
    setImageFileName(draft.imageFileName || '')
    if (draft.author) setAuthor(draft.author)
    
    if (editorRef.current) {
      editorRef.current.innerHTML = draft.body || ''
    }
    setSuccessMsg('Draft restored successfully!')
    setTimeout(() => setSuccessMsg(''), 3000)
    setShowDraftsModal(false)
    setHasDraftToRestore(false)
  }

  const deleteDraft = (id) => {
    const updated = draftsList.filter(d => d.id !== id)
    setDraftsList(updated)
    localStorage.setItem('qsphere_blog_drafts', JSON.stringify(updated))
    if (updated.length === 0) {
      setShowDraftsModal(false)
      setHasDraftToRestore(false)
    }
  }

  // Dismiss banner
  const dismissDraftBanner = () => {
    setHasDraftToRestore(false)
  }

  // Debounced auto-save effect
  useEffect(() => {
    if (!autoSaveEnabled) return

    const editorText = editorRef.current ? editorRef.current.innerText : ''
    // Don't auto-save if all inputs are completely empty
    if (!title.trim() && !excerpt.trim() && !editorText.trim() && !coverImageBase64) {
      return
    }

    const timer = setTimeout(() => {
      let draftId = currentDraftId
      if (!draftId) {
        draftId = Date.now().toString()
        setCurrentDraftId(draftId)
      }
      const draftData = {
        id: draftId,
        title,
        excerpt,
        category,
        coverImageBase64,
        imageFileName,
        author,
        body: editorRef.current ? editorRef.current.innerHTML : '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString()
      }
      
      let drafts = []
      const draftsRaw = localStorage.getItem('qsphere_blog_drafts')
      if (draftsRaw) {
        try { drafts = JSON.parse(draftsRaw) } catch(e){}
      }
      
      const existingIdx = drafts.findIndex(d => d.id === draftId)
      if (existingIdx >= 0) {
        drafts[existingIdx] = draftData
      } else {
        drafts.push(draftData)
      }
      
      localStorage.setItem('qsphere_blog_drafts', JSON.stringify(drafts))
      setDraftsList(drafts)
      setLastSavedTime(draftData.timestamp)
    }, 1500) // 1.5 seconds debounce

    return () => clearTimeout(timer)
  }, [title, excerpt, category, coverImageBase64, imageFileName, author, wordCount, autoSaveEnabled])

  // Unload tab closure protector
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const editorText = editorRef.current ? editorRef.current.innerText : ''
      const hasContent = title.trim() || excerpt.trim() || editorText.trim() || coverImageBase64
      
      if (hasContent) {
        // Trigger browser confirmation popup
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'

        let draftId = currentDraftId
        if (!draftId) draftId = Date.now().toString()
        const draftData = {
          id: draftId,
          title,
          excerpt,
          category,
          coverImageBase64,
          imageFileName,
          author,
          body: editorRef.current ? editorRef.current.innerHTML : '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toLocaleDateString()
        }
        
        let drafts = []
        const draftsRaw = localStorage.getItem('qsphere_blog_drafts')
        if (draftsRaw) {
          try { drafts = JSON.parse(draftsRaw) } catch(e){}
        }
        
        const existingIdx = drafts.findIndex(d => d.id === draftId)
        if (existingIdx >= 0) {
          drafts[existingIdx] = draftData
        } else {
          drafts.push(draftData)
        }
        localStorage.setItem('qsphere_blog_drafts', JSON.stringify(drafts))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [title, excerpt, category, coverImageBase64, imageFileName, author, wordCount])

  // Execute formatting command on editor
  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      editorRef.current.focus()
    }
    handleEditorChange()
  }

  // Handle keyup / click / input within rich editor to compute counts & styles
  const handleEditorChange = () => {
    if (!editorRef.current) return
    const content = editorRef.current.innerHTML || ''
    const text = editorRef.current.innerText || ''

    // Word count calculation (including Title, Excerpt, and Editor Body)
    const titleWords = title.trim().split(/\s+/).filter(Boolean).length
    const excerptWords = excerpt.trim().split(/\s+/).filter(Boolean).length
    const bodyWords = text.trim().split(/\s+/).filter(Boolean).length
    
    setWordCount(titleWords + excerptWords + bodyWords)
    setCharCount(text.length)

    // Dynamic tag path detection (look at cursor parent elements)
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

  // Update counts when title or excerpt change
  useEffect(() => {
    handleEditorChange()
  }, [title, excerpt])

  // Auto-calculated reading time
  const getAutoReadTime = () => {
    const minutes = Math.max(1, Math.ceil(wordCount / 200))
    return `${minutes} min read`
  }

  // Compute a simple SEO score and suggestions based on form content
  const computeSeoScore = () => {
    const contentHTML = editorRef.current ? (editorRef.current.innerHTML || '') : ''
    const titleLen = title.trim().length
    const checks = []

    const titleOk = titleLen >= 30 && titleLen <= 70
    checks.push({ key: 'title', label: 'Title length (30–70 chars)', passed: titleOk, advice: 'Make the title between 30 and 70 characters for best SEO.' })

    const excerptOk = excerpt.trim().length >= 50
    checks.push({ key: 'excerpt', label: 'Excerpt / meta description', passed: excerptOk, advice: 'Add a descriptive excerpt of at least ~50 characters.' })

    const imageOk = !!coverImageBase64
    checks.push({ key: 'image', label: 'Cover image present', passed: imageOk, advice: 'Add a cover image to improve link previews and click-through-rate.' })

    const categoryOk = !!category
    checks.push({ key: 'category', label: 'Category assigned', passed: categoryOk, advice: 'Assign a category to help organize and surface the post.' })

    const lengthOk = wordCount >= 300
    checks.push({ key: 'length', label: 'Content length (≥300 words)', passed: lengthOk, advice: 'Longer, in-depth posts (300+ words) typically rank better.' })

    const headingsOk = /<h[12][\s>]/i.test(contentHTML)
    checks.push({ key: 'headings', label: 'Has H1/H2 headings', passed: headingsOk, advice: 'Use headings (<h1>, <h2>) to structure content for readers and search engines.' })

    // Scoring weights (sum to 100)
    let score = 0
    score += titleOk ? 20 : (titleLen > 0 ? 5 : 0)
    score += excerptOk ? 20 : 0
    score += imageOk ? 15 : 0
    score += categoryOk ? 10 : 0
    score += lengthOk ? 20 : Math.min(10, Math.floor(wordCount / 30))
    score += headingsOk ? 15 : 0

    if (score > 100) score = 100
    if (score < 0) score = 0

    return { score, checks }
  }

  // Handle category creation via API
  const handleCreateCategory = async (e) => {
    e.preventDefault()
    const trimmed = newCategoryName.trim().toUpperCase()
    if (!trimmed) return

    try {
      const res = await fetch('/api/blog-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      })

      if (res.ok) {
        // Refresh categories from API
        const catRes = await fetch('/api/blog-categories')
        if (catRes.ok) {
          const cats = await catRes.json()
          setCustomCategories(cats.map(c => c.name))
        }
        setCategory(trimmed)
        setNewCategoryName('')
        setSuccessMsg(`Category "${trimmed}" created successfully!`)
        setTimeout(() => setSuccessMsg(''), 3000)
        setError('')
      } else {
        const data = await res.json()
        setError(data.error || 'Category already exists or failed to save.')
      }
    } catch (err) {
      setError('Failed to create category. Network error.')
    }
  }

  // File Upload to Base64 conversion
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }

    setImageFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setCoverImageBase64(reader.result)
      setError('')
    }
    reader.onerror = () => {
      setError('Failed to read image file.')
    }
    reader.readAsDataURL(file)
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

    // 1. Focus the editor first to restore editing context
    editorRef.current.focus()

    // 2. Restore the highlighted range
    const sel = window.getSelection()
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }

    if (!linkUrl) {
      setLinkModalOpen(false)
      return
    }

    // 3. Create the link element
      const targetAttr = linkOpenInNewTab ? ' target="_blank"' : ''
      const relAttr = linkRel === 'nofollow' ? 'rel="nofollow noopener noreferrer"' : (linkOpenInNewTab ? 'rel="noopener noreferrer"' : '')

      if (sel && sel.isCollapsed) {
        // If no text was highlighted, insert URL as active link text
        const htmlText = `<a href="${linkUrl}"${targetAttr} ${relAttr}>${linkUrl}</a>`
        document.execCommand('insertHTML', false, htmlText)
      } else {
        // Standard highlight wrapper
        document.execCommand('createLink', false, linkUrl)

        // Try to find the created anchor to apply relational attributes
        let anchorEl = null
        if (sel && sel.anchorNode) {
          let node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode
          while (node && node !== editorRef.current) {
            if (node.tagName === 'A') {
              anchorEl = node
              break
            }
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

    // 4. Update stats and clean state
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

  // AI Suggest Titles
  const suggestTitles = async () => {
    if (!title.trim() && !excerpt.trim()) {
      setError('Please provide a basic title or excerpt to get suggestions.')
      return
    }
    setError('')
    setAiGenerating(true)
    try {
      const res = await fetch('/api/ai/suggest-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: title || excerpt })
      })
      const data = await res.json()
      if (res.ok && data.titles) {
        setSuggestedTitles(data.titles)
        setShowTitleSuggestions(true)
      } else {
        throw new Error(data.error || 'Failed to suggest titles')
      }
    } catch (err) {
      setError(err.message || 'Error communicating with Qubi assistant')
    } finally {
      setAiGenerating(false)
    }
  }

  // Handle Selection Change for Floating AI Toolbar
  const handleSelectionChangeEvt = (e) => {
    // If clicking inside the floating toolbar, do not dismiss it
    if (e && e.target && e.target.closest && e.target.closest('#qubi-floating-toolbar')) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setFloatingToolbarProps(null)
      return
    }

    const range = selection.getRangeAt(0)
    let node = range.commonAncestorContainer
    while (node && node !== document.body) {
      if (node === editorRef.current) break
      node = node.parentNode
    }
    
    if (node !== editorRef.current) {
      setFloatingToolbarProps(null)
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setFloatingToolbarProps(null)
      return
    }

    const rect = range.getBoundingClientRect()
    setFloatingToolbarProps({
      top: rect.top - 60,
      left: rect.left + rect.width / 2,
      text,
      range
    })
  }

  useEffect(() => {
    document.addEventListener('mouseup', handleSelectionChangeEvt)
    document.addEventListener('keyup', handleSelectionChangeEvt)
    return () => {
      document.removeEventListener('mouseup', handleSelectionChangeEvt)
      document.removeEventListener('keyup', handleSelectionChangeEvt)
    }
  }, [])

  const modifySelectedText = async (mode) => {
    if (!floatingToolbarProps) return
    setIsModifyingText(true)
    
    try {
      const res = await fetch('/api/ai/modify-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: floatingToolbarProps.text, 
          prompt: floatingPrompt,
          mode 
        })
      })
      
      const data = await res.json()
      if (res.ok && data.text) {
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(floatingToolbarProps.range)
        document.execCommand('insertText', false, data.text)
        setFloatingToolbarProps(null)
        setFloatingPrompt('')
        handleEditorChange()
      }
    } catch (err) {
      console.error('Error modifying text:', err)
    } finally {
      setIsModifyingText(false)
    }
  }

  // AI Generate Excerpt
  const generateAIExcerpt = async () => {
    if (!title.trim()) {
      setError('Please enter a title first before generating an excerpt.')
      return
    }
    setError('')
    setAiExcerptGenerating(true)
    try {
      const content = editorRef.current ? editorRef.current.innerText : ''
      const res = await fetch('/api/ai/generate-blog-excerpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate excerpt')
      setExcerpt(data.excerpt)
      setSuccessMsg('Qubi has written your excerpt!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message || 'Error generating excerpt')
    } finally {
      setAiExcerptGenerating(false)
    }
  }

  // AI Write Blog Content
  const generateAIBlogContent = async () => {
    if (!title.trim()) {
      setError('Please enter a title first before generating blog content.')
      return
    }
    setError('')
    setAiContentGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-blog-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate content')
      // Convert markdown to simple HTML for the editor
      const html = data.content
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[h|u|l])/gm, '')
      if (editorRef.current) {
        editorRef.current.innerHTML = `<p>${html}</p>`
        handleEditorChange()
      }
      setSuccessMsg('Qubi has written your blog!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message || 'Error generating blog content')
    } finally {
      setAiContentGenerating(false)
    }
  }

  // Final Publish via API
  // Helper to perform actual publish request
  const doPublish = async () => {
    // Get author email from profile
    let authorEmail = ''
    try {
      const profileRaw = localStorage.getItem('qsphere_onboarding_profile')
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw)
        authorEmail = parsed.email || parsed.emailAddress || ''
      }
    } catch (e) {}
    if (!authorEmail) {
      authorEmail = localStorage.getItem('qsphere_email_to_verify') || ''
    }

    const htmlContent = editorRef.current ? editorRef.current.innerHTML : ''
    const textContent = editorRef.current ? editorRef.current.innerText : ''
    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      blogData: htmlContent,
      coverImage: coverImageBase64,
      category: category,
      author: author.trim() ? author.trim() : 'QSphere Contributor',
      authorEmail: authorEmail,
      readingTime: getAutoReadTime(),
    }

    try {
      setSuccessMsg('Publishing...')
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        // Remove the published draft from localStorage drafts
        if (currentDraftId) {
          const draftsRaw = localStorage.getItem('qsphere_blog_drafts')
          if (draftsRaw) {
            try {
              const drafts = JSON.parse(draftsRaw)
              const updated = drafts.filter(d => d.id !== currentDraftId)
              if (updated.length === 0) {
                localStorage.removeItem('qsphere_blog_drafts')
              } else {
                localStorage.setItem('qsphere_blog_drafts', JSON.stringify(updated))
              }
            } catch (e) {}
          }
        }
        navigate('/blogs')
      } else {
        const data = await res.json()
        setError(data.error || 'Error occurred while publishing. Please try again.')
        setSuccessMsg('')
      }
    } catch (err) {
      setError('Network error while publishing. Please try again.')
      setSuccessMsg('')
    }
  }

  const handlePublish = async (e) => {
    e.preventDefault()
    setError('')

    // Compute SEO results and show modal with any incomplete tasks
    const seo = seoResults || computeSeoScore()
    const incomplete = seo.checks.filter(c => !c.passed)
    if (incomplete.length > 0) {
      setMissingSeoChecks(incomplete)
      setSeoIncompleteModalOpen(true)
      return
    }

    // All SEO checks passed, proceed to publish
    await doPublish()
  }

  return (
    <div className="relative bg-[#08120d]" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentPage="blogs" />

      {/* Grid backgrounds */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#08120d]" />
        <div className="absolute inset-0 opacity-35" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.16) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 10%, rgba(34,197,94,0.12) 0%, transparent 30%)' }} />
      </div>

      {/* Editor top navigation bar */}
      <div className="relative z-10 w-full bg-white/[0.04] border-b border-white/[0.08] backdrop-blur-xl pt-24 px-6 md:px-10 lg:px-14">
        <div className="mx-auto w-full flex flex-col md:flex-row md:items-center justify-between py-6 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:border-emerald-400/30 hover:bg-emerald-500/10 text-white/70 hover:text-emerald-300 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="text-[10px] tracking-[0.25em] font-semibold text-emerald-400 uppercase">Interactive Publisher</div>
              <h1 className="text-white font-bold text-lg leading-tight">Write Blog Post</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 font-mono hidden sm:inline">{getAutoReadTime()} ({wordCount} {wordCount === 1 ? 'word' : 'words'}) estimated</span>
            <button
              onClick={handlePublish}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 text-black px-6 py-2.5 text-xs font-extrabold hover:bg-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all"
            >
              Publish Post
            </button>
          </div>
        </div>
      </div>

      {/* Editor container */}
      <main className="relative z-10 flex-grow px-6 md:px-10 lg:px-14 py-8">
        <div className="mx-auto w-full">

          {hasDraftToRestore && (
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-emerald-300 shadow-[0_18px_60px_-35px_rgba(16,185,129,0.55)]">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <span className="text-sm font-bold text-white block">Unsaved Draft Found</span>
                  <span className="text-xs text-white/60">We found an unsaved draft from your last session. Would you like to restore it?</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={dismissDraftBanner}
                  className="px-4 py-1.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-semibold transition"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => setShowDraftsModal(true)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-400 text-black hover:bg-emerald-300 text-xs font-bold transition shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  View Drafts ({draftsList.length})
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300 animate-pulse">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
              <Check size={18} className="shrink-0" />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            
            {/* LEFT COLUMN: The Rich Text Editor Panel */}
            <div className="space-y-6">
              
              {/* Document metadata heading area */}
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6 space-y-4 shadow-[0_20px_70px_-45px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <GhostInput
                    value={title}
                    onChange={(v) => setTitle(v)}
                    placeholder="Enter Title..."
                    className="flex-1 w-full text-white font-black text-3xl md:text-4xl outline-none placeholder-white/30 border-b border-white/10 focus:border-emerald-400/30 pb-4 transition-all"
                    style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}
                  />
                  <button
                    type="button"
                    disabled={aiGenerating || (!title.trim() && !excerpt.trim())}
                    onClick={suggestTitles}
                    className="shrink-0 md:mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-bold text-sm shadow-[0_4px_15px_-4px_rgba(16,185,129,0.5)] hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {aiGenerating ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                        Generating...
                      </span>
                    ) : (
                      <>
                        <Sparkles size={16} /> Suggest Title
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-white/50" />

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Provide a short summary / teaser excerpt..."
                    className="flex-1 bg-transparent text-white/70 text-sm outline-none placeholder-white/20"
                  />
                  <button
                    type="button"
                    disabled={aiExcerptGenerating || !title.trim()}
                    onClick={generateAIExcerpt}
                    title="AI Generate Excerpt"
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {aiExcerptGenerating ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    {aiExcerptGenerating ? 'Writing...' : 'Qubi Write'}
                  </button>
                </div>
              </div>

              {/* The Jodit-like Visual editor */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl overflow-hidden flex flex-col shadow-[0_22px_80px_-50px_rgba(0,0,0,0.75)]">
                
                {/* TOOLBAR */}
                <div className="flex flex-wrap items-center gap-1 bg-white/[0.06] border-b border-white/10 p-2 text-white/85">
                  {/* Basic styles */}
                  <button type="button" onClick={() => execCmd('bold')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold" title="Bold"><Bold size={15} /></button>
                  <button type="button" onClick={() => execCmd('italic')} className="p-2 rounded hover:bg-white/5 transition-colors font-semibold" title="Italic"><Italic size={15} /></button>
                  <button type="button" onClick={() => execCmd('underline')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Underline"><Underline size={15} /></button>
                  
                  <span className="w-[1px] h-5 bg-white/10 mx-1" />

                  {/* Lists */}
                  <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Bullet List"><List size={15} /></button>
                  <button type="button" onClick={() => execCmd('insertOrderedList')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Numbered List"><ListOrdered size={15} /></button>
                  
                  <span className="w-[1px] h-5 bg-white/10 mx-1" />

                  {/* Headers dropdown style format */}
                  <button type="button" onClick={() => execCmd('formatBlock', '<h1>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 1"><Heading1 size={15} /></button>
                  <button type="button" onClick={() => execCmd('formatBlock', '<h2>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 2"><Heading2 size={15} /></button>
                  <button type="button" onClick={() => execCmd('formatBlock', '<h3>')} className="p-2 rounded hover:bg-white/5 transition-colors font-bold text-xs" title="Heading 3"><Heading3 size={15} /></button>
                  <button type="button" onClick={() => execCmd('formatBlock', '<p>')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Paragraph"><Text size={15} /></button>
                  <button type="button" onClick={() => execCmd('formatBlock', '<blockquote>')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Quote"><Quote size={15} /></button>

                  <span className="w-[1px] h-5 bg-white/10 mx-1" />

                  {/* Alignments */}
                  <button type="button" onClick={() => execCmd('justifyLeft')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Left"><AlignLeft size={15} /></button>
                  <button type="button" onClick={() => execCmd('justifyCenter')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Center"><AlignCenter size={15} /></button>
                  <button type="button" onClick={() => execCmd('justifyRight')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Right"><AlignRight size={15} /></button>
                  <button type="button" onClick={() => execCmd('justifyFull')} className="p-2 rounded hover:bg-white/5 transition-colors" title="Align Justify"><AlignJustify size={15} /></button>

                  <span className="w-[1px] h-5 bg-white/10 mx-1" />

                  {/* Insert Actions */}
                  <button type="button" onClick={insertLink} className="p-2 rounded hover:bg-white/5 transition-colors" title="Insert Link"><LinkIcon size={15} /></button>
                  
                  <span className="w-[1px] h-5 bg-white/10 mx-1" />

                  {/* Utility */}
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
                  onClick={(e) => {
                    handleEditorChange()
                    if (e.target.tagName === 'IMG') {
                      setSelectedImageNode(e.target)
                      setImageAltText(e.target.getAttribute('alt') || '')
                    } else {
                      setSelectedImageNode(null)
                    }
                  }}
                  className="w-full min-h-[450px] bg-white/[0.03] text-white p-6 leading-relaxed outline-none focus:bg-white/[0.05] transition-all prose prose-invert max-w-none"
                  style={{
                    overflowY: 'auto',
                    fontFamily: "'Inter', sans-serif"
                  }}
                  placeholder="Click here to start composing your rich article content..."
                />

                {/* EDITOR FOOTER (Dynamic tag path, word count, jodit style logo) */}
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

            {/* RIGHT COLUMN: Settings & Publishing Controls */}
            <div className="space-y-6">
              
              {/* Cover Image Upload (No presets shown!) */}
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6 space-y-4 shadow-[0_20px_70px_-45px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <h2 className="text-white text-sm font-bold tracking-wider uppercase flex items-center justify-between">
                  <span>Cover Banner Image</span>
                  <Settings size={14} className="text-emerald-400" />
                </h2>
                
                {!coverImageBase64 ? (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-400/30 hover:bg-emerald-500/[0.02] transition-all">
                    <Upload size={28} className="text-emerald-400/70 mb-3" />
                    <span className="text-xs font-bold text-white mb-1">Upload Cover Photo</span>
                    <span className="text-[10px] text-white/35">PNG, JPG, WebP up to 5MB</span>
                    <input
                      type="file"
                      required
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-[16/10]">
                      <img src={coverImageBase64} alt="Uploaded Cover" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setCoverImageBase64(''); setImageFileName(''); }}
                        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-red-400 border border-white/10 hover:bg-black transition-all"
                        title="Remove Image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-[10px] text-white/45 truncate font-mono text-center">{imageFileName}</div>
                  </div>
                )}
              </div>

              {/* Image Properties Panel (Only shows when an image is selected in the editor) */}
              {selectedImageNode && (
                <div className="rounded-3xl border border-emerald-400/30 bg-emerald-950/20 p-6 space-y-4 shadow-[0_20px_70px_-45px_rgba(16,185,129,0.3)] backdrop-blur-xl animate-in slide-in-from-top-4 fade-in">
                  <h2 className="text-emerald-400 text-sm font-bold tracking-wider uppercase flex items-center justify-between">
                    <span>Image Properties</span>
                    <Settings size={14} />
                  </h2>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-white/70">Alt Text (SEO)</label>
                    <input
                      type="text"
                      value={imageAltText}
                      onChange={(e) => {
                        setImageAltText(e.target.value)
                        if (selectedImageNode) {
                          selectedImageNode.setAttribute('alt', e.target.value)
                          handleEditorChange()
                        }
                      }}
                      placeholder="Describe this image..."
                      className="w-full rounded-xl bg-black/40 border border-emerald-400/20 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none transition-colors"
                    />
                    <p className="text-[10px] text-white/40 leading-relaxed">
                      Alt text improves accessibility and helps search engines understand the image. It is saved automatically as you type.
                    </p>
                  </div>
                </div>
              )}

              {/* Auto Save Settings Panel */}
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6 space-y-4 shadow-[0_20px_70px_-45px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-white text-sm font-bold tracking-wider uppercase">
                    Auto Save
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider select-none">
                      {autoSaveEnabled ? 'On' : 'Off'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !autoSaveEnabled
                        setAutoSaveEnabled(nextVal)
                        localStorage.setItem('qsphere_autosave_preference', String(nextVal))
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out outline-none ${
                        autoSaveEnabled ? 'bg-emerald-400' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                          autoSaveEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-white/50 leading-relaxed font-mono">
                  {autoSaveEnabled ? (
                    lastSavedTime ? (
                      <span className="text-emerald-400">Draft auto-saved at {lastSavedTime}</span>
                    ) : (
                      <span>Draft auto-saves as you type...</span>
                    )
                  ) : (
                    <span>Auto-saving is disabled.</span>
                  )}
                </div>
              </div>

              {/* Dynamic Categories (Defaults removed!) */}
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6 space-y-4 shadow-[0_20px_70px_-45px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <h2 className="text-white text-sm font-bold tracking-wider uppercase">
                  Categories List
                </h2>

                {/* List of custom categories */}
                {customCategories.length === 0 ? (
                  <div className="text-xs text-white/30 italic">No categories created yet. Add a category below to get started.</div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {customCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          category === cat
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                            : 'border-white/10 text-white/50 hover:border-white/35 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Inline Category Creation */}
                <div className="border-t border-white/[0.06] pt-4 space-y-3">
                  <div className="text-xs font-semibold text-white/70">Create New Category</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. THEORY"
                      className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 uppercase tracking-wider focus:border-emerald-400/40 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-3 py-2 rounded-xl bg-emerald-400 text-black hover:bg-emerald-300 transition-all text-xs font-extrabold uppercase"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>

              {/* Publish Info Panel */}
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6 space-y-4 shadow-[0_20px_70px_-45px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <h2 className="text-white text-sm font-bold tracking-wider uppercase">
                  Post Metadata
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Author</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Contributor Name"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 focus:border-emerald-400/40 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white/70">SEO</div>
                      <div className="flex items-center gap-2">
                        {seoResults ? (
                          <div className="text-xs font-mono text-emerald-300">{seoResults.score}%</div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            const res = computeSeoScore()
                            setSeoResults(res)
                            setSeoOpen((s) => !s)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black text-xs font-semibold hover:bg-emerald-300 transition"
                        >
                          SEO Suggestions
                        </button>
                      </div>
                    </div>

                    {seoOpen && seoResults ? (
                      <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-xs text-white/60">SEO Score</div>
                          <div className="text-sm font-bold text-emerald-300">{seoResults.score}%</div>
                        </div>
                        <ul className="space-y-3">
                          {seoResults.checks.map((c) => (
                            <li key={c.key} className="flex items-start gap-3">
                              <div className={c.passed ? 'text-emerald-300' : 'text-red-400'}>
                                {c.passed ? '✔' : '✖'}
                              </div>
                              <div>
                                <div className="text-sm text-white">{c.label}</div>
                                {!c.passed ? <div className="text-xs text-white/40">{c.advice}</div> : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>
      {/* Link insertion modal */}
      {linkModalOpen ? (
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
      ) : null}

      {/* Floating AI Text Modification Toolbar */}
      {floatingToolbarProps && (
        <div 
          id="qubi-floating-toolbar"
          className="fixed z-50 flex items-center gap-2 rounded-2xl bg-[#111c16] border border-emerald-400/20 p-2 shadow-2xl backdrop-blur-xl transform -translate-x-1/2 -translate-y-full"
          style={{ top: floatingToolbarProps.top, left: floatingToolbarProps.left }}
        >
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-1.5 border border-white/[0.08]">
            <Sparkles size={14} className="text-emerald-400" />
            <input 
              type="text"
              value={floatingPrompt}
              onChange={(e) => setFloatingPrompt(e.target.value)}
              placeholder="Ask Qubi to modify..."
              className="bg-transparent text-xs text-white outline-none w-48 placeholder:text-white/40"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && floatingPrompt.trim()) {
                  e.preventDefault()
                  modifySelectedText('prompt')
                }
              }}
            />
            <button 
              type="button"
              disabled={isModifyingText || !floatingPrompt.trim()}
              onClick={() => modifySelectedText('prompt')}
              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-300 disabled:opacity-50"
            >
              <CornerDownRight size={14} />
            </button>
          </div>
          <span className="w-[1px] h-6 bg-white/10" />
          <button 
            type="button"
            disabled={isModifyingText}
            onClick={() => modifySelectedText('paraphrase')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/20 disabled:opacity-50 transition"
          >
            {isModifyingText ? 'Processing...' : 'Paraphrase'}
          </button>
          <button
            type="button"
            onClick={() => { setFloatingToolbarProps(null); setFloatingPrompt(''); }}
            className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* AI Title Suggestions Modal */}
      {showTitleSuggestions && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTitleSuggestions(false)} />
          <div className="relative z-60 w-full max-w-2xl rounded-3xl border border-emerald-400/20 bg-[#08100c] p-8 shadow-[0_40px_100px_-20px_rgba(16,185,129,0.3)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">AI Title Suggestions</h3>
                <p className="text-xs text-white/50">Highly optimized for SEO and readability</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowTitleSuggestions(false)}
                className="ml-auto p-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/10 text-white/60 transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              {suggestedTitles.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-emerald-400/30 transition group">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-white mb-1 truncate">{t.title}</h4>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${t.rating}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-300/70">SEO Score: {t.rating}/100</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(t.title)
                      setShowTitleSuggestions(false)
                    }}
                    className="shrink-0 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 px-4 py-2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-400 hover:text-black"
                  >
                    Select Title
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drafts Modal */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDraftsModal(false)} />
          <div className="relative z-60 w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border border-white/10 bg-[#0b1510] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Your Drafts</h3>
                <p className="text-xs text-white/50 mt-1">Manage or restore your saved blog drafts</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDraftsModal(false)}
                className="p-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/10 text-white/60 transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid gap-4">
              {draftsList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-white/40 text-sm">No drafts found.</div>
                </div>
              ) : (
                draftsList.sort((a, b) => new Date(b.date + ' ' + b.timestamp) - new Date(a.date + ' ' + a.timestamp)).map(draft => (
                  <div key={draft.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-emerald-400/30 transition flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-white mb-1 truncate">{draft.title || 'Untitled Draft'}</h4>
                      <p className="text-xs text-white/50 line-clamp-2 leading-relaxed mb-3">
                        {draft.excerpt || (draft.body ? draft.body.replace(/<[^>]*>?/gm, '') : 'No content yet')}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-white/40">
                        <span>{draft.date}</span>
                        <span>•</span>
                        <span>{draft.timestamp}</span>
                        {draft.id === currentDraftId && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">CURRENT</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => deleteDraft(draft.id)}
                        className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition"
                        title="Delete Draft"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={draft.id === currentDraftId}
                        onClick={() => restoreSpecificDraft(draft)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-sm font-bold transition hover:bg-emerald-400 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {draft.id === currentDraftId ? 'Active' : 'Restore'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="border-t border-white/10 p-4 bg-white/[0.02] flex justify-end rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {seoIncompleteModalOpen && (
  <div className="fixed inset-0 z-[70] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSeoIncompleteModalOpen(false)} />
    <div className="relative z-60 w-full max-w-lg rounded-3xl border border-white/[0.08] bg-[#0b1510] p-8 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <AlertCircle size={20} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">SEO Suggestions Incomplete</h3>
          <p className="text-xs text-white/50">These unfinished tasks could affect the ranking of your blog</p>
        </div>
        <button
          type="button"
          onClick={() => setSeoIncompleteModalOpen(false)}
          className="ml-auto p-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/10 text-white/60 transition"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">Missing checks</div>
      <ul className="space-y-2 mb-6">
        {missingSeoChecks.map((c) => (
          <li key={c.key} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs font-bold">✕</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{c.label}</div>
              <div className="text-xs text-white/40 mt-0.5">{c.advice}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="text-xs text-white/50 mb-6 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        These items help search engines understand and rank your content better. Publishing without them may reduce visibility.
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setSeoIncompleteModalOpen(false)}
          className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white text-sm font-semibold transition"
        >
          Edit Blog
        </button>
        <button
          type="button"
          onClick={async () => {
            setSeoIncompleteModalOpen(false);
            await doPublish();
          }}
          className="flex-1 px-4 py-3 rounded-xl bg-emerald-400 text-black hover:bg-emerald-300 text-sm font-bold transition shadow-[0_0_20px_rgba(16,185,129,0.25)]"
        >
          Publish Anyway
        </button>
      </div>
    </div>
  </div>
)}
<Footer />
    </div>
  )
}
