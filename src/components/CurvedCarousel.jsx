import { useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import quantariumImg from '../assets/quantarium.png'
import qubionImg from '../assets/qubion.png'
import quantamnonicsImg from '../assets/quantamonics.png'

const IMAGES = [
  { src: quantariumImg, alt: 'Quantarium', href: 'https://www.quantarium.com/' },
  { src: qubionImg, alt: 'Qubion', href: 'https://qubiontech.com/' },
  { src: quantamnonicsImg, alt: 'Quantamnonics', href: 'https://quantumronics.com/' },
]

const CURVE_ANGLE = 22
const CURVE_DEPTH = 180

export default function CurvedCarousel() {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  const wrapperRef      = useRef(null)
  const trackRef        = useRef(null)
  const trackFillRef    = useRef(null)
  const counterCurRef   = useRef(null)
  const itemsRef        = useRef([])
  const maxTranslateRef = useRef(0)
  const rafIdRef        = useRef(null)
  const lastProgressRef = useRef(-1)
  const initializedRef  = useRef(false)

  const openSite = (href) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  // ── Layout calculation ───────────────────────────────────────
  const calculateLayout = () => {
    const wrapper = wrapperRef.current
    const track   = trackRef.current
    if (!wrapper || !track || !itemsRef.current[0]) return

    const firstItem = itemsRef.current[0]
    const itemWidth = firstItem.offsetWidth
    if (itemWidth === 0) return // guard: not painted yet

    const computed   = getComputedStyle(track)
    const gap        = parseFloat(computed.gap) || 20
    const padLeft    = parseFloat(computed.paddingLeft) || 0
    const padRight   = parseFloat(computed.paddingRight) || 0
    const totalWidth =
      IMAGES.length * itemWidth +
      (IMAGES.length - 1) * gap +
      padLeft +
      padRight

    maxTranslateRef.current = Math.max(0, totalWidth - window.innerWidth)

    // KEY FIX: more generous scroll distance so sticky holds long enough
    const scrollDistance = maxTranslateRef.current + window.innerHeight * 1.2
    wrapper.style.height = `${scrollDistance}px`
    initializedRef.current = true
  }

  // ── Gallery update (runs every scroll frame) ─────────────────
  const updateGallery = () => {
    const wrapper = wrapperRef.current
    const track   = trackRef.current
    if (!wrapper || !track) return

    // Lazy re-init if dimensions were zero at mount time
    if (!initializedRef.current || maxTranslateRef.current === 0) {
      calculateLayout()
    }

    // Progress derived from wrapper's position in viewport
    const wrapperRect        = wrapper.getBoundingClientRect()
    const scrollableDistance = wrapper.offsetHeight - window.innerHeight
    const scrolled           = -wrapperRect.top
    const progress           = Math.max(0, Math.min(1, scrolled / Math.max(1, scrollableDistance)))

    if (Math.abs(progress - lastProgressRef.current) < 0.0001) return
    lastProgressRef.current = progress

    // Slide the track horizontally
    const translateX = -progress * maxTranslateRef.current
    track.style.transform = `translate3d(${translateX}px, 0, 0)`

    if (trackFillRef.current)
      trackFillRef.current.style.width = `${progress * 100}%`

    // Per-item 3-D curve
    const vpCenter  = window.innerWidth / 2
    let closestIdx  = 0
    let closestDist = Infinity

    itemsRef.current.forEach((item, i) => {
      if (!item) return
      const rect       = item.getBoundingClientRect()
      const itemCenter = rect.left + rect.width / 2
      const offset     = itemCenter - vpCenter
      const absOffset  = Math.abs(offset)

      if (absOffset < closestDist) {
        closestDist = absOffset
        closestIdx  = i
      }

      const radius     = window.innerWidth * 0.7
      const normalised = Math.min(1, absOffset / radius)
      const direction  = offset >= 0 ? 1 : -1
      const curvedDist = Math.pow(normalised, 1.4)

      const rotateY    = -direction * curvedDist * CURVE_ANGLE
      const translateZ = -curvedDist * CURVE_DEPTH
      const scale      = 1 - curvedDist * 0.06
      const opacity    = 1 - Math.pow(normalised, 2) * 0.45

      item.style.transform = `rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`
      item.style.opacity   = opacity

      item.classList.remove('cs-center', 'cs-near')
      const hw = rect.width * 0.5
      if      (absOffset < hw * 0.6) item.classList.add('cs-center')
      else if (absOffset < hw * 1.4) item.classList.add('cs-near')
    })

    if (counterCurRef.current)
      counterCurRef.current.textContent = String(closestIdx + 1).padStart(2, '0')
  }

  const onScroll = () => {
    if (rafIdRef.current !== null) return
    rafIdRef.current = requestAnimationFrame(() => {
      updateGallery()
      rafIdRef.current = null
    })
  }

  useEffect(() => {
    const wrapper = wrapperRef.current

    // IntersectionObserver: init as soon as carousel enters viewport
    let observer
    if (wrapper) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !initializedRef.current) {
            calculateLayout()
            updateGallery()
          }
        },
        { threshold: 0.01 }
      )
      observer.observe(wrapper)
    }

    // Belt-and-suspenders: also init after delays
    // (images may still be decoding at 300 ms; 1000 ms is the safety net)
    const t1 = setTimeout(() => { calculateLayout(); updateGallery() }, 300)
    const t2 = setTimeout(() => { calculateLayout(); updateGallery() }, 1000)

    let resizeTimer
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        initializedRef.current = false
        calculateLayout()
        updateGallery()
      }, 150)
    }

    const onLoad = () => { calculateLayout(); updateGallery() }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('load',   onLoad)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(resizeTimer)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      if (observer) observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load',   onLoad)
    }
  }, [])

  return (
    <>
      <style>{`
        /* ── Wrapper: position:relative lets sticky work inside it ── */
        .cs-wrapper {
          position: relative;
          /* height is set dynamically by calculateLayout() */
        }

        /* ── Sticky panel: this is what gets "screen-hijacked" ── */
        .cs-sticky {
          position: sticky;
          top: 0;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          perspective: 1800px;
          perspective-origin: 50% 50%;
          z-index: 10;
          background: var(--cs-bg);
        }

        /* ── Top progress bar ── */
        .cs-top-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 10;
          padding: 1.6rem 3.5rem;
          display: flex;
          align-items: center;
          gap: 1.2rem;
          pointer-events: none;
        }

        .cs-label {
          font-size: 0.6rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--cs-label-color, #555049);
          white-space: nowrap;
          font-family: var(--font-body);
        }

        .cs-track-line {
          flex: 1;
          max-width: 180px;
          height: 1px;
          background: var(--cs-track-line-bg, rgba(255,255,255,0.08));
          position: relative;
          overflow: hidden;
        }

        .cs-track-fill {
          height: 100%;
          background: var(--cs-track-fill-bg, #c4a265);
          width: 0%;
          will-change: width;
        }

        /* ── Image track ── */
        .cs-track {
          display: flex;
          gap: 2vw;
          padding: 0 8vw;
          will-change: transform;
          align-items: center;
          transform-style: preserve-3d;
        }

        /* ── Individual image cards ── */
        .cs-item {
          display: block;
          flex-shrink: 0;
          width: 48vw;
          height: 70vh;
          overflow: hidden;
          position: relative;
          will-change: transform, opacity;
          border-radius: 3px;
          transform-style: preserve-3d;
          transition: filter 0.5s ease;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
        }

        .cs-item img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          filter: var(--cs-img-filter-default, grayscale(100%) contrast(1.08) brightness(0.7));
          transform: scale(1.12);
          transition: filter 0.5s ease, transform 0.5s ease;
        }
        .cs-item.cs-near img {
          filter: var(--cs-img-filter-near, grayscale(100%) contrast(1.12) brightness(0.85));
          transform: scale(1.05);
        }
        .cs-item.cs-center img {
          filter: var(--cs-img-filter-center, grayscale(75%) contrast(1.08) brightness(0.95) sepia(6%));
          transform: scale(1);
        }

        .cs-item-shadow {
          position: absolute; inset: 0;
          box-shadow: inset 0 0 80px rgba(0,0,0,0.4);
          pointer-events: none;
          z-index: 1;
          border-radius: 3px;
        }

        .cs-item-index {
          position: absolute;
          bottom: 1.2rem; left: 1.2rem;
          font-size: 0.65rem;
          font-weight: 400;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.2);
          z-index: 2;
          transition: color 0.4s ease;
          font-family: var(--font-body);
        }
        .cs-item.cs-center .cs-item-index { color: rgba(255,255,255,0.45); }

        /* ── Slide counter ── */
        .cs-counter {
          position: absolute;
          bottom: 2rem; right: 3.5rem;
          z-index: 10;
          font-size: 0.7rem;
          color: var(--cs-counter-color, #555049);
          font-weight: 300;
          letter-spacing: 0.05em;
          display: flex;
          align-items: baseline;
          gap: 0.3rem;
          pointer-events: none;
          font-family: var(--font-body);
        }
        .cs-counter-current {
          color: var(--cs-counter-current-color, #e8e4de);
          font-weight: 500;
          font-size: 1.4rem;
          line-height: 1;
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .cs-item { width: 75vw; height: 52vh; }
          .cs-track { gap: 3vw; padding: 0 4vw; }
          .cs-top-bar { padding: 1.2rem 1.5rem; }
          .cs-counter { right: 1.5rem; }
        }
      `}</style>

      {/*
        STRUCTURE EXPLANATION:
        ┌─ cs-wrapper (position: relative, height set by JS) ──────────┐
        │  This tall div creates the scroll space that "hijacks"        │
        │  the page while the sticky panel stays locked.                │
        │                                                               │
        │  ┌─ cs-sticky (position: sticky, top: 0, height: 100vh) ──┐  │
        │  │  This stays fixed on screen as user scrolls through     │  │
        │  │  the wrapper's height. The image track slides left      │  │
        │  │  inside it based on scroll progress.                    │  │
        │  └──────────────────────────────────────────────────────── ┘  │
        └───────────────────────────────────────────────────────────────┘
      */}
      <div className="cs-wrapper" ref={wrapperRef}
        style={{
          '--cs-bg': isDayMode ? palette.bgPrimary : '#000000',
          '--cs-label-color': isDayMode ? palette.textMuted : '#555049',
          '--cs-track-line-bg': isDayMode ? palette.borderSoft : 'rgba(255,255,255,0.08)',
          '--cs-track-fill-bg': isDayMode ? palette.accentPrimary : '#c4a265',
          '--cs-counter-color': isDayMode ? palette.textMuted : '#555049',
          '--cs-counter-current-color': isDayMode ? palette.textPrimary : '#e8e4de',
          '--cs-img-filter-default': isDayMode ? 'grayscale(60%) contrast(1.02) brightness(0.9)' : 'grayscale(100%) contrast(1.08) brightness(0.7)',
          '--cs-img-filter-near': isDayMode ? 'grayscale(40%) contrast(1.04) brightness(1.0)' : 'grayscale(100%) contrast(1.12) brightness(0.85)',
          '--cs-img-filter-center': isDayMode ? 'grayscale(20%) contrast(1.02) brightness(1.05)' : 'grayscale(75%) contrast(1.08) brightness(0.95) sepia(6%)',
        }}
      >
        <div className="cs-sticky">          <div className="cs-top-bar">
            <span className="cs-label">Scroll Horizontally</span>
            <div className="cs-track-line">
              <div className="cs-track-fill" ref={trackFillRef} />
            </div>
          </div>

          <div className="cs-track" ref={trackRef}>
            {IMAGES.map((img, i) => (
              <a
                key={i}
                className="cs-item"
                ref={el => { itemsRef.current[i] = el }}
                href={img.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${img.alt}`}
                onClick={(event) => {
                  event.preventDefault()
                  openSite(img.href)
                }}
              >
                <img src={img.src} alt={img.alt} loading="lazy" />
                <div className="cs-item-shadow" />
                <span className="cs-item-index">{String(i + 1).padStart(2, '0')}</span>
              </a>
            ))}
          </div>

          <div className="cs-counter">
            <span className="cs-counter-current" ref={counterCurRef}>01</span>
            <span>/</span>
            <span>{String(IMAGES.length).padStart(2, '0')}</span>
          </div>

        </div>
      </div>
    </>
  )
}