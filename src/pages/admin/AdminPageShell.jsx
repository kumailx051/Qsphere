import AdminNavbar from './AdminNavbar'
import { useTheme } from '../../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../../themeColors'

export default function AdminPageShell({ eyebrow, title, description, actions, children }) {
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  return (
    <div className="relative min-h-screen overflow-x-clip" style={{ backgroundColor: palette.bgPrimary, color: palette.textPrimary }}>
      <AdminNavbar />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <div className="absolute inset-0" style={{ background: isDayMode ? 'radial-gradient(circle at 12% 0%, rgba(46,197,138,0.13), transparent 36%), radial-gradient(circle at 100% 10%, rgba(6,182,212,0.08), transparent 28%)' : 'radial-gradient(circle at 12% 0%, rgba(16,185,129,0.17), transparent 36%), radial-gradient(circle at 100% 10%, rgba(6,182,212,0.1), transparent 28%)' }} />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: `linear-gradient(${palette.borderSoft} 1px, transparent 1px), linear-gradient(90deg, ${palette.borderSoft} 1px, transparent 1px)`, backgroundSize: '120px 120px', maskImage: 'radial-gradient(circle at 50% 18%, black 22%, transparent 82%)' }} />
      </div>

      <main className="relative z-10 px-6 pb-20 pt-32 md:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto max-w-[1500px]">
          <section className="relative overflow-hidden rounded-[38px] p-7 md:p-10" style={{ border: `1px solid ${palette.borderPrimary}`, background: isDayMode ? 'linear-gradient(145deg, rgba(255,255,255,0.97), rgba(247,247,245,0.88))' : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))', boxShadow: palette.shadowCard }}>
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${palette.accentPrimary}, transparent)` }} />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.34em]" style={{ color: palette.accentDark }}>{eyebrow}</div>
                <h1 className="mt-4 max-w-5xl text-4xl font-bold leading-[0.92] md:text-6xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>{title}</h1>
                {description ? <p className="mt-5 max-w-3xl text-base leading-8" style={{ color: palette.textSecondary }}>{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </section>

          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
