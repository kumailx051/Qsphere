import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import Navbar from '../components/Navbar'

const ARR = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)



const OtpPage = () => {
  const canvasRef = useRef(null)
  const sceneRefs = useRef({})
  const navigate = useNavigate()
  const otpLength = 6

  const [otp, setOtp] = useState(() => Array(otpLength).fill(''))
  const [busy, setBusy] = useState(false)

  const otpHelper = useMemo(
    () => ({
      title: 'Secure Access Portal',
      subtitle: 'Enter the verification code sent to your email.'
    }),
    []
  )

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyBackground = document.body.style.background
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.background = '#030705'

    const cv = canvasRef.current
    if (!cv) return undefined

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#030705', 10, 50)

    const starsGeometry = (() => {
      const n = 2000
      const positions = new Float32Array(n * 3)
      for (let i = 0; i < n; i += 1) {
        const r = 70 + Math.random() * 40
        const t = Math.random() * Math.PI * 2
        const ph = Math.acos(2 * Math.random() - 1)
        positions[i * 3] = r * Math.sin(ph) * Math.cos(t)
        positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t) * 0.7
        positions[i * 3 + 2] = r * Math.cos(ph)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      return geometry
    })()

    scene.add(
      new THREE.Points(
        starsGeometry,
        new THREE.PointsMaterial({
          size: 0.12,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.5,
          color: '#aaffdd',
          depthWrite: false
        })
      )
    )

    const pGeo = new THREE.BufferGeometry()
    ;(() => {
      const n = 1100
      const positions = new Float32Array(n * 3)
      for (let i = 0; i < n; i += 1) {
        const r = 18 + Math.random() * 45
        const t = Math.random() * Math.PI * 2
        const ph = Math.acos(2 * Math.random() - 1)
        positions[i * 3] = r * Math.sin(ph) * Math.cos(t)
        positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t) * 0.55
        positions[i * 3 + 2] = r * Math.cos(ph)
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    })()

    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.07,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
        color: '#00e5a0',
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    )
    scene.add(particles)

    const rays = new THREE.Group()
    rays.position.set(0, 0, -12)
    for (let i = 0; i < 10; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? '#00e5a0' : i % 3 === 1 ? '#00b377' : '#00ff99',
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 70), material)
      mesh.rotation.z = (i / 10) * Math.PI * 2
      rays.add(mesh)
    }
    scene.add(rays)

    const orbData = [
      { p: [-7, 2, -3], c: '#00e5a0', r: 2.4, s: 0 },
      { p: [7, -2, -4], c: '#00b377', r: 2.8, s: 2 },
      { p: [0, 4, -7], c: '#00ff99', r: 2.0, s: 4 },
      { p: [-5, -3, 3], c: '#00cc88', r: 1.8, s: 1 },
      { p: [5, 3, 3], c: '#00e5a0', r: 1.5, s: 3 },
      { p: [2, -4, -2], c: '#009966', r: 2.2, s: 5 }
    ]

    const orbs = orbData.map((data) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.r, 32, 32),
        new THREE.MeshBasicMaterial({
          color: data.c,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      )
      mesh.position.set(...data.p)
      scene.add(mesh)
      return { mesh, base: [...data.p], seed: data.s }
    })

    const gridMaterial = new THREE.LineBasicMaterial({ color: '#00e5a0', transparent: true, opacity: 0.04 })
    for (let i = -5; i <= 5; i += 1) {
      const g1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-20, 0, i * 4),
        new THREE.Vector3(20, 0, i * 4)
      ])
      const g2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i * 4, 0, -20),
        new THREE.Vector3(i * 4, 0, 20)
      ])
      scene.add(new THREE.Line(g1, gridMaterial))
      scene.add(new THREE.Line(g2, gridMaterial))
    }

    scene.add(new THREE.AmbientLight('#001a0d', 0.3))
    const light1 = new THREE.PointLight('#00e5a0', 1.4, 25)
    light1.position.set(0, 2, 8)
    scene.add(light1)
    const light2 = new THREE.PointLight('#00b377', 0.5, 25)
    light2.position.set(0, 2, -8)
    scene.add(light2)
    const light3 = new THREE.PointLight('#00ff99', 0.4, 18)
    light3.position.set(7, -3, 2)
    scene.add(light3)
    const light4 = new THREE.PointLight('#009966', 0.4, 18)
    light4.position.set(-7, 3, -2)
    scene.add(light4)

    let mouseX = 0
    let mouseY = 0
    let curAngle = 0
    let targetAngle = 0
    let last = 0
    const cameraVector = new THREE.Vector3()

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 0, 7)

    const onMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1
      mouseY = -((event.clientY / window.innerHeight) * 2 - 1)
    }

    const onTouchMove = (event) => {
      const touch = event.touches[0]
      if (!touch) return
      mouseX = (touch.clientX / window.innerWidth) * 2 - 1
      mouseY = -((touch.clientY / window.innerHeight) * 2 - 1)
    }

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('resize', onResize)

    const animate = (now) => {
      sceneRefs.current.raf = requestAnimationFrame(animate)
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const time = now * 0.001

      particles.rotation.y += dt * 0.018
      particles.rotation.x += dt * 0.004
      rays.rotation.z += dt * 0.035

      orbs.forEach((orb) => {
        const seed = orb.seed
        orb.mesh.position.y = orb.base[1] + Math.sin(time * 0.45 + seed) * 0.6
        orb.mesh.position.x = orb.base[0] + Math.cos(time * 0.28 + seed) * 0.45
        orb.mesh.scale.setScalar(1 + Math.sin(time * 0.7 + seed) * 0.12)
      })

      targetAngle = 0
      curAngle += (targetAngle - curAngle) * Math.min(1, 0.045 * 60 * dt)

      const translateX = mouseY * 0.055
      const translateY = mouseX * 0.055
      const radius = 7

      cameraVector.set(
        Math.sin(curAngle) * radius + translateY * Math.cos(curAngle),
        translateX,
        Math.cos(curAngle) * radius - translateY * Math.sin(curAngle)
      )
      camera.position.lerp(cameraVector, 0.15)
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }

    sceneRefs.current.raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(sceneRefs.current.raf)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      starsGeometry.dispose()
      pGeo.dispose()
      document.documentElement.style.overflow = previousOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.background = previousBodyBackground
    }
  }, [])

  const handleVerify = async () => {
    const normalized = otp.join('')
    if (normalized.length !== otpLength) return

    setBusy(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setBusy(false)

    navigate('/onboarding', { state: { verified: true } })
  }

  const statusText = 'QSPHERE · Verification Node Active'

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#030705] text-white">
      <Navbar currentPage="auth" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --g: #00e5a0;
          --g2: #00b377;
          --g3: #00ff99;
          --bg: #030705;
          --card: rgba(4,18,10,0.88);
        }

        html, body {
          width: 100%;
          height: 100%;
          background: var(--bg);
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        #cv {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        #bd {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 15% 30%, rgba(0,229,160,0.12), transparent 55%),
            radial-gradient(ellipse at 85% 70%, rgba(0,180,120,0.09), transparent 55%),
            radial-gradient(ellipse at 50% 100%, rgba(0,120,80,0.12), transparent 60%);
        }

        #fw {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1600px;
          z-index: 10;
          pointer-events: auto;
        }

        #fl {
          position: relative;
          width: 460px;
          max-width: 92vw;
        }

        .card {
          position: relative;
          background: var(--card);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border: 1px solid rgba(0,229,160,0.15);
          border-radius: 20px;
          padding: 36px 32px 32px;
          color: #fff;
          box-shadow:
            0 0 0 1px rgba(0,229,160,0.05) inset,
            0 32px 80px -16px rgba(0,0,0,0.8),
            0 0 60px -10px rgba(0,229,160,0.15),
            0 0 120px -30px rgba(0,229,160,0.08);
        }

        .card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg,
            rgba(0,229,160,0.5),
            rgba(0,180,120,0.2) 40%,
            rgba(0,229,160,0.1) 80%,
            rgba(0,100,60,0.3) 100%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: .9;
        }

        .section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .28em;
          text-transform: uppercase;
          color: var(--g);
          font-family: 'DM Sans', sans-serif;
          margin-bottom: 18px;
          pointer-events: auto;
        }

        .section-label .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--g);
          box-shadow: 0 0 8px var(--g);
          flex-shrink: 0;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(0,229,160,0.25);
          border-radius: 999px;
          padding: 6px 14px 6px 8px;
          margin-bottom: 24px;
          background: rgba(0,229,160,0.04);
          pointer-events: auto;
        }

        .brand-icon {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid rgba(0,229,160,0.4);
          background: rgba(0,229,160,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 12px;
          color: var(--g);
        }

        .brand-text {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: .18em;
          color: #fff;
        }

        .h1 {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 30px;
          line-height: 1.1;
          color: #fff;
          margin-bottom: 6px;
          text-shadow: 0 0 40px rgba(0,229,160,0.2);
          pointer-events: auto;
        }

        .h1 span { color: var(--g); }

        .sub {
          font-size: 13px;
          color: rgba(255,255,255,.45);
          margin-bottom: 28px;
          font-weight: 300;
          line-height: 1.5;
          pointer-events: auto;
        }

        .fstack { display: flex; flex-direction: column; gap: 14px; }

        .fi { position: relative; pointer-events: auto; }

        .fi input {
          width: 100%;
          background: rgba(0,229,160,0.03);
          color: #fff;
          border: 1px solid rgba(0,229,160,0.12);
          border-radius: 10px;
          padding: 17px 44px 7px 14px;
          font-size: 14px;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .25s, box-shadow .25s, background .25s;
          box-shadow: inset 0 1px 0 rgba(0,229,160,0.04), inset 0 0 20px rgba(0,0,0,0.3);
        }

        .otp-input {
          color: #f6fff9 !important;
          -webkit-text-fill-color: #f6fff9 !important;
          caret-color: #00e5a0;
          opacity: 1 !important;
          text-shadow: 0 0 10px rgba(0,229,160,0.28);
          font-variant-numeric: tabular-nums;
        }

        .fi input:focus {
          border-color: rgba(0,229,160,0.5);
          background: rgba(0,229,160,0.05);
          box-shadow: 0 0 0 3px rgba(0,229,160,0.12), inset 0 0 24px rgba(0,229,160,0.06);
        }

        .fi label {
          position: absolute;
          left: 14px;
          top: 13px;
          font-size: 13px;
          color: rgba(255,255,255,.4);
          pointer-events: none;
          transition: all .2s ease;
          letter-spacing: .01em;
          font-family: 'DM Sans', sans-serif;
        }

        .fi input:focus + label,
        .fi input:not(:placeholder-shown) + label {
          top: 4px;
          font-size: 9px;
          color: var(--g);
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .fi .eye {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color .2s;
        }

        .fi .eye:hover { color: var(--g); }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 13px 18px;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: .04em;
          border-radius: 10px;
          color: #000;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          background: linear-gradient(135deg,var(--g) 0%, #00b377 100%);
          border: none;
          transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s, filter .2s;
          box-shadow: 0 8px 24px -6px rgba(0,229,160,0.5), 0 0 20px rgba(0,229,160,0.2);
          pointer-events: auto;
        }

        .btn:hover {
          transform: translateY(-1px) scale(1.01);
          filter: brightness(1.08);
          box-shadow: 0 12px 32px -6px rgba(0,229,160,0.65), 0 0 30px rgba(0,229,160,0.3);
        }

        .btn:active { transform: translateY(0) scale(.98); }

        .btn:disabled { opacity: .7; cursor: default; transform: none; }

        .ghost {
          color: var(--g);
          font-weight: 500;
          cursor: pointer;
          background: none;
          border: none;
          font-size: inherit;
          font-family: 'DM Sans', sans-serif;
          padding: 0;
          transition: text-shadow .2s, opacity .2s;
          opacity: .9;
          pointer-events: auto;
        }

        .ghost:hover { opacity: 1; text-shadow: 0 0 12px var(--g); }

        .row { display: flex; align-items: center; }

        @keyframes spin { to { transform: rotate(360deg); } }

        .spin {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          border: 2px solid rgba(0,0,0,.25);
          border-top-color: #000;
          animation: spin .8s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }

        #status {
          position: fixed;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 999px;
          border: 1px solid rgba(0,229,160,0.2);
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(20px);
          font-size: 10px;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: rgba(255,255,255,.55);
          pointer-events: none;
          z-index: 22;
          white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }

        .sdot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--g);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--g); }
          50% { opacity: .5; box-shadow: 0 0 4px var(--g); }
        }

        #foot {
          position: fixed;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          letter-spacing: .3em;
          text-transform: uppercase;
          color: rgba(255,255,255,.2);
          pointer-events: none;
          z-index: 22;
          white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }

        @media (max-width: 768px) {
          #fw { padding: 24px 14px; }
          .card { padding: 28px 22px 24px; }
          .h1 { font-size: 24px; }
          .sub { font-size: 12px; }
        }
      `}</style>

      <canvas ref={canvasRef} id="cv" aria-hidden="true" />
      <div id="bd" aria-hidden="true" />

      <div id="fw">
        <div id="fl">
          <div className="card">
            <div className="brand">
              <div className="brand-icon">Q</div>
              <div>
                <div className="brand-text">QSPHERE</div>
              </div>
            </div>

            <div className="section-label"><span className="dot" />{otpHelper.title}</div>

            <div className="h1">Verify your <span>Quantum</span><br />access.</div>
            <p className="sub">{otpHelper.subtitle}</p>

              <div className="fstack">
              <div className="fi">
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                  }}
                >
                  {Array.from({ length: otpLength }).map((_, idx) => {
                    const val = otp[idx] ?? ''
                    return (
                      <input
                        key={idx}
                        className="otp-input"
                        type="text"
                        inputMode="numeric"
                        aria-label={`OTP digit ${idx + 1}`}
                        value={val}
                        onChange={(e) => {
                          const digit = e.target.value.replace(/\D/g, '').slice(-1)
                          setOtp((prev) => {
                            const next = [...prev]
                            next[idx] = digit
                            return next
                          })
                          if (digit && idx < otpLength - 1) {
                            const el = e.currentTarget.parentElement?.querySelectorAll('input')?.[idx + 1]
                            if (el) el.focus()
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace') {
                            e.preventDefault()
                            setOtp((prev) => {
                              const next = [...prev]
                              if (next[idx]) {
                                next[idx] = ''
                                return next
                              }
                              if (idx > 0) {
                                next[idx - 1] = ''
                              }
                              return next
                            })
                            if (!val && idx > 0) {
                              const el = e.currentTarget.parentElement?.querySelectorAll('input')?.[idx - 1]
                              if (el) el.focus()
                            }
                          }
                          if (e.key === 'ArrowLeft') {
                            const el = e.currentTarget.parentElement?.querySelectorAll('input')?.[idx - 1]
                            if (el) el.focus()
                          }
                          if (e.key === 'ArrowRight') {
                            const el = e.currentTarget.parentElement?.querySelectorAll('input')?.[idx + 1]
                            if (el) el.focus()
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault()
                          const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, otpLength)
                          if (pasted) {
                            setOtp((prev) => {
                              const next = [...prev]
                              for (let i = 0; i < pasted.length; i++) {
                                if (idx + i < otpLength) {
                                  next[idx + i] = pasted[i]
                                }
                              }
                              return next
                            })
                            const focusIdx = Math.min(idx + pasted.length, otpLength - 1)
                            const el = e.currentTarget.parentElement?.querySelectorAll('input')?.[focusIdx]
                            if (el) el.focus()
                          }
                        }}
                        tabIndex={0}
                        style={{
                          zIndex: 40,
                          position: 'relative',
                          pointerEvents: 'auto',
                          width: 50,
                          height: 52,
                          padding: 0,
                          borderRadius: 12,
                          border: '1px solid rgba(0,229,160,0.12)',
                          background: 'rgba(0,229,160,0.03)',
                          color: '#fff',
                          WebkitTextFillColor: '#ffffff',
                          caretColor: '#00e5a0',
                          textAlign: 'center',
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 700,
                          fontSize: 18,
                          outline: 'none',
                          boxShadow: 'inset 0 1px 0 rgba(0,229,160,0.04), inset 0 0 20px rgba(0,0,0,0.3)',
                        }}
                      />
                    )
                  })}
                </div>

                <div style={{ marginTop: 8, textAlign: 'center', color: 'rgba(255,255,255,.45)', fontSize: 12 }}>
                  Enter {otpLength}-digit verification code
                </div>
              </div>

              <button className="btn" type="button" disabled={busy || otp.join('').length !== otpLength} onClick={handleVerify}>

                <span className="row" style={{ gap: 8 }}>
                  {busy ? <span className="spin" /> : 'Verify'}
                  {!busy && ARR}
                </span>
              </button>

              <div style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,.5)' }}>
                Didn’t receive it?{' '}
                <button
                  className="ghost"
                  type="button"
                  style={{ fontWeight: 600 }}
                  onClick={() => alert('Resend OTP (demo)')}
                >
                  Resend
                </button>
              </div>

              <div style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,.5)' }}>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => navigate('/auth')}
                  style={{ fontWeight: 600 }}
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="status">
        <div className="sdot" />
        <span>{statusText}</span>
      </div>

      <div id="foot">Tilt your cursor to explore the quantum field</div>
    </div>
  )
}

export default OtpPage

