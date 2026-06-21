import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import * as THREE from 'three'
import Navbar from '../components/Navbar'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'
import aboutDayVideo from '../assets/aboutDay.mp4'
import aboutDarkVideo from '../assets/about.mp4'
import contactDayVideo from '../assets/contactDay.mp4'
import contactDarkVideo from '../assets/contact.mp4'

const ARR = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const EYE_OPEN = (
  <>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </>
)

const EYE_CLOSED = (
  <>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </>
)

const OTP_FLOW_KEY = 'qsphere_otp_flow'
const OTP_FLOW_VERIFY_EMAIL = 'verify-email'
const OTP_FLOW_RESET_PASSWORD = 'reset-password'

const STAGE = {
  IDLE: 'idle',
  FOLDING_IN: 'folding-in',
  FLIPPING: 'flipping',
  FOLDING_OUT: 'folding-out',
}
const T_FOLD = 550
const T_FLIP = 700

const AuthPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const canvasRef = useRef(null)
  const formWrapRef = useRef(null)
  const loginFaceRef = useRef(null)
  const registerFaceRef = useRef(null)
  const modeRef = useRef('login')
  const sceneRefs = useRef({})

  const [mode, setMode] = useState('login')
  const [loginView, setLoginView] = useState('sign-in')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)
  const [registerBusy, setRegisterBusy] = useState(false)
  const [pageMessage, setPageMessage] = useState(() => location.state?.authMessage || '')
  const [pageMessageType, setPageMessageType] = useState(() => location.state?.authMessageType || 'info')
  const [loginErrors, setLoginErrors] = useState({})
  const [registerErrors, setRegisterErrors] = useState({})
  const [loginFormError, setLoginFormError] = useState('')

  // Input States
  const [lEmail, setLEmail] = useState(() => location.state?.emailAddress || '')
  const [lPass, setLPass] = useState('')
  const [rName, setRName] = useState('')
  const [rEmail, setREmail] = useState('')
  const [rPass, setRPass] = useState('')
  const [rCfm, setRCfm] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [stage, setStage] = useState(STAGE.IDLE)
  const panelVideoRef = useRef(null)
  const panelRef = useRef(null)
  const timers = useRef([])
  const videoFolded = stage === STAGE.FOLDING_IN || stage === STAGE.FLIPPING
  const formCentered = stage === STAGE.FOLDING_IN || stage === STAGE.FLIPPING
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyBackground = document.body.style.background
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.background = palette.bgPrimary

    const cv = canvasRef.current
    if (!cv) return undefined

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(palette.bgPrimary, 10, 50)

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 0, 7)

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
          color: isDayMode ? '#8bcfb1' : '#aaffdd',
          depthWrite: false,
        }),
      ),
    )

    const pGeo = new THREE.BufferGeometry()
      ; (() => {
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
        color: palette.accentPrimary,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    scene.add(particles)

    const rays = new THREE.Group()
    rays.position.set(0, 0, -12)
    for (let i = 0; i < 10; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? palette.accentPrimary : i % 3 === 1 ? palette.accentDark : palette.accentLight,
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 70), material)
      mesh.rotation.z = (i / 10) * Math.PI * 2
      rays.add(mesh)
    }
    scene.add(rays)

    const orbData = [
      { p: [-7, 2, -3], c: palette.accentPrimary, r: 2.4, s: 0 },
      { p: [7, -2, -4], c: palette.accentDark, r: 2.8, s: 2 },
      { p: [0, 4, -7], c: palette.accentLight, r: 2.0, s: 4 },
      { p: [-5, -3, 3], c: palette.accentDark, r: 1.8, s: 1 },
      { p: [5, 3, 3], c: palette.accentPrimary, r: 1.5, s: 3 },
      { p: [2, -4, -2], c: palette.accentDark, r: 2.2, s: 5 },
    ]

    const orbs = orbData.map((data) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.r, 32, 32),
        new THREE.MeshBasicMaterial({
          color: data.c,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      mesh.position.set(...data.p)
      scene.add(mesh)
      return { mesh, base: [...data.p], seed: data.s }
    })

    const gridMaterial = new THREE.LineBasicMaterial({ color: palette.accentPrimary, transparent: true, opacity: isDayMode ? 0.03 : 0.04 })
    for (let i = -5; i <= 5; i += 1) {
      const g1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-20, 0, i * 4), new THREE.Vector3(20, 0, i * 4)])
      const g2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i * 4, 0, -20), new THREE.Vector3(i * 4, 0, 20)])
      scene.add(new THREE.Line(g1, gridMaterial))
      scene.add(new THREE.Line(g2, gridMaterial))
    }

    scene.add(new THREE.AmbientLight(isDayMode ? '#f3efe5' : '#001a0d', isDayMode ? 0.7 : 0.3))
    const light1 = new THREE.PointLight(palette.accentPrimary, 1.4, 25)
    light1.position.set(0, 2, 8)
    scene.add(light1)
    const light2 = new THREE.PointLight(palette.accentDark, 0.5, 25)
    light2.position.set(0, 2, -8)
    scene.add(light2)
    const light3 = new THREE.PointLight(palette.accentLight, 0.4, 18)
    light3.position.set(7, -3, 2)
    scene.add(light3)
    const light4 = new THREE.PointLight(palette.accentDark, 0.4, 18)
    light4.position.set(-7, 3, -2)
    scene.add(light4)

    let mouseX = 0
    let mouseY = 0
    let curAngle = 0
    let targetAngle = 0
    let last = 0
    const cameraVector = new THREE.Vector3()

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
      const animationFrame = requestAnimationFrame(animate)
      sceneRefs.current.raf = animationFrame
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

      const currentMode = modeRef.current
      const loginTarget = currentMode === 'login' ? 1.4 : 0.4
      const registerTarget = currentMode === 'register' ? 1.4 : 0.4
      light1.intensity += (loginTarget - light1.intensity) * 0.04
      light2.intensity += (registerTarget - light2.intensity) * 0.04

      targetAngle = currentMode === 'login' ? 0 : Math.PI
      curAngle += (targetAngle - curAngle) * Math.min(1, 0.045 * 60 * dt)

      const translateX = mouseY * 0.055
      const translateY = mouseX * 0.055
      const radius = 7
      cameraVector.set(
        Math.sin(curAngle) * radius + translateY * Math.cos(curAngle),
        translateX,
        Math.cos(curAngle) * radius - translateY * Math.sin(curAngle),
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
  }, [isDayMode, palette.accentDark, palette.accentLight, palette.accentPrimary, palette.bgPrimary])

  useEffect(() => {
    if (stage !== STAGE.FOLDING_IN && stage !== STAGE.FLIPPING && panelVideoRef.current) {
      panelVideoRef.current.load()
      panelVideoRef.current.play().catch(() => { })
    }
  }, [stage, theme])

  useEffect(() => {
    if (!loginFaceRef.current || !registerFaceRef.current) return

    const loginFace = loginFaceRef.current
    const registerFace = registerFaceRef.current

    if (mode === 'register') {
      loginFace.style.pointerEvents = 'none'
      registerFace.style.pointerEvents = 'auto'
    } else {
      registerFace.style.pointerEvents = 'none'
      loginFace.style.pointerEvents = 'auto'
    }
  }, [mode])

  const showInlineMessage = (message, type = 'info') => {
    setPageMessage(message)
    setPageMessageType(type)
  }

  const setOtpFlow = (flow, emailAddress) => {
    localStorage.setItem('qsphere_email_to_verify', emailAddress)
    localStorage.setItem(OTP_FLOW_KEY, flow)
  }

  const clearOtpFlow = () => {
    localStorage.removeItem(OTP_FLOW_KEY)
  }

  const getMissingFieldMessage = () => 'Fill this field'

  const applyRequiredFieldErrors = (fields, message) => {
    const nextErrors = {}

    fields.forEach((field) => {
      nextErrors[field] = getMissingFieldMessage()
    })

    if (mode === 'login') {
      setLoginErrors(nextErrors)
      setLoginFormError(message || 'Please fill in the highlighted fields.')
    } else {
      setRegisterErrors(nextErrors)
      showInlineMessage(message || 'Please fill in the highlighted fields.', 'error')
    }
  }

  const handleLogin = async () => {
    const emailAddress = lEmail.trim()
    const password = lPass.trim()

    const nextErrors = {
      email: emailAddress ? '' : getMissingFieldMessage(),
      password: password ? '' : getMissingFieldMessage(),
    }

    setLoginErrors(nextErrors)
    setRegisterErrors({})
    setLoginFormError('')

    if (nextErrors.email || nextErrors.password) {
      setLoginFormError('Please fill in the highlighted fields.')
      return
    }

    setLoginBusy(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAddress, password })
      })

      const result = await response.json()
      if (!response.ok) {
        if (response.status === 403 && result.needsVerification) {
          setOtpFlow(OTP_FLOW_VERIFY_EMAIL, result.emailAddress || emailAddress)
          showInlineMessage(result.error || 'Your email is not verified yet. Redirecting to OTP verification.', 'error')
          navigate('/otp')
          return
        }

        if (response.status === 400 && /emailAddress and password are required/i.test(result.error || '')) {
          applyRequiredFieldErrors(['email', 'password'], result.error)
          return
        }

        throw new Error(result.error || 'Invalid email address or password.')
      }

      const { user } = result
      if (!user.isVerified) {
        setOtpFlow(OTP_FLOW_VERIFY_EMAIL, user.emailAddress)
        showInlineMessage('Your email is not verified yet. Redirecting to OTP verification.', 'success')
        navigate('/otp')
        return
      }

      if (!user.isOnboarded) {
        clearOtpFlow()
        localStorage.setItem('qsphere_email_to_verify', user.emailAddress)
        showInlineMessage('You have not completed onboarding yet. Redirecting to onboarding.', 'success')
        navigate('/onboarding', { state: { verified: true } })
        return
      }

      // Fully logged in and onboarded!
      try {
        clearOtpFlow()
        localStorage.setItem('qsphere_logged_in', '1')
        localStorage.setItem('qsphere_onboarding_profile', JSON.stringify(user))
        localStorage.setItem('qsphere_login_time', Date.now().toString())
        if (rememberMe) {
          localStorage.setItem('qsphere_remember_me', '1')
        } else {
          localStorage.removeItem('qsphere_remember_me')
        }
      } catch {
        void 0
      }

      showInlineMessage(`Welcome back to the Quantum Community, ${user.fullName}!`, 'success')
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Logged in successfully', type: 'success' } }))
      const redirectTo = location?.state?.redirectTo || '/dashboard'
      setTimeout(() => navigate(redirectTo), 500)
    } catch (error) {
      setLoginFormError(error.message || 'An error occurred during login. Please try again.')
    } finally {
      setLoginBusy(false)
    }
  }

  const handleRegister = async () => {
    const fullName = rName.trim()
    const emailAddress = rEmail.trim()
    const password = rPass.trim()
    const confirmPassword = rCfm.trim()

    const nextErrors = {
      name: fullName ? '' : getMissingFieldMessage(),
      email: emailAddress ? '' : getMissingFieldMessage(),
      password: password ? '' : getMissingFieldMessage(),
      confirm: confirmPassword ? '' : getMissingFieldMessage(),
    }

    setRegisterErrors(nextErrors)
    setLoginErrors({})

    if (nextErrors.name || nextErrors.email || nextErrors.password || nextErrors.confirm) {
      showInlineMessage('Please fill in the highlighted fields.', 'error')
      return
    }

    if (password !== confirmPassword) {
      setRegisterErrors((current) => ({ ...current, password: 'Passwords do not match.', confirm: 'Passwords do not match.' }))
      showInlineMessage('Passwords do not match.', 'error')
      return
    }

    setRegisterBusy(true)
    showInlineMessage('Creating your account...', 'info')
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          emailAddress,
          password
        })
      })

      const result = await response.json()
      if (!response.ok) {
        if (response.status === 409 && result.pendingRegistration) {
          setOtpFlow(OTP_FLOW_VERIFY_EMAIL, result.emailAddress || emailAddress)
          showInlineMessage(result.message || 'You already have a pending verification. Redirecting to OTP.', 'success')
          navigate('/otp')
          return
        }

        if (response.status === 400 && /fullName, emailAddress, and password are required/i.test(result.error || '')) {
          applyRequiredFieldErrors(['name', 'email', 'password'], result.error)
          return
        }

        if (response.status === 400 && /already registered/i.test(result.error || '')) {
          setRegisterErrors((current) => ({ ...current, email: result.error || 'This email is already registered.' }))
          showInlineMessage(result.error || 'This email is already registered.', 'error')
          return
        }

        throw new Error(result.error || 'Registration failed')
      }

      setOtpFlow(OTP_FLOW_VERIFY_EMAIL, emailAddress)
      showInlineMessage('Registration successful! Verification code sent to your email.', 'success')
      navigate('/otp')
    } catch (error) {
      showInlineMessage(error.message || 'An error occurred during registration.', 'error')
    } finally {
      setRegisterBusy(false)
    }
  }

  const handleForgotPassword = async () => {
    const emailAddress = lEmail.trim()

    const nextErrors = {
      email: emailAddress ? '' : getMissingFieldMessage(),
      password: '',
    }

    setLoginErrors(nextErrors)
    setLoginFormError('')

    if (nextErrors.email) {
      setLoginFormError('Please enter the email address linked to your account.')
      return
    }

    setLoginBusy(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAddress })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Unable to start password reset.')
      }

      setOtpFlow(OTP_FLOW_RESET_PASSWORD, result.emailAddress || emailAddress)
      showInlineMessage(result.message || 'Reset code sent. Redirecting to OTP verification.', 'success')
      navigate('/otp')
    } catch (error) {
      setLoginFormError(error.message || 'Unable to start password reset.')
    } finally {
      setLoginBusy(false)
    }
  }

  const isForgotPasswordView = mode === 'login' && loginView === 'forgot'
  const loginSectionLabel = isForgotPasswordView ? 'Password Recovery Node' : 'Secure Access Portal'
  const loginTitle = isForgotPasswordView
    ? <>Reset your <span>Quantum</span><br />password.</>
    : <>Sign In to the <span>Quantum</span><br />Community.</>
  const loginSubtitle = isForgotPasswordView
    ? 'Enter your email address and we will send a secure 6-digit reset code.'
    : 'Access your dimension of cutting-edge quantum science and collaboration.'
  const statusText = mode === 'login'
    ? (isForgotPasswordView ? 'QSPHERE · Recovery Node Active' : 'QSPHERE · Entry Node Active')
    : 'QSPHERE · Genesis Chamber Active'

  const panelContent = mode === 'login' ? 'about' : 'contact'
  const panelVideoSrc = panelContent === 'about'
    ? (isDayMode ? aboutDayVideo : aboutDarkVideo)
    : (isDayMode ? contactDayVideo : contactDarkVideo)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const runSequence = (nextMode) => {
    if (stage !== STAGE.IDLE) return
    clearTimers()

    setStage(STAGE.FOLDING_IN)

    timers.current.push(
      setTimeout(() => {
        setStage(STAGE.FLIPPING)
        setMode(nextMode)
        setLoginView('sign-in')
        setLoginFormError('')
      }, T_FOLD),
    )

    timers.current.push(
      setTimeout(() => {
        setStage(STAGE.FOLDING_OUT)
      }, T_FOLD + T_FLIP),
    )

    timers.current.push(
      setTimeout(() => {
        setStage(STAGE.IDLE)
      }, T_FOLD + T_FLIP + T_FOLD),
    )
  }

  const handleJoinCommunity = () => {
    if (window.innerWidth < 768) {
      setMode('register')
      setLoginView('sign-in')
      setLoginFormError('')
      return
    }
    runSequence('register')
  }

  const handleBackToSignIn = () => {
    if (window.innerWidth < 768) {
      setMode('login')
      setLoginView('sign-in')
      setLoginFormError('')
      return
    }
    runSequence('login')
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: palette.bgPrimary, color: palette.textPrimary }}>
      <Navbar currentPage="auth" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --g: ${palette.accentPrimary};
          --g2: ${palette.accentDark};
          --g3: ${palette.accentLight};
          --glow: ${isDayMode ? 'rgba(46,197,138,0.18)' : 'rgba(0,229,160,0.25)'};
          --glow-s: ${isDayMode ? 'rgba(46,197,138,0.09)' : 'rgba(0,229,160,0.12)'};
          --bg: ${palette.bgPrimary};
          --bg-soft: ${palette.bgSecondary};
          --card: ${isDayMode ? '#fefefe' : '#04120a'};
          --card-border: ${isDayMode ? palette.borderPrimary : 'rgba(0,229,160,0.15)'};
          --text: ${palette.textPrimary};
          --text-soft: ${palette.textSecondary};
          --text-faint: ${palette.textMuted};
          --input-bg: ${isDayMode ? 'rgba(247,247,247,0.92)' : 'rgba(0,229,160,0.03)'};
          --input-border: ${isDayMode ? palette.borderPrimary : 'rgba(0,229,160,0.12)'};
          --input-focus-bg: ${isDayMode ? '#ffffff' : 'rgba(0,229,160,0.05)'};
          --status-bg: ${isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.6)'};
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
            radial-gradient(ellipse at 15% 30%, ${isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(0,229,160,0.12)'}, transparent 55%),
            radial-gradient(ellipse at 85% 70%, ${isDayMode ? 'rgba(255,224,163,0.10)' : 'rgba(0,180,120,0.09)'}, transparent 55%),
            radial-gradient(ellipse at 50% 100%, ${isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(0,120,80,0.12)'}, transparent 60%);
        }

        #fw {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1600px;
          z-index: 10;
          pointer-events: none;
        }

        #fl {
          position: relative;
          z-index: 2;
          transform-style: preserve-3d;
          transition: transform ${T_FLIP}ms cubic-bezier(0.22,1,0.36,1);
          width: 55%;
          flex-shrink: 0;
        }

        #fl.reg {
          transform: rotateY(180deg);
        }

        #lf {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          border-radius: 20px 0 0 20px;
          background: var(--card);
          border: 1px solid var(--card-border);
          border-right: none;
          box-shadow:
            0 0 0 1px ${isDayMode ? 'rgba(46,197,138,0.04)' : 'rgba(0,229,160,0.05)'} inset,
            ${isDayMode ? '0 32px 80px -16px rgba(15,23,42,0.10)' : '0 32px 80px -16px rgba(0,0,0,0.8)'},
            0 0 60px -10px ${isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(0,229,160,0.15)'},
            0 0 120px -30px ${isDayMode ? 'rgba(46,197,138,0.05)' : 'rgba(0,229,160,0.08)'};
          pointer-events: auto;
        }

        #rf {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          border-radius: 20px 0 0 20px;
          background: var(--card);
          border: 1px solid var(--card-border);
          border-right: none;
          box-shadow:
            0 0 0 1px ${isDayMode ? 'rgba(46,197,138,0.04)' : 'rgba(0,229,160,0.05)'} inset,
            ${isDayMode ? '0 32px 80px -16px rgba(15,23,42,0.10)' : '0 32px 80px -16px rgba(0,0,0,0.8)'},
            0 0 60px -10px ${isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(0,229,160,0.15)'},
            0 0 120px -30px ${isDayMode ? 'rgba(46,197,138,0.05)' : 'rgba(0,229,160,0.08)'};
          transform: rotateY(180deg);
          pointer-events: none;
        }

        .card {
          padding: 44px 40px 48px;
          color: var(--text);
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
          border: 1px solid ${isDayMode ? palette.accentBorder : 'rgba(0,229,160,0.25)'};
          border-radius: 999px;
          padding: 6px 14px 6px 8px;
          margin-bottom: 24px;
          background: ${isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(0,229,160,0.04)'};
        }

        .brand-icon {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid ${isDayMode ? palette.accentBorder : 'rgba(0,229,160,0.4)'};
          background: ${isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(0,229,160,0.08)'};
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
          color: var(--text);
        }

        .h1 {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 30px;
          line-height: 1.1;
          color: var(--text);
          margin-bottom: 6px;
          text-shadow: ${isDayMode ? '0 12px 36px rgba(255,255,255,0.55)' : '0 0 40px rgba(0,229,160,0.2)'};
        }

        .h1 span {
          color: var(--g);
        }

        .sub {
          font-size: 13px;
          color: var(--text-soft);
          margin-bottom: 28px;
          font-weight: 300;
          line-height: 1.5;
        }

        .fi {
          position: relative;
        }

        .fi input {
          width: 100%;
          background: var(--input-bg);
          color: var(--text);
          border: 1px solid var(--input-border);
          border-radius: 10px;
          padding: 17px 44px 7px 14px;
          font-size: 14px;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .25s, box-shadow .25s, background .25s;
          box-shadow: inset 0 1px 0 ${isDayMode ? 'rgba(46,197,138,0.03)' : 'rgba(0,229,160,0.04)'}, inset 0 0 20px ${isDayMode ? 'rgba(15,23,42,0.03)' : 'rgba(0,0,0,0.3)'};
        }

        .fi input:focus {
          border-color: rgba(0,229,160,0.5);
          background: var(--input-focus-bg);
          box-shadow: 0 0 0 3px ${isDayMode ? 'rgba(46,197,138,0.10)' : 'rgba(0,229,160,0.12)'}, inset 0 0 24px ${isDayMode ? 'rgba(46,197,138,0.03)' : 'rgba(0,229,160,0.06)'};
        }

        .fi.err input {
          border-color: rgba(239,68,68,0.65);
          background: rgba(127,29,29,0.18);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.12), inset 0 0 24px rgba(127,29,29,0.12);
        }

        .fi.err input:focus {
          border-color: rgba(248,113,113,0.9);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.18), inset 0 0 24px rgba(127,29,29,0.16);
        }

        .fi label {
          position: absolute;
          left: 14px;
          top: 13px;
          font-size: 13px;
          color: var(--text-faint);
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

        .fi .ico {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: ${isDayMode ? 'rgba(14,150,96,0.55)' : 'rgba(0,229,160,0.35)'};
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .fi-msg {
          margin-top: 6px;
          font-size: 11px;
          color: rgba(248,113,113,0.95);
          letter-spacing: .01em;
          min-height: 14px;
        }

        .fi .eye {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-faint);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color .2s;
        }

        .fi .eye:hover {
          color: var(--g);
        }

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
          color: ${isDayMode ? '#ffffff' : '#000'};
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          background: linear-gradient(135deg,var(--g) 0%,var(--g2) 100%);
          border: none;
          transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s, filter .2s;
          box-shadow: ${isDayMode ? '0 10px 28px -10px rgba(30,158,107,0.28), 0 0 20px rgba(46,197,138,0.12)' : '0 8px 24px -6px rgba(0,229,160,0.5), 0 0 20px rgba(0,229,160,0.2)'};
        }

        .btn:hover {
          transform: translateY(-1px) scale(1.01);
          filter: brightness(1.08);
          box-shadow: ${isDayMode ? '0 14px 34px -10px rgba(30,158,107,0.34), 0 0 22px rgba(46,197,138,0.16)' : '0 12px 32px -6px rgba(0,229,160,0.65), 0 0 30px rgba(0,229,160,0.3)'};
        }

        .btn:active {
          transform: translateY(0) scale(.98);
        }

        .btn:disabled {
          opacity: .7;
          cursor: default;
          transform: none;
        }

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
        }

        .ghost:hover {
          opacity: 1;
          text-shadow: 0 0 12px var(--g);
        }

        .cb {
          appearance: none;
          -webkit-appearance: none;
          width: 15px;
          height: 15px;
          border: 1px solid ${isDayMode ? palette.borderPrimary : 'rgba(0,229,160,0.3)'};
          border-radius: 3px;
          background: ${isDayMode ? '#ffffff' : 'rgba(0,229,160,0.04)'};
          cursor: pointer;
          position: relative;
          transition: all .2s;
          flex-shrink: 0;
        }

        .cb:checked {
          background: var(--g);
          border-color: var(--g);
          box-shadow: 0 0 10px rgba(0,229,160,0.5);
        }

        .cb:checked::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 0;
          width: 4px;
          height: 8px;
          border: solid #000;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .divr {
          display: flex;
          align-items: center;
          margin: 22px 0;
        }

        .divr-l {
          flex: 1;
          height: 1px;
          background: ${isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(0,229,160,0.1)'};
        }

        .divr-t {
          margin: 0 12px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .3em;
          color: ${isDayMode ? 'rgba(14,150,96,0.55)' : 'rgba(0,229,160,0.35)'};
        }

        .fstack {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .row {
          display: flex;
          align-items: center;
        }

        .row-sb {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

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

        .vig {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 20;
          background:
            radial-gradient(ellipse at center, transparent 35%, ${isDayMode ? 'rgba(250,249,247,0.18)' : 'rgba(0,0,0,.6)'} 90%),
            radial-gradient(ellipse at 15% 15%, ${isDayMode ? 'rgba(46,197,138,0.04)' : 'rgba(0,229,160,0.06)'}, transparent 50%);
        }

        .scl {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 21;
          background-image: repeating-linear-gradient(0deg,
            ${isDayMode ? 'rgba(10,22,32,.02)' : 'rgba(255,255,255,.008)'} 0, ${isDayMode ? 'rgba(10,22,32,.02)' : 'rgba(255,255,255,.008)'} 1px, transparent 1px, transparent 4px);
          opacity: .6;
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
          border: 1px solid ${isDayMode ? palette.borderPrimary : 'rgba(0,229,160,0.2)'};
          background: var(--status-bg);
          backdrop-filter: blur(20px);
          font-size: 10px;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--text-soft);
          pointer-events: none;
          z-index: 22;
          white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }

        #status.msg-error {
          border-color: rgba(239,68,68,0.25);
          color: rgba(254,202,202,0.9);
        }

        #status.msg-success {
          border-color: rgba(0,229,160,0.28);
          color: rgba(220,252,231,0.9);
        }

        .status-msg {
          max-width: min(56vw, 520px);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--g); }
          50% { opacity: .5; box-shadow: 0 0 4px var(--g); }
        }

        .sdot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--g);
          animation: pulse 2s ease-in-out infinite;
        }

        #foot {
          position: fixed;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          letter-spacing: .3em;
          text-transform: uppercase;
          color: ${isDayMode ? 'rgba(78,83,92,0.45)' : 'rgba(255,255,255,.2)'};
          pointer-events: none;
          z-index: 22;
          white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 22px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid ${isDayMode ? palette.accentBorder : 'rgba(0,229,160,0.18)'};
          font-size: 9px;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: ${isDayMode ? 'rgba(14,150,96,.72)' : 'rgba(0,229,160,.6)'};
          font-family: 'DM Sans', sans-serif;
          background: ${isDayMode ? 'rgba(46,197,138,0.08)' : 'rgba(0,229,160,0.04)'};
        }

        #ap {
          position: relative;
          width: min(1400px, 98vw);
          margin-top: 3rem;
          overflow: hidden;
        }

        .qassembly {
          width: 100%;
          display: flex;
          align-items: stretch;
          transition: transform ${T_FOLD}ms cubic-bezier(0.4,0,0.2,1);
          transform-style: preserve-3d;
        }

        .qassembly.centered {
          transform: translateX(11.5%);
        }

        .qassembly.solo #lf,
        .qassembly.solo #rf {
          border-radius: 20px;
          border-right: 1px solid var(--card-border);
        }



        #vp {
          position: relative;
          width: 45%;
          flex-shrink: 0;
          z-index: 1;
          transform-origin: left center;
          transition: transform ${T_FOLD}ms cubic-bezier(0.4,0,0.2,1), opacity ${T_FOLD}ms ease;
          transform-style: preserve-3d;
          overflow: hidden;
          border-radius: 0 20px 20px 0;
          border: 1px solid var(--card-border);
          border-left: none;
        }

        #vp.folding {
          transform: rotateY(-150deg);
          opacity: 0;
          pointer-events: none;
        }

        #vp video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vp-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(135deg,
            ${isDayMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.24)'} 0%,
            ${isDayMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.50)'} 100%);
        }

        .vp-body {
          position: relative;
          z-index: 2;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          min-height: 420px;
          height: 100%;
        }

        .vp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-family: 'DM Sans', sans-serif;
          color: ${isDayMode ? '#0d6e4a' : '#a7f3d0'};
          background: ${isDayMode ? 'rgba(46,197,138,0.12)' : 'rgba(0,229,160,0.10)'};
          border: 1px solid ${isDayMode ? 'rgba(46,197,138,0.22)' : 'rgba(0,229,160,0.18)'};
          backdrop-filter: blur(8px);
          margin-bottom: 18px;
          align-self: flex-start;
        }

        .vp-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 6px currentColor;
        }

        .vp-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 22px;
          line-height: 1.15;
          color: #ffffff;
          text-shadow: 0 2px 12px rgba(0,0,0,0.4);
          margin-bottom: 10px;
        }

        .vp-desc {
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255,255,255,0.78);
          font-weight: 300;
          margin-bottom: 20px;
          text-shadow: 0 1px 6px rgba(0,0,0,0.3);
        }

        .vp-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }

        .vp-stat {
          display: flex;
          flex-direction: column;
        }

        .vp-stat-val {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: #ffffff;
          text-shadow: 0 0 20px ${isDayMode ? 'rgba(46,197,138,0.35)' : 'rgba(0,229,160,0.4)'};
        }

        .vp-stat-lbl {
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
        }

        @media (max-width: 768px) {
          #fw {
            perspective: 1200px;
            padding: 24px 14px;
          }

          #ap {
            min-height: 520px;
          }

          .qassembly.centered {
            transform: none;
          }

          #vp {
            display: none !important;
          }

          #fl {
            width: 100%;
          }

          .qassembly.solo #lf {
            border-radius: 20px;
          }

          .card {
            padding: 28px 22px 24px;
          }

          .h1 {
            font-size: 24px;
          }

          .sub {
            font-size: 12px;
          }

          .grid2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <canvas ref={canvasRef} id="cv" aria-hidden="true" />
      <div id="bd" aria-hidden="true" />

      <div id="fw">
        <div id="status" className={pageMessage ? `msg-${pageMessageType}` : ''}>
          <div className="sdot" />
          <span>{statusText}</span>
          {pageMessage ? <span className="status-msg">{pageMessage}</span> : null}
        </div>
        <div id="ap">
          <div className={`qassembly ${formCentered ? 'centered solo' : ''}`}>
          <div ref={formWrapRef} id="fl" className={mode === 'register' ? 'reg' : ''}>
            <div ref={loginFaceRef} id="lf">
              <div className="card">
                <div className="brand">
                  <div className="brand-icon">Q</div>
                  <div>
                    <div className="brand-text">QSPHERE</div>
                  </div>
                </div>

                <div className="section-label"><span className="dot" />{loginSectionLabel}</div>

                <div className="h1">{loginTitle}</div>
                <p className="sub">{loginSubtitle}</p>

                <div className="fstack">
                  {loginFormError && (
                    <div style={{ color: '#ef4444', fontSize: '13px', padding: '12px 16px', background: isDayMode ? 'rgba(239,68,68,0.08)' : 'rgba(255,60,60,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      {loginFormError}
                    </div>
                  )}
                  <div className={`fi ${loginErrors.email ? 'err' : ''}`}>
                    <input
                      type="email"
                      id="lEmail"
                      placeholder=" "
                      autoComplete="email"
                      value={lEmail}
                      onChange={(e) => setLEmail(e.target.value)}
                    />
                    <label htmlFor="lEmail">Email address</label>
                    <span className="ico">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <div className="fi-msg">{loginErrors.email || '\u00A0'}</div>
                  </div>

                  {!isForgotPasswordView ? (
                    <>
                      <div className={`fi ${loginErrors.password ? 'err' : ''}`}>
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          id="lPass"
                          placeholder=" "
                          autoComplete="current-password"
                          value={lPass}
                          onChange={(e) => setLPass(e.target.value)}
                        />
                        <label htmlFor="lPass">Password</label>
                        <button className="eye" id="lEyeBtn" type="button" onClick={() => setShowLoginPassword((value) => !value)}>
                          <svg id="lEyeSvg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            {showLoginPassword ? EYE_CLOSED : EYE_OPEN}
                          </svg>
                        </button>
                        <div className="fi-msg">{loginErrors.password || '\u00A0'}</div>
                      </div>

                      <div className="row-sb" style={{ fontSize: '13px' }}>
                        <label className="row" style={{ gap: 8, cursor: 'pointer', color: palette.textSecondary }}>
                          <input
                            type="checkbox"
                            className="cb"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            id="lRem"
                          />
                          Remember me
                        </label>
                        <button
                          className="ghost"
                          style={{ fontSize: '11px' }}
                          type="button"
                          onClick={() => {
                            setLoginView('forgot')
                            setLoginErrors({})
                            setLoginFormError('')
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: palette.textSecondary, lineHeight: 1.6, marginTop: '-2px' }}>
                      We will email a one-time code to this address. Use it to create a new password on the next screen.
                    </div>
                  )}

                  <button
                    className="btn"
                    id="lSub"
                    type="button"
                    disabled={loginBusy}
                    onClick={isForgotPasswordView ? handleForgotPassword : handleLogin}
                  >
                    <span className="row" style={{ gap: 8 }}>
                      {loginBusy ? <span className="spin" /> : isForgotPasswordView ? 'Send Reset Code' : 'Sign In'}
                      {!loginBusy && ARR}
                    </span>
                  </button>
                </div>

                <div className="divr"><div className="divr-l" /><span className="divr-t">or</span><div className="divr-l" /></div>

                <div style={{ textAlign: 'center', fontSize: '13px', color: palette.textSecondary }}>
                  {isForgotPasswordView ? (
                    <>
                      Remembered your password?{' '}
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => {
                          setLoginView('sign-in')
                          setLoginErrors({})
                          setLoginFormError('')
                        }}
                        style={{ fontWeight: 600 }}
                      >
                        ← Back to Sign In
                      </button>
                    </>
                  ) : (
                    <>
                      New to QSPHERE?{' '}
                      <button
                        className="ghost"
                        type="button"
                        disabled={stage !== STAGE.IDLE}
                        onClick={handleJoinCommunity}
                        style={{ fontWeight: 600 }}
                      >
                        Join the Community →
                      </button>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div className="badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    End-to-end encrypted
                  </div>
                </div>
              </div>
            </div>

            <div ref={registerFaceRef} id="rf">
              <div className="card">
                <div className="brand">
                  <div className="brand-icon">Q</div>
                  <div>
                    <div className="brand-text">QSPHERE</div>
                  </div>
                </div>

                <div className="section-label"><span className="dot" />Create Your Dimension</div>

                <div className="h1">Join the <span>Quantum</span><br />Community.</div>
                <p className="sub">Collaborate with 50+ researchers and pioneers shaping the future of quantum science.</p>

                <div className="fstack">
                  <div className={`fi ${registerErrors.name ? 'err' : ''}`}>
                    <input
                      type="text"
                      id="rName"
                      placeholder=" "
                      value={rName}
                      onChange={(e) => setRName(e.target.value)}
                    />
                    <label htmlFor="rName">Full name</label>
                    <span className="ico">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <div className="fi-msg">{registerErrors.name || '\u00A0'}</div>
                  </div>

                  <div className={`fi ${registerErrors.email ? 'err' : ''}`}>
                    <input
                      type="email"
                      id="rEmail"
                      placeholder=" "
                      autoComplete="email"
                      value={rEmail}
                      onChange={(e) => setREmail(e.target.value)}
                    />
                    <label htmlFor="rEmail">Email address</label>
                    <span className="ico">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <div className="fi-msg">{registerErrors.email || '\u00A0'}</div>
                  </div>

                  <div className="grid2">
                    <div className={`fi ${registerErrors.password ? 'err' : ''}`}>
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        id="rPass"
                        placeholder=" "
                        value={rPass}
                        onChange={(e) => setRPass(e.target.value)}
                      />
                      <label htmlFor="rPass">Password</label>
                      <div className="fi-msg">{registerErrors.password || '\u00A0'}</div>
                    </div>
                    <div className={`fi ${registerErrors.confirm ? 'err' : ''}`}>
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        id="rCfm"
                        placeholder=" "
                        value={rCfm}
                        onChange={(e) => setRCfm(e.target.value)}
                      />
                      <label htmlFor="rCfm">Confirm</label>
                      <div className="fi-msg">{registerErrors.confirm || '\u00A0'}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="rEyeBtn"
                    onClick={() => setShowRegisterPassword((value) => !value)}
                    style={{
                      fontSize: '11px',
                      color: showRegisterPassword ? palette.accentDark : palette.accentPrimary,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'color .2s',
                      letterSpacing: '.02em',
                    }}
                  >
                    <svg id="rEyeSvg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showRegisterPassword ? EYE_CLOSED : EYE_OPEN}
                    </svg>
                    <span id="rEyeTxt">{showRegisterPassword ? 'Hide passwords' : 'Show passwords'}</span>
                  </button>

                  <button className="btn" id="rSub" type="button" disabled={registerBusy} onClick={handleRegister}>
                    <span className="row" style={{ gap: 8 }}>
                      {registerBusy ? <span className="spin" /> : 'Create Account'}
                      {!registerBusy && ARR}
                    </span>
                  </button>
                </div>

                <div className="divr"><div className="divr-l" /><span className="divr-t">or</span><div className="divr-l" /></div>

                <div style={{ textAlign: 'center', fontSize: '13px', color: palette.textSecondary }}>
                  Already a member?{' '}
                  <button className="ghost" type="button" disabled={stage !== STAGE.IDLE} onClick={handleBackToSignIn} style={{ fontWeight: 600 }}>
                    ← Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div ref={panelRef} id="vp" className={videoFolded ? 'folding' : ''}>
            <video ref={panelVideoRef} muted loop playsInline preload="metadata">
              <source src={panelVideoSrc} type="video/mp4" />
            </video>
            <div className="vp-overlay" />
            <div className="vp-body">
              <div className="vp-badge">
                <span className="vp-dot" />
                {panelContent === 'about' ? 'COMMUNITY PORTAL' : 'GENESIS INITIATIVE'}
              </div>
              <h3 className="vp-title">
                {panelContent === 'about' ? 'Join the Quantum Community' : 'Create Your Dimension'}
              </h3>
              <p className="vp-desc">
                {panelContent === 'about'
                  ? 'Collaborate with 50+ researchers and pioneers shaping the future of quantum science.'
                  : 'Unlock tools, connect with innovators, and bring your quantum ideas to life.'}
              </p>
              <div className="vp-stats">
                <div className="vp-stat">
                  <span className="vp-stat-val">50+</span>
                  <span className="vp-stat-lbl">Researchers</span>
                </div>
                <div className="vp-stat">
                  <span className="vp-stat-val">1K+</span>
                  <span className="vp-stat-lbl">Members</span>
                </div>
                <div className="vp-stat">
                  <span className="vp-stat-val">24/7</span>
                  <span className="vp-stat-lbl">Collaboration</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="vig" />
      <div className="scl" />

      <div id="foot">Tilt your cursor to explore the quantum field</div>
    </div>
  )
}

export default AuthPage
