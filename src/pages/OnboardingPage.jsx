import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, LayoutDashboard, Sparkles, Upload, Users } from 'lucide-react'
import { onboardingCommonFields, onboardingRoleFields, onboardingRoles } from '../data/onboarding'

const storageKey = 'qsphere_onboarding_profile'

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
  } catch (error) {
    return null
  }
}

const fieldWrapperClass = 'rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]'

const InputControl = ({ field, value, onChange }) => {
  const commonClassName = 'mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-emerald-400/40 focus:bg-black/35 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'

  if (field.type === 'select') {
    return (
      <select
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        className={commonClassName}
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
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className={`${commonClassName} resize-none`}
      />
    )
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(field.name, event.target.value)}
      type={field.type || 'text'}
      placeholder={field.placeholder}
      className={commonClassName}
    />
  )
}

const OnboardingPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedRole, setSelectedRole] = useState('student')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [values, setValues] = useState(() => ({ ...emptyValues }))

  const roleConfig = useMemo(
    () => onboardingRoles.find((role) => role.id === selectedRole) ?? onboardingRoles[0],
    [selectedRole],
  )

  const roleFields = onboardingRoleFields[selectedRole] ?? []
  const verifiedFromOtp = Boolean(location.state?.verified)

  const handleFieldChange = (name, nextValue) => {
    setValues((current) => ({ ...current, [name]: nextValue }))
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

    const profile = {
      role: selectedRole,
      roleLabel: roleConfig.label,
      verifiedFromOtp,
      avatarPreview,
      ...values,
      submittedAt: new Date().toISOString(),
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(profile))
    } catch (error) {
      // localStorage may be unavailable in privacy-restricted contexts.
    }

    await new Promise((resolve) => setTimeout(resolve, 700))
    setSubmitting(false)
    navigate('/dashboard', { state: { profile } })
  }

  const draftProfile = readStoredProfile()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030705] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(0,229,160,0.12),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(0,110,70,0.2),transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%,rgba(0,0,0,0.4))]" />

      <main className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-emerald-400/15 bg-white/[0.04] p-6 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[11px] tracking-[0.3em] text-emerald-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                Q
              </span>
              QSPHERE ONBOARDING
            </div>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/70">Profile setup</p>
              <h1 className="mt-3 text-3xl leading-tight text-white" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>
                Finish your <span className="text-emerald-300">membership</span> profile.
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/55">
                Choose a role, fill the matching fields, and we will route you to the dashboard once your profile is ready.
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/20">
                  <Sparkles size={18} />
                </span>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/70">Current role</div>
                  <div className="mt-1 font-semibold text-white">{roleConfig.label}</div>
                </div>
              </div>

              <p className="mt-4 text-sm text-white/55">{roleConfig.description}</p>

              <div className="mt-4 space-y-3">
                {roleConfig.id === 'student' && (
                  <>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Institute and semester ready for campus members.</div>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Majors and interests help us personalize recommendations.</div>
                  </>
                )}
                {roleConfig.id === 'graduate' && (
                  <>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Add your degree and graduation date for alumni matching.</div>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Discipline helps surface the right research communities.</div>
                  </>
                )}
                {roleConfig.id === 'industry' && (
                  <>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Share your organization and role title for professional routing.</div>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Job description helps us understand how you engage with quantum teams.</div>
                  </>
                )}
                {roleConfig.id === 'faculty' && (
                  <>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Qualification and designation are kept front and center.</div>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Research interest is used to highlight collaboration opportunities.</div>
                  </>
                )}
                {roleConfig.id === 'researcher' && (
                  <>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Research focus and institute help route your profile correctly.</div>
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-3 text-sm text-emerald-100/90">Interests and referral id can be used to connect you with labs and peers.</div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">Flow</div>
                <div className="mt-3 space-y-3 text-sm text-white/70">
                  <div className="flex items-center gap-3"><CheckCircle2 size={16} className="text-emerald-300" /> OTP verified</div>
                  <div className="flex items-center gap-3"><CheckCircle2 size={16} className="text-emerald-300" /> Choose role</div>
                  <div className="flex items-center gap-3"><LayoutDashboard size={16} className="text-emerald-300" /> Land on dashboard</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                {draftProfile ? 'A saved profile exists in this browser. Submitting again will refresh it.' : 'No saved profile found yet. Complete the form to unlock the dashboard.'}
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-emerald-400/15 bg-white/[0.045] p-5 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/70">Personal information</p>
                <h2 className="mt-3 text-3xl leading-tight text-white" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>
                  Share the details your role needs.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                  The form updates automatically when you switch roles so students, graduates, industry members, faculty, and researchers only see the fields relevant to them.
                </p>
                {verifiedFromOtp && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs tracking-[0.2em] text-emerald-100">
                    <CheckCircle2 size={14} /> VERIFIED FROM OTP
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 lg:w-[320px] xl:w-[360px]">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-24 w-32 items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-emerald-400/25 bg-emerald-500/10 sm:w-36">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center text-[11px] uppercase tracking-[0.22em] text-emerald-100/70">
                        Upload
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">Profile picture</div>
                    <div className="mt-2 text-sm text-white/70">Add a clean headshot for your dashboard.</div>
                  </div>
                </div>

                <label className="mt-4 inline-flex w-full cursor-pointer items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 transition hover:bg-emerald-500/15">
                  <span className="inline-flex items-center gap-2"><Upload size={16} /> Upload profile picture</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-8">
              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-sm uppercase tracking-[0.26em] text-white/45">Role selection</h3>
                  <div className="text-xs text-white/40">Switch anytime before submitting</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {onboardingRoles.map((role) => {
                    const active = selectedRole === role.id
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-emerald-400/50 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.25)_inset]' : 'border-white/10 bg-white/[0.03] hover:border-emerald-400/25 hover:bg-emerald-500/8'}`}
                      >
                        <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-200/70">{role.eyebrow}</div>
                        <div className="mt-2 text-sm font-semibold text-white">{role.label}</div>
                        <div className="mt-1 text-xs leading-5 text-white/45">{role.title}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={fieldWrapperClass}>
                <div className="mb-4 flex items-center gap-2 text-white/70">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-200">
                    <Users size={16} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">Core details</div>
                    <div className="text-xs text-white/45">Required for every role</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
                  <div>
                    <label className="text-sm text-white/75">Full Name <span className="text-emerald-300">*</span></label>
                    <input
                      value={values.fullName}
                      onChange={(event) => handleFieldChange('fullName', event.target.value)}
                      type="text"
                      placeholder="Enter your full name"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-emerald-400/40 focus:bg-black/35 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                      required
                    />

                    </div>

                  <div>
                    <label className="text-sm text-white/75">Membership As</label>
                    <div className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/60">
                      {roleConfig.label}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-white/75">Profile Picture</label>
                    <div className="mt-2 rounded-xl border border-dashed border-white/12 bg-black/20 px-4 py-3 text-sm text-white/45">
                      {avatarPreview ? 'Image ready for dashboard preview' : 'Optional upload from the panel on the right'}
                    </div>
                  </div>
                </div>
              </div>

              <div className={fieldWrapperClass}>
                <div className="mb-4 flex items-center gap-2 text-white/70">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-200">
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">Contact and identity</div>
                    <div className="text-xs text-white/45">Always collected before dashboard access</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {onboardingCommonFields.map((field) => {
                    const spanClass = field.span === 2 ? 'xl:col-span-2' : field.span === 3 ? 'xl:col-span-3' : ''
                    return (
                      <div key={field.name} className={spanClass}>
                        <label className="text-sm text-white/75">
                          {field.label} {field.required ? <span className="text-emerald-300">*</span> : null}
                        </label>
                        <InputControl field={field} value={values[field.name] ?? ''} onChange={handleFieldChange} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div key={selectedRole} className={`${fieldWrapperClass} transition-all duration-300`}>
                <div className="mb-4 flex items-center gap-2 text-white/70">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-200">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">Role-specific fields</div>
                    <div className="text-xs text-white/45">Changes when you choose a different role</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {roleFields.map((field) => {
                    const spanClass = field.span === 2 ? 'xl:col-span-2' : field.span === 3 ? 'xl:col-span-3' : ''
                    return (
                      <div key={field.name} className={spanClass}>
                        <label className="text-sm text-white/75">
                          {field.label} {field.required ? <span className="text-emerald-300">*</span> : null}
                        </label>
                        <InputControl field={field} value={values[field.name] ?? ''} onChange={handleFieldChange} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl text-sm text-white/50">
                  By continuing, you agree to complete a profile that matches your community role and will be used to personalize your dashboard.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 py-3 text-sm font-semibold text-black shadow-[0_14px_40px_-12px_rgba(16,185,129,0.65)] transition hover:scale-[1.01] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
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
