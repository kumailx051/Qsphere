import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allBlogs, setAllBlogs] = useState([])
  const [comments, setComments] = useState([])
  const [shareOpen, setShareOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const nameRef = useRef(null)
  const commentRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [id])

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

  const addComment = async (e) => {
    e.preventDefault()
    const name = nameRef.current?.value?.trim() || 'Anonymous'
    const text = commentRef.current?.value?.trim()
    if (!text) return

    try {
      const res = await fetch(`/api/blogs/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text })
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
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  // More blogs carousel
  const others = useMemo(() => allBlogs.filter((p) => p.id !== postId), [postId, allBlogs])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const carouselVisible = 3
  const nextCarousel = () => setCarouselIndex((i) => (i + carouselVisible) % Math.max(others.length, 1))
  const prevCarousel = () => setCarouselIndex((i) => (i - carouselVisible + others.length) % Math.max(others.length, 1))

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
    <div className="relative bg-[#060a06] min-h-screen text-white">
      <Navbar currentPage="blogs" />

      {/* Hero / image with overlaid title */}
      <div className="relative w-full overflow-hidden">
        <img src={post.coverImage} alt={post.title} className="w-full h-[50vh] min-h-[320px] object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 md:px-12">
          <div className="max-w-5xl text-center">
            <div className="text-emerald-400 text-[11px] tracking-[0.4em] mb-3 font-semibold">{post.category}</div>
            <h1 className="text-white font-black leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontFamily: "'Archivo Black', 'Inter', sans-serif" }}>{post.title}</h1>
            <div className="text-white/70 mt-3 text-sm">By {post.author} · {post.readingTime} · {formatDate(post.dateOfPublish)}</div>
          </div>
        </div>
      </div>

      <main className="relative z-10 w-full px-0 -mt-10">
        <div className="w-full bg-white/[0.03] rounded-t-[28px] rounded-b-none p-6 md:p-12 shadow-lg" style={{ backdropFilter: 'blur(8px)' }}>
          {/* Header row: author + actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="text-sm text-white/70">By <span className="font-semibold text-white">{post.author}</span></div>
              <div className="text-xs text-white/50">{formatDate(post.dateOfPublish)} · {post.readingTime}</div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={downloadPdf} disabled={isDownloadingPdf} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-semibold disabled:opacity-70 disabled:cursor-not-allowed">{isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}</button>

              <div className="relative">
                <button onClick={() => setShareOpen((s) => !s)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white/90">Share</button>
                {shareOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-black/90 border border-white/10 rounded-lg p-3 shadow-lg">
                    <button onClick={() => shareTo('facebook')} className="w-full text-left py-2 hover:text-emerald-300">Facebook</button>
                    <button onClick={() => shareTo('linkedin')} className="w-full text-left py-2 hover:text-emerald-300">LinkedIn</button>
                    <button onClick={() => shareTo('instagram')} className="w-full text-left py-2 hover:text-emerald-300">Instagram</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <div className="mb-6 text-white/60 text-base italic border-l-2 border-emerald-400/30 pl-4">
              {post.excerpt}
            </div>
          )}

          {/* Content - render rich HTML from blogData */}
          <div className="prose prose-invert max-w-none text-white/85 mb-8">
            {post.blogData ? (
              <div dangerouslySetInnerHTML={{ __html: post.blogData }} />
            ) : (
              <p className="text-lg leading-relaxed whitespace-pre-wrap">No content available.</p>
            )}
          </div>

          {/* Comment section */}
          <section className="mt-6">
            <h4 className="text-white font-semibold mb-4">Comments</h4>
            <form onSubmit={addComment} className="grid gap-3">
              <input ref={nameRef} placeholder="Your name (optional)" className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-white" />
              <textarea ref={commentRef} placeholder="Write a comment..." rows={4} className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-white" />
              <div className="flex items-center gap-3">
                <button type="submit" className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-200">Post comment</button>
                <div className="text-white/50 text-sm">Anyone can comment without logging in.</div>
              </div>
            </form>

            <div className="mt-6 space-y-4">
              {comments.length === 0 && <div className="text-white/50">No comments yet — be the first to comment.</div>}
              {comments.map((c) => (
                <div key={c.id} className="bg-black/40 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-white/50">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-white/90 mt-2">{c.text}</div>
                </div>
              ))}
            </div>
          </section>

          {/* More blogs carousel */}
          {others.length > 0 && (
            <section className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-semibold">More Blogs</h4>
                <div className="flex items-center gap-2">
                  <button onClick={prevCarousel} className="px-3 py-2 bg-white/[0.04] rounded">‹</button>
                  <button onClick={nextCarousel} className="px-3 py-2 bg-white/[0.04] rounded">›</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: Math.min(carouselVisible, others.length) }).map((_, idx) => {
                  const item = others[(carouselIndex + idx) % others.length]
                  return (
                    <article key={item.id} className="group relative flex flex-col rounded-2xl border border-emerald-400/8 bg-white/[0.02] overflow-hidden cursor-pointer" onClick={() => navigate(`/blogs/${item.id}`)}>
                      <img src={item.coverImage} alt={item.title} className="w-full h-48 object-cover" />
                      <div className="p-4">
                        <div className="text-emerald-400 text-xs tracking-[0.3em] mb-2">{item.category}</div>
                        <h5 className="text-white font-semibold">{item.title}</h5>
                        <p className="text-white/50 text-sm mt-2">{item.excerpt}</p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
