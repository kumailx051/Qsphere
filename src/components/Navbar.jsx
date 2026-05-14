import { useState } from 'react'
import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

const Navbar = ({ currentPage = 'home' }) => {
  const [menuOpen, setMenuOpen] = useState(false)

  const isHomePage = currentPage === 'home'
  const isAboutPage = currentPage === 'about'
  const isContactPage = currentPage === 'contact'

  return (
    <>
      {/* Desktop + Tablet Navbar */}
      <div className="fixed left-0 right-0 top-0 z-50 pointer-events-none">
        <div className="pointer-events-auto mx-auto w-full max-w-6xl px-5 pt-6">
          <div className="flex items-center justify-between rounded-full border border-emerald-400/35 bg-black/70 px-4 py-3 backdrop-blur-2xl shadow-[0_0_36px_rgba(16,185,129,0.28)]">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-emerald-400/30 bg-black/40 shadow-[0_0_18px_rgba(16,185,129,0.35)]">
                <img src={logoImg} alt="QSphere logo" className="h-full w-full object-contain p-1" />
              </div>
              <div className="text-[11px] tracking-[0.45em] font-semibold text-emerald-100">
                QSPHERE
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 text-[12px] tracking-[0.22em] text-white/90">
              <Link to="/" className={isHomePage ? "relative text-emerald-200" : "hover:text-emerald-200 transition-colors"}>
                Home
                {isHomePage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <a href="#" className="hover:text-emerald-200 transition-colors">Blogs</a>
              <a href="#" className="hover:text-emerald-200 transition-colors">Groups</a>
              <Link to="/about" className={isAboutPage ? "relative text-emerald-200" : "hover:text-emerald-200 transition-colors"}>
                About
                {isAboutPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/contact" className={isContactPage ? "relative text-emerald-200" : "hover:text-emerald-200 transition-colors"}>
                Contact
                {isContactPage && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
            </nav>

            {/* CTA + Menu Button */}
            <div className="flex items-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-[11px] tracking-[0.2em] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30 transition-colors"
              >
                Join Community
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/20 text-emerald-200">
                  →
                </span>
              </Link>

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 hover:bg-white/20 transition-colors md:hidden"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-haspopup="dialog"
                onClick={() => setMenuOpen(true)}
              >
                <div className="space-y-1.5">
                  <span className="block h-0.5 w-4 bg-white/80" />
                  <span className="block h-0.5 w-4 bg-white/80" />
                  <span className="block h-0.5 w-4 bg-white/80" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            className="absolute right-4 top-4 bottom-4 flex w-[min(90vw,360px)] flex-col rounded-3xl border border-emerald-400/25 bg-black/75 p-6 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-emerald-400/30 bg-black/40 shadow-[0_0_18px_rgba(16,185,129,0.35)]">
                  <img src={logoImg} alt="QSphere logo" className="h-full w-full object-contain p-1" />
                </div>
                <div className="text-[11px] tracking-[0.45em] font-semibold text-emerald-100">
                  QSPHERE
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/90 hover:bg-white/20 transition-colors"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <span className="text-lg leading-none">x</span>
              </button>
            </div>

            <nav className="mt-10 flex flex-col gap-5 text-base text-white/90">
              <Link to="/" className={isHomePage ? "flex items-center justify-between text-emerald-200" : "hover:text-emerald-200 transition-colors"} onClick={() => setMenuOpen(false)}>
                Home
                {isHomePage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <a href="#" className="hover:text-emerald-200 transition-colors" onClick={() => setMenuOpen(false)}>Blogs</a>
              <a href="#" className="hover:text-emerald-200 transition-colors" onClick={() => setMenuOpen(false)}>Groups</a>
              <Link to="/about" className={isAboutPage ? "flex items-center justify-between text-emerald-200" : "hover:text-emerald-200 transition-colors"} onClick={() => setMenuOpen(false)}>
                About
                {isAboutPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
              <Link to="/contact" className={isContactPage ? "flex items-center justify-between text-emerald-200" : "hover:text-emerald-200 transition-colors"} onClick={() => setMenuOpen(false)}>
                Contact
                {isContactPage && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </Link>
            </nav>

            <div className="mt-auto pt-8">
              <Link
                to="/auth"
                className="inline-flex w-full items-center justify-between rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-[12px] tracking-[0.2em] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Join Community
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/20 text-emerald-200">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
