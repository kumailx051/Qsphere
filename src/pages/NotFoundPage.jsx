import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  return (
    <div className="relative" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: palette.bgPrimary }}>
      <Navbar currentPage="home" />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <div className="absolute inset-0" style={{
          opacity: isDayMode ? 0.6 : 0.4,
          background: `radial-gradient(circle at 50% 0%, ${isDayMode ? 'rgba(46,197,138,0.18)' : 'rgba(16,185,129,0.15)'} 0%, transparent 70%)`,
        }} />
      </div>

      <main className="relative z-10 flex-grow flex items-center justify-center px-6 pt-32 pb-24">
        <div className="text-center max-w-lg">
          <div className="font-black leading-none mb-4" style={{
            fontSize: 'clamp(5rem, 12vw, 9rem)',
            fontFamily: "'Archivo Black', 'Inter', sans-serif",
            color: palette.accentPrimary,
            textShadow: `0 0 60px ${isDayMode ? 'rgba(46,197,138,0.2)' : 'rgba(16,185,129,0.25)'}`,
          }}>
            404
          </div>
          <div className="w-16 h-0.5 mx-auto mb-6" style={{ backgroundColor: palette.accentBorder }} />
          <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif", color: palette.textPrimary }}>
            Page Not Found
          </h1>
          <p className="text-sm md:text-base leading-relaxed mb-8" style={{ color: palette.textMuted }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold transition-all"
              style={{
                backgroundColor: palette.accentPrimary,
                color: isDayMode ? '#FFFFFF' : '#000000',
                boxShadow: `0 0 25px ${isDayMode ? 'rgba(46,197,138,0.25)' : 'rgba(16,185,129,0.2)'}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDayMode ? dayTheme.accentDark : '#6ee7b7'
                e.currentTarget.style.boxShadow = `0 0 35px ${isDayMode ? 'rgba(46,197,138,0.35)' : 'rgba(16,185,129,0.35)'}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = palette.accentPrimary
                e.currentTarget.style.boxShadow = `0 0 25px ${isDayMode ? 'rgba(46,197,138,0.25)' : 'rgba(16,185,129,0.2)'}`
              }}
            >
              Go Home
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all"
              style={{
                border: `1px solid ${palette.borderPrimary}`,
                backgroundColor: palette.btnSecondaryBg,
                color: palette.btnSecondaryText,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = palette.btnSecondaryHoverBg
                e.currentTarget.style.borderColor = palette.btnSecondaryHoverBorder
                e.currentTarget.style.color = palette.btnSecondaryHoverText
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = palette.btnSecondaryBg
                e.currentTarget.style.borderColor = palette.borderPrimary
                e.currentTarget.style.color = palette.btnSecondaryText
              }}
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
