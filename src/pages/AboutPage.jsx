import { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import aboutVideo from '../assets/about.mp4'

const AboutPage = () => {
  const videoRef = useRef(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      const playPromise = videoRef.current.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => { })
      }
    }
  }, [])

  // Animate stats when they come into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true)
        }
      },
      { threshold: 0.3 }
    )
    if (statsRef.current) {
      observer.observe(statsRef.current)
    }
    return () => observer.disconnect()
  }, [])

  const stats = [
    {
      number: '50+',
      label: 'Researchers',
      description: 'Experts in quantum technologies.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="22" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="20" cy="22" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="14" y1="14" x2="8" y2="19" stroke="currentColor" strokeWidth="1" />
          <line x1="14" y1="14" x2="20" y2="19" stroke="currentColor" strokeWidth="1" />
        </svg>
      ),
    },
    {
      number: '20+',
      label: 'Projects',
      description: 'Pioneering groundbreaking quantum research.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="6" y="4" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="10" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="1" />
          <line x1="10" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1" />
          <line x1="10" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="1" />
        </svg>
      ),
    },
    {
      number: '10+',
      label: 'Collaborations',
      description: 'Partnering with global innovators.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="14" y1="4" x2="14" y2="24" stroke="currentColor" strokeWidth="1" />
          <line x1="4" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="14" cy="14" rx="5" ry="10" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      ),
    },
    {
      number: '5+',
      label: 'Awards',
      description: 'Recognized for excellence in quantum innovation.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 4 L16.5 10 L23 10.5 L18 15 L19.5 22 L14 18.5 L8.5 22 L10 15 L5 10.5 L11.5 10 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      ),
    },
  ]

  return (
    <div
      className="relative bg-black"
      style={{ minHeight: '100vh' }}
    >
      {/* ─── Full-screen hero section ─── */}
      <div className="relative min-h-screen w-full overflow-hidden">
        {/* Dark base */}
        <div className="absolute inset-0 bg-[#060a06]" />

        {/* Navbar */}
        <Navbar currentPage="about" />

        {/* Video Background — positioned right */}
        <video
          ref={videoRef}
          className="absolute top-0 right-0 h-full object-cover"
          style={{
            width: '65%',
            opacity: 0.85,
            maskImage: 'linear-gradient(to right, transparent 0%, black 25%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 25%)',
          }}
          muted
          loop
          playsInline
        >
          <source src={aboutVideo} type="video/mp4" />
        </video>

        {/* Subtle grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 70% at 65% 45%, transparent 40%, rgba(0,0,0,0.7) 80%, rgba(0,0,0,0.95) 100%)',
            zIndex: 2,
          }}
        />
        {/* ─── Mobile Nav ─── */}
        {/* Bottom gradient fade into stats */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '200px',
            background: 'linear-gradient(to bottom, transparent, #060a06)',
            zIndex: 3,
          }}
        />

        {/* ─── Main Content ─── */}
        <div className="relative z-10 flex flex-col justify-between min-h-screen">
          {/* Top Content */}
          <div className="w-full flex-1 p-8 md:p-14">
            <div className="flex flex-col lg:flex-row lg:justify-between gap-10 lg:gap-16 h-full">

              {/* Left Column — Label + Heading + Description */}
              <div className="max-w-5xl mt-12 md:mt-20 flex-1">
                {/* ABOUT US Label */}
                <div
                  className="text-emerald-400 text-[11px] tracking-[0.4em] mb-6 font-semibold flex items-center gap-3"
                  style={{
                    animation: 'fadeInUp 0.8s ease-out both',
                    animationDelay: '0.2s',
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-emerald-400"
                    style={{
                      boxShadow: '0 0 12px rgba(16,185,129,0.8), 0 0 24px rgba(16,185,129,0.4)',
                    }}
                  />
                  ABOUT US
                </div>

                {/* Main Heading — same font/size as HomePage hero */}
                <h1
                  className="text-white font-bold leading-[0.95] tracking-tight"
                  style={{
                    fontSize: 'clamp(2.1rem, 5.6vw, 5.4rem)',
                    fontFamily: "'Archivo Black', 'Inter', sans-serif",
                    letterSpacing: '-0.03em',
                    animation: 'fadeInUp 0.8s ease-out both',
                    animationDelay: '0.4s',
                  }}
                >
                  Building the Future<br />
                  Through{' '}
                  <span
                    className="text-emerald-400"
                    style={{ textShadow: '0 0 40px rgba(16,185,129,0.3)' }}
                  >
                    Quantum
                  </span>
                  <br />
                  Possibilities.
                </h1>

                {/* Description */}
                <p
                  className="text-white/60 mt-8 max-w-xl text-base md:text-lg leading-relaxed"
                  style={{
                    animation: 'fadeInUp 0.8s ease-out both',
                    animationDelay: '0.6s',
                  }}
                >
                  We are a collective of researchers, engineers, and visionaries dedicated to exploring the frontiers of quantum science and technology.
                </p>
              </div>

              {/* Right Column — Our Mission card (positioned lower) */}
              <div
                className="lg:flex-shrink-0 lg:w-[320px] lg:self-end lg:mb-4"
                style={{
                  animation: 'fadeInUp 0.8s ease-out both',
                  animationDelay: '0.9s',
                }}
              >
                <div
                  className="flex items-start gap-4 p-5 rounded-2xl"
                  style={{
                    background: 'rgba(16,185,129,0.04)',
                    border: '1px solid rgba(16,185,129,0.12)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      border: '1px solid rgba(16,185,129,0.35)',
                      background: 'rgba(16,185,129,0.1)',
                      boxShadow: '0 0 20px rgba(16,185,129,0.15)',
                    }}
                  >
                    <span className="text-emerald-400 text-lg">↗</span>
                  </div>
                  <div>
                    <h3
                      className="text-white font-semibold text-base mb-2"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Our Mission
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      To unlock the potential of quantum computing and empower a new era of innovation.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ─── Stats Bar ─── */}
          <div
            ref={statsRef}
            className="relative z-20 w-full"
            style={{
              borderTop: '1px solid rgba(16,185,129,0.12)',
              background: 'linear-gradient(to top, rgba(6,10,6,0.98), rgba(6,10,6,0.85))',
            }}
          >
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-10 md:py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4"
                    style={{
                      opacity: statsVisible ? 1 : 0,
                      transform: statsVisible ? 'translateY(0)' : 'translateY(20px)',
                      transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.12}s`,
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-emerald-400/60"
                      style={{
                        border: '1px solid rgba(16,185,129,0.15)',
                        background: 'rgba(16,185,129,0.05)',
                      }}
                    >
                      {stat.icon}
                    </div>
                    {/* Content */}
                    <div>
                      <div
                        className="text-white font-bold mb-0.5"
                        style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', lineHeight: 1.1 }}
                      >
                        {stat.number}
                      </div>
                      <div className="text-white/80 font-medium text-sm mb-1">{stat.label}</div>
                      <div className="text-white/40 text-xs leading-relaxed">{stat.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Keyframe animations ─── */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default AboutPage
