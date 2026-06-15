import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="relative bg-[#060a06]" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentPage="home" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#060a06]" />
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.15) 0%, transparent 70%)' }} />
      </div>

      <main className="relative z-10 flex-grow flex items-center justify-center px-6 pt-32 pb-24">
        <div className="text-center max-w-lg">
          <div className="text-emerald-400 font-black leading-none mb-4" style={{ fontSize: 'clamp(5rem, 12vw, 9rem)', fontFamily: "'Archivo Black', 'Inter', sans-serif", textShadow: '0 0 60px rgba(16,185,129,0.25)' }}>
            404
          </div>
          <div className="w-16 h-0.5 bg-emerald-400/40 mx-auto mb-6" />
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}>
            Page Not Found
          </h1>
          <p className="text-white/50 text-sm md:text-base leading-relaxed mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 text-black px-6 py-3 text-sm font-extrabold hover:bg-emerald-300 transition-all shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:shadow-[0_0_35px_rgba(16,185,129,0.35)]"
            >
              Go Home
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/70 hover:text-white hover:border-white/20 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
