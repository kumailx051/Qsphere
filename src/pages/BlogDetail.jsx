import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { jsPDF } from 'jspdf'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function BlogDetail() {
  const { id } = useParams()
  const postId = Number(id || 0)
  const navigate = useNavigate()
  const location = useLocation()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allBlogs, setAllBlogs] = useState([])
  const [comments, setComments] = useState([])
  const [shareOpen, setShareOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [viewerProfile, setViewerProfile] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editText, setEditText] = useState('')

  const nameRef = useRef(null)
  const commentRef = useRef(null)
  const commentsSectionRef = useRef(null)

  const viewerEmail = (viewerProfile?.emailAddress || viewerProfile?.email || '').toLowerCase()

  const targetCommentId = useMemo(() => {
    const value = new URLSearchParams(location.search).get('commentId')
    const parsed = Number(value || 0)
    return parsed > 0 ? parsed : 0
  }, [location.search])

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    try {
      const logged = localStorage.getItem('qsphere_logged_in') === '1'
      const profileRaw = localStorage.getItem('qsphere_onboarding_profile')
      setIsLoggedIn(logged)
      setViewerProfile(profileRaw ? JSON.parse(profileRaw) : null)
    } catch {
      setIsLoggedIn(false)
      setViewerProfile(null)
    }
  }, [])

  // Process links in blog content: add target="_blank" and rel="noopener noreferrer"
  // so external links open in a new tab instead of navigating away.
  useEffect(() => {
    if (!post?.blogData) return
    const container = document.querySelector('.prose')
    if (!container) return
    const links = container.querySelectorAll('a')
    links.forEach((a) => {
      if (!a.getAttribute('target')) a.setAttribute('target', '_blank')
      const existingRel = a.getAttribute('rel') || ''
      if (!existingRel.includes('noopener')) {
        a.setAttribute('rel', `${existingRel} noopener noreferrer`.trim())
      }
      // Ensure external URLs have a protocol so they don't become relative paths
      const href = a.getAttribute('href') || ''
      if (href && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('http')) {
        a.setAttribute('href', `https://${href}`)
      }
    })
  }, [post?.blogData])

  // Fetch the blog post
  useEffect(() => {
    const loadBlog = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/blogs/${postId}`)
        if (res.ok) {
          const data = await res.json()
          setPost(data)
        } else {
          setPost(null)
        }
      } catch (e) {
        console.error('Failed to load blog:', e)
        setPost(null)
      } finally {
        setLoading(false)
      }
    }
    if (postId) loadBlog()
  }, [postId])

  // Fetch all blogs for the "More Blogs" carousel
  useEffect(() => {
    const loadAll = async () => {
      try {
        const res = await fetch('/api/blogs')
        if (res.ok) {
          const data = await res.json()
          setAllBlogs(data)
        }
      } catch (e) {
        // ignore
      }
    }
    loadAll()
  }, [])

  // Fetch comments for this blog
  useEffect(() => {
    const loadComments = async () => {
      try {
        const res = await fetch(`/api/blogs/${postId}/comments`)
        if (res.ok) {
          const data = await res.json()
          setComments(data)
        }
      } catch (e) {
        // ignore
      }
    }
    if (postId) loadComments()
  }, [postId])

  useEffect(() => {
    if (!targetCommentId || comments.length === 0) return

    const targetNode = document.getElementById(`blog-comment-${targetCommentId}`)
    if (targetNode) {
      window.requestAnimationFrame(() => {
        targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    if (commentsSectionRef.current) {
      window.requestAnimationFrame(() => {
        commentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [comments, targetCommentId])

  const addComment = async (e) => {
    e.preventDefault()

    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Please sign in to comment on this blog.', type: 'error' } }))
      navigate('/auth', {
        state: {
          redirectTo: `/blogs/${postId}`,
          authMessage: 'Please sign in to comment on this blog.',
          authMessageType: 'info',
        }
      })
      return
    }

    const name = nameRef.current?.value?.trim() || viewerProfile?.fullName || 'Anonymous'
    const text = commentRef.current?.value?.trim()
    if (!text) return

    const commenterEmail = viewerProfile?.emailAddress || viewerProfile?.email || ''

    try {
      const res = await fetch(`/api/blogs/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text, commenterEmail })
      })
      if (res.ok) {
        const newComment = await res.json()
        setComments((s) => [newComment, ...s])
        if (commentRef.current) commentRef.current.value = ''
      }
    } catch (e) {
      console.error('Failed to post comment:', e)
    }
  }

  const handleEdit = (comment) => {
    setEditingCommentId(comment.id)
    setEditText(comment.text)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditText('')
  }

  const handleSaveEdit = async (commentId) => {
    const text = editText.trim()
    if (!text) return

    try {
      const res = await fetch(`/api/blogs/${postId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, commenterEmail: viewerEmail })
      })
      if (res.ok) {
        const updated = await res.json()
        setComments((s) => s.map((c) => (c.id === commentId ? updated : c)))
        setEditingCommentId(null)
        setEditText('')
        window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Comment updated', type: 'success' } }))
      } else {
        const err = await res.json()
        window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: err.error || 'Failed to update comment', type: 'error' } }))
      }
    } catch (e) {
      console.error('Failed to update comment:', e)
    }
  }

  const handleDelete = async (commentId) => {
    try {
      const res = await fetch(`/api/blogs/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commenterEmail: viewerEmail })
      })
      if (res.ok) {
        setComments((s) => s.filter((c) => c.id !== commentId))
        window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Comment deleted', type: 'success' } }))
      } else {
        const err = await res.json()
        window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: err.error || 'Failed to delete comment', type: 'error' } }))
      }
    } catch (e) {
      console.error('Failed to delete comment:', e)
    }
  }

  const loadImageAsDataUrl = async (src) => {
    if (!src) return null
    if (src.startsWith('data:')) return src

    try {
      const response = await fetch(src)
      if (!response.ok) return null
      const blob = await response.blob()

      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Failed to read image'))
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const renderHtmlToPdf = (doc, html, x, y, maxWidth, pageHeight, margin) => {
    const temp = document.createElement('div')
    temp.innerHTML = html

    const pageBreak = (needed) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage()
        y = margin + 20
      }
    }

    const renderText = (text, leftMargin, opts = {}) => {
      const {
        fontSize = 11,
        fontStyle = 'normal',
        color = [50, 50, 50],
        indent = 0,
        lineHeight = 14,
        prefix = '',
      } = opts
      if (!text) return
      const avail = maxWidth - leftMargin - indent
      doc.setFont('helvetica', fontStyle)
      doc.setFontSize(fontSize)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, avail)
      for (let i = 0; i < lines.length; i++) {
        pageBreak(lineHeight)
        if (i === 0 && prefix) {
          doc.text(prefix, x + leftMargin + indent, y)
          doc.text(lines[i], x + leftMargin + indent + doc.getTextWidth(prefix) + 2, y)
        } else {
          doc.text(lines[i], x + leftMargin + indent, y)
        }
        y += lineHeight
      }
    }

    const walk = (parentNode, leftMargin) => {
      for (let i = 0; i < parentNode.childNodes.length; i++) {
        const node = parentNode.childNodes[i]
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.replace(/\s+/g, ' ').trim()
          if (!text) continue
          renderText(text, leftMargin)
          continue
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue
        const tag = node.nodeName.toLowerCase()

        if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
          const text = node.textContent.replace(/\s+/g, ' ').trim()
          if (!text) continue
          pageBreak(30)
          y += 8
          const sizes = { h1: 20, h2: 15, h3: 13 }
          renderText(text, leftMargin, {
            fontSize: sizes[tag], fontStyle: 'bold', color: [16, 185, 129],
            lineHeight: sizes[tag] + 10,
          })
          y += 4
          continue
        }

        if (tag === 'p') {
          if (node.children.length > 0) {
            pageBreak(14)
            walk(node, leftMargin)
            y += 6
          } else {
            const text = node.textContent.replace(/\s+/g, ' ').trim()
            if (!text) continue
            renderText(text, leftMargin)
            y += 4
          }
          continue
        }

        if (tag === 'a') {
          const text = node.textContent.replace(/\s+/g, ' ').trim()
          const href = node.getAttribute('href') || ''
          if (!text) continue
          renderText(text, leftMargin, {
            fontSize: 11, fontStyle: 'normal', color: [37, 99, 235], lineHeight: 14,
          })
          continue
        }

        if (tag === 'strong' || tag === 'b') {
          const text = node.textContent.replace(/\s+/g, ' ').trim()
          if (!text) continue
          renderText(text, leftMargin, { fontSize: 11, fontStyle: 'bold', color: [30, 30, 30] })
          continue
        }

        if (tag === 'em' || tag === 'i') {
          const text = node.textContent.replace(/\s+/g, ' ').trim()
          if (!text) continue
          renderText(text, leftMargin, { fontSize: 11, fontStyle: 'italic', color: [60, 60, 60] })
          continue
        }

        if (tag === 'blockquote') {
          const text = node.textContent.replace(/\s+/g, ' ').trim()
          if (!text) continue
          pageBreak(14)
          renderText(text, leftMargin, {
            fontSize: 10, fontStyle: 'italic', color: [100, 100, 100],
            indent: 14, lineHeight: 13,
          })
          y += 6
          continue
        }

        if (tag === 'ul' || tag === 'ol') {
          let index = 1
          for (const li of node.children) {
            if (li.tagName?.toLowerCase() !== 'li') continue
            const text = li.textContent.replace(/\s+/g, ' ').trim()
            if (!text) continue
            pageBreak(16)
            const prefix = tag === 'ol' ? `${index}.` : '•'
            renderText(text, leftMargin, {
              fontSize: 11, fontStyle: 'normal', color: [50, 50, 50],
              indent: 20, prefix, lineHeight: 15,
            })
            y += 2
            index++
          }
          y += 4
          continue
        }

        if (tag === 'br') {
          y += 6
          continue
        }

        if (tag === 'hr') {
          pageBreak(14)
          y += 6
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.5)
          doc.line(x + leftMargin, y, x + maxWidth, y)
          y += 10
          continue
        }

        // Table
        if (tag === 'table') {
          const rows = []
          for (const tr of node.children) {
            if (tr.tagName?.toLowerCase() !== 'tr') continue
            const cells = []
            for (const cell of tr.children) {
              const cellTag = cell.tagName?.toLowerCase()
              if (cellTag === 'td' || cellTag === 'th') {
                cells.push({
                  text: cell.textContent.replace(/\s+/g, ' ').trim(),
                  isHeader: cellTag === 'th',
                  colspan: parseInt(cell.getAttribute('colspan') || '1'),
                  rowspan: parseInt(cell.getAttribute('rowspan') || '1'),
                })
              }
            }
            if (cells.length > 0) rows.push(cells)
          }
          if (rows.length === 0) continue

          const colCount = Math.max(...rows.map(r => r.reduce((s, c) => s + c.colspan, 0)))
          const colWidth = (maxWidth - leftMargin) / colCount
          const cellPadding = 6
          const fontSize = 9

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(fontSize)

          const rowHeights = rows.map((row) => {
            let maxH = 0
            for (const cell of row) {
              const w = cell.colspan * colWidth - cellPadding * 2
              const lines = doc.splitTextToSize(cell.text || '', w)
              const h = lines.length * (fontSize + 3) + cellPadding * 2
              if (h > maxH) maxH = h
            }
            return Math.max(maxH, fontSize + cellPadding * 2 + 6)
          })

          let tableY = y
          for (let ri = 0; ri < rows.length; ri++) {
            const row = rows[ri]
            const rowH = rowHeights[ri]
            if (tableY + rowH > pageHeight - margin) {
              doc.addPage()
              tableY = margin + 20
            }

            let cellX = x + leftMargin
            let maxRowH = rowH
            for (let ci = 0; ci < row.length; ci++) {
              const cell = row[ci]
              const w = cell.colspan * colWidth
              const h = rowH

              doc.setDrawColor(180, 180, 180)
              doc.setLineWidth(0.3)
              doc.rect(cellX, tableY, w, h)

              if (cell.isHeader) {
                doc.setFillColor(16, 185, 129, 0.12)
                doc.rect(cellX, tableY, w, h, 'F')
              }

              const cellText = cell.text || ''
              const lines = doc.splitTextToSize(cellText, w - cellPadding * 2)

              doc.setFont('helvetica', cell.isHeader ? 'bold' : 'normal')
              doc.setFontSize(fontSize)
              doc.setTextColor(cell.isHeader ? [16, 185, 129] : [50, 50, 50])

              for (let li = 0; li < lines.length; li++) {
                doc.text(lines[li], cellX + cellPadding, tableY + cellPadding + (li + 1) * (fontSize + 3))
              }

              cellX += w
            }
            tableY += rowH
          }
          y = tableY + 10
          continue
        }

        if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'span' || tag === 'thead' || tag === 'tbody' || tag === 'tfoot') {
          walk(node, leftMargin)
          continue
        }
        walk(node, leftMargin)
      }
    }
    walk(temp, 0)
    return y
  }

  const downloadPdf = async () => {
    if (!post || isDownloadingPdf) return

    setIsDownloadingPdf(true)

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 50
      const contentWidth = pageWidth - margin * 2

      let y = margin + 30

      // Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(16, 185, 129)
      const titleLines = doc.splitTextToSize(post.title || 'Untitled Article', contentWidth)
      for (const line of titleLines) {
        if (y + 24 > pageHeight - margin) {
          doc.addPage()
          y = margin + 20
        }
        doc.text(line, margin, y)
        y += 22
      }

      y += 16

      // Separator
      doc.setDrawColor(16, 185, 129, 0.4)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 20

      // Render blog body HTML
      y = renderHtmlToPdf(doc, post.blogData || '', margin, y, contentWidth, pageHeight, margin)

      // Page numbers
      const totalPages = doc.internal.getNumberOfPages()
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(180, 180, 180)
        doc.text(`QSphere Blog`, margin, pageHeight - 20)
        doc.text(`${page} / ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' })
      }

      const safeTitle = (post.title || 'blog-detail').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
      doc.save(`${safeTitle || 'blog-detail'}.pdf`)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const shareTo = (platform) => {
    const url = window.location.href
    const text = encodeURIComponent(post?.title || '')
    let shareUrl = '#'
    if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    if (platform === 'linkedin') shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${text}`
    if (platform === 'instagram') shareUrl = `https://www.instagram.com/`
    setShareOpen(false)
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  // More blogs carousel
  const others = useMemo(() => allBlogs.filter((p) => p.id !== postId), [postId, allBlogs])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const carouselVisible = 3
  const nextCarousel = () => setCarouselIndex((i) => (i + carouselVisible) % Math.max(others.length, 1))
  const prevCarousel = () => setCarouselIndex((i) => (i - carouselVisible + others.length) % Math.max(others.length, 1))
  const publishedLabel = formatDate(post?.dateOfPublish)
  const authorName = post?.author || 'QSphere Contributor'
  const categoryLabel = post?.category || 'Featured Article'
  const readingLabel = [publishedLabel, post?.readingTime].filter(Boolean).join('  ·  ')
  const viewerName = viewerProfile?.fullName || viewerProfile?.emailAddress || viewerProfile?.email || 'Signed-in member'

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#060a06] text-white">
        <Navbar currentPage="blogs" />
        <main className="pt-28 px-6 md:px-12 lg:px-20">
          <div className="max-w-4xl mx-auto py-40 text-center">
            <p className="text-white/60">Loading article...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="relative min-h-screen bg-[#060a06] text-white">
        <Navbar currentPage="blogs" />
        <main className="pt-28 px-6 md:px-12 lg:px-20">
          <div className="max-w-4xl mx-auto py-40 text-center">
            <h1 className="text-3xl font-bold mb-4">Article not found</h1>
            <p className="text-white/60 mb-8">We couldn't find the article you're looking for.</p>
            <Link to="/blogs" className="inline-flex items-center px-6 py-3 rounded-xl bg-white text-black font-semibold">Back to articles</Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060a06] text-white">
      <Navbar currentPage="blogs" />

      <style>{`
        .blog-shell {
          background:
            linear-gradient(180deg, rgba(9, 18, 13, 0.98) 0%, rgba(7, 14, 10, 0.97) 100%),
            radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 38%);
          border: 1px solid rgba(110, 231, 183, 0.12);
          box-shadow:
            0 32px 90px -45px rgba(0, 0, 0, 0.9),
            0 0 0 1px rgba(16, 185, 129, 0.04) inset;
          backdrop-filter: blur(24px);
        }

        .blog-prose {
          color: rgba(236, 253, 245, 0.84);
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(1.04rem, 1vw + 0.7rem, 1.17rem);
          line-height: 1.95;
          letter-spacing: 0.002em;
        }

        .blog-prose > * + * {
          margin-top: 1.15em;
        }

        .blog-prose p {
          color: rgba(236, 253, 245, 0.84);
          margin: 1.2em 0;
        }

        .blog-prose h1,
        .blog-prose h2,
        .blog-prose h3,
        .blog-prose h4 {
          color: #f7fffb;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.18;
          margin-top: 1.9em;
          margin-bottom: 0.55em;
        }

        .blog-prose h1 {
          font-size: clamp(2rem, 3vw, 2.8rem);
        }

        .blog-prose h2 {
          font-size: clamp(1.7rem, 2.2vw, 2.25rem);
        }

        .blog-prose h3 {
          font-size: clamp(1.35rem, 1.6vw, 1.7rem);
        }

        .blog-prose h4 {
          font-size: clamp(1.15rem, 1.2vw, 1.3rem);
        }

        .blog-prose a {
          color: #86efac;
          text-decoration: underline;
          text-decoration-color: rgba(110, 231, 183, 0.55);
          text-underline-offset: 0.18em;
          transition: color 0.2s ease, text-decoration-color 0.2s ease;
        }

        .blog-prose a:hover {
          color: #d1fae5;
          text-decoration-color: rgba(209, 250, 229, 0.92);
        }

        .blog-prose strong,
        .blog-prose b {
          color: #ffffff;
          font-weight: 800;
        }

        .blog-prose em,
        .blog-prose i {
          color: rgba(220, 252, 231, 0.92);
        }

        .blog-prose blockquote {
          margin: 2em 0;
          padding: 1.15rem 1.35rem;
          border-left: 3px solid rgba(52, 211, 153, 0.82);
          border-radius: 0 1.1rem 1.1rem 0;
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.14), rgba(16, 185, 129, 0.04));
          color: rgba(236, 253, 245, 0.9);
          font-size: 1.03em;
        }

        .blog-prose ul,
        .blog-prose ol {
          padding-left: 1.45rem;
          margin: 1.4em 0;
        }

        .blog-prose li {
          margin: 0.55em 0;
          padding-left: 0.2rem;
        }

        .blog-prose li::marker {
          color: rgba(110, 231, 183, 0.88);
        }

        .blog-prose hr {
          border: 0;
          height: 1px;
          margin: 2.25em 0;
          background: linear-gradient(90deg, transparent, rgba(110, 231, 183, 0.45), transparent);
        }

        .blog-prose img {
          width: 100%;
          border-radius: 1.4rem;
          border: 1px solid rgba(110, 231, 183, 0.12);
          margin: 2rem 0;
          box-shadow: 0 24px 55px -38px rgba(0, 0, 0, 0.95);
        }

        .blog-prose code {
          font-family: 'Cascadia Code', 'Consolas', monospace;
          font-size: 0.92em;
          color: #d1fae5;
          background: rgba(7, 24, 17, 0.96);
          border: 1px solid rgba(110, 231, 183, 0.12);
          border-radius: 0.5rem;
          padding: 0.14rem 0.45rem;
        }

        .blog-prose pre {
          overflow-x: auto;
          padding: 1.2rem 1.25rem;
          border-radius: 1.15rem;
          background: rgba(2, 11, 8, 0.96);
          border: 1px solid rgba(110, 231, 183, 0.14);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        .blog-prose pre code {
          background: transparent;
          border: 0;
          padding: 0;
          color: rgba(236, 253, 245, 0.9);
        }

        .blog-prose table {
          width: 100%;
          display: block;
          overflow-x: auto;
          border-collapse: separate;
          border-spacing: 0;
          margin: 1.9rem 0;
          border: 1px solid rgba(110, 231, 183, 0.12);
          border-radius: 1.2rem;
          background: rgba(255, 255, 255, 0.02);
        }

        .blog-prose th,
        .blog-prose td {
          padding: 0.95rem 1rem;
          border-bottom: 1px solid rgba(110, 231, 183, 0.08);
          border-right: 1px solid rgba(110, 231, 183, 0.08);
          text-align: left;
          vertical-align: top;
          min-width: 180px;
        }

        .blog-prose th {
          background: rgba(16, 185, 129, 0.13);
          color: #d1fae5;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .blog-prose td {
          color: rgba(236, 253, 245, 0.77);
        }

        .blog-prose tr:last-child td {
          border-bottom: 0;
        }

        .blog-prose tr td:last-child,
        .blog-prose tr th:last-child {
          border-right: 0;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[34rem] w-[34rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      {/* Hero / image with overlaid title */}
      <div className="relative w-full overflow-hidden border-b border-white/5 min-h-[58vh] flex flex-col justify-end">
        {post.coverImage ? (
          <img src={post.coverImage} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.28),_transparent_45%),linear-gradient(180deg,_#10231b_0%,_#07100d_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,6,0.2)_0%,rgba(2,8,6,0.55)_45%,rgba(2,8,6,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.2),_transparent_40%)]" />
        <div className="relative z-20 w-full px-5 pb-14 pt-40 sm:px-8 md:px-12 lg:px-16 lg:pt-48">
          <div className="mx-auto w-full max-w-[1680px]">
            <Link
              to="/blogs"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur-md transition hover:border-emerald-300/35 hover:text-emerald-200"
            >
              Back to blogs
            </Link>
          </div>
        </div>
      </div>

      <main className="relative z-10 -mt-14 px-4 pb-24 sm:px-6 lg:-mt-16 lg:px-8">
        <div className="mx-auto w-full max-w-[1680px]">
          <div className="blog-shell rounded-[30px] p-5 sm:p-7 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
              <article className="min-w-0">
                <div className="mb-7 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.26em] text-emerald-200/80">
                  <span className="rounded-full border border-emerald-300/18 bg-emerald-500/10 px-3 py-1.5">Feature article</span>
                  <span className="rounded-full border border-emerald-300/18 bg-emerald-500/10 px-3 py-1.5">{categoryLabel}</span>
                </div>

                <h1
                  className="text-white font-black leading-[0.98] mb-6"
                  style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)', fontFamily: "'Archivo Black', 'Inter', sans-serif" }}
                >
                  {post.title}
                </h1>
                
                <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/72">
                  <span>By <span className="font-semibold text-white">{authorName}</span></span>
                  {readingLabel ? <span>{readingLabel}</span> : null}
                </div>

                <div className="mb-8 rounded-[22px] border border-emerald-300/14 bg-emerald-500/[0.07] px-5 py-5 text-[1.03rem] italic leading-8 text-emerald-50/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:px-6">
                  {post.excerpt || 'Read the full article with a cleaner, more comfortable layout tailored to the QSphere visual theme.'}
                </div>

                <div className="prose blog-prose max-w-none">
                  {post.blogData ? (
                    <div dangerouslySetInnerHTML={{ __html: post.blogData }} />
                  ) : (
                    <p className="whitespace-pre-wrap text-lg leading-relaxed">No content available.</p>
                  )}
                </div>
              </article>

              <aside className="min-w-0">
                <div className="space-y-4 lg:sticky lg:top-28">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_-36px_rgba(0,0,0,0.85)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-200/70">Article details</div>
                    <div className="mt-4 space-y-4 text-sm text-white/74">
                      <div>
                        <div className="text-white/40">Author</div>
                        <div className="mt-1 text-base font-semibold text-white">{authorName}</div>
                      </div>
                      <div>
                        <div className="text-white/40">Published</div>
                        <div className="mt-1 text-white">{publishedLabel || 'Not available'}</div>
                      </div>
                      <div>
                        <div className="text-white/40">Read time</div>
                        <div className="mt-1 text-white">{post.readingTime || 'Flexible read'}</div>
                      </div>
                      <div>
                        <div className="text-white/40">Category</div>
                        <div className="mt-1 text-white">{categoryLabel}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_-36px_rgba(0,0,0,0.85)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-200/70">Reader actions</div>
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        onClick={downloadPdf}
                        disabled={isDownloadingPdf}
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-[#072114] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setShareOpen((s) => !s)}
                          className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/88 transition hover:border-emerald-300/25 hover:text-emerald-200"
                        >
                          Share article
                        </button>
                        {shareOpen && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-white/10 bg-[#08110d]/96 p-2 shadow-[0_22px_50px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl">
                            <button onClick={() => shareTo('facebook')} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/82 transition hover:bg-white/[0.05] hover:text-emerald-200">Facebook</button>
                            <button onClick={() => shareTo('linkedin')} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/82 transition hover:bg-white/[0.05] hover:text-emerald-200">LinkedIn</button>
                            <button onClick={() => shareTo('instagram')} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/82 transition hover:bg-white/[0.05] hover:text-emerald-200">Instagram</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              <section ref={commentsSectionRef} className="lg:col-span-2">
                <div className="rounded-[28px] border border-white/10 bg-black/18 p-5 sm:p-6 md:p-7">
                  <div className="mb-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.34em] text-emerald-200/70">Discussion</div>
                    <h4 className="mt-2 text-2xl font-bold tracking-tight text-white">Comments</h4>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Share your thoughts, add context, or continue the conversation around this article.</p>
                  </div>

                  {isLoggedIn ? (
                    <>
                      <div className="mb-4 rounded-2xl border border-emerald-300/12 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-50/84">
                        Commenting as <span className="font-semibold text-white">{viewerName}</span>
                      </div>

                      <form onSubmit={addComment} className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                        <input
                          ref={nameRef}
                          placeholder="Display name (optional)"
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-emerald-300/35 focus:bg-white/[0.06]"
                        />
                        <textarea
                          ref={commentRef}
                          placeholder="Write a thoughtful comment..."
                          rows={4}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white placeholder:text-white/30 outline-none transition focus:border-emerald-300/35 focus:bg-white/[0.06] md:row-span-2"
                        />
                        <div className="flex flex-col items-start justify-between gap-3 md:py-1">
                          <button type="submit" className="inline-flex items-center rounded-xl bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-[#072114] transition hover:bg-emerald-200">Post comment</button>
                          <div className="text-xs leading-5 text-white/46">Your comment is posted from your signed-in account.</div>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-emerald-300/20 bg-white/[0.025] px-5 py-6 sm:px-6">
                      <div className="max-w-2xl">
                        <div className="text-lg font-semibold text-white">Sign in to join the conversation</div>
                        <p className="mt-2 text-sm leading-6 text-white/58">
                          Only logged-in QSphere members can comment on blog posts. Sign in to share your thoughts and keep the discussion trusted.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/auth', { state: { redirectTo: `/blogs/${postId}` } })}
                          className="mt-4 inline-flex items-center rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-[#072114] transition hover:bg-emerald-200"
                        >
                          Sign in to comment
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 space-y-4">
                    {comments.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-6 text-sm text-white/52">
                        No comments yet - be the first to start the discussion.
                      </div>
                    )}
                    {comments.map((c) => {
                      const isOwn = viewerEmail && viewerEmail === String(c.commenterEmail || '').toLowerCase()
                      const isEditing = editingCommentId === c.id

                      return (
                      <div
                        key={c.id}
                        id={`blog-comment-${c.id}`}
                        className={`rounded-2xl border p-4 shadow-[0_14px_34px_-28px_rgba(0,0,0,0.88)] sm:p-5 ${targetCommentId === c.id ? 'border-emerald-300/35 bg-emerald-500/[0.10] ring-1 ring-emerald-300/25' : 'border-white/8 bg-white/[0.03]'}`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-base font-semibold text-white">{c.name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-emerald-200/50">Community response</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOwn && !isEditing && (
                              <>
                                <button
                                  onClick={() => handleEdit(c)}
                                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/62 transition hover:border-emerald-300/30 hover:text-emerald-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/62 transition hover:border-red-400/30 hover:text-red-300"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                            <div className="text-xs text-white/42">{new Date(c.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="mt-3">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={3}
                              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white placeholder:text-white/30 outline-none transition focus:border-emerald-300/35 focus:bg-white/[0.06]"
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => handleSaveEdit(c.id)}
                                className="inline-flex items-center rounded-lg bg-emerald-300 px-3.5 py-1.5 text-xs font-semibold text-[#072114] transition hover:bg-emerald-200"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/62 transition hover:border-white/25 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 text-[0.98rem] leading-7 text-white/82">{c.text}</div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                </div>
              </section>

              {others.length > 0 && (
                <section className="lg:col-span-2">
                  <div className="mt-2 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 sm:p-6 md:p-7">
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.34em] text-emerald-200/70">Continue reading</div>
                        <h4 className="mt-2 text-2xl font-bold tracking-tight text-white">More Blogs</h4>
                        <p className="mt-2 text-sm text-white/52">Explore related writing from the QSphere community.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={prevCarousel} className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white/78 transition hover:border-emerald-300/25 hover:text-emerald-200">‹</button>
                        <button onClick={nextCarousel} className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white/78 transition hover:border-emerald-300/25 hover:text-emerald-200">›</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {Array.from({ length: Math.min(carouselVisible, others.length) }).map((_, idx) => {
                        const item = others[(carouselIndex + idx) % others.length]
                        return (
                          <article
                            key={item.id}
                            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[22px] border border-emerald-300/10 bg-[#09120f] transition duration-300 hover:-translate-y-1 hover:border-emerald-300/24 hover:shadow-[0_28px_60px_-38px_rgba(16,185,129,0.34)]"
                            onClick={() => navigate(`/blogs/${item.id}`)}
                          >
                            {item.coverImage ? (
                              <img src={item.coverImage} alt={item.title} className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                            ) : (
                              <div className="h-48 w-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.24),_transparent_42%),linear-gradient(180deg,_#10231b_0%,_#07100d_100%)]" />
                            )}
                            <div className="flex flex-1 flex-col p-5">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300/82">{item.category}</div>
                              <h5 className="mt-3 text-lg font-bold leading-7 text-white transition group-hover:text-emerald-100">{item.title}</h5>
                              <p className="mt-3 line-clamp-4 text-sm leading-6 text-white/52">{item.excerpt}</p>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
