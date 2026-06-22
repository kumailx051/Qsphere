import { useEffect, useRef, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import InfiniteGallery from '../components/InfiniteGallery'
import videoBackground from '../assets/videoBackground.mp4'
import videoBackgroundDay from '../assets/videoBackgroundDay.mp4'
import imageGridVideoDay from '../assets/imageGridVideoDay.mp4'
import Crosshairs from '../components/Crosshairs'
import Navbar from '../components/Navbar'
import CurvedCarousel from '../components/CurvedCarousel'
import QuantumSections from '../components/QuantumSections'
import Footer from '../components/Footer'
import QOrbitalSphere from '../components/QOrbitalSphere'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

const SCROLL_SPACE_VH = 320

const DARK_GLOW_COLORS = [
  [180, 20, 50],
  [30, 180, 80],
  [40, 80, 220],
  [180, 20, 50],
  [30, 180, 80],
  [210, 190, 30],
]
const DAY_GLOW_COLORS = [
  [46, 197, 138],
  [14, 150, 96],
  [177, 231, 209],
  [46, 197, 138],
  [14, 150, 96],
  [177, 231, 209],
]

const CYCLE_DURATION = 12
const TITLE_START_SCALE = 1.23
const TITLE_MAX_SCALE = 1.9
const TITLE_END_SCALE = 0.16
const HERO_LETTER_SPACING = -0.06
const NAV_LETTER_SPACING = -0.04
const INTRO_WORDMARK_END = 0.08
const SPLIT_START = 0.1
const SPLIT_DURATION = 0.1
const ORBIT_REVEAL_START = SPLIT_START
const ORBIT_REVEAL_DURATION = 0.12
const HERO_ENTER_START = 0.4
const HERO_ENTER_DURATION = 0.2
const Q_HANDOFF_START = HERO_ENTER_START
const Q_HANDOFF_DURATION = 0.18
const ORBIT_FADE_START = Q_HANDOFF_START
const ORBIT_FADE_DURATION = Q_HANDOFF_DURATION
const BRAND_REVEAL_START = 0.5
const BRAND_REVEAL_DURATION = 0.12
const Q_FADE_START = 0.54
const Q_FADE_DURATION = 0.1
const SPHERE_REJOIN_START = 0.32
const SPHERE_REJOIN_DURATION = 0.14

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function getGlowColor(time, isDayMode) {
  const colors = isDayMode ? DAY_GLOW_COLORS : DARK_GLOW_COLORS
  const totalSegments = colors.length
  const segmentDuration = CYCLE_DURATION / totalSegments
  const elapsed = time % CYCLE_DURATION
  const segIndex = Math.floor(elapsed / segmentDuration)
  const segProgress = (elapsed - segIndex * segmentDuration) / segmentDuration
  const from = colors[segIndex]
  const to = colors[(segIndex + 1) % totalSegments]
  const eased = segProgress < 0.5
    ? 2 * segProgress * segProgress
    : 1 - Math.pow(-2 * segProgress + 2, 2) / 2

  return lerpColor(from, to, eased)
}

const HomePage = () => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const [showLoader, setShowLoader] = useState(true)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), 1200)
    const removeTimer = setTimeout(() => setShowLoader(false), 1700)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])
  const qRef = useRef(null)
  const sphereRef = useRef(null)
  const wordmarkRef = useRef(null)
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

  const heroWordmarkFontSize = 'clamp(3.05rem, 9.9vw, 9.1rem)'
  const heroWordmarkShadow = isDayMode
    ? '0 2px 0 rgba(255,255,255,0.75), 0 10px 28px rgba(3,10,34,0.18), 0 0 60px rgba(3,10,34,0.08)'
    : '0 2px 0 rgba(255,255,255,0.65), 0 10px 28px rgba(3,10,34,0.42), 0 0 60px rgba(3,10,34,0.18)'
  const heroQColor = palette.accentPrimary
  const heroSphereColor = isDayMode ? '#0A1620' : '#ffffff'

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
    const navbarBrandNode = navbarBrandRef.current
    const navbarFrameNode = navbarFrameRef.current

    const tick = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp

      targetProgressRef.current = getProgress()
      currentProgressRef.current += (targetProgressRef.current - currentProgressRef.current) * 0.06

      const progress = currentProgressRef.current

      const growProgress = smoothstep(clamp01(progress / 0.14))
      const introWordmarkProgress = smoothstep(clamp01(progress / INTRO_WORDMARK_END))
      const splitProgress = smoothstep(clamp01((progress - SPLIT_START) / SPLIT_DURATION))
      const qCenterProgress = smoothstep(clamp01((progress - 0.14) / 0.12))
      const orbitRevealProgress = smoothstep(clamp01((progress - ORBIT_REVEAL_START) / ORBIT_REVEAL_DURATION))
      const orbitFadeProgress = smoothstep(clamp01((progress - ORBIT_FADE_START) / ORBIT_FADE_DURATION))
      const handoffProgress = smoothstep(clamp01((progress - Q_HANDOFF_START) / Q_HANDOFF_DURATION))
      const brandRevealProgress = smoothstep(clamp01((progress - BRAND_REVEAL_START) / BRAND_REVEAL_DURATION))
      const qFadeProgress = smoothstep(clamp01((progress - Q_FADE_START) / Q_FADE_DURATION))
      const sphereRejoinProgress = smoothstep(clamp01((progress - SPHERE_REJOIN_START) / SPHERE_REJOIN_DURATION))
      const wordLockProgress = smoothstep(
        clamp01((progress - SPHERE_REJOIN_START) / Math.max(0.001, Q_HANDOFF_START - SPHERE_REJOIN_START)),
      )

      const qWidth = qRef.current?.offsetWidth || 240
      const sphereWidth = sphereRef.current?.offsetWidth || 900
      const wordmarkWidth = wordmarkRef.current?.offsetWidth || 1100
      const getSplitWordmarkWidth = (scale) => {
        const scaledQWidth = qWidth * scale
        const scaledSphereWidth = sphereWidth * scale
        const scaledTitleGap = Math.max(8, scaledQWidth * 0.03)
        const scaledOpticalKerning = scaledQWidth * 0.085
        const scaledEffectiveGap = Math.max(-18, scaledTitleGap - scaledOpticalKerning)

        return scaledQWidth + scaledEffectiveGap + scaledSphereWidth
      }

      const viewportWidthLimit = window.innerWidth * 0.9
      const viewportHeightLimit = window.innerHeight * 0.42
      const baseWordmarkHeight = wordmarkRef.current?.offsetHeight || sphereRef.current?.offsetHeight || qRef.current?.offsetHeight || 180
      const widthSafeForCombined = viewportWidthLimit / Math.max(wordmarkWidth, 1)
      const widthSafeForSplit = viewportWidthLimit / Math.max(getSplitWordmarkWidth(1), 1)
      const heightSafeScale = viewportHeightLimit / Math.max(baseWordmarkHeight, 1)
      const introMaxScale = Math.min(TITLE_MAX_SCALE, widthSafeForCombined, widthSafeForSplit, heightSafeScale)
      const stageScale = handoffProgress > 0
        ? lerp(introMaxScale, TITLE_END_SCALE, handoffProgress)
        : lerp(TITLE_START_SCALE, introMaxScale, growProgress)

      const galleryFade = Math.max(0, 1 - Math.max(0, progress - 0.3) / 0.2)

      const heroIn = Math.min(1, Math.max(0, (progress - HERO_ENTER_START) / HERO_ENTER_DURATION))
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

      const navBrandRect = navbarBrandRef.current?.getBoundingClientRect() || navBrandRectRef.current
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const navTargetScale = navBrandRect
        ? Math.max(0.01, navBrandRect.width / Math.max(wordmarkWidth, 1))
        : TITLE_END_SCALE
      const sphereScale = lerp(stageScale, stageScale * 0.88, splitProgress)
      // Smoothly transition sphere scale from split-reduced (0.88x) back to full
      // during rejoin so positioning and rendering stay in sync
      const sphereDisplayScale = lerp(sphereScale, stageScale, sphereRejoinProgress)
      const qScaledWidth = qWidth * stageScale
      const sphereScaledWidth = sphereWidth * sphereDisplayScale
      const titleGap = Math.max(8, qScaledWidth * 0.03)
      const opticalKerning = qScaledWidth * 0.085
      const effectiveTitleGap = Math.max(-18, titleGap - opticalKerning)
      const totalWidth = qScaledWidth + effectiveTitleGap + sphereScaledWidth
      const qBaseLeft = centerX - totalWidth / 2
      const qBaseX = qBaseLeft + qScaledWidth / 2
      const sphereBaseX = qBaseX + qScaledWidth / 2 + effectiveTitleGap + sphereScaledWidth / 2
      const qCenteredX = centerX
      const qFinalWidth = qWidth * navTargetScale
      const sphereDriftDistance = Math.min(window.innerWidth * 0.08, 110)
      const qOrbitX = lerp(qBaseX, qCenteredX, qCenterProgress)
      const qRejoinX = lerp(qOrbitX, qBaseX, wordLockProgress)
      const sphereSplitX = sphereBaseX - sphereDriftDistance * splitProgress
      const sphereRejoinX = lerp(
        sphereSplitX,
        qRejoinX + qScaledWidth / 2 + effectiveTitleGap + sphereScaledWidth / 2,
        wordLockProgress,
      )
      const qEndX = navBrandRect
        ? navBrandRect.left + qFinalWidth * 0.5
        : window.innerWidth * 0.22
      const wordmarkEndX = navBrandRect
        ? navBrandRect.left + navBrandRect.width * 0.5
        : qEndX + ((wordmarkWidth * navTargetScale) - qFinalWidth) * 0.5
      const wordEndLeft = qEndX - qFinalWidth / 2
      const qEndY = navBrandRect ? navBrandRect.top + navBrandRect.height / 2 : 48
      const wordHandoffLeft = lerp(qBaseLeft, wordEndLeft, handoffProgress)
      const wordmarkX = handoffProgress > 0 ? lerp(centerX, wordmarkEndX, handoffProgress) : centerX
      const wordmarkY = handoffProgress > 0 ? lerp(centerY, qEndY, handoffProgress) : centerY
      const qX = handoffProgress > 0 ? wordHandoffLeft + qScaledWidth / 2 : qRejoinX
      const qY = handoffProgress > 0 ? lerp(centerY, qEndY, handoffProgress) : centerY
      const qScale = stageScale
      const wordmarkScale = handoffProgress > 0 ? lerp(introMaxScale, navTargetScale, handoffProgress) : stageScale
      const letterSpacing = `${lerp(HERO_LETTER_SPACING, NAV_LETTER_SPACING, brandRevealProgress)}em`
      const navBrandOpacity = smoothstep(clamp01((progress - 0.58) / 0.08))
      const wordmarkBlend = smoothstep(clamp01((wordLockProgress - 0.18) / 0.52))
      const introWordmarkOpacity = 1 - introWordmarkProgress
      const handoffWordmarkOpacity = wordmarkBlend
      const splitLayerOpacity = introWordmarkProgress * (1 - wordmarkBlend)
      const qOpacity = splitLayerOpacity
      const sphereOpacity = sphereRejoinProgress > 0
        ? sphereRejoinProgress * splitLayerOpacity
        : splitLayerOpacity * (1 - splitProgress)
      const wordmarkOpacity = Math.max(introWordmarkOpacity, handoffWordmarkOpacity)
      const wordmarkBlur = introWordmarkOpacity > handoffWordmarkOpacity
        ? lerp(0, 8, introWordmarkProgress)
        : lerp(6, 0, wordmarkBlend)
      const sphereX = handoffProgress > 0
        ? wordHandoffLeft + qScaledWidth + effectiveTitleGap + sphereScaledWidth / 2
        : sphereRejoinX
      const sphereY = handoffProgress > 0
        ? qY
        : lerp(centerY - 6 * splitProgress, centerY, wordLockProgress)
      const sphereBlur = sphereRejoinProgress > 0
        ? lerp(6, 0, sphereRejoinProgress)
        : 18 * splitProgress
      const orbitOpacity = orbitRevealProgress * (1 - orbitFadeProgress)
      const sphereProgress = orbitFadeProgress > 0
        ? 0.5 + orbitFadeProgress * 0.5
        : orbitRevealProgress * 0.5

      if (qRef.current) {
        qRef.current.style.opacity = `${qOpacity}`
        qRef.current.style.transform = `translate3d(${qX}px, ${qY}px, 0) translate(-50%, -50%) scale(${qScale}) translateZ(0)`
        qRef.current.style.letterSpacing = letterSpacing
        qRef.current.style.textShadow = brandRevealProgress > 0.2
          ? (isDayMode ? '0 8px 24px rgba(46,197,138,0.12)' : '0 0 24px rgba(16,185,129,0.22)')
          : (isDayMode ? '0 8px 24px rgba(46,197,138,0.12)' : '0 0 24px rgba(16,185,129,0.22)')
      }

      if (sphereRef.current) {
        sphereRef.current.style.opacity = `${sphereOpacity}`
        sphereRef.current.style.filter = `blur(${sphereBlur}px)`
        sphereRef.current.style.transform = `translate3d(${sphereX}px, ${sphereY}px, 0) translate(-50%, -50%) scale(${sphereDisplayScale}) translateZ(0)`
        sphereRef.current.style.letterSpacing = letterSpacing
      }

      if (wordmarkRef.current) {
        wordmarkRef.current.style.opacity = `${wordmarkOpacity * (1 - navBrandOpacity)}`
        wordmarkRef.current.style.transform = `translate3d(${wordmarkX}px, ${wordmarkY}px, 0) translate(-50%, -50%) scale(${wordmarkScale}) translateZ(0)`
        wordmarkRef.current.style.filter = `blur(${wordmarkBlur}px)`
        wordmarkRef.current.style.letterSpacing = letterSpacing
      }

      if (navbarBrandNode) {
        navbarBrandNode.style.opacity = `${navBrandOpacity}`
        navbarBrandNode.style.visibility = navBrandOpacity > 0.01 ? 'visible' : 'hidden'
      }

      if (orbitalWrapRef.current) {
        orbitalWrapRef.current.dataset.qsphereProgress = `${sphereProgress}`
        orbitalWrapRef.current.style.opacity = `${orbitOpacity}`
      }

      if (galleryWrapRef.current) {
        const galleryTranslateY = (1 - galleryFade) * 80
        galleryWrapRef.current.style.opacity = galleryFade
        galleryWrapRef.current.style.transform = `translateY(${galleryTranslateY}px)`
      }
      if (crosshairRef.current) crosshairRef.current.style.opacity = galleryFade * 0.5

      const elapsed = (timestamp - startTimeRef.current) / 1000
      const [r, g, b] = getGlowColor(elapsed, isDayMode)

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

      if (navbarBrandNode) {
        navbarBrandNode.style.opacity = ''
        navbarBrandNode.style.visibility = ''
      }

      if (navbarFrameNode) {
        navbarFrameNode.style.transform = ''
        navbarFrameNode.style.willChange = ''
      }
    }
  }, [getProgress])

  return (
    <>
      {showLoader && (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 pointer-events-none ${isFading ? 'opacity-0' : 'opacity-100'}`}
          style={{ backgroundColor: palette.bgPrimary }}
        >
          <div className="loader"></div>
        </div>
      )}
      <div
        ref={scrollSectionRef}
        className="relative"
        style={{ height: `${SCROLL_SPACE_VH}vh`, backgroundColor: palette.bgPrimary }}
      >
        <div className="sticky top-0 h-screen w-screen overflow-hidden z-50">
          <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />

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
            style={{ zIndex: 6, overflow: 'hidden' }}
          >
            {isDayMode && (
              <div className="absolute inset-0 pointer-events-none">
                <video
                  className="w-full h-full object-cover"
                  style={{ transform: 'scale(1.35)' }}
                  src={imageGridVideoDay}
                  autoPlay
                  muted
                  playsInline
                  onTimeUpdate={(e) => {
                    if (e.target.currentTime >= 6) {
                      e.target.currentTime = 1
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    e.target.currentTime = 1
                    e.target.playbackRate = 0.5
                  }}
                />
              </div>
            )}
            <InfiniteGallery scale={1} />
          </div>

          <div
            ref={heroRef}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ opacity: 0, willChange: 'transform, opacity' }}
          >
            <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />

            <video
              ref={videoRef}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ transform: isDayMode ? 'scale(1.35)' : 'none' }}
              src={isDayMode ? videoBackgroundDay : videoBackground}
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
        className={`fixed inset-0 z-[74] pointer-events-none overflow-visible ${isDayMode ? 'mix-blend-multiply' : 'mix-blend-screen'}`}
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
        className="fixed z-[73] pointer-events-none select-none font-black tracking-tight text-center"
        style={{
          left: '0px',
          top: '0px',
          fontSize: heroWordmarkFontSize,
          fontFamily: "'Syne', 'Inter', sans-serif",
          transform: `translate3d(50vw, 50vh, 0) translate(-50%, -50%) scale(${TITLE_START_SCALE}) translateZ(0)`,
          transformOrigin: 'center center',
          letterSpacing: `${HERO_LETTER_SPACING}em`,
          lineHeight: 0.9,
          opacity: 1,
          willChange: 'transform, opacity',
          color: heroQColor,
          textShadow: isDayMode ? '0 8px 24px rgba(46,197,138,0.12)' : '0 0 24px rgba(16,185,129,0.22)',
        }}
        aria-hidden="true"
      >
        Q
      </div>

      <div
        ref={sphereRef}
        className="fixed z-[72] pointer-events-none select-none font-black tracking-tight text-center"
        style={{
          left: '0px',
          top: '0px',
          fontSize: heroWordmarkFontSize,
          fontFamily: "'Syne', 'Inter', sans-serif",
          transform: `translate3d(50vw, 50vh, 0) translate(-50%, -50%) scale(${TITLE_START_SCALE}) translateZ(0)`,
          transformOrigin: 'center center',
          letterSpacing: `${HERO_LETTER_SPACING}em`,
          lineHeight: 0.9,
          opacity: 1,
          willChange: 'transform, opacity, filter',
          color: heroSphereColor,
          textShadow: heroWordmarkShadow,
        }}
        aria-hidden="true"
      >
        Sphere
      </div>

      <div
        ref={wordmarkRef}
        className="fixed z-[73] pointer-events-none select-none font-black tracking-tight text-center"
        style={{
          left: '0px',
          top: '0px',
          fontSize: heroWordmarkFontSize,
          fontFamily: "'Syne', 'Inter', sans-serif",
          transform: `translate3d(50vw, 50vh, 0) translate(-50%, -50%) scale(${TITLE_START_SCALE}) translateZ(0)`,
          transformOrigin: 'center center',
          letterSpacing: `${HERO_LETTER_SPACING}em`,
          lineHeight: 0.9,
          opacity: 0,
          willChange: 'transform, opacity, filter',
          textShadow: heroWordmarkShadow,
        }}
        aria-hidden="true"
      >
        <span style={{ color: heroQColor, textShadow: isDayMode ? '0 8px 24px rgba(46,197,138,0.12)' : '0 0 24px rgba(16,185,129,0.22)' }}>Q</span>
        <span style={{ color: heroSphereColor }}>Sphere</span>
      </div>

      <span className="sr-only">QSphere</span>

      <CurvedCarousel />

      <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${palette.accentPrimary}, transparent)` }} />

      <QuantumSections quoteEntered={quoteVisible} />

      <section ref={quoteRef} className="relative overflow-hidden px-6 py-28 md:px-12 md:py-36" style={{ backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
        <div className="absolute inset-0" style={{ background: isDayMode ? 'radial-gradient(circle at top, rgba(16,185,129,0.08), transparent 48%), radial-gradient(circle at bottom right, rgba(6,182,212,0.05), transparent 34%)' : 'radial-gradient(circle at top, rgba(16,185,129,0.16), transparent 48%), radial-gradient(circle at bottom right, rgba(6,182,212,0.10), transparent 34%)' }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${isDayMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.3)'}, transparent)` }} />
        <motion.div
          initial={{ opacity: 0, y: 36, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: false, amount: 0.45 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex max-w-4xl flex-col items-start gap-6"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.45em]" style={{ color: palette.accentPrimary }}>
            Quantum Reflection
          </span>
          <blockquote className="max-w-3xl text-balance text-3xl font-black leading-tight tracking-tight md:text-5xl" style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}>
            If you are not completely confused by quantum mechanics, you do not understand it
          </blockquote>
          <p className="text-sm uppercase tracking-[0.35em] md:text-base" style={{ color: palette.textSecondary }}>
            John Wheeler
          </p>
        </motion.div>
      </section>

      <Footer />
    </>
  )
}

export default HomePage