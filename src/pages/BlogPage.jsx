import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import videoBackground from '../assets/videoBackground.mp4'
import { getStoredBlogs } from '../utils/blogStore'

const BlogPage = () => {
  const videoRef = useRef(null)
  const [blogs, setBlogs] = useState([])

  useEffect(() => {
    setBlogs(getStoredBlogs())
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  return (
    <div className="relative bg-[#060a06]" style={{ minHeight: '100vh' }}>
      <Navbar currentPage="blogs" />

      {/* Hero Section */}
      <div className="relative w-full overflow-hidden" style={{ height: '60vh', minHeight: '500px' }}>
        <div className="absolute inset-0 bg-[#060a06]" />

        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: 0.5,
          }}
          muted loop playsInline
        >
          <source src={videoBackground} type="video/mp4" />
        </video>

        {/* Gradients for blending */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            background: 'linear-gradient(to bottom, rgba(6,10,6,0.3) 0%, rgba(6,10,6,0.8) 70%, #060a06 100%)',
            zIndex: 2,
          }} 
        />
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            background: 'radial-gradient(circle at center, transparent 0%, rgba(6,10,6,0.6) 100%)',
            zIndex: 2,
          }} 
        />

        <div className="relative z-10 h-full w-full flex flex-col justify-center items-center text-center px-6 mt-16">
          <div className="flex items-center gap-3 mb-6" style={{ animation: 'blogFadeUp 0.8s ease-out both' }}>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 12px rgba(16,185,129,0.8)' }} />
            <span className="text-emerald-400 text-[11px] tracking-[0.4em] font-semibold">OUR JOURNAL</span>
          </div>

          <h1
            className="text-white font-black leading-[0.95] tracking-tight mb-6"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 6rem)',
              fontFamily: "'Archivo Black', 'Inter', sans-serif",
              letterSpacing: '-0.03em',
              animation: 'blogFadeUp 0.8s ease-out 0.2s both',
            }}
          >
            Quantum <span className="text-emerald-400" style={{ textShadow: '0 0 40px rgba(16,185,129,0.3)' }}>Insights</span>
          </h1>

          <p 
            className="text-white/60 text-base md:text-lg max-w-2xl leading-relaxed"
            style={{ animation: 'blogFadeUp 0.8s ease-out 0.4s both' }}
          >
            Explore the latest breakthroughs, research, and stories from the frontiers of quantum science.
          </p>
        </div>
      </div>

      {/* Main Content - Blog Grid */}
      <div className="relative z-10 w-full px-6 md:px-10 lg:px-14 pb-32 pt-10 bg-[#060a06]">
        <div className="w-full">
          <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
            {blogs.map((post, i) => (
              <Link
                key={post.id} 
                to={`/blogs/${post.id}`}
                className="group relative flex flex-col rounded-3xl border border-emerald-400/10 bg-white/[0.02] overflow-hidden transition-all duration-500 hover:bg-white/[0.04] no-underline"
                style={{
                  animation: `blogFadeUp 0.8s ease-out ${0.6 + i * 0.1}s both`,
                }}
              >
                {/* Glow effect on hover */}
                <div 
                  className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: 'inset 0 0 30px rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    zIndex: 10
                  }}
                />
                
                <div className="relative h-64 md:h-80 overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-transparent transition-colors duration-500" />
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-emerald-400 bg-black/60 backdrop-blur-md rounded-full border border-emerald-400/20">
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center gap-4 text-xs text-white/40 mb-4 font-medium tracking-wide">
                    <span>{post.date}</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-400/40" />
                    <span>{post.readTime}</span>
                  </div>

                  <h3 
                    className="text-white font-bold text-2xl mb-4 group-hover:text-emerald-400 transition-colors duration-300"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {post.title}
                  </h3>

                  <p className="text-white/50 text-sm leading-relaxed mb-8 flex-grow">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Read Article
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transform group-hover:translate-x-1 transition-transform">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-20 flex justify-center" style={{ animation: 'blogFadeUp 0.8s ease-out 1s both' }}>
            <button className="inline-flex items-center gap-3 bg-white/[0.05] border border-white/10 text-white font-semibold text-sm px-8 py-4 rounded-xl hover:bg-white/[0.1] hover:border-emerald-400/30 transition-all duration-300">
              Load More Articles
            </button>
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        @keyframes blogFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default BlogPage
