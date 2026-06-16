import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Cyclic gradient: emerald -> teal -> cyan -> sky blue -> back to emerald
// (matches the green/teal "quantum" branding used across the site)
const GRADIENT_STOPS = ['#10b981', '#14b8a6', '#22d3ee', '#38bdf8', '#10b981'].map(
  (hex) => new THREE.Color(hex),
)

const sampleGradient = (t) => {
  const wrapped = ((t % 1) + 1) % 1
  const segments = GRADIENT_STOPS.length - 1
  const scaled = wrapped * segments
  const index = Math.min(Math.floor(scaled), segments - 1)
  const frac = scaled - index
  return GRADIENT_STOPS[index].clone().lerp(GRADIENT_STOPS[index + 1], frac)
}

const smoothstep = (t) => {
  const v = Math.min(1, Math.max(0, t))
  return v * v * (3 - 2 * v)
}

// A near-spherical shell of particles, colored by their angular position so the
// whole sphere reads as a smooth, rotating colour gradient. This is the only
// structure forming the ring/sphere around the label - there are no separate
// fixed "stream" rings, so nothing reads as a static line. The whole shell
// rotates as one body, which is what makes the particles look like they're
// orbiting the label.
const buildShell = (count, radius, jitter) => {
  const home = new Float32Array(count * 3)
  const scatterIn = new Float32Array(count * 3)
  const scatterOut = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenAngle * i

    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY
    const shellRadius = radius + (Math.random() - 0.5) * jitter

    const hx = x * shellRadius
    const hy = y * shellRadius
    const hz = z * shellRadius

    home[i * 3] = hx
    home[i * 3 + 1] = hy
    home[i * 3 + 2] = hz

    // Random scattered position for entry
    scatterIn[i * 3] = (Math.random() - 0.5) * 120
    scatterIn[i * 3 + 1] = (Math.random() - 0.5) * 120
    scatterIn[i * 3 + 2] = (Math.random() - 0.5) * 60

    // Random scattered position for exit
    scatterOut[i * 3] = (Math.random() - 0.5) * 120
    scatterOut[i * 3 + 1] = (Math.random() - 0.5) * 120
    scatterOut[i * 3 + 2] = (Math.random() - 0.5) * 60

    const angle = Math.atan2(y, x)
    const t = (angle + Math.PI) / (Math.PI * 2)
    const color = sampleGradient(t)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    scales[i] = 0.3 + Math.random() * 0.75
  }

  return { home, scatterIn, scatterOut, colors, scales }
}

// Sparse dust scattered through a larger volume around the sphere.
const buildAmbient = (count, minRadius, maxRadius) => {
  const home = new Float32Array(count * 3)
  const scatterIn = new Float32Array(count * 3)
  const scatterOut = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const scales = new Float32Array(count)

  for (let i = 0; i < count; i += 1) {
    const radius = minRadius + Math.random() * (maxRadius - minRadius)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    const hx = radius * Math.sin(phi) * Math.cos(theta)
    const hy = radius * Math.sin(phi) * Math.sin(theta)
    const hz = radius * Math.cos(phi)

    home[i * 3] = hx
    home[i * 3 + 1] = hy
    home[i * 3 + 2] = hz

    scatterIn[i * 3] = (Math.random() - 0.5) * 120
    scatterIn[i * 3 + 1] = (Math.random() - 0.5) * 120
    scatterIn[i * 3 + 2] = (Math.random() - 0.5) * 60

    scatterOut[i * 3] = (Math.random() - 0.5) * 120
    scatterOut[i * 3 + 1] = (Math.random() - 0.5) * 120
    scatterOut[i * 3 + 2] = (Math.random() - 0.5) * 60

    const color = sampleGradient(Math.random()).lerp(new THREE.Color('#ffffff'), 0.55)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    scales[i] = 0.25 + Math.random() * 0.5
  }

  return { home, scatterIn, scatterOut, colors, scales }
}

const createParticleMaterial = (sizeMultiplier, opacityMultiplier) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: sizeMultiplier },
      uOpacity: { value: opacityMultiplier },
      uWobble: { value: 1.0 },
    },
    vertexShader: `
      attribute float aScale;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uSize;
      uniform float uWobble;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 pos = position;
        float wobble = sin(uTime * 0.9 + position.x * 2.2 + position.y * 1.7) * 0.045 * uWobble;
        pos += normalize(position + vec3(0.0001)) * wobble;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (uSize * aScale * 60.0) / -mvPosition.z;

        vColor = aColor;
        vAlpha = 0.55 + aScale * 0.35;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        float core = smoothstep(0.5, 0.0, dist);
        float glow = pow(core, 1.8);
        gl_FragColor = vec4(vColor, glow * vAlpha * uOpacity);
      }
    `,
  })

const buildPointCloud = (data, material) => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data.home.slice(), 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3))
  geometry.setAttribute('aScale', new THREE.BufferAttribute(data.scales, 1))
  return { geometry, points: new THREE.Points(geometry, material), data }
}

const lerp3 = (out, a, b, t, offset) => {
  out[offset] = a[offset] + (b[offset] - a[offset]) * t
  out[offset + 1] = a[offset + 1] + (b[offset + 1] - a[offset + 1]) * t
  out[offset + 2] = a[offset + 2] + (b[offset + 2] - a[offset + 2]) * t
}

export const QOrbitalSphere = ({ className = '' }) => {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current

    if (!host || !canvas) return undefined

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
    camera.position.set(0, 0, 6.4)

    const root = new THREE.Group()
    scene.add(root)

    // --- Particle layers -------------------------------------------------
    const shellData = buildShell(3600, 1.7, 0.14)
    const ambientData = buildAmbient(900, 3.9, 2.2)

    const shellMaterial = createParticleMaterial(1.3, 1.0)
    const ambientMaterial = createParticleMaterial(0.8, 0.7)

    const shell = buildPointCloud(shellData, shellMaterial)
    const ambient = buildPointCloud(ambientData, ambientMaterial)

    root.add(shell.points)
    root.add(ambient.points)

    const particleSets = [shell, ambient]
    const particleMaterials = [shellMaterial, ambientMaterial]

    // --- Shell collisions ----------------------------------------------------
    // Each shell particle is pulled back toward its original resting spot on
    // the sphere (so the overall shape stays intact) but pushed away from any
    // other shell particle it gets too close to. That push is what makes
    // particles visibly bump into each other and drift off their resting
    // positions, then settle back.
    //
    // A uniform spatial hash keeps the neighbour search cheap - each particle
    // only checks the handful of others sharing its cell (or an adjacent one)
    // instead of comparing against all ~3600 others every frame.
    const shellPositionAttribute = shell.geometry.attributes.position
    const shellPositions = shellPositionAttribute.array
    const shellCount = shellPositions.length / 3
    const shellHome = shellData.home.slice()
    const shellVelocities = new Float32Array(shellPositions.length)

    shellPositionAttribute.setUsage(THREE.DynamicDrawUsage)

    const COLLISION_RADIUS = 0.075 // how close particles must get to push apart
    const COLLISION_RADIUS_SQ = COLLISION_RADIUS * COLLISION_RADIUS
    const CELL_SIZE = COLLISION_RADIUS * 2 // grid cell size, keep >= 2x radius
    const REPULSION_STRENGTH = 5 // how hard particles push apart on contact
    const SPRING_STRENGTH = 1.2 // how strongly they're pulled back to "home"
    const DAMPING = 0.92 // how quickly the jostling settles down
    const GRID_OFFSET = 64 // keeps cell ids positive for the hash below

    const cellId = (cx, cy, cz) =>
      (cx + GRID_OFFSET) * 65536 + (cy + GRID_OFFSET) * 256 + (cz + GRID_OFFSET)

    const collisionGrid = new Map()

    const updateShellCollisions = (dt) => {
      if (dt <= 0) return

      collisionGrid.clear()

      for (let i = 0; i < shellCount; i += 1) {
        const ix = i * 3
        const cx = Math.floor(shellPositions[ix] / CELL_SIZE)
        const cy = Math.floor(shellPositions[ix + 1] / CELL_SIZE)
        const cz = Math.floor(shellPositions[ix + 2] / CELL_SIZE)
        const id = cellId(cx, cy, cz)
        let bucket = collisionGrid.get(id)
        if (!bucket) {
          bucket = []
          collisionGrid.set(id, bucket)
        }
        bucket.push(i)
      }

      for (let i = 0; i < shellCount; i += 1) {
        const ix = i * 3
        const px = shellPositions[ix]
        const py = shellPositions[ix + 1]
        const pz = shellPositions[ix + 2]

        let ax = (shellHome[ix] - px) * SPRING_STRENGTH
        let ay = (shellHome[ix + 1] - py) * SPRING_STRENGTH
        let az = (shellHome[ix + 2] - pz) * SPRING_STRENGTH

        const cx = Math.floor(px / CELL_SIZE)
        const cy = Math.floor(py / CELL_SIZE)
        const cz = Math.floor(pz / CELL_SIZE)

        for (let ox = -1; ox <= 1; ox += 1) {
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let oz = -1; oz <= 1; oz += 1) {
              const bucket = collisionGrid.get(cellId(cx + ox, cy + oy, cz + oz))
              if (!bucket) continue

              for (let b = 0; b < bucket.length; b += 1) {
                const j = bucket[b]
                if (j === i) continue

                const jx = j * 3
                const dx = px - shellPositions[jx]
                const dy = py - shellPositions[jx + 1]
                const dz = pz - shellPositions[jx + 2]
                const distSq = dx * dx + dy * dy + dz * dz

                if (distSq > 1e-8 && distSq < COLLISION_RADIUS_SQ) {
                  const dist = Math.sqrt(distSq)
                  const push = ((COLLISION_RADIUS - dist) / dist) * REPULSION_STRENGTH
                  ax += dx * push
                  ay += dy * push
                  az += dz * push
                }
              }
            }
          }
        }

        shellVelocities[ix] = (shellVelocities[ix] + ax * dt) * DAMPING
        shellVelocities[ix + 1] = (shellVelocities[ix + 1] + ay * dt) * DAMPING
        shellVelocities[ix + 2] = (shellVelocities[ix + 2] + az * dt) * DAMPING
      }

      for (let i = 0; i < shellPositions.length; i += 1) {
        shellPositions[i] += shellVelocities[i] * dt
      }

      shellPositionAttribute.needsUpdate = true
    }

    // --- Sizing & lifecycle -------------------------------------------------
    let raf = 0
    let lastTime = 0

    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)

    const animate = (time) => {
      raf = window.requestAnimationFrame(animate)
      const t = time * 0.001
      const dt = lastTime === 0 ? 0 : Math.min(Math.max(t - lastTime, 0), 1 / 30)
      lastTime = t

      // Read scroll progress from parent container
      const raw = parseFloat(host?.parentElement?.dataset?.qsphereProgress || '0')
      const p = Math.min(1, Math.max(0, raw))

      // Animation phases:
      // 0.0 - 0.5: particles gather from scattered positions to form sphere
      // 0.5 - 1.0: particles scatter out to different positions
      const enterPhase = p <= 0.5 ? smoothstep(p / 0.5) : 1
      const exitPhase = p > 0.5 ? smoothstep((p - 0.5) / 0.5) : 0

      const transitionWobble = p <= 0.5 ? 1 + (1 - enterPhase) * 3 : 1 + exitPhase * 3

      particleMaterials.forEach((mat) => {
        mat.uniforms.uTime.value = t
        mat.uniforms.uWobble.value = transitionWobble
        const fade = p <= 0.5 ? enterPhase : 1 - exitPhase
        mat.uniforms.uOpacity.value = fade * 1.0  // Full opacity
      })

      // Update particle positions based on scroll progress
      particleSets.forEach(({ geometry, data: d }) => {
        const posAttr = geometry.attributes.position
        const array = posAttr.array
        const count = array.length / 3

        for (let i = 0; i < count; i++) {
          const offset = i * 3
          if (p <= 0.5) {
            const ease = smoothstep(enterPhase)
            lerp3(array, d.scatterIn, d.home, ease, offset)
          } else {
            const ease = smoothstep(exitPhase)
            lerp3(array, d.home, d.scatterOut, ease, offset)
          }
        }

        posAttr.needsUpdate = true
      })

      // Rotation only active when sphere is formed
      let orbitSpin = 0
      const center = p > 0.25 && p < 0.75
      if (center) {
        orbitSpin = t * 0.18
      } else if (p <= 0.5) {
        orbitSpin = t * 0.18 * enterPhase
      } else {
        orbitSpin = t * 0.18 * (1 - exitPhase)
      }

      const sinTilt = Math.sin(t * 0.3) * 0.12
      const cosTilt = Math.cos(t * 0.22) * 0.06

      root.rotation.y = orbitSpin
      root.rotation.x = sinTilt
      root.rotation.z = cosTilt

      // Only update collisions when sphere is mostly formed
      if (p > 0.2 && p < 0.8) {
        updateShellCollisions(dt)
      }

      renderer.render(scene, camera)
    }

    raf = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(raf)
      resizeObserver.disconnect()

      root.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })

      renderer.dispose()
    }
  }, [])

  return (
    <div ref={hostRef} className={`relative ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}

export default QOrbitalSphere
