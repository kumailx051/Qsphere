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
import QOrbitalSphere from '../components/QOrbitalSphere'

const SCROLL_SPACE_VH = 320

const GLOW_COLORS = [
  [180, 20, 50],
  [30, 180, 80],
  [40, 80, 220],
  [180, 20, 50],
  [30, 180, 80],
  [210, 190, 30],
]

const CYCLE_DURATION = 12
const TITLE_START_SCALE = 1.23
const TITLE_MAX_SCALE = 2.1
const TITLE_END_SCALE = 0.16

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function getGlowColor(time) {
  const totalSegments = GLOW_COLORS.length
  const segmentDuration = CYCLE_DURATION / totalSegments
  const elapsed = time % CYCLE_DURATION
  const segIndex = Math.floor(elapsed / segmentDuration)
  const segProgress = (elapsed - segIndex * segmentDuration) / segmentDuration
  const from = GLOW_COLORS[segIndex]
  const to = GLOW_COLORS[(segIndex + 1) % totalSegments]
  const eased = segProgress < 0.5
    ? 2 * segProgress * segProgress
    : 1 - Math.pow(-2 * segProgress + 2, 2) / 2

  return lerpColor(from, to, eased)
}

const HomePage = () => {
  const qRef = useRef(null)
  const sphereRef = useRef(null)
  const orbitalWrapRef = useRef(null)
  const navbarBrandRef = useRef(null)
  const navbarFrameRef = useRef(null)
  const galleryWrapRef = useRef(null)
  const glowRef = useRef(null)
  const glowInnerRef = useRef(null)
  const crosshairRef = useRef(null)
  const vignetteRef = useRef(null)
  const scrollSectionRef = useRef(null)
  const heroRef = useRef(null)
  const quoteRef = useRef(null)
  const startTimeRef = useRef(null)
  const videoRef = useRef(null)
  const videoPlayingRef = useRef(false)
  const quoteVisible = useInView(quoteRef, { amount: 0.2, once: false })

  const currentProgressRef = useRef(0)
  const targetProgressRef = useRef(0)

  const clamp01 = (value) => Math.min(1, Math.max(0, value))
  const smoothstep = (value) => value * value * (3 - 2 * value)
  const lerp = (start, end, amount) => start + (end - start) * amount

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

  const navBrandRectRef = useRef(null)

  useEffect(() => {
    const updateRect = () => {
      if (navbarBrandRef.current) {
        navBrandRectRef.current = navbarBrandRef.current.getBoundingClientRect()
      }
    }
    updateRect()
    const timer = setTimeout(updateRect, 150)
    window.addEventListener('resize', updateRect)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateRect)
    }
  }, [])

  useEffect(() => {
    let raf

    const tick = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp

      targetProgressRef.current = getProgress()
      currentProgressRef.current += (targetProgressRef.current - currentProgressRef.current) * 0.06

      const progress = currentProgressRef.current

      const growProgress = smoothstep(clamp01(progress / 0.14))
      const splitProgress = smoothstep(clamp01((progress - 0.1) / 0.1))
      const qCenterProgress = smoothstep(clamp01((progress - 0.14) / 0.12))
      const orbitProgress = smoothstep(clamp01((progress - 0.24) / 0.1))
      const orbitRevealProgress = smoothstep(clamp01((progress - 0.2) / 0.08))
      const orbitFadeProgress = smoothstep(clamp01((progress - 0.5) / 0.08))
      const handoffProgress = smoothstep(clamp01((progress - 0.62) / 0.14))
      const brandRevealProgress = smoothstep(clamp01((progress - 0.72) / 0.1))
      const qFadeProgress = smoothstep(clamp01((progress - 0.7) / 0.1))

      const stageScale = handoffProgress > 0
        ? lerp(TITLE_MAX_SCALE, TITLE_END_SCALE, handoffProgress)
        : lerp(TITLE_START_SCALE, TITLE_MAX_SCALE, growProgress)

      const galleryFade = Math.max(0, 1 - Math.max(0, progress - 0.3) / 0.2)

      const heroIn = Math.min(1, Math.max(0, (progress - 0.4) / 0.2))
      const heroOut = Math.min(1, Math.max(0, (1 - progress) / 0.15))
      const heroOpacity = Math.min(heroIn, heroOut)

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

      const navBrandRect = navBrandRectRef.current || navbarBrandRef.current?.getBoundingClientRect()
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const qWidth = qRef.current?.offsetWidth || 240
      const sphereWidth = sphereRef.current?.offsetWidth || 900
      const sphereScale = lerp(stageScale, stageScale * 0.88, splitProgress)
      const qScaledWidth = qWidth * stageScale
      const sphereScaledWidth = sphereWidth * sphereScale
      const titleGap = Math.max(10, qScaledWidth * 0.04)
      const totalWidth = qScaledWidth + titleGap + sphereScaledWidth
      const qBaseX = centerX - totalWidth / 2 + qScaledWidth / 2
      const sphereBaseX = qBaseX + qScaledWidth / 2 + titleGap + sphereScaledWidth / 2
      const qCenteredX = centerX
      const sphereDriftDistance = Math.min(window.innerWidth * 0.08, 110)
      const qOrbitX = lerp(qBaseX, qCenteredX, qCenterProgress)
      const qEndX = navBrandRect
        ? navBrandRect.left + Math.min(navBrandRect.height * 0.62, 16)
        : window.innerWidth * 0.22
      const qEndY = navBrandRect ? navBrandRect.top + navBrandRect.height / 2 : 48
      const qX = handoffProgress > 0 ? lerp(qOrbitX, qEndX, handoffProgress) : qOrbitX
      const qY = handoffProgress > 0 ? lerp(centerY, qEndY, handoffProgress) : centerY
      const qScale = stageScale
      const qOpacity = 1 - qFadeProgress
      const sphereOpacity = 1 - splitProgress
      const sphereX = sphereBaseX - sphereDriftDistance * splitProgress
      const sphereY = centerY - 6 * splitProgress
      const orbitOpacity = orbitRevealProgress * (1 - orbitFadeProgress)
      const orbitScale = lerp(0.9, 1.16, orbitProgress)
      const sphereProgress = orbitFadeProgress > 0
        ? 0.5 + orbitFadeProgress * 0.5
        : orbitRevealProgress * 0.5

      if (qRef.current) {
        qRef.current.style.opacity = `${qOpacity}`
        qRef.current.style.transform = `translate3d(${qX}px, ${qY}px, 0) translate(-50%, -50%) scale(${qScale}) translateZ(0)`
        qRef.current.style.textShadow = brandRevealProgress > 0.2
          ? '0 0 28px rgba(16,185,129,0.34), 0 0 50px rgba(0,0,0,0.65), 0 8px 18px rgba(0,0,0,0.35)'
          : '0 0 60px rgba(0,0,0,0.8), 0 0 120px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.6)'
      }

      if (sphereRef.current) {
        sphereRef.current.style.opacity = `${sphereOpacity}`
        sphereRef.current.style.filter = `blur(${18 * splitProgress}px)`
        sphereRef.current.style.transform = `translate3d(${sphereX}px, ${sphereY}px, 0) translate(-50%, -50%) scale(${sphereScale}) translateZ(0)`
      }

      if (orbitalWrapRef.current) {
        orbitalWrapRef.current.dataset.qsphereProgress = `${sphereProgress}`
        orbitalWrapRef.current.style.opacity = `${orbitOpacity}`
      }

      if (navbarBrandRef.current) {
        navbarBrandRef.current.style.visibility = brandRevealProgress > 0.01 ? 'visible' : 'hidden'
        navbarBrandRef.current.style.opacity = `${brandRevealProgress}`
        navbarBrandRef.current.style.transform = `translate3d(${lerp(20, 0, brandRevealProgress)}px, 0, 0)`
        navbarBrandRef.current.style.filter = `blur(${lerp(8, 0, brandRevealProgress)}px)`
      }

      if (navbarFrameRef.current) {
        navbarFrameRef.current.style.transform = `translate3d(${lerp(0, -40, brandRevealProgress)}px, 0, 0)`
        navbarFrameRef.current.style.willChange = 'transform'
      }

      if (galleryWrapRef.current) galleryWrapRef.current.style.opacity = galleryFade
      if (crosshairRef.current) crosshairRef.current.style.opacity = galleryFade * 0.5

      const elapsed = (timestamp - startTimeRef.current) / 1000
      const [r, g, b] = getGlowColor(elapsed)

      if (glowRef.current) {
        glowRef.current.style.opacity = galleryFade
        glowRef.current.style.background = `radial-gradient(ellipse 60% 65% at 50% 50%, rgba(${r},${g},${b},0.65) 0%, rgba(${r},${g},${b},0.30) 45%, transparent 72%)`
      }

      if (glowInnerRef.current) {
        glowInnerRef.current.style.opacity = galleryFade
        glowInnerRef.current.style.background = `radial-gradient(ellipse 35% 40% at 50% 48%, rgba(${r},${g},${b},0.30) 0%, transparent 60%)`
      }

      if (heroRef.current) {
        const translateY = (1 - heroIn) * 80
        heroRef.current.style.opacity = heroOpacity
        heroRef.current.style.transform = `translateY(${translateY}px) translateZ(0)`
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)

      if (navbarBrandRef.current) {
        navbarBrandRef.current.style.opacity = ''
        navbarBrandRef.current.style.visibility = ''
        navbarBrandRef.current.style.transform = ''
        navbarBrandRef.current.style.filter = ''
      }

      if (navbarFrameRef.current) {
        navbarFrameRef.current.style.transform = ''
        navbarFrameRef.current.style.willChange = ''
      }
    }
  }, [getProgress])

  return (
    <>
      <div
        ref={scrollSectionRef}
        className="relative bg-black"
        style={{ height: `${SCROLL_SPACE_VH}vh` }}
      >
        <div className="sticky top-0 h-screen w-screen overflow-hidden z-50">
          <div className="absolute inset-0 bg-[#0a0a0a]" />

          <div
            ref={glowRef}
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 2 }}
          />

          <div
            ref={glowInnerRef}
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 2 }}
          />

          <Navbar currentPage="home" homeBrandRef={navbarBrandRef} homeNavFrameRef={navbarFrameRef} />

          <div ref={crosshairRef}>
            <Crosshairs opacity={1} />
          </div>

          <div
            ref={galleryWrapRef}
            className="absolute inset-0"
            style={{ zIndex: 6 }}
          >
            <InfiniteGallery scale={1} />
          </div>

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

      <div
        ref={orbitalWrapRef}
        className="fixed inset-0 z-[74] pointer-events-none overflow-visible mix-blend-screen"
        style={{
          opacity: 1,
          transform: `translate3d(0, 0, 0) scale(1) translateZ(0)`,
          willChange: 'transform, opacity',
        }}
        aria-hidden="true"
      >
        <QOrbitalSphere className="h-full w-full" />
      </div>

      <div
        ref={qRef}
        className="fixed z-[73] pointer-events-none select-none text-white font-black tracking-tight text-center"
        style={{
          left: '0px',
          top: '0px',
          fontSize: 'clamp(3.8rem, 11.5vw, 10.5rem)',
          fontFamily: "'Archivo Black', 'Inter', sans-serif",
          transform: `translate3d(50vw, 50vh, 0) translate(-50%, -50%) scale(${TITLE_START_SCALE}) translateZ(0)`,
          transformOrigin: 'center center',
          letterSpacing: '-0.05em',
          lineHeight: 0.9,
          opacity: 1,
          willChange: 'transform, opacity',
          textShadow:
            '0 0 60px rgba(0,0,0,0.8), 0 0 120px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.6)',
        }}
        aria-hidden="true"
      >
        Q
      </div>

      <div
        ref={sphereRef}
        className="fixed z-[72] pointer-events-none select-none text-white font-black tracking-tight text-center"
        style={{
          left: '0px',
          top: '0px',
          fontSize: 'clamp(3.8rem, 11.5vw, 10.5rem)',
          fontFamily: "'Archivo Black', 'Inter', sans-serif",
          transform: `translate3d(50vw, 50vh, 0) translate(-50%, -50%) scale(${TITLE_START_SCALE}) translateZ(0)`,
          transformOrigin: 'center center',
          letterSpacing: '-0.05em',
          lineHeight: 0.9,
          opacity: 1,
          willChange: 'transform, opacity, filter',
          textShadow:
            '0 0 60px rgba(0,0,0,0.8), 0 0 120px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.6)',
        }}
        aria-hidden="true"
      >
        Sphere
      </div>

      <span className="sr-only">QSphere</span>

      <CurvedCarousel />

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

      <Footer />
    </>
  )
}

export default HomePage
