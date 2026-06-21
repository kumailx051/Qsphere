import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, BookOpen, Calendar, Clock3, Sparkles } from 'lucide-react'

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
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import videoBackground from '../assets/videoBackground.mp4'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

const PER_PAGE = 4

const BlogPage = () => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const videoRef = useRef(null)
  const sentinelRef = useRef(null)
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PER_PAGE)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  const sortedBlogs = useMemo(
    () =>
      [...blogs].sort(
        (a, b) => new Date(b.dateOfPublish || b.created_at || 0).getTime() - new Date(a.dateOfPublish || a.created_at || 0).getTime(),
      ),
    [blogs],
  )

  const visibleBlogs = sortedBlogs.slice(0, visibleCount)
  const featuredPost = visibleBlogs[0] || null
  const gridPosts = visibleBlogs.slice(1)
  const categoryCount = new Set(sortedBlogs.map((post) => post.category).filter(Boolean)).size
  const authoredCount = sortedBlogs.filter(
    (post) => currentUserEmail && String(post.authorEmail || '').trim().toLowerCase() === currentUserEmail,
  ).length

  useEffect(() => {
    try {
      const profileRaw = localStorage.getItem('qsphere_onboarding_profile')
      if (profileRaw) {
        const profile = JSON.parse(profileRaw)
        setCurrentUserEmail(String(profile.emailAddress || '').trim().toLowerCase())
      }
    } catch {}
  }, [])

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const res = await fetch('/api/blogs')
        if (res.ok) {
          const data = await res.json()
          setBlogs(data)
        }
      } catch (e) {
        console.error('Failed to load blogs:', e)
      } finally {
        setLoading(false)
      }
    }
    loadBlogs()
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  const loadTimerRef = useRef(null)

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (loading || blogs.length === 0) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const allShown = visibleCount >= blogs.length
    if (allShown) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingMore) {
          setLoadingMore(true)
          loadTimerRef.current = setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + PER_PAGE, blogs.length))
            setLoadingMore(false)
          }, 300)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => {
      observer.disconnect()
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current)
        loadTimerRef.current = null
      }
    }
  }, [loading, blogs, visibleCount, loadingMore])

  const { scrollY } = useScroll()
  const glowY1 = useTransform(scrollY, [0, 500], [0, -60])
  const glowY2 = useTransform(scrollY, [0, 500], [0, -30])

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '100vh', backgroundColor: palette.bgPrimary }}>
      <Navbar currentPage="blogs" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.6 : 0.35, background: isDayMode ? 'radial-gradient(circle at 20% 0%, rgba(46,197,138,0.14) 0%, transparent 42%)' : 'radial-gradient(circle at 20% 0%, rgba(16,185,129,0.18) 0%, transparent 42%)', y: glowY1 }} />
        <motion.div className="absolute inset-0" style={{ opacity: isDayMode ? 0.26 : 0.2, background: isDayMode ? 'radial-gradient(circle at 100% 0%, rgba(255,224,163,0.22) 0%, transparent 36%)' : 'radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12) 0%, transparent 36%)', y: glowY2 }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.12 : 0.14,
            backgroundImage: isDayMode ? 'linear-gradient(rgba(10,22,32,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(10,22,32,0.035) 1px, transparent 1px)' : 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 18%, black 24%, transparent 88%)',
          }}
        />
      </div>

      <main className="relative z-10 w-full px-6 pb-32 pt-32 md:px-10 lg:px-14 xl:px-20">
        <motion.section
          variants={heroVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="relative overflow-hidden rounded-[38px] p-7 md:p-10 xl:p-12"
          style={{
            border: `1px solid ${palette.borderPrimary}`,
            background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,247,245,0.88))' : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
            boxShadow: palette.shadowCard,
          }}
        >
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: isDayMode ? 'linear-gradient(to right, transparent, rgba(46,197,138,0.55), transparent)' : 'linear-gradient(to right, transparent, rgba(110,231,183,0.5), transparent)' }} />
          <div className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.12)' : 'rgba(16,185,129,0.1)' }} />
          <div className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(255,224,163,0.2)' : 'rgba(6,182,212,0.1)' }} />

          <div className="relative z-10 grid gap-10 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accentPrimary, boxShadow: isDayMode ? '0 0 18px rgba(46,197,138,0.45)' : '0 0 18px rgba(16,185,129,0.8)' }} />
                  Our Journal
                </span>
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)', color: palette.textMuted }}>
                  <Sparkles size={14} style={{ color: palette.accentPrimary }} />
                  Editorial transmission
                </span>
              </div>

              <h1
                className="max-w-5xl text-5xl font-bold leading-[0.9] md:text-6xl xl:text-[5.4rem]"
                style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary, textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.6)' : '0 0 40px rgba(16,185,129,0.08)' }}
              >
                Quantum thinking,
                <br />
                <span style={{ color: palette.accentPrimary }}>written with weight.</span>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 md:text-lg xl:text-[1.12rem]" style={{ color: palette.textSecondary }}>
                Research notes, frontier ideas, technical breakdowns, and stories from people building at the edge of quantum science.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/blogs/new"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                  style={{ border: `1px solid ${isDayMode ? 'transparent' : palette.btnPrimaryBorder}`, backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText, boxShadow: isDayMode ? '0 20px 45px rgba(30,158,107,0.18)' : 'none' }}
                >
                  Write an article
                  <ArrowUpRight size={16} />
                </Link>
                <a
                  href="#blog-grid"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                  style={{ border: `1px solid ${palette.btnSecondaryBorder}`, backgroundColor: palette.btnSecondaryBg, color: palette.btnSecondaryText }}
                >
                  Browse articles
                  <ArrowUpRight size={16} />
                </a>
              </div>

              <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Published pieces', value: String(sortedBlogs.length).padStart(2, '0') },
                  { label: 'Categories', value: String(categoryCount).padStart(2, '0') },
                  { label: 'Your articles', value: String(authoredCount).padStart(2, '0') },
                ].map((item) => (
                  <motion.div key={item.label} variants={itemVariants} className="rounded-[28px] p-5 backdrop-blur-xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.2)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>{item.label}</div>
                    <div className="mt-4 text-4xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>{item.value}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div
              className="relative overflow-hidden rounded-[34px] p-6 md:p-7"
              style={{
                border: `1px solid ${palette.borderPrimary}`,
                background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,247,245,0.85))' : 'linear-gradient(180deg, rgba(5,10,8,0.92), rgba(4,8,7,0.74))',
                boxShadow: isDayMode ? '0 24px 90px rgba(15,23,42,0.1)' : '0 24px 90px rgba(0,0,0,0.42)',
              }}
            >
              <div className="absolute inset-x-8 top-0 h-px" style={{ background: isDayMode ? 'linear-gradient(to right, transparent, rgba(46,197,138,0.45), transparent)' : 'linear-gradient(to right, transparent, rgba(110,231,183,0.4), transparent)' }} />
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.15)' : 'rgba(16,185,129,0.1)' }} />

              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ opacity: isDayMode ? 0.15 : 0.25 }}
                muted
                loop
                playsInline
              >
                <source src={videoBackground} type="video/mp4" />
              </video>

              <div className="absolute inset-0" style={{ background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.98))' : 'linear-gradient(180deg, rgba(4,8,7,0.2), rgba(4,8,7,0.95))' }} />

              <div className="relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>Publishing direction</div>
                <h2 className="mt-4 text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                  Built to feel more editorial than generic.
                </h2>
                <p className="mt-5 text-sm leading-7" style={{ color: palette.textSecondary }}>
                  The journal now previews ideas with stronger rhythm, clearer content signals, and a richer visual frame before readers even open an article.
                </p>

                <div className="mt-6 grid gap-3">
                  {[
                    'Sharper reading hierarchy and cleaner article scanning.',
                    'Feature-first layout for your strongest or newest story.',
                    'A journal surface that matches the premium depth of your new detail pages.',
                  ].map((note) => (
                    <div key={note} className="rounded-2xl px-4 py-3.5 text-sm" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)', color: palette.textSecondary }}>
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {loading ? (
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3 lg:gap-10"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="overflow-hidden rounded-[32px] p-5 animate-pulse"
                style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.03)' }}
              >
                <div className="h-64 rounded-[26px]" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' }} />
                <div className="mt-6 h-3 w-24 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                <div className="mt-4 h-8 w-4/5 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                <div className="mt-3 h-8 w-2/3 rounded-full" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                <div className="mt-6 h-20 rounded-[20px]" style={{ backgroundColor: isDayMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)' }} />
              </motion.div>
            ))}
          </motion.section>
        ) : sortedBlogs.length === 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-10 flex flex-col items-center justify-center rounded-[34px] py-28 text-center backdrop-blur-xl"
            style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.03)' }}
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}>
              <BookOpen size={32} style={{ color: palette.textMuted }} />
            </div>
            <h3 className="mb-3 text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
              No articles yet.
            </h3>
            <p className="max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
              The journal is ready for its first strong signal. Publish a story and give this space its opening pulse.
            </p>
            <Link
              to="/blogs/new"
              className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
              style={{ border: `1px solid ${isDayMode ? 'transparent' : palette.btnPrimaryBorder}`, backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText, boxShadow: isDayMode ? '0 20px 45px rgba(30,158,107,0.18)' : 'none' }}
            >
              Write the first article
              <ArrowUpRight size={16} />
            </Link>
          </motion.section>
        ) : (
          <>
            {featuredPost && (
              <motion.section
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="mt-10 overflow-hidden rounded-[36px]"
                style={{
                  border: `1px solid ${palette.borderPrimary}`,
                  background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(247,247,245,0.85))' : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                  boxShadow: palette.shadowCard,
                }}
              >
                <Link to={`/blogs/${featuredPost.id}`} className="group grid no-underline xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="relative min-h-[360px] overflow-hidden xl:min-h-[520px]">
                    {featuredPost.coverImage ? (
                      <img
                        src={featuredPost.coverImage}
                        alt={featuredPost.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full" style={{ background: isDayMode ? 'radial-gradient(circle at 20% 20%, rgba(46,197,138,0.18), transparent 38%), linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)' : 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.28), transparent 38%), linear-gradient(180deg, #07110d 0%, #040706 100%)' }} />
                    )}
                    <div className="absolute inset-0" style={{ background: isDayMode ? 'linear-gradient(180deg, transparent, rgba(255,255,255,0.15))' : 'linear-gradient(180deg, rgba(5,10,8,0.08), rgba(5,10,8,0.72))' }} />
                    <div className="absolute left-6 top-6 z-10 flex flex-wrap gap-3 md:left-8 md:top-8">
                      {featuredPost.category && (
                        <span
                          className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] backdrop-blur-xl"
                          style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.45)', color: isDayMode ? palette.accentDark : palette.accentLight }}
                        >
                          {featuredPost.category}
                        </span>
                      )}
                      {currentUserEmail && String(featuredPost.authorEmail || '').trim().toLowerCase() === currentUserEmail && (
                        <span
                          className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] shadow-[0_0_16px_rgba(16,185,129,0.28)]"
                          style={{ border: `1px solid ${isDayMode ? 'rgba(46,197,138,0.4)' : 'rgba(110,231,183,0.24)'}`, backgroundColor: isDayMode ? 'rgba(16,185,129,0.9)' : 'rgba(16,185,129,0.8)', color: '#ffffff' }}
                        >
                          My Blog
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative p-7 md:p-10 xl:p-12">
                    <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Featured story</div>
                    <h2 className="mt-5 max-w-3xl text-4xl font-bold leading-[0.94] transition-colors duration-300 md:text-5xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                      {featuredPost.title}
                    </h2>

                    <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium tracking-wide" style={{ color: palette.textMuted }}>
                      <span className="inline-flex items-center gap-2">
                        <Calendar size={14} style={{ color: palette.accentPrimary }} />
                        {formatDate(featuredPost.dateOfPublish)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock3 size={14} style={{ color: palette.accentPrimary }} />
                        {featuredPost.readingTime || 'Fresh read'}
                      </span>
                    </div>

                    <p className="mt-7 max-w-2xl text-base leading-8" style={{ color: palette.textSecondary }}>
                      {featuredPost.excerpt}
                    </p>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                      {[
                        { label: 'Category', value: featuredPost.category || 'Journal' },
                        { label: 'Reading time', value: featuredPost.readingTime || 'Fresh read' },
                        { label: 'Published', value: formatDate(featuredPost.dateOfPublish) || 'Recently' },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[24px] p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)' }}>
                          <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.72)' }}>{item.label}</div>
                          <div className="mt-3 text-sm font-semibold leading-6" style={{ color: palette.textPrimary }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:gap-3" style={{ color: palette.accentPrimary }}>
                      Read featured article
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                </Link>
              </motion.section>
            )}

            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              id="blog-grid"
              className="mt-10"
            >
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>Article grid</div>
                  <h2 className="mt-4 text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                    Stories with more editorial gravity.
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                  Below the featured story, every article card is designed to feel cleaner, richer, and easier to scan before readers dive into the full piece.
                </p>
              </div>

              <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-8 md:grid-cols-2 xl:grid-cols-3 lg:gap-10">
                {gridPosts.map((post, i) => (
              <motion.div key={post.id} variants={itemVariants}>
              <Link
                to={`/blogs/${post.id}`}
                className="group relative flex flex-col overflow-hidden rounded-[32px] no-underline transition-all duration-500 hover:-translate-y-1.5"
                style={{
                  border: `1px solid ${palette.borderPrimary}`,
                  backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)',
                  boxShadow: isDayMode ? '0 10px 40px rgba(15,23,42,0.05)' : 'none',
                }}
              >
                <div 
                  className="absolute -inset-px rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: isDayMode ? 'inset 0 0 30px rgba(46,197,138,0.15)' : 'inset 0 0 30px rgba(16,185,129,0.1)',
                    border: `1px solid ${isDayMode ? 'rgba(46,197,138,0.4)' : 'rgba(16,185,129,0.3)'}`,
                    zIndex: 10
                  }}
                />
                
                <div className="relative h-64 overflow-hidden md:h-80">
                  <div className="absolute inset-0 z-10 group-hover:bg-transparent transition-colors duration-500" style={{ backgroundColor: isDayMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)' }} />
                  {post.coverImage ? (
                    <img 
                      src={post.coverImage} 
                      alt={post.title} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="h-full w-full" style={{ background: isDayMode ? 'radial-gradient(circle at 20% 20%, rgba(46,197,138,0.18), transparent 38%), linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)' : 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.28), transparent 38%), linear-gradient(180deg, #07110d 0%, #040706 100%)' }} />
                  )}
                  <div className="absolute top-4 left-4 z-20">
                    <span
                      className="px-3 py-1 text-[10px] font-semibold tracking-[0.2em] backdrop-blur-md rounded-full"
                      style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)', color: isDayMode ? palette.accentDark : palette.accentLight }}
                    >
                      {post.category}
                    </span>
                  </div>
                  {currentUserEmail && String(post.authorEmail || '').trim().toLowerCase() === currentUserEmail && (
                    <div className="absolute top-4 right-4 z-20">
                      <span
                        className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] backdrop-blur-md rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        style={{ border: `1px solid ${isDayMode ? 'rgba(46,197,138,0.4)' : 'rgba(110,231,183,0.3)'}`, backgroundColor: isDayMode ? 'rgba(16,185,129,0.9)' : 'rgba(16,185,129,0.8)', color: '#ffffff' }}
                      >
                        MY BLOG
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex flex-wrap items-center gap-4 text-xs mb-4 font-medium tracking-wide" style={{ color: palette.textMuted }}>
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={13} style={{ color: palette.accentPrimary }} />
                      {formatDate(post.dateOfPublish)}
                    </span>
                    <span className="w-1 h-1 rounded-full" style={{ backgroundColor: palette.accentPrimary, opacity: 0.4 }} />
                    <span className="inline-flex items-center gap-2">
                      <Clock3 size={13} style={{ color: palette.accentPrimary }} />
                      {post.readingTime}
                    </span>
                  </div>

                  <h3 
                    className="font-bold text-2xl mb-4 transition-colors duration-300"
                    style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}
                  >
                    {post.title}
                  </h3>

                  <p className="text-sm leading-7 mb-8 flex-grow line-clamp-4" style={{ color: palette.textSecondary }}>
                    {post.excerpt}
                  </p>

                  <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: palette.textPrimary }}>
                    <span className="group-hover:text-emerald-400 transition-colors" style={{ color: palette.accentPrimary }}>Read Article</span>
                    <ArrowUpRight size={16} className="transform group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" style={{ color: palette.accentPrimary }} />
                  </div>
                </div>
              </Link>
              </motion.div>
            ))}
              </motion.div>
            </motion.section>
          </>
        )}

          {!loading && sortedBlogs.length > 0 && (
          <div ref={sentinelRef} className="mt-16 flex justify-center">
            {visibleCount < sortedBlogs.length ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: palette.accentPrimary, opacity: 0.6 }} />
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: palette.accentPrimary, opacity: 0.4, animationDelay: '0.2s' }} />
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: palette.accentPrimary, opacity: 0.2, animationDelay: '0.4s' }} />
                </div>
                <span className="text-xs font-mono tracking-[0.18em] uppercase" style={{ color: palette.textMuted }}>
                  {loadingMore ? 'Loading more...' : 'Scroll for more articles'}
                </span>
              </div>
            ) : sortedBlogs.length > PER_PAGE ? (
              <span className="text-xs font-mono tracking-[0.18em] uppercase" style={{ color: palette.textMuted }}>All articles loaded</span>
            ) : null}
          </div>
          )}
      </main>

      <Footer />

      <style>{`
        @keyframes blogFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default BlogPage
