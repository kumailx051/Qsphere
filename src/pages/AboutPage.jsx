import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Award,
  BookOpenText,
  FolderKanban,
  Globe2,
  Lightbulb,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import aboutVideo from '../assets/about.mp4'
import aboutDayVideo from '../assets/aboutDay.mp4'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

const stats = [
  {
    number: '50+',
    label: 'Researchers',
    description: 'Experts exploring quantum systems, hardware, and emerging applications.',
    icon: Users,
  },
  {
    number: '20+',
    label: 'Projects',
    description: 'Active initiatives turning experimental theory into visible momentum.',
    icon: FolderKanban,
  },
  {
    number: '10+',
    label: 'Collaborations',
    description: 'Cross-disciplinary partnerships linking academia, labs, and industry.',
    icon: Globe2,
  },
  {
    number: '5+',
    label: 'Awards',
    description: 'Recognition for the quality, originality, and impact of the work.',
    icon: Award,
  },
]

const identityPillars = [
  {
    title: 'Collaboration',
    text: 'Students, researchers, industry professionals, and experts come together in one ecosystem built to share knowledge and move ideas forward.',
    icon: Users,
  },
  {
    title: 'Education',
    text: 'We support the next generation of quantum scientists through mentorship, community learning, and access to meaningful opportunities.',
    icon: BookOpenText,
  },
  {
    title: 'Impact',
    text: 'We bridge research and real-world application so quantum technologies can create lasting value across industries and society.',
    icon: Rocket,
  },
]

const operatingPrinciples = [
  {
    title: 'Think Beyond Hype',
    text: 'We focus on substance, rigor, and directional clarity instead of empty futurism.',
    icon: Lightbulb,
  },
  {
    title: 'Build Across Disciplines',
    text: 'Quantum progress happens faster when researchers, engineers, and educators collaborate in the same room.',
    icon: Sparkles,
  },
  {
    title: 'Turn Research Into Motion',
    text: 'Ideas matter most when they move toward experiments, tools, learning systems, and real-world use.',
    icon: ArrowUpRight,
  },
]

export default function AboutPage() {
  const videoRef = useRef(null)
  const statsRef = useRef(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const { theme } = useTheme()

  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const currentVideo = isDayMode ? aboutDayVideo : aboutVideo

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
      const playPromise = videoRef.current.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {})
      }
    }
  }, [currentVideo])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true)
        }
      },
      { threshold: 0.25 },
    )

    if (statsRef.current) {
      observer.observe(statsRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="relative overflow-hidden"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: palette.bgPrimary,
      }}
    >
      <Navbar currentPage="about" />

      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ backgroundColor: palette.bgPrimary }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.6 : 0.4,
            background: isDayMode
              ? 'radial-gradient(circle at 16% 0%, rgba(46,197,138,0.14) 0%, transparent 42%)'
              : 'radial-gradient(circle at 16% 0%, rgba(16,185,129,0.2) 0%, transparent 40%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.26 : 0.2,
            background: isDayMode
              ? 'radial-gradient(circle at 100% 12%, rgba(255,224,163,0.22) 0%, transparent 34%)'
              : 'radial-gradient(circle at 100% 12%, rgba(6,182,212,0.12) 0%, transparent 34%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: isDayMode ? 0.12 : 0.14,
            backgroundImage: isDayMode
              ? 'linear-gradient(rgba(10,22,32,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(10,22,32,0.035) 1px, transparent 1px)'
              : 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '124px 124px',
            maskImage: 'radial-gradient(circle at 50% 16%, black 24%, transparent 88%)',
          }}
        />
      </div>

      <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto max-w-[1500px]">
          <section
            className="relative overflow-hidden rounded-[40px]"
            style={{
              animation: 'aboutFadeUp 0.8s ease-out both',
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode
                ? 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(247,247,245,0.88))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
              boxShadow: palette.shadowCard,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: isDayMode
                  ? 'linear-gradient(to right, transparent, rgba(46,197,138,0.55), transparent)'
                  : 'linear-gradient(to right, transparent, rgba(110,231,183,0.5), transparent)',
              }}
            />
            <div
              className="absolute -left-12 top-0 h-72 w-72 rounded-full blur-3xl"
              style={{ backgroundColor: isDayMode ? 'rgba(46,197,138,0.12)' : 'rgba(16,185,129,0.1)' }}
            />
            <div
              className="absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl"
              style={{ backgroundColor: isDayMode ? 'rgba(255,224,163,0.2)' : 'rgba(6,182,212,0.1)' }}
            />

            <div className="relative grid gap-0 xl:grid-cols-[1.02fr_0.98fr]">
              <div className="relative z-10 p-7 md:p-10 xl:p-12">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span
                    className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.34em]"
                    style={{
                      border: `1px solid ${palette.accentBorder}`,
                      backgroundColor: palette.accentSoft,
                      color: palette.accentDark,
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: palette.accentPrimary,
                        boxShadow: isDayMode
                          ? '0 0 18px rgba(46,197,138,0.45)'
                          : '0 0 18px rgba(16,185,129,0.8)',
                      }}
                    />
                    About Us
                  </span>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em]"
                    style={{
                      border: `1px solid ${palette.borderPrimary}`,
                      backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)',
                      color: palette.textMuted,
                    }}
                  >
                    <Sparkles size={14} style={{ color: palette.accentPrimary }} />
                    Vision in motion
                  </span>
                </div>

                <h1
                  className="max-w-5xl text-5xl font-bold leading-[0.9] md:text-6xl xl:text-[5.35rem]"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    color: palette.textPrimary,
                    textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.6)' : '0 0 40px rgba(16,185,129,0.08)',
                  }}
                >
                  Building the future
                  <br />
                  <span style={{ color: palette.accentPrimary }}>through quantum possibility.</span>
                </h1>

                <p
                  className="mt-7 max-w-3xl text-base leading-8 md:text-lg xl:text-[1.12rem]"
                  style={{ color: palette.textSecondary }}
                >
                  We are a collective of researchers, engineers, and visionaries working to turn quantum science into a living, collaborative force for progress.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href="#identity-section"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                    style={{
                      border: `1px solid ${isDayMode ? 'transparent' : palette.btnPrimaryBorder}`,
                      backgroundColor: palette.btnPrimaryBg,
                      color: palette.btnPrimaryText,
                      boxShadow: isDayMode ? '0 20px 45px rgba(30,158,107,0.18)' : 'none',
                    }}
                  >
                    Explore our story
                    <ArrowUpRight size={16} />
                  </a>
                  <a
                    href="#principles-section"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold no-underline transition-all"
                    style={{
                      border: `1px solid ${palette.btnSecondaryBorder}`,
                      backgroundColor: palette.btnSecondaryBg,
                      color: palette.btnSecondaryText,
                    }}
                  >
                    See how we work
                    <ArrowUpRight size={16} />
                  </a>
                </div>

                <div
                  className="mt-10 rounded-[30px] p-6 backdrop-blur-xl"
                  style={{
                    border: `1px solid ${palette.borderPrimary}`,
                    backgroundColor: isDayMode ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.28em]"
                    style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}
                  >
                    Mission signal
                  </div>
                  <p className="mt-4 text-base leading-8" style={{ color: palette.textSecondary }}>
                    Our mission is to unlock the potential of quantum computing, connect ambitious minds across disciplines, and create a community where bold research becomes practical, visible momentum.
                  </p>
                </div>
              </div>

              <div className="relative min-h-[420px] overflow-hidden xl:min-h-[760px]">
                <video
                  key={currentVideo}
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay
                >
                  <source src={currentVideo} type="video/mp4" />
                </video>

                <div
                  className="absolute inset-0"
                  style={{
                    background: isDayMode
                      ? 'linear-gradient(90deg, rgba(250,249,247,0.96) 0%, rgba(250,249,247,0.58) 24%, rgba(250,249,247,0.14) 48%, rgba(250,249,247,0.76) 100%)'
                      : 'linear-gradient(90deg, rgba(4,7,4,0.92) 0%, rgba(4,7,4,0.56) 25%, rgba(4,7,4,0.18) 48%, rgba(4,7,4,0.8) 100%)',
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: isDayMode
                      ? 'radial-gradient(circle at 75% 35%, transparent 0%, rgba(255,255,255,0.18) 44%, rgba(250,249,247,0.72) 100%)'
                      : 'radial-gradient(circle at 75% 35%, transparent 0%, rgba(4,7,4,0.3) 44%, rgba(4,7,4,0.88) 100%)',
                  }}
                />

                <div className="absolute bottom-6 left-6 right-6 z-10 md:bottom-8 md:left-8 md:right-8">
                  <div
                    className="rounded-[30px] p-6 backdrop-blur-xl"
                    style={{
                      border: `1px solid ${isDayMode ? 'rgba(46,197,138,0.22)' : 'rgba(16,185,129,0.14)'}`,
                      backgroundColor: isDayMode ? 'rgba(255,255,255,0.68)' : 'rgba(6,14,11,0.58)',
                      boxShadow: isDayMode ? '0 24px 80px rgba(15,23,42,0.12)' : '0 24px 80px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.28em]"
                      style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}
                    >
                      Why we exist
                    </div>
                    <h2 className="mt-4 text-3xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                      A quantum community built to turn hard ideas into real progress.
                    </h2>
                    <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      We believe the most meaningful breakthroughs happen when research, education, and collaboration stop operating in silos and start accelerating one another.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={statsRef}
              className="relative z-20"
              style={{
                borderTop: `1px solid ${isDayMode ? 'rgba(46,197,138,0.16)' : 'rgba(16,185,129,0.1)'}`,
                background: isDayMode
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(249,248,245,0.92))'
                  : 'linear-gradient(180deg, rgba(5,9,7,0.18), rgba(5,9,7,0.8))',
              }}
            >
              <div className="grid gap-6 px-6 py-8 md:grid-cols-2 md:px-10 xl:grid-cols-4 xl:px-12 xl:py-10">
                {stats.map((stat, index) => {
                  const Icon = stat.icon

                  return (
                    <div
                      key={stat.label}
                      className="rounded-[28px] p-5 backdrop-blur-xl"
                      style={{
                        opacity: statsVisible ? 1 : 0,
                        transform: statsVisible ? 'translateY(0)' : 'translateY(20px)',
                        transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.12}s`,
                        border: `1px solid ${isDayMode ? palette.borderPrimary : 'rgba(255,255,255,0.06)'}`,
                        backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-4xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                            {stat.number}
                          </div>
                          <div className="mt-2 text-sm font-semibold" style={{ color: palette.textPrimary }}>
                            {stat.label}
                          </div>
                        </div>
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl"
                          style={{
                            border: `1px solid ${palette.accentBorder}`,
                            backgroundColor: palette.accentSoft,
                            color: palette.accentPrimary,
                          }}
                        >
                          <Icon size={22} />
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                        {stat.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section id="identity-section" className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
            <div
              className="rounded-[34px] p-7 md:p-10"
              style={{
                border: `1px solid ${palette.borderPrimary}`,
                background: isDayMode
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,247,245,0.9))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.34)',
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>
                Who we are
              </div>
              <h2 className="mt-5 text-4xl font-bold leading-[0.95] md:text-5xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                A quantum community shaped for depth, not noise.
              </h2>
              <div className="mt-7 space-y-6 text-base leading-8" style={{ color: palette.textSecondary }}>
                <p>
                  We are a passionate and forward-thinking collective united by a shared vision to build the future of quantum science through collaborative research, meaningful education, and real-world application.
                </p>
                <p>
                  By bridging the gap between academia and industry, we accelerate development while making sure that research does more than push theory forward. It needs to serve people, systems, and the greater good.
                </p>
                <p>
                  Our long-term goal is to cultivate a thriving environment where collaboration compounds over time and quantum science becomes a force for measurable impact across generations.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              {identityPillars.map((pillar, index) => {
                const Icon = pillar.icon

                return (
                  <div
                    key={pillar.title}
                    className="rounded-[30px] p-6"
                    style={{
                      animation: `aboutFadeUp 0.7s ease-out ${0.08 + index * 0.08}s both`,
                      border: `1px solid ${palette.borderPrimary}`,
                      background: isDayMode
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,247,245,0.92))'
                        : 'linear-gradient(180deg, rgba(8,14,11,0.92), rgba(5,9,7,0.7))',
                      boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.28)',
                    }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        border: `1px solid ${palette.accentBorder}`,
                        backgroundColor: palette.accentSoft,
                        color: palette.accentPrimary,
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>
                      {pillar.title}
                    </div>
                    <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      {pillar.text}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          <section
            id="principles-section"
            className="mt-8 overflow-hidden rounded-[34px] p-7 md:p-10"
            style={{
              border: `1px solid ${palette.borderPrimary}`,
              background: isDayMode
                ? 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,247,245,0.88))'
                : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
              boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.34)',
            }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>
                  How we move
                </div>
                <h2 className="mt-4 text-4xl font-bold leading-[0.95] md:text-5xl" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                  Operating principles for serious progress.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                These principles shape the way we learn, collaborate, and decide what kind of quantum future is worth building.
              </p>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-3">
              {operatingPrinciples.map((principle, index) => {
                const Icon = principle.icon

                return (
                  <div
                    key={principle.title}
                    className="rounded-[30px] p-6 backdrop-blur-xl"
                    style={{
                      animation: `aboutFadeUp 0.7s ease-out ${0.1 + index * 0.08}s both`,
                      border: `1px solid ${palette.borderPrimary}`,
                      backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.2)',
                    }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        border: `1px solid ${palette.accentBorder}`,
                        backgroundColor: palette.accentSoft,
                        color: palette.accentPrimary,
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <h3 className="mt-5 text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: palette.textPrimary }}>
                      {principle.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      {principle.text}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes aboutFadeUp {
          from {
            opacity: 0;
            transform: translateY(26px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
