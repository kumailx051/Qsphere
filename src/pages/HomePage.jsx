import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import InfiniteGallery from '../components/InfiniteGallery'
import videoBackground from '../assets/videoBackground.mp4'
import Crosshairs from '../components/Crosshairs'
import Navbar from '../components/Navbar'
import CurvedCarousel from '../components/CurvedCarousel'
import QuantumSections from '../components/QuantumSections'
import Footer from '../components/Footer'

// ─── Scroll space ────────────────────────────────────────────────
// Hero intro    = 220 vh  (unchanged)
// Carousel      = dynamic (CurvedCarousel sets its own height via JS)
const SCROLL_SPACE_VH = 220

// Color cycle: red → green → blue → red → green → yellow → (repeat)
const GLOW_COLORS = [
  [180, 20, 50],    // red
  [30, 180, 80],    // green
  [40, 80, 220],    // blue
  [180, 20, 50],    // red
  [30, 180, 80],    // green
  [210, 190, 30],   // yellow
]

const CYCLE_DURATION = 12 // seconds for one full loop

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function getGlowColor(time) {
  const totalSegments  = GLOW_COLORS.length
  const segmentDuration = CYCLE_DURATION / totalSegments
  const elapsed   = time % CYCLE_DURATION
  const segIndex  = Math.floor(elapsed / segmentDuration)
  const segProgress = (elapsed - segIndex * segmentDuration) / segmentDuration
  const from = GLOW_COLORS[segIndex]
  const to   = GLOW_COLORS[(segIndex + 1) % totalSegments]
  const eased = segProgress < 0.5
    ? 2 * segProgress * segProgress
    : 1 - Math.pow(-2 * segProgress + 2, 2) / 2
  return lerpColor(from, to, eased)
}

const HomePage = () => {
  // All refs — no React state for animation = zero re-renders = zero lag
  const titleRef       = useRef(null)
  const navbarBrandRef = useRef(null)
  const galleryWrapRef = useRef(null)
  const glowRef        = useRef(null)
  const glowInnerRef   = useRef(null)
  const crosshairRef   = useRef(null)
  const vignetteRef    = useRef(null)
  const scrollSectionRef = useRef(null)
  const heroRef        = useRef(null)
  const quoteRef       = useRef(null)
  const startTimeRef   = useRef(null)
  const videoRef       = useRef(null)
  const videoPlayingRef = useRef(false)
  const quoteVisible   = useInView(quoteRef, { amount: 0.2, once: false })

  const currentProgressRef = useRef(0)
  const targetProgressRef = useRef(0)

  const clamp01 = (value) => Math.min(1, Math.max(0, value))
  const smoothstep = (value) => value * value * (3 - 2 * value)
  const lerp = (start, end, amount) => start + (end - start) * amount

  // Memoized scroll progress getter — direct raw value
  const getProgress = useCallback(() => {
    const section = scrollSectionRef.current
    const sectionTop = section ? section.offsetTop : 0
    const sectionHeight = section
      ? section.offsetHeight
      : (SCROLL_SPACE_VH / 100) * window.innerHeight
    const max = Math.max(1, sectionHeight - window.innerHeight)
    const raw = window.scrollY - sectionTop
    return Math.min(1, Math.max(0, raw / max))
  }, [])

  useEffect(() => {
    let raf

    const tick = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      
      targetProgressRef.current = getProgress()
      // Apply smooth linear interpolation (lerp) to create the "smooth lag" feel
      currentProgressRef.current += (targetProgressRef.current - currentProgressRef.current) * 0.08
      
      const progress = currentProgressRef.current

      // ── Text animation: grows first, then travels into the navbar slot ──
      const growProgress = smoothstep(clamp01(progress / 0.18))
      const moveProgress = smoothstep(clamp01((progress - 0.12) / 0.42))
      const settleProgress = smoothstep(clamp01((progress - 0.28) / 0.28))
      const titleScale = progress < 0.18
        ? lerp(1, 3.35, growProgress)
        : lerp(3.35, 0.16, settleProgress)
      const titleOpacity = 1

      // Gallery fades between 30%–50% scroll
      const galleryFade  = Math.max(0, 1 - Math.max(0, progress - 0.30) / 0.20)
      const galleryScale = 1 - progress * 0.55

      // Hero appears between 40%–60% scroll, fades out near the end
      const heroIn = Math.min(1, Math.max(0, (progress - 0.40) / 0.20))
      const heroOut = Math.min(1, Math.max(0, (1 - progress) / 0.15))
      const heroOpacity = Math.min(heroIn, heroOut)

      // Background video plays only when hero is in view
      const shouldPlayVideo = heroOpacity > 0.05
      if (videoRef.current) {
        if (shouldPlayVideo && !videoPlayingRef.current) {
          const playPromise = videoRef.current.play()
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => { videoPlayingRef.current = false })
          }
          videoPlayingRef.current = true
        } else if (!shouldPlayVideo && videoPlayingRef.current) {
          videoRef.current.pause()
          videoPlayingRef.current = false
        }
      }

      // ── Apply to DOM directly (no React re-renders) ──

      const navBrandRect = navbarBrandRef.current?.getBoundingClientRect()
      const startX = window.innerWidth / 2
      const startY = window.innerHeight / 2
      const endX = navBrandRect ? navBrandRect.left + navBrandRect.width / 2 + 36 : window.innerWidth * 0.21
      const endY = navBrandRect ? navBrandRect.top + navBrandRect.height / 2 : 48

      if (titleRef.current) {
        titleRef.current.style.left = `${lerp(startX, endX, moveProgress)}px`
        titleRef.current.style.top = `${lerp(startY, endY, moveProgress)}px`
        titleRef.current.style.opacity = `${titleOpacity}`
        titleRef.current.style.transform = `translate(-50%, -50%) scale(${titleScale}) translateZ(0)`
      }

      if (galleryWrapRef.current)
        galleryWrapRef.current.style.opacity = galleryFade

      if (crosshairRef.current)
        crosshairRef.current.style.opacity = galleryFade * 0.5

      // Color cycling glow — direct DOM
      const elapsed = (timestamp - startTimeRef.current) / 1000
      const [r, g, b] = getGlowColor(elapsed)

      if (glowRef.current) {
        glowRef.current.style.opacity     = galleryFade
        glowRef.current.style.background  = `radial-gradient(ellipse 60% 65% at 50% 50%, rgba(${r},${g},${b},0.65) 0%, rgba(${r},${g},${b},0.30) 45%, transparent 72%)`
      }
      if (glowInnerRef.current) {
        glowInnerRef.current.style.opacity    = galleryFade
        glowInnerRef.current.style.background = `radial-gradient(ellipse 35% 40% at 50% 48%, rgba(${r},${g},${b},0.30) 0%, transparent 60%)`
      }

      if (heroRef.current) {
        const translateY = (1 - heroIn) * 80
        heroRef.current.style.opacity   = heroOpacity
        heroRef.current.style.transform = `translateY(${translateY}px) translateZ(0)`
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [getProgress])

  return (
    <>
      {/* ─────────────────────────────────────────────────────────
          PART 1 — sticky hero intro (unchanged, 220 vh tall)
      ───────────────────────────────────────────────────────── */}
      <div
        ref={scrollSectionRef}
        className="relative bg-black"
        style={{ height: `${SCROLL_SPACE_VH}vh` }}
      >
        <div className="sticky top-0 h-screen w-screen overflow-hidden z-50">
          {/* Base background */}
          <div className="absolute inset-0 bg-[#0a0a0a]" />

          {/* Animated color-cycling radial glow */}
          <div
            ref={glowRef}
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 2 }}
          />

          {/* Brighter inner accent layer */}
          <div
            ref={glowInnerRef}
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 2 }}
          />

          {/* Navbar */}
          <Navbar currentPage="home" homeBrandRef={navbarBrandRef} />

          {/* Crosshairs */}
          <div ref={crosshairRef}>
            <Crosshairs opacity={1} />
          </div>

          {/* Infinite image gallery */}
          <div
            ref={galleryWrapRef}
            className="absolute inset-0"
            style={{ zIndex: 6 }}
          >
            <InfiniteGallery scale={1} />
          </div>

          {/* Hero section */}
          <div
            ref={heroRef}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ opacity: 0, willChange: 'transform, opacity' }}
          >
            <div className="absolute inset-0 bg-black" />

            <video
              ref={videoRef}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              src={videoBackground}
              muted
              loop
              playsInline
              preload="metadata"
            />

            <div className="relative z-10 h-full w-full flex flex-col justify-between p-8 md:p-14">
              <div className="max-w-5xl pointer-events-auto mt-12 md:mt-20">
                <div className="text-emerald-400 text-[11px] tracking-[0.4em] mb-6 font-semibold">
                  — BEYOND THE GRID
                </div>
                <h2
                  className="text-white font-bold leading-[0.95] tracking-tight"
                  style={{
                    fontSize: 'clamp(2.1rem, 5.6vw, 5.4rem)',
                    fontFamily: "'Archivo Black', 'Inter', sans-serif",
                    letterSpacing: '-0.03em',
                    maxWidth: 'fit-content',
                  }}
                >
                  <span className="block">Building the</span>
                  <span className="block">Future</span>
                  <span className="block">
                    of{' '}
                    <span
                      className="text-emerald-400"
                      style={{ textShadow: '0 0 40px rgba(16,185,129,0.3)' }}
                    >
                      Quantum
                    </span>{' '}
                  </span>
                  <span className="block">Science</span>
                </h2>
                <p className="text-white/60 mt-8 max-w-xl text-base md:text-lg leading-relaxed">
                  A global community of students, researchers, and innovators collaborating to
                  advance quantum technologies and turn breakthrough ideas into real-world impact.
                </p>
                <div className="mt-10" />
              </div>
            </div>
          </div>

          {/* Dark vignette */}
          <div
            ref={vignetteRef}
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'transparent',
              zIndex: 8,
            }}
          />
        </div>
      </div>

      {/* Center title — "QSphere" */}
      <h1
        ref={titleRef}
        className="fixed z-[70] pointer-events-none text-white font-black tracking-tight text-center"
        style={{
          left: '50%',
          top: '50%',
          fontSize: 'clamp(4rem, 14vw, 14rem)',
          fontFamily: "'Archivo Black', 'Inter', sans-serif",
          transform: 'translate(-50%, -50%) scale(1) translateZ(0)',
          transformOrigin: 'center center',
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
          opacity: 1,
          willChange: 'transform, opacity, left, top',
          textShadow:
            '0 0 60px rgba(0,0,0,0.8), 0 0 120px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.6)',
        }}
      >
        QSphere
      </h1>

      {/* ─────────────────────────────────────────────────────────
          PART 2 — Curved scroll carousel (self-contained)
          Placed in normal flow so it appears after the hero block.
          CurvedCarousel sets its own wrapper height via JS.
      ───────────────────────────────────────────────────────── */}
      <CurvedCarousel />

      {/* ─────────────────────────────────────────────────────────
          PART 3 — Three quantum info sections with scroll-linked
          sticky video that glides left ↔ right via framer-motion
      ───────────────────────────────────────────────────────── */}
      <QuantumSections quoteEntered={quoteVisible} />

      <section ref={quoteRef} className="relative overflow-hidden bg-[#050505] px-6 py-28 text-white md:px-12 md:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.10),transparent_34%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 36, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: false, amount: 0.45 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex max-w-4xl flex-col items-start gap-6"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-emerald-400">
            Quantum Reflection
          </span>
          <blockquote className="max-w-3xl text-balance text-3xl font-black leading-tight tracking-tight md:text-5xl" style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}>
            If you are not completely confused by quantum mechanics, you do not understand it
          </blockquote>
          <p className="text-sm uppercase tracking-[0.35em] text-white/55 md:text-base">
            John Wheeler
          </p>
        </motion.div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          PART 4 — Footer
      ───────────────────────────────────────────────────────── */}
      <Footer />
    </>
  )
}

export default HomePage
