import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookPlus,
  CheckCircle2,
  LayoutDashboard,
  PenLine,
  Settings,
  Sparkles,
  UserCog,
  Users2,
} from 'lucide-react'
import { onboardingRoles } from '../data/onboarding'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const storageKey = 'qsphere_onboarding_profile'

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

/* ─── Quick-stat helper ────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, accent = false }) => (
  <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 transition-all duration-300 hover:border-emerald-400/20 hover:bg-white/[0.04]">
    <div
      className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      style={{ boxShadow: 'inset 0 0 24px rgba(16,185,129,0.06)' }}
    />
    <div className="relative z-10 flex items-center gap-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/10 text-emerald-300">
        <Icon size={18} />
      </span>
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{label}</div>
        <div className={`mt-1 text-sm font-semibold ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
      </div>
    </div>
  </div>
)

/* ─── Action card (Add Blog / Add Group / Account) ─────────────── */
const ActionCard = ({ icon: Icon, title, description, to, onClick, gradient, delay = 0 }) => {
  const inner = (
    <div
      className="group relative flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-white/[0.04] p-7 backdrop-blur-xl transition-all duration-500 hover:border-emerald-400/25 hover:bg-white/[0.07] hover:-translate-y-1 cursor-pointer overflow-hidden"
      style={{ animation: `dashFadeUp 0.7s ease-out ${delay}s both`, minHeight: 220 }}
    >
      {/* Background gradient glow */}
      <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl"
          style={{
            background: gradient || 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.16), transparent 70%)',
          }}
      />
      {/* Hover border glow */}
      <div
          className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 30px rgba(16,185,129,0.1)' }}
      />

      <div className="relative z-10">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-shadow duration-500">
          <Icon size={24} />
        </div>
        <h3
          className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors duration-300"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/45">{description}</p>
      </div>

      <div className="relative z-10 mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-1 group-hover:translate-y-0">
        Open
        <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </div>
  )

  if (to) return <Link to={to} className="block no-underline">{inner}</Link>
  return <button type="button" onClick={onClick} className="block w-full text-left">{inner}</button>
}

/* ═══════════════════════════════════════════════════════════════════
   DashboardPage
   ═══════════════════════════════════════════════════════════════════ */
const DashboardPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState(() => location.state?.profile ?? readStoredProfile())

  useEffect(() => {
    if (location.state?.profile) {
      setProfile(location.state.profile)
      return
    }
    setProfile(readStoredProfile())
  }, [location.state])

  const roleConfig = useMemo(() => {
    if (!profile?.role) return onboardingRoles[0]
    return onboardingRoles.find((role) => role.id === profile.role) ?? onboardingRoles[0]
  }, [profile])

  /* ── No-profile fallback ────────────────────────────────────── */
  if (!profile) {
    return (
      <div className="relative bg-[#08120d]" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar currentPage="dashboard" />

        {/* Background */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0 bg-[#08120d]" />
          <div className="absolute inset-0 opacity-45" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pt-28 pb-20">
          <div
            className="w-full max-w-lg rounded-3xl border border-emerald-400/18 bg-white/[0.05] p-10 text-center backdrop-blur-2xl"
            style={{ animation: 'dashFadeUp 0.7s ease-out both', boxShadow: '0 30px 90px -30px rgba(0,0,0,0.9)' }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
              <LayoutDashboard size={28} />
            </div>
            <h1 className="mt-6 text-3xl text-white font-black tracking-tight" style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}>
              Your dashboard is waiting.
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/50">
              Complete the onboarding form first so we can build your personalized dashboard.
            </p>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="mt-8 inline-flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-7 py-3.5 text-sm font-semibold text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:bg-emerald-500/25 hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all duration-300"
            >
              Start onboarding
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <Footer />

        <style>{`
          @keyframes dashFadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  /* ── Data ────────────────────────────────────────────────────── */
  const submittedAt = profile.submittedAt ? new Date(profile.submittedAt) : null
  const submittedLabel = submittedAt
    ? submittedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Just now'

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="relative bg-[#08120d]" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentPage="dashboard" />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#08120d]" />
        <div
          className="absolute inset-0 opacity-45"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-24"
          style={{ background: 'radial-gradient(circle at 100% 100%, rgba(6,182,212,0.16) 0%, transparent 50%)' }}
        />
      </div>

      {/* ───────────────────── Main content ───────────────────── */}
      <main className="relative z-10 flex-grow px-6 md:px-10 lg:px-14 pt-32 pb-24">
        <div className="mx-auto w-full max-w-7xl">

          {/* ── Welcome header ──────────────────────────────────── */}
          <div className="mb-10" style={{ animation: 'dashFadeUp 0.6s ease-out both' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 10px rgba(16,185,129,0.9)' }} />
              <span className="text-emerald-400 text-[10px] tracking-[0.3em] font-semibold uppercase">Dashboard</span>
            </div>

            <div>
              <h1
                className="text-white font-black text-4xl md:text-5xl lg:text-6xl tracking-tight"
                style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}
              >
                Welcome back,{' '}
                <span className="text-emerald-400" style={{ textShadow: '0 0 40px rgba(16,185,129,0.25)' }}>
                  {profile.fullName || 'Explorer'}
                </span>
              </h1>
              <p className="mt-3 text-white/50 text-sm md:text-base max-w-2xl leading-relaxed">
                Manage your content, groups, and account settings from your personalized command center.
              </p>
            </div>
          </div>

          {/* ── Quick stats ──────────────────────────────────────── */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
            style={{ animation: 'dashFadeUp 0.6s ease-out 0.15s both' }}
          >
            <StatCard icon={Sparkles} label="Role" value={roleConfig.label} accent />
            <StatCard icon={PenLine} label="Joined" value={submittedLabel} />
            <StatCard icon={Users2} label="Community" value="Member" accent />
          </div>

          {/* ── Action cards ─────────────────────────────────────── */}
          <div className="mb-6" style={{ animation: 'dashFadeUp 0.6s ease-out 0.25s both' }}>
            <h2
              className="text-white text-2xl font-bold tracking-tight mb-1"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Quick Actions
            </h2>
            <p className="text-white/40 text-sm mb-8">Create content, manage groups, or update your account.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <ActionCard
              icon={BookPlus}
              title="Add Blog"
              description="Write and publish a new blog post to share your quantum insights, research findings, or tutorials with the community."
              to="/blogs/new"
              gradient="radial-gradient(circle at 20% 20%, rgba(16,185,129,0.14), transparent 65%)"
              delay={0.3}
            />
            <ActionCard
              icon={Users2}
              title="Add Group"
              description="Create a new research group or collaborative workspace. Invite members and start building something extraordinary together."
              to="/groups/new"
              gradient="radial-gradient(circle at 80% 20%, rgba(6,182,212,0.12), transparent 65%)"
              delay={0.4}
            />
            <ActionCard
              icon={UserCog}
              title="Account Management"
              description="Update your personal details, change your password, manage notification preferences, and configure your profile settings."
              onClick={() => navigate('/account', { state: { profile } })}
              gradient="radial-gradient(circle at 50% 80%, rgba(168,85,247,0.10), transparent 65%)"
              delay={0.5}
            />
          </div>

          {/* ── Explore section ──────────────────────────────────── */}
          <div
            className="rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 md:p-10 shadow-[0_24px_90px_-50px_rgba(0,0,0,0.75)]"
            style={{ animation: 'dashFadeUp 0.7s ease-out 0.55s both' }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <h2
                  className="text-white text-2xl font-bold tracking-tight"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Explore the Community
                </h2>
                <p className="mt-1 text-white/40 text-sm">Discover blogs, join groups, or dive into quantum discussions.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] tracking-[0.2em] text-emerald-300/70 uppercase font-medium">Live community</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Browse Blogs', desc: 'Read the latest articles', to: '/blogs', icon: BookPlus },
                { label: 'Join Groups', desc: 'Collaborate with researchers', to: '/groups', icon: Users2 },
                { label: 'About QSphere', desc: 'Learn about our mission', to: '/about', icon: Sparkles },
                { label: 'Contact Us', desc: 'Get in touch with the team', to: '/contact', icon: Settings },
              ].map((item, i) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 text-white/85 no-underline transition-all duration-300 hover:border-emerald-400/25 hover:bg-emerald-500/[0.08] hover:-translate-y-0.5"
                  style={{ animation: `dashFadeUp 0.5s ease-out ${0.6 + i * 0.08}s both` }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 group-hover:bg-emerald-500/20 transition-colors">
                    <item.icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">{item.label}</div>
                    <div className="text-xs text-white/35">{item.desc}</div>
                  </div>
                  <ArrowRight size={14} className="text-emerald-400/50 group-hover:text-emerald-400 transform group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default DashboardPage
