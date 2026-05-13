import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Contact Us', to: '/contact' },
  { label: 'About Us',   to: '/about'   },
  { label: 'Blogs',      to: '/blogs'   },
]

export default function Footer() {
  return (
    <footer
      style={{
        background: '#000',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '56px 6vw 32px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Top row ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 40,
        }}
      >
        {/* Contact info */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 32px',
            alignItems: 'center',
          }}
        >
          {/* location */}
          <span style={infoStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            10012, Pakistan
          </span>

          <Dot />

          {/* email */}
          <a href="mailto:info@gmail.com" style={{ ...infoStyle, textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            info@gmail.com
          </a>

          <Dot />

          {/* phone */}
          <a href="tel:+1234556789" style={{ ...infoStyle, textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 1.5h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.09a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            +1234556789
          </a>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {NAV_LINKS.map((lnk, i) => (
            <span key={lnk.to} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link
                to={lnk.to}
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  textDecoration: 'none',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.target.style.color = '#10b981')}
                onMouseLeave={e => (e.target.style.color = 'rgba(255,255,255,0.6)')}
              >
                {lnk.label}
              </Link>
              {i < NAV_LINKS.length - 1 && <Dot />}
            </span>
          ))}
        </nav>
      </div>

      {/* ── Divider ────────────────────────────────────────── */}
      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.2),transparent)',
          marginBottom: 28,
        }}
      />

      {/* ── Bottom row ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: '0.03em' }}>
          © 2026 QSphere · All Rights Reserved
        </span>

        <a
          href="https://kumail-raza-portfolio.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12,
            textDecoration: 'none',
            letterSpacing: '0.03em',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#10b981')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
        >
          Built with{' '}
          <span style={{ color: '#e25555', fontSize: 14 }}>❤️</span>
          {' '}· Explore ↗
        </a>
      </div>
    </footer>
  )
}

/* ── Helpers ───────────────────────────────────────────────────── */
const infoStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: 'rgba(255,255,255,0.55)',
  fontSize: 13,
  letterSpacing: '0.02em',
}

const Dot = () => (
  <span style={{ color: 'rgba(16,185,129,0.4)', fontSize: 16, lineHeight: 1 }}>·</span>
)
