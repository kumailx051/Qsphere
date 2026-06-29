import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, LayoutDashboard, Sparkles, Upload } from 'lucide-react'
import { onboardingCommonFields, onboardingRoleFields, onboardingRoles } from '../data/onboarding'
import { useTheme } from '../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../themeColors'

const storageKey = 'qsphere_onboarding_profile'

const formatPhoneNumber = (value) => {
  const clean = value.replace(/\D/g, '')
  const truncated = clean.slice(0, 11)
  if (truncated.length > 4) {
    return `${truncated.slice(0, 4)}-${truncated.slice(4)}`
  }
  return truncated
}

const formatCNIC = (value) => {
  const clean = value.replace(/\D/g, '')
  const truncated = clean.slice(0, 13)
  if (truncated.length > 12) {
    return `${truncated.slice(0, 5)}-${truncated.slice(5, 12)}-${truncated.slice(12)}`
  } else if (truncated.length > 5) {
    return `${truncated.slice(0, 5)}-${truncated.slice(5)}`
  }
  return truncated
}

const emptyValues = {
  fullName: '',
  email: '',
  gender: 'Male',
  cellMain: '',
  cellAlt: '',
  cnic: '',
  passportNo: '',
  dob: '',
  city: '',
  address: '',
  institute: '',
  degree: '',
  semester: '',
  majors: '',
  interests: '',
  referralId: '',
  discipline: '',
  graduationDate: '',
  organization: '',
  jobDescription: '',
  roleTitle: '',
  qualification: '',
  experience: '',
  designation: '',
  post: '',
  researchInterest: '',
  researchFocus: '',
}

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

const getFieldWrapperStyle = (palette, isDayMode) => ({
  border: `1px solid ${palette.borderPrimary}`,
  backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : '#06100c',
  boxShadow: isDayMode ? palette.shadowCard : '0 0 0 1px rgba(16,185,129,0.05) inset'
})

const InputControl = ({ field, value, onChange, hasError, palette, isDayMode }) => {
  const isReadOnly = field.name === 'email'
  
  const commonStyle = {
    backgroundColor: hasError ? (isDayMode ? '#fff1f2' : '#120a0a') : (isDayMode ? 'rgba(255,255,255,0.5)' : '#0a1a14'),
    borderColor: hasError ? '#f43f5e' : (isReadOnly ? palette.borderPrimary : (isDayMode ? palette.accentBorder : 'rgba(16,185,129,0.3)')),
    color: isDayMode ? palette.textPrimary : 'white',
    opacity: isReadOnly ? 0.6 : 1,
    cursor: isReadOnly ? 'not-allowed' : 'auto'
  }

  const commonClassName = `mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${hasError ? 'focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]' : 'focus:shadow-[0_0_0_4px_rgba(16,185,129,0.15)]'} ${isDayMode ? 'placeholder:text-gray-400' : 'placeholder:text-emerald-100/40'}`

  if (field.type === 'select') {
    return (
      <select
        id={field.name}
        name={field.name}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        className={commonClassName}
        style={commonStyle}
      >
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        id={field.name}
        name={field.name}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className={`${commonClassName} resize-none`}
        style={commonStyle}
      />
    )
  }

  return (
    <input
      id={field.name}
      name={field.name}
      value={value}
      onChange={(event) => !isReadOnly && onChange(field.name, event.target.value)}
      type={field.type || 'text'}
      placeholder={field.placeholder}
      className={commonClassName}
      readOnly={isReadOnly}
      style={commonStyle}
    />
  )
}

const OnboardingPage = () => {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedRole, setSelectedRole] = useState('student')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [values, setValues] = useState(() => ({ ...emptyValues }))
  const [emailToOnboard, setEmailToOnboard] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const email = localStorage.getItem('qsphere_email_to_verify')
    if (!email) {
      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Verification session expired or not found. Redirecting to Sign In.', type: 'error' } }))
      navigate('/auth')
    } else {
      setEmailToOnboard(email)
      setValues((current) => ({ ...current, email: email }))
    }
  }, [navigate])

  const roleConfig = useMemo(
    () => onboardingRoles.find((role) => role.id === selectedRole) ?? onboardingRoles[0],
    [selectedRole],
  )

  const roleFields = onboardingRoleFields[selectedRole] ?? []
  const verifiedFromOtp = Boolean(location.state?.verified)

  const handleFieldChange = (name, nextValue) => {
    let formattedValue = nextValue
    if (name === 'cellMain' || name === 'cellAlt') {
      formattedValue = formatPhoneNumber(nextValue)
    } else if (name === 'cnic') {
      formattedValue = formatCNIC(nextValue)
    }

    setValues((current) => ({ ...current, [name]: formattedValue }))
    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[name]
        return next
      })
    }
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(String(reader.result || ''))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    const newErrors = {}

    // Validate common fields
    onboardingCommonFields.forEach((field) => {
      const val = (values[field.name] || '').toString().trim()
      if (field.required && !val) {
        newErrors[field.name] = 'This field is required'
      } else if (val) {
        if ((field.name === 'cellMain' || field.name === 'cellAlt') && val.replace(/\D/g, '').length !== 11) {
          newErrors[field.name] = 'Phone number must be exactly 11 digits (xxxx-xxxxxxx)'
        }
        if (field.name === 'cnic' && val.replace(/\D/g, '').length !== 13) {
          newErrors[field.name] = 'CNIC must be exactly 13 digits (xxxxx-xxxxxxx-x)'
        }
      }
    })

    // Validate role specific fields
    roleFields.forEach((field) => {
      const val = (values[field.name] || '').toString().trim()
      if (field.required && !val) {
        newErrors[field.name] = 'This field is required'
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setSubmitting(false)
      const firstErrorField = Object.keys(newErrors)[0]
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus()
      }
      return
    }

    const payload = {
      emailAddress: emailToOnboard,
      role: selectedRole,
      gender: values.gender || 'Male',
      cellMain: values.cellMain,
      cellAlternative: values.cellAlt,
      cnic: values.cnic,
      passportNo: values.passportNo,
      dateOfBirth: values.dob,
      city: values.city,
      address: values.address,
      avatarPreview: avatarPreview,
      // Role specific fields
      institute: values.institute,
      degree: values.degree,
      semester: values.semester,
      majors: values.majors,
      interests: values.interests,
      referralId: values.referralId,
      discipline: values.discipline,
      dateOfGraduation: values.graduationDate,
      organization: values.organization,
      jobDescription: values.jobDescription,
      roleTitle: values.roleTitle,
      qualification: values.qualification,
      experience: values.experience,
      designation: values.designation,
      post: values.post,
      researchInterest: values.researchInterest,
      researchFocus: values.researchFocus,
    }

    try {
      const response = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      let result = {}
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        throw new Error(text || `Server error: ${response.status} ${response.statusText}`)
      }

      if (!response.ok) {
        throw new Error(result.error || 'Onboarding submission failed')
      }

      const { user } = result
      const profile = {
        role: user.role,
        roleLabel: roleConfig.label,
        verifiedFromOtp,
        avatarPreview: user.profileImage || avatarPreview,
        submittedAt: new Date().toISOString(),
        fullName: user.fullName,
        email: user.emailAddress,
        gender: user.gender,
        cellMain: user.cellMain,
        cellAlt: user.cellAlternative,
        cnic: user.cnic,
        passportNo: user.passportNo,
        dob: user.dateOfBirth,
        city: user.city,
        address: user.address,
        // Role specific fields mapping
        institute: user.institute,
        degree: user.degree,
        semester: user.semester,
        majors: user.majors,
        interests: user.interests,
        referralId: user.referralId,
        discipline: user.discipline,
        graduationDate: user.dateOfGraduation,
        organization: user.organization,
        jobDescription: user.jobDescription,
        roleTitle: user.roleTitle,
        qualification: user.qualification,
        experience: user.experience,
        designation: user.designation,
        post: user.post,
        researchInterest: user.researchInterest,
        researchFocus: user.researchFocus
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(profile))
        localStorage.removeItem('qsphere_email_to_verify')
        localStorage.setItem('qsphere_logged_in', '1')
        localStorage.setItem('qsphere_login_time', Date.now().toString())
      } catch (_) {
        // localStorage restriction fallback
      }

      window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message: 'Logged in successfully', type: 'success' } }))
      navigate('/dashboard', { state: { profile } })
    } catch (error) {
      setSubmitError(error.message || 'An error occurred during onboarding submission.')
    } finally {
      setSubmitting(false)
    }
  }

  const draftProfile = readStoredProfile()

  return (
    <div className="relative min-h-screen overflow-hidden transition-colors" style={{ backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
      <div className="absolute inset-0" style={{ background: isDayMode ? 'none' : 'radial-gradient(circle at top left, rgba(16,185,129,0.22), transparent 35%), radial-gradient(circle at 80% 20%, rgba(0,229,160,0.12), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,110,70,0.2), transparent 45%)' }} />
      <div className="absolute inset-0" style={{ background: isDayMode ? 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent 50%, rgba(248,250,249,0.8))' : 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent 30%, rgba(0,0,0,0.4))' }} />

      <main className="relative mx-auto flex min-h-screen w-full 2xl:max-w-[1600px] items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[28px] p-6 backdrop-blur-2xl" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.04)', boxShadow: isDayMode ? palette.shadowCard : '0 30px 90px -30px rgba(0,0,0,0.9)' }}>
            <div className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[11px] tracking-[0.3em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                Q
              </span>
              QSPHERE ONBOARDING
            </div>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.28em]" style={{ color: palette.accentPrimary }}>Profile setup</p>
              <h1 className="type-heading mt-3" style={{ color: palette.textPrimary }}>
                Finish your <span style={{ color: palette.accentPrimary }}>membership</span> profile.
              </h1>
              <p className="mt-4 text-sm leading-6" style={{ color: palette.textSecondary }}>
                Choose a role, fill the matching fields, and we will route you to the dashboard once your profile is ready.
              </p>
            </div>

            <div className="mt-6 rounded-3xl p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
              <div className="flex items-center gap-3 text-sm" style={{ color: palette.textPrimary }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.accentSoft, color: palette.accentPrimary, border: `1px solid ${palette.accentBorder}` }}>
                  <Sparkles size={18} />
                </span>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: palette.accentDark }}>Current role</div>
                  <div className="mt-1 font-semibold">{roleConfig.label}</div>
                </div>
              </div>

              <p className="mt-4 text-sm" style={{ color: palette.textSecondary }}>{roleConfig.description}</p>

              <div className="mt-4 space-y-3">
                {roleConfig.id === 'student' && (
                  <>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Institute and semester ready for campus members.</div>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Majors and interests help us personalize recommendations.</div>
                  </>
                )}
                {roleConfig.id === 'graduate' && (
                  <>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Add your degree and graduation date for alumni matching.</div>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Discipline helps surface the right research communities.</div>
                  </>
                )}
                {roleConfig.id === 'industry' && (
                  <>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Share your organization and role title for professional routing.</div>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Job description helps us understand how you engage with quantum teams.</div>
                  </>
                )}
                {roleConfig.id === 'faculty' && (
                  <>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Qualification and designation are kept front and center.</div>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Research interest is used to highlight collaboration opportunities.</div>
                  </>
                )}
                {roleConfig.id === 'researcher' && (
                  <>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Research focus and institute help route your profile correctly.</div>
                    <div className="rounded-2xl p-3 text-sm" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>Interests and referral id can be used to connect you with labs and peers.</div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl p-4" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: palette.textMuted }}>Flow</div>
                <div className="mt-3 space-y-3 text-sm" style={{ color: palette.textPrimary }}>
                  <div className="flex items-center gap-3"><CheckCircle2 size={16} style={{ color: palette.accentPrimary }} /> OTP verified</div>
                  <div className="flex items-center gap-3"><CheckCircle2 size={16} style={{ color: palette.accentPrimary }} /> Choose role</div>
                  <div className="flex items-center gap-3"><LayoutDashboard size={16} style={{ color: palette.accentPrimary }} /> Land on dashboard</div>
                </div>
              </div>

              <div className="rounded-2xl p-4 text-sm" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary, color: palette.textSecondary }}>
                {draftProfile ? 'A saved profile exists in this browser. Submitting again will refresh it.' : 'No saved profile found yet. Complete the form to unlock the dashboard.'}
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] p-5 backdrop-blur-2xl sm:p-6 lg:p-8" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: isDayMode ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.045)', boxShadow: isDayMode ? palette.shadowCard : '0 30px 90px -30px rgba(0,0,0,0.9)' }}>
            <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-start lg:justify-between" style={{ borderColor: palette.borderPrimary }}>
              <div>
                <p className="text-xs uppercase tracking-[0.3em]" style={{ color: palette.accentPrimary }}>Personal information</p>
                <h2 className="type-sectionHeading mt-3" style={{ color: palette.textPrimary }}>
                  Share the details your role needs.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: palette.textSecondary }}>
                  The form updates automatically when you switch roles so students, graduates, industry members, faculty, and researchers only see the fields relevant to them.
                </p>
                {verifiedFromOtp && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs tracking-[0.2em]" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                    <CheckCircle2 size={14} /> VERIFIED FROM OTP
                  </div>
                )}
              </div>

              <div className="rounded-3xl p-4 lg:w-[320px] xl:w-[360px]" style={{ border: `1px solid ${palette.borderPrimary}`, backgroundColor: palette.bgSecondary }}>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-24 w-32 items-center justify-center overflow-hidden rounded-[24px] border border-dashed sm:w-36" style={{ borderColor: palette.accentBorder, backgroundColor: palette.accentSoft }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center text-[11px] uppercase tracking-[0.22em]" style={{ color: palette.accentDark }}>
                        Upload
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: palette.textMuted }}>Profile picture</div>
                    <div className="mt-2 text-sm" style={{ color: palette.textSecondary }}>Add a clean headshot for your dashboard.</div>
                  </div>
                </div>

                <label className="mt-4 inline-flex w-full cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-sm transition hover:brightness-110" style={{ border: `1px solid ${palette.accentBorder}`, backgroundColor: palette.accentSoft, color: palette.accentDark }}>
                  <span className="inline-flex items-center gap-2"><Upload size={16} /> Upload profile picture</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-8">
              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-sm uppercase tracking-[0.26em]" style={{ color: palette.textMuted }}>Role selection</h3>
                  <div className="text-xs" style={{ color: palette.textMuted }}>Switch anytime before submitting</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {onboardingRoles.map((role) => {
                    const active = selectedRole === role.id
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role.id)
                          setErrors({})
                          setSubmitError('')
                        }}
                        className="rounded-2xl border px-4 py-3 text-left transition hover:brightness-110"
                        style={{ 
                          border: `1px solid ${active ? palette.accentBorder : palette.borderPrimary}`,
                          backgroundColor: active ? palette.accentSoft : palette.bgSecondary,
                          boxShadow: active ? `0 0 0 1px ${palette.accentPrimary}33 inset` : 'none'
                        }}
                      >
                        <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: active ? palette.accentPrimary : palette.textMuted }}>{role.eyebrow}</div>
                        <div className="mt-2 text-sm font-semibold" style={{ color: active ? palette.accentDark : palette.textPrimary }}>{role.label}</div>
                        <div className="mt-1 text-xs leading-5" style={{ color: palette.textSecondary }}>{role.title}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              

              <div className="rounded-2xl p-6" style={getFieldWrapperStyle(palette, isDayMode)}>
                <div className="mb-4 flex items-center gap-2" style={{ color: palette.textSecondary }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>Contact and identity</div>
                    <div className="text-xs" style={{ color: palette.textMuted }}>Always collected before dashboard access</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {onboardingCommonFields.map((field) => {
                    const spanClass = field.span === 2 ? 'xl:col-span-2' : field.span === 3 ? 'xl:col-span-3' : ''
                    return (
                      <div key={field.name} className={spanClass}>
                        <label className="text-sm" style={{ color: palette.textSecondary }} htmlFor={field.name}>
                          {field.label} {field.required ? <span style={{ color: palette.accentPrimary }}>*</span> : null}
                        </label>
                        <InputControl
                          field={field}
                          value={values[field.name] ?? ''}
                          onChange={handleFieldChange}
                          hasError={Boolean(errors[field.name])}
                          palette={palette}
                          isDayMode={isDayMode}
                        />
                        {errors[field.name] && (
                          <p className="mt-1.5 text-xs font-medium text-rose-500">{errors[field.name]}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div key={selectedRole} className="rounded-2xl p-6 transition-all duration-300" style={getFieldWrapperStyle(palette, isDayMode)}>
                <div className="mb-4 flex items-center gap-2" style={{ color: palette.textSecondary }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: palette.accentSoft, color: palette.accentPrimary }}>
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: palette.textPrimary }}>Role-specific fields</div>
                    <div className="text-xs" style={{ color: palette.textMuted }}>Changes when you choose a different role</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {roleFields.map((field) => {
                    const spanClass = field.span === 2 ? 'xl:col-span-2' : field.span === 3 ? 'xl:col-span-3' : ''
                    return (
                      <div key={field.name} className={spanClass}>
                        <label className="text-sm" style={{ color: palette.textSecondary }} htmlFor={field.name}>
                          {field.label} {field.required ? <span style={{ color: palette.accentPrimary }}>*</span> : null}
                        </label>
                        <InputControl
                          field={field}
                          value={values[field.name] ?? ''}
                          onChange={handleFieldChange}
                          hasError={Boolean(errors[field.name])}
                          palette={palette}
                          isDayMode={isDayMode}
                        />
                        {errors[field.name] && (
                          <p className="mt-1.5 text-xs font-medium text-rose-500">{errors[field.name]}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'rgba(244,63,94,0.2)', backgroundColor: isDayMode ? '#fff1f2' : 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
                  {submitError}
                </div>
              )}

              <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: palette.borderPrimary }}>
                <div className="max-w-xl text-sm" style={{ color: palette.textMuted }}>
                  By continuing, you agree to complete a profile that matches your community role and will be used to personalize your dashboard.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-3 text-sm font-semibold transition hover:scale-[1.01] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: palette.btnPrimaryBg, color: palette.btnPrimaryText, boxShadow: isDayMode ? '0 10px 25px -5px rgba(16,185,129,0.3)' : '0 14px 40px -12px rgba(16,185,129,0.65)' }}
                >
                  {submitting ? 'Saving profile...' : 'Submit and open dashboard'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

export default OnboardingPage
