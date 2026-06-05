import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import videoBackground from '../assets/videoBackground.mp4'
import { getStoredBlogs } from '../utils/blogStore'
import { jsPDF } from 'jspdf'

export default function BlogDetail() {
  const { id } = useParams()
  const postId = Number(id || 0)
  const blogs = getStoredBlogs()
  const post = blogs.find((p) => p.id === postId)

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [id])

  const navigate = useNavigate()
  const [shareOpen, setShareOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  // Comments state persisted to localStorage per post
  const storageKey = `qsphere_comments_${postId}`
  const [comments, setComments] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  })
  const nameRef = useRef(null)
  const commentRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(comments)) } catch (e) { }
  }, [comments, storageKey])

  const addComment = (e) => {
    e.preventDefault()
    const name = nameRef.current?.value?.trim() || 'Anonymous'
    const text = commentRef.current?.value?.trim()
    if (!text) return
    const c = { id: Date.now(), name, text, date: new Date().toISOString() }
    setComments((s) => [c, ...s])
    if (commentRef.current) commentRef.current.value = ''
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

  const addWrappedParagraph = (doc, text, x, y, maxWidth, options = {}) => {
    const {
      fontSize = 11,
      lineHeight = 16,
      color = [234, 240, 235],
      fontStyle = 'normal',
      fontName = 'helvetica',
    } = options

    doc.setFont(fontName, fontStyle)
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text || '', maxWidth)
    doc.text(lines, x, y)
    return y + lines.length * lineHeight
  }

  const downloadPdf = async () => {
    if (!post || isDownloadingPdf) return

    setIsDownloadingPdf(true)

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 42
      const contentWidth = pageWidth - margin * 2
      const brandGreen = [16, 185, 129]
      const dark = [6, 10, 6]

      // Cover block
      doc.setFillColor(...dark)
      doc.rect(0, 0, pageWidth, 210, 'F')
      doc.setFillColor(10, 18, 13)
      doc.rect(0, 0, pageWidth, 210, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...brandGreen)
      doc.text(String(post.category || 'BLOG').toUpperCase(), pageWidth / 2, 56, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(255, 255, 255)
      const titleLines = doc.splitTextToSize(post.title || 'Untitled Article', contentWidth - 40)
      doc.text(titleLines, pageWidth / 2, 92, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(210, 220, 214)
      doc.text(`By ${post.author || 'QSphere Team'}  ·  ${post.readTime || ''}  ·  ${post.date || ''}`, pageWidth / 2, 132, { align: 'center' })

      const coverImage = await loadImageAsDataUrl(post.image)
      let y = 232
      if (coverImage) {
        const imageHeight = 210
        doc.setDrawColor(30, 70, 52)
        doc.roundedRect(margin, y, contentWidth, imageHeight, 16, 16, 'S')
        doc.addImage(coverImage, 'JPEG', margin, y, contentWidth, imageHeight, undefined, 'FAST')
        y += imageHeight + 28
      }

      // Article metadata and body
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...brandGreen)
      doc.text('Article', margin, y)
      y += 18

      doc.setFont('helvetica', 'normal')
      y = addWrappedParagraph(
        doc,
        `By ${post.author || 'QSphere Team'}   ·   ${post.date || ''}   ·   ${post.readTime || ''}`,
        margin,
        y,
        contentWidth,
        { fontSize: 10, lineHeight: 14, color: [170, 180, 172] },
      )
      y += 14

      if (post.body) {
        y = addWrappedParagraph(doc, post.body, margin, y, contentWidth, {
          fontSize: 12,
          lineHeight: 18,
          color: [236, 240, 237],
        })
        y += 8
      }

      if (post.sections && post.sections.length > 0) {
        post.sections.forEach((section) => {
          if (y > pageHeight - 120) {
            doc.addPage()
            y = margin
          }

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(14)
          doc.setTextColor(255, 255, 255)
          doc.text(section.title || 'Section', margin, y)
          y += 18

          y = addWrappedParagraph(doc, section.content || '', margin, y, contentWidth, {
            fontSize: 11,
            lineHeight: 16,
            color: [220, 228, 222],
          })
          y += 12
        })
      }

      if (post.takeaways && post.takeaways.length > 0) {
        if (y > pageHeight - 120) {
          doc.addPage()
          y = margin
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(...brandGreen)
        doc.text('Key Takeaways', margin, y)
        y += 18

        post.takeaways.forEach((takeaway) => {
          if (y > pageHeight - 80) {
            doc.addPage()
            y = margin
          }

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(11)
          doc.setTextColor(228, 234, 229)
          const bulletLines = doc.splitTextToSize(`• ${takeaway}`, contentWidth)
          doc.text(bulletLines, margin, y)
          y += bulletLines.length * 16 + 4
        })
      }

      const totalPages = doc.internal.getNumberOfPages()
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(120, 132, 124)
        doc.text(`QSphere Blog`, margin, pageHeight - 24)
        doc.text(`${page} / ${totalPages}`, pageWidth - margin, pageHeight - 24, { align: 'right' })
      }

      const safeTitle = (post.title || 'blog-detail').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
      doc.save(`${safeTitle || 'blog-detail'}.pdf`)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const shareTo = (platform) => {
    const url = window.location.href
    const text = encodeURIComponent(post.title)
    let shareUrl = '#'
    if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    if (platform === 'linkedin') shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${text}`
    if (platform === 'instagram') shareUrl = `https://www.instagram.com/` // Instagram doesn't support direct share via URL
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  // More blogs carousel
  const others = useMemo(() => blogs.filter((p) => p.id !== postId), [postId, blogs])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const carouselVisible = 3
  const nextCarousel = () => setCarouselIndex((i) => (i + carouselVisible) % others.length)
  const prevCarousel = () => setCarouselIndex((i) => (i - carouselVisible + others.length) % others.length)

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
        <img src={post.image} alt={post.title} className="w-full h-[34vh] min-h-[240px] object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 md:px-12">
          <div className="max-w-5xl text-center">
            <div className="text-emerald-400 text-[11px] tracking-[0.4em] mb-3 font-semibold">{post.category}</div>
            <h1 className="text-white font-black leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontFamily: "'Archivo Black', 'Inter', sans-serif" }}>{post.title}</h1>
            <div className="text-white/70 mt-3 text-sm">By {post.author} · {post.readTime} · {post.date}</div>
          </div>
        </div>
      </div>

      <main className="relative z-10 w-full px-0 -mt-10">
        <div className="w-full bg-white/[0.03] rounded-t-[28px] rounded-b-none p-6 md:p-12 shadow-lg" style={{ backdropFilter: 'blur(8px)' }}>
          {/* Header row: author + actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="text-sm text-white/70">By <span className="font-semibold text-white">{post.author}</span></div>
              <div className="text-xs text-white/50">{post.date} · {post.readTime}</div>
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

          {/* Content */}
          <div className="prose prose-invert max-w-none text-white/85 mb-8">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{post.body}</p>
            
            {/* Dynamic Custom Sections */}
            {post.sections && post.sections.map((section, idx) => (
              <div key={idx} className="mt-8">
                <h3 className="text-xl font-bold text-white mb-3">{section.title}</h3>
                <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}

            {/* Key Takeaways */}
            <h3 className="mt-10 font-bold text-emerald-400 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Key Takeaways
            </h3>
            <ul className="mt-4 space-y-2 list-disc pl-5">
              {post.takeaways && post.takeaways.length > 0 ? (
                post.takeaways.map((takeaway, idx) => (
                  <li key={idx} className="text-white/80 leading-relaxed">{takeaway}</li>
                ))
              ) : (
                <>
                  <li className="text-white/80 leading-relaxed">Summarized insight one about the topic.</li>
                  <li className="text-white/80 leading-relaxed">Summarized insight two with practical implications.</li>
                  <li className="text-white/80 leading-relaxed">Next steps and references for further reading.</li>
                </>
              )}
            </ul>
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
                    <div className="text-xs text-white/50">{new Date(c.date).toLocaleString()}</div>
                  </div>
                  <div className="text-white/90 mt-2">{c.text}</div>
                </div>
              ))}
            </div>
          </section>

          {/* More blogs carousel */}
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
                    <img src={item.image} alt={item.title} className="w-full h-48 object-cover" />
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
        </div>
      </main>

      <Footer />
    </div>
  )
}
