/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react'
import { galleryImages } from '../mock'

// ── Grid configuration ──────────────────────────────────────
const CARD_W = 250
const CARD_H = 330
const GAP_X = 60
const GAP_Y = 60
const ROTATION_DEG = -12

// Cell dimensions
const CELL_W = CARD_W + GAP_X
const CELL_H = CARD_H + GAP_Y

// How many columns/rows in a single repeating tile
// Needs to be big enough to cover the rotated viewport
const TILE_COLS = 8
const TILE_ROWS = 7

// Stagger for brickwork: every odd row is offset by half a cell
const STAGGER = CELL_W * 0.5

// Full tile extent in px
const TILE_W = TILE_COLS * CELL_W
const TILE_H = TILE_ROWS * CELL_H

// Positive modulo
const mod = (a, n) => ((a % n) + n) % n

// Pre-build slot data for one tile
const SLOTS = []
let _imgIdx = 0
for (let r = 0; r < TILE_ROWS; r++) {
  for (let c = 0; c < TILE_COLS; c++) {
    SLOTS.push({
      bx: c * CELL_W + (r % 2 === 1 ? STAGGER : 0),
      by: r * CELL_H,
      img: _imgIdx % galleryImages.length,
    })
    _imgIdx++
  }
}

const InfiniteGallery = ({ scale = 1 }) => {
  const rootRef = useRef(null)
  const innerRef = useRef(null)
  const cardRefs = useRef([])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const state = {
      targetX: 0,
      targetY: 0,
      curX: 0,
      curY: 0,
      velX: 0,
      velY: 0,
      isDragging: false,
      lastDragX: 0,
      lastDragY: 0,
      lastTime: 0,
      idleT: 0,
    }

    // ── Pointer / touch handlers ──
    const onPointerDown = (e) => {
      state.isDragging = true
      state.lastDragX = e.clientX
      state.lastDragY = e.clientY
      state.lastTime = performance.now()
      state.velX = 0
      state.velY = 0
      root.style.cursor = 'grabbing'
    }
    const onPointerMove = (e) => {
      if (!state.isDragging) return
      const dx = e.clientX - state.lastDragX
      const dy = e.clientY - state.lastDragY
      state.targetX += dx
      state.targetY += dy
      const now = performance.now()
      const dt = Math.max(1, now - state.lastTime)
      state.velX = (dx / dt) * 16
      state.velY = (dy / dt) * 16
      state.lastDragX = e.clientX
      state.lastDragY = e.clientY
      state.lastTime = now
    }
    const onPointerUp = () => {
      if (!state.isDragging) return
      state.isDragging = false
      root.style.cursor = 'grab'
    }

    root.addEventListener('mousedown', onPointerDown)
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup', onPointerUp)

    const onTouchStart = (e) => {
      const t = e.touches[0]
      onPointerDown({ clientX: t.clientX, clientY: t.clientY })
    }
    const onTouchMove = (e) => {
      const t = e.touches[0]
      onPointerMove({ clientX: t.clientX, clientY: t.clientY })
    }
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onPointerUp)

    // ── Animation loop ──
    let raf
    const tick = () => {
      // Momentum when not dragging
      if (!state.isDragging) {
        state.targetX += state.velX
        state.targetY += state.velY
        state.velX *= 0.94
        state.velY *= 0.94
        if (Math.abs(state.velX) < 0.01) state.velX = 0
        if (Math.abs(state.velY) < 0.01) state.velY = 0

        // Gentle idle drift so the gallery feels alive
        state.idleT += 0.003
        state.targetX += Math.cos(state.idleT) * 0.12
        state.targetY += Math.sin(state.idleT * 0.7) * 0.08
      }

      // Smooth interpolation
      state.curX += (state.targetX - state.curX) * 0.08
      state.curY += (state.targetY - state.curY) * 0.08

      // Center exclusion zone — cards inside this ellipse are fully hidden
      // Sized generously to fully cover the "QSphere" title + breathing room
      const EXCL_RX = 700  // horizontal radius — wide enough for full text + padding
      const EXCL_RY = 300  // vertical radius
      const FADE_BAND = 0.3 // normalized fade range outside the ellipse

      // Move each card, wrapping around the tile
      for (let i = 0; i < SLOTS.length; i++) {
        const el = cardRefs.current[i]
        if (!el) continue
        const s = SLOTS[i]

        const px = mod(s.bx + state.curX, TILE_W) - TILE_W / 2
        const py = mod(s.by + state.curY, TILE_H) - TILE_H / 2

        // Normalized elliptical distance from center (1.0 = on the ellipse edge)
        const nx = px / EXCL_RX
        const ny = py / EXCL_RY
        const dist = Math.sqrt(nx * nx + ny * ny)

        // dist < 1 → fully hidden (0), dist 1→1+FADE_BAND → fade in, dist > 1+FADE_BAND → fully visible (1)
        const cardOpacity = dist < 1 ? 0 : Math.min(1, (dist - 1) / FADE_BAND)

        el.style.transform = `translate3d(${px}px, ${py}px, 0)`
        el.style.opacity = cardOpacity
      }

      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
      root.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onPointerUp)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{ cursor: 'grab', touchAction: 'none' }}
    >
      {/* Grid wrapper — centered and rotated */}
      <div
        ref={innerRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          transform: `scale(${scale}) rotate(${ROTATION_DEG}deg)`,
          transformOrigin: 'center center',
          transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {SLOTS.map((slot, i) => {
          const url = galleryImages[slot.img]
          return (
            <div
              key={i}
              ref={(el) => (cardRefs.current[i] = el)}
              className="absolute group"
              style={{
                width: CARD_W,
                height: CARD_H,
                marginLeft: -CARD_W / 2,
                marginTop: -CARD_H / 2,
                willChange: 'transform',
              }}
            >
              <div
                className="w-full h-full overflow-hidden"
                style={{
                  borderRadius: 20,
                  background: '#fff',
                  padding: 10,
                  boxShadow: 'none',
                }}
              >
                <div
                  className="w-full h-full overflow-hidden"
                  style={{ borderRadius: 12 }}
                >
                  <img
                    src={url}
                    alt=""
                    draggable={false}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    style={{ display: 'block' }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default InfiniteGallery
