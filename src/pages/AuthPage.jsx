import { useState } from 'react'
import Navbar from '../components/Navbar'

const AuthPage = () => {
  const [mode, setMode] = useState('login')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)

  const isLogin = mode === 'login'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030705] text-white">
      <Navbar currentPage="auth" />

      <canvas
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full opacity-80"
        style={{ zIndex: 0 }}
      />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 15% 30%, rgba(0,229,160,0.12), transparent 55%), radial-gradient(ellipse at 85% 70%, rgba(0,180,120,0.09), transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(0,120,80,0.12), transparent 60%)',
          zIndex: 1,
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-28">
        <div className="w-full max-w-[460px] rounded-[20px] border border-emerald-400/15 bg-[rgba(4,18,10,0.88)] p-8 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8),0_0_60px_-10px_rgba(0,229,160,0.15)] backdrop-blur-[28px] saturate-[160%]">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-emerald-400/25 bg-emerald-500/5 px-3 py-2">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-[12px] font-extrabold text-emerald-300">Q</div>
            <div className="text-[13px] font-bold tracking-[0.18em] text-white">QSPHERE</div>
          </div>

          <div className="mb-5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(0,229,160,0.8)]" />
            {isLogin ? 'Secure Access Portal' : 'Create Your Dimension'}
          </div>

          <h1 className="mb-2 text-[30px] font-black leading-[1.1] tracking-tight text-white">
            {isLogin ? (
              <>
                Sign In to the <span className="text-emerald-300">Quantum</span><br />Grid.
              </>
            ) : (
              <>
                Join the <span className="text-emerald-300">Quantum</span><br />Community.
              </>
            )}
          </h1>
          <p className="mb-7 text-sm font-light leading-6 text-white/45">
            {isLogin
              ? 'Access your dimension of cutting-edge quantum science and collaboration.'
              : 'Collaborate with researchers and pioneers shaping the future of quantum science.'}
          </p>

          {isLogin ? (
            <div className="space-y-4">
              <div className="relative">
                <input className="w-full rounded-xl border border-emerald-400/10 bg-emerald-500/[0.03] px-4 pb-2 pt-[17px] pr-11 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:bg-emerald-500/[0.05]" type="email" placeholder=" " autoComplete="email" />
                <label className="pointer-events-none absolute left-4 top-[13px] text-[13px] text-white/40">Email address</label>
              </div>
              <div className="relative">
                <input className="w-full rounded-xl border border-emerald-400/10 bg-emerald-500/[0.03] px-4 pb-2 pt-[17px] pr-11 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:bg-emerald-500/[0.05]" type={showLoginPassword ? 'text' : 'password'} placeholder=" " autoComplete="current-password" />
                <label className="pointer-events-none absolute left-4 top-[13px] text-[13px] text-white/40">Password</label>
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-emerald-300" onClick={() => setShowLoginPassword((value) => !value)}>
                  {showLoginPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-white/55">
                  <input type="checkbox" className="h-[15px] w-[15px] rounded-[3px] border border-emerald-400/30 bg-emerald-500/[0.04]" defaultChecked />
                  Remember me
                </label>
                <button type="button" className="text-emerald-300 hover:text-emerald-200">Forgot password?</button>
              </div>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-emerald-300 to-emerald-500 px-4 py-3.5 font-semibold text-black shadow-[0_8px_24px_-6px_rgba(0,229,160,0.5),0_0_20px_rgba(0,229,160,0.2)] transition hover:-translate-y-0.5 hover:brightness-105" type="button">
                Sign In <span>→</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <input className="w-full rounded-xl border border-emerald-400/10 bg-emerald-500/[0.03] px-4 pb-2 pt-[17px] pr-11 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:bg-emerald-500/[0.05]" type="text" placeholder=" " />
                <label className="pointer-events-none absolute left-4 top-[13px] text-[13px] text-white/40">Full name</label>
              </div>
              <div className="relative">
                <input className="w-full rounded-xl border border-emerald-400/10 bg-emerald-500/[0.03] px-4 pb-2 pt-[17px] pr-11 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:bg-emerald-500/[0.05]" type="email" placeholder=" " autoComplete="email" />
                <label className="pointer-events-none absolute left-4 top-[13px] text-[13px] text-white/40">Email address</label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative">
                  <input className="w-full rounded-xl border border-emerald-400/10 bg-emerald-500/[0.03] px-4 pb-2 pt-[17px] pr-11 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:bg-emerald-500/[0.05]" type={showRegisterPassword ? 'text' : 'password'} placeholder=" " />
                  <label className="pointer-events-none absolute left-4 top-[13px] text-[13px] text-white/40">Password</label>
                </div>
                <div className="relative">
                  <input className="w-full rounded-xl border border-emerald-400/10 bg-emerald-500/[0.03] px-4 pb-2 pt-[17px] pr-11 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:bg-emerald-500/[0.05]" type={showRegisterPassword ? 'text' : 'password'} placeholder=" " />
                  <label className="pointer-events-none absolute left-4 top-[13px] text-[13px] text-white/40">Confirm</label>
                </div>
              </div>

              <button type="button" className="text-left text-[11px] text-emerald-300/55 hover:text-emerald-200" onClick={() => setShowRegisterPassword((value) => !value)}>
                {showRegisterPassword ? 'Hide passwords' : 'Show passwords'}
              </button>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-emerald-300 to-emerald-500 px-4 py-3.5 font-semibold text-black shadow-[0_8px_24px_-6px_rgba(0,229,160,0.5),0_0_20px_rgba(0,229,160,0.2)] transition hover:-translate-y-0.5 hover:brightness-105" type="button">
                Create Account <span>→</span>
              </button>
            </div>
          )}

          <div className="my-6 flex items-center">
            <div className="h-px flex-1 bg-emerald-400/10" />
            <span className="mx-3 text-[10px] uppercase tracking-[0.3em] text-emerald-300/35">or</span>
            <div className="h-px flex-1 bg-emerald-400/10" />
          </div>

          <div className="text-center text-sm text-white/50">
            {isLogin ? (
              <>
                New to QSPHERE?{' '}
                <button type="button" className="font-semibold text-emerald-300 hover:text-emerald-200" onClick={() => setMode('register')}>
                  Join the Community →
                </button>
              </>
            ) : (
              <>
                Already a member?{' '}
                <button type="button" className="font-semibold text-emerald-300 hover:text-emerald-200" onClick={() => setMode('login')}>
                  ← Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  )
}

export default AuthPage