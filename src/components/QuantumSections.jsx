import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring, useAnimate, useMotionValueEvent, useInView, useMotionValue, animate as framerAnimate } from 'framer-motion'
import quantamVideo from '../assets/quantam.webm'
import { useTheme } from '../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../themeColors'

const sections = [
  {
    id: 'collaborative-research',
    tag: 'RESEARCH',
    title: 'Collaborative\nResearch',
    body: "Through collaborative research, we are committed to building a strong and vibrant quantum community in Pakistan. By fostering partnerships between academia, industry, and research institutions, we aim to cultivate a collaborative ecosystem that accelerates the development of quantum technologies. Together, we will strengthen Pakistan's position at the forefront of quantum research, driving innovation, knowledge exchange, and technological growth within the nation and beyond.",
    // video LEFT → text on right
    videoLeft: true,
  },
  {
    id: 'community',
    tag: 'COMMUNITY',
    title: 'Community of Students\n& Researchers',
    body: 'A dynamic community of students and researchers dedicated to advancing quantum technologies and contributing to the development of national quantum policies in Pakistan. By fostering collaboration and knowledge-sharing, we aim to shape the future of quantum science in the country, driving both technological innovation and strategic policy frameworks that will position Pakistan as a leader in the global quantum revolution.',
    // video RIGHT → text on left
    videoLeft: false,
  },
  {
    id: 'innovating-future',
    tag: 'INNOVATION',
    title: 'Innovating\nthe Future',
    body: "Shaping the future by empowering students with the skills and knowledge of quantum technology. We are dedicated to equipping the next generation of innovators with the tools to navigate and lead in the rapidly advancing world of quantum computing and communication, ensuring they are prepared to drive breakthroughs and shape tomorrow's technological landscape.",
    // video LEFT → text on right
    videoLeft: true,
  },
]

/* ─── Accent bar ─────────────────────────────────────────────── */
const AccentBar = () => (
  <div
    style={{
      width: 3,
      height: 48,
      borderRadius: 2,
      background: 'linear-gradient(180deg,#10b981,#06b6d4)',
      flexShrink: 0,
    }}
  />
)

const panelVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 28,
    filter: 'blur(10px)',
  },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

/* ─── Text panel ─────────────────────────────────────────────── */
const TextPanel = ({ section, palette }) => {
  const titleLines = section.title.split('\n')

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.45 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <motion.span
        variants={itemVariants}
        style={{
          fontSize: 11,
          letterSpacing: '0.4em',
          color: '#10b981',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        — {section.tag}
      </motion.span>
      <div style={{ overflow: 'hidden' }}>
        <motion.h2
          variants={itemVariants}
          style={{
            fontFamily: "'Archivo Black', 'Inter', sans-serif",
            fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: palette.textPrimary,
          }}
        >
          {titleLines.map((line) => (
            <span key={line} style={{ display: 'block' }}>
              {line}
            </span>
          ))}
        </motion.h2>
      </div>
      <motion.div variants={itemVariants} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <AccentBar />
        <motion.p
          variants={itemVariants}
          style={{
            color: palette.textSecondary,
            fontSize: 'clamp(0.85rem, 1.1vw, 1rem)',
            lineHeight: 1.8,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {section.body}
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */
export default function QuantumSections({ quoteEntered = false }) {
  const containerRef = useRef(null)
  const videoRef     = useRef(null)
  const quoteExitX   = useMotionValue(0)
  const quoteExitOpacity = useMotionValue(1)
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  /* ── Ensure video plays (muted for autoplay compliance) ── */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    const tryPlay = () => video.play().catch(() => {})
    if (video.readyState >= 3) tryPlay()
    else video.addEventListener('canplay', tryPlay, { once: true })
  }, [])

  useEffect(() => {
    framerAnimate(quoteExitX, quoteEntered ? 120 : 0, {
      duration: 0.95,
      ease: [0.22, 1, 0.36, 1],
    })
    framerAnimate(quoteExitOpacity, quoteEntered ? 0 : 1, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    })
  }, [quoteEntered, quoteExitX, quoteExitOpacity])

  /* ── Scroll progress over the whole 3-section block ───── */
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  /* ── Horizontal slide: left (0%) ↔ right (50%) ─────────
     Section 1  0.00 – 0.30  → left   (0%)
     Transition 0.30 – 0.36  → slides to right
     Section 2  0.36 – 0.63  → right  (50%)
     Transition 0.63 – 0.70  → slides back left
     Section 3  0.70 – 1.00  → left   (0%)
  ──────────────────────────────────────────────────────────── */
  const rawX = useTransform(
    scrollYProgress,
    [0,    0.28, 0.36,  0.63,  0.70, 1],
    ['0%', '0%', '100%', '100%', '0%', '0%']
  )
  const springX = useSpring(rawX, { stiffness: 55, damping: 18, mass: 0.9 })

  /* ── Full 360° flip on each section transition ──────────
     useAnimate fires an autonomous animation so it always
     completes the full spin regardless of scroll speed.
  ──────────────────────────────────────────────────────────── */
  const [flipScope, flipAnimate] = useAnimate()
  const flipped = useRef({ s1: false, s2: false })

  const doFlip = () =>
    flipAnimate(
      flipScope.current,
      { rotateY: [0, 360] },
      { duration: 0.65, ease: [0.4, 0, 0.2, 1] }
    )

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (v > 0.30 && !flipped.current.s1) {
      flipped.current.s1 = true
      doFlip()
    }
    if (v < 0.28) flipped.current.s1 = false

    if (v > 0.63 && !flipped.current.s2) {
      flipped.current.s2 = true
      doFlip()
    }
    if (v < 0.61) flipped.current.s2 = false
  })

  /* ── Entry: slide in from the left on first appearance ──────
     useInView fires once when the container first enters the
     viewport. We animate x: -100% → 0 on the sliding wrapper.
  ──────────────────────────────────────────────────────────── */
  const [entryScope, entryAnimate] = useAnimate()
  const hasEntered = useRef(false)
  const isInView   = useInView(containerRef, { once: true, amount: 0.1 })

  useEffect(() => {
    if (isInView && !hasEntered.current && entryScope.current) {
      hasEntered.current = true
      entryAnimate(
        entryScope.current,
        { x: ['-100%', '0%'] },
        { duration: 0.85, ease: [0.2, 0, 0.1, 1] }
      )
    }
  }, [isInView, entryAnimate, entryScope])

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', background: palette.bgPrimary }}
    >
      {/* ── Sticky video panel ───────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
          zIndex: 10,
          overflow: 'hidden',
          perspective: '1400px',
        }}
      >
        {/* Sliding wrapper — also the entry animation target */}
        <motion.div
          ref={entryScope}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            x: '-100%',
          }}
        >
          <motion.div
            style={{
              width: '100%',
              height: '100%',
              x: quoteEntered ? quoteExitX : springX,
              opacity: quoteExitOpacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Flip wrapper — driven by imperative 360° animation */}
            <motion.div
              ref={flipScope}
              style={{
                width: '80%',
                height: '75%',
                transformStyle: 'preserve-3d',
              }}
            >
              <video
                ref={videoRef}
                src={quantamVideo}
                loop
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  backfaceVisibility: 'hidden',
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Text sections (overlap sticky) ───────────────── */}
      {sections.map((section, i) => (
        <div
          key={section.id}
          id={section.id}
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            // text goes on the side opposite the video
            justifyContent: section.videoLeft ? 'flex-end' : 'flex-start',
            padding: '0 6vw',
            marginTop: i === 0 ? '-100vh' : 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <motion.div
            style={{ width: '44%', maxWidth: 540 }}
          >
            <TextPanel section={section} palette={palette} />
          </motion.div>

          {/* Section divider */}
          {i < sections.length - 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '6vw',
                right: '6vw',
                height: 1,
                background: `linear-gradient(90deg,transparent,${isDayMode ? 'rgba(46,197,138,0.35)' : 'rgba(16,185,129,0.15)'},transparent)`,
              }}
            />
          )}
        </div>
      ))}

      {/* Bottom fade */}
      <div
        style={{
          height: 120,
          background: `linear-gradient(to bottom, ${palette.bgPrimary}, ${palette.bgPrimary})`,
        }}
      />
    </div>
  )
}
