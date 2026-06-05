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
  FileText
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { saveCustomCategory, saveNewBlog } from '../utils/blogStore'

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
  // SEO panel state
  const [seoOpen, setSeoOpen] = useState(false)
  const [seoResults, setSeoResults] = useState(null)
  // Link modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkRel, setLinkRel] = useState('dofollow')
  const savedRangeRef = useRef(null)

  // Auto Save States
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const savedPref = localStorage.getItem('qsphere_autosave_preference')
    return savedPref !== 'false' // default to true
  })
  const [lastSavedTime, setLastSavedTime] = useState('')
  const [hasDraftToRestore, setHasDraftToRestore] = useState(false)

  // Load custom categories, author profile, and check for draft
  useEffect(() => {
    const rawCustomCats = localStorage.getItem('qsphere_custom_categories')
    if (rawCustomCats) {
      try {
        setCustomCategories(JSON.parse(rawCustomCats))
      } catch (e) {
        setCustomCategories([])
      }
    }

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

    // Check for existing draft
    const draft = localStorage.getItem('qsphere_blog_draft')
    if (draft) {
      setHasDraftToRestore(true)
    }
  }, [])

  // Restore draft content
  const restoreDraft = () => {
    const draftRaw = localStorage.getItem('qsphere_blog_draft')
    if (!draftRaw) return

    try {
      const draft = JSON.parse(draftRaw)
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
    } catch (e) {
      setError('Failed to restore draft.')
    }
    setHasDraftToRestore(false)
  }

  // Discard draft content
  const discardDraft = () => {
    localStorage.removeItem('qsphere_blog_draft')
    setHasDraftToRestore(false)
    setSuccessMsg('Draft discarded.')
    setTimeout(() => setSuccessMsg(''), 3000)
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
      const draftData = {
        title,
        excerpt,
        category,
        coverImageBase64,
        imageFileName,
        author,
        body: editorRef.current ? editorRef.current.innerHTML : '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      localStorage.setItem('qsphere_blog_draft', JSON.stringify(draftData))
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

        // Auto-save one final time just in case they decide to exit
        const draftData = {
          title,
          excerpt,
          category,
          coverImageBase64,
          imageFileName,
          author,
          body: editorRef.current ? editorRef.current.innerHTML : '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        localStorage.setItem('qsphere_blog_draft', JSON.stringify(draftData))
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

  // Handle category creation
  const handleCreateCategory = (e) => {
    e.preventDefault()
    const trimmed = newCategoryName.trim().toUpperCase()
    if (!trimmed) return

    const success = saveCustomCategory(trimmed)
    if (success) {
      const rawCustomCats = localStorage.getItem('qsphere_custom_categories')
      const updated = rawCustomCats ? JSON.parse(rawCustomCats) : []
      setCustomCategories(updated)
      setCategory(trimmed)
      setNewCategoryName('')
      setSuccessMsg(`Category "${trimmed}" created successfully!`)
      setTimeout(() => setSuccessMsg(''), 3000)
      setError('')
    } else {
      setError('Category already exists or failed to save.')
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
    setLinkUrl('')
    setLinkRel('dofollow')
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
    if (sel && sel.isCollapsed) {
      // If no text was highlighted, insert URL as active link text
      const htmlText = `<a href="${linkUrl}" ${linkRel === 'nofollow' ? 'rel="nofollow noopener noreferrer"' : ''}>${linkUrl}</a>`
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
        if (linkRel === 'nofollow') {
          anchorEl.setAttribute('rel', 'nofollow noopener noreferrer')
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
    savedRangeRef.current = null
  }

  const cancelLink = () => {
    setLinkModalOpen(false)
    setLinkUrl('')
    setLinkRel('dofollow')
    savedRangeRef.current = null
  }

  // Final Publish
  const handlePublish = (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please enter a title for your blog.')
      return
    }
    if (!category) {
      setError('Please select or create a category.')
      return
    }
    if (!coverImageBase64) {
      setError('Please upload a cover photo of your choice.')
      return
    }
    if (!excerpt.trim()) {
      setError('Please write a short excerpt summary.')
      return
    }

    const htmlContent = editorRef.current ? editorRef.current.innerHTML : ''
    const textContent = editorRef.current ? editorRef.current.innerText : ''

    if (!textContent.trim()) {
      setError('Please write some content inside your blog.')
      return
    }

    const blogData = {
      title: title.trim(),
      category: category,
      readTime: getAutoReadTime(),
      excerpt: excerpt.trim(),
      image: coverImageBase64,
      author: author.trim() ? author.trim() : 'QSphere Contributor',
      body: htmlContent // Save as styled HTML directly
    }

    const saved = saveNewBlog(blogData)
    if (saved) {
      localStorage.removeItem('qsphere_blog_draft')
      navigate('/blogs')
    } else {
      setError('Error occurred while publishing. Please try again.')
    }
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
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
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
        <div className="mx-auto max-w-7xl">

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
                  onClick={discardDraft}
                  className="px-4 py-1.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-semibold transition"
                >
                  Discard Draft
                </button>
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="px-4 py-1.5 rounded-xl bg-emerald-400 text-black hover:bg-emerald-300 text-xs font-bold transition shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  Restore Draft
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
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter Title..."
                  className="w-full bg-transparent text-white font-black text-3xl md:text-4xl outline-none placeholder-white/30 border-b border-white/10 focus:border-emerald-400/30 pb-4 transition-all"
                  style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}
                />
                
                <input
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Provide a short summary / teaser excerpt..."
                  className="w-full bg-transparent text-white/70 text-sm outline-none placeholder-white/20"
                />
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
                  onClick={handleEditorChange}
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
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/35 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Link type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setLinkRel('dofollow')} className={`px-3 py-1.5 rounded-xl text-xs ${linkRel === 'dofollow' ? 'bg-emerald-400 text-black' : 'bg-white/[0.06] text-white/70'}`}>Dofollow</button>
                  <button type="button" onClick={() => setLinkRel('nofollow')} className={`px-3 py-1.5 rounded-xl text-xs ${linkRel === 'nofollow' ? 'bg-emerald-400 text-black' : 'bg-white/[0.06] text-white/70'}`}>Nofollow</button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={cancelLink} className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/70">Cancel</button>
                <button type="button" onClick={applyLink} className="px-4 py-2 rounded-xl bg-emerald-400 text-black">Insert</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  )
}
