import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
  Sparkles,
  User,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import contactVideo from '../assets/contact.mp4'
import contactDayVideo from '../assets/contactDay.mp4'
import { useTheme } from '../contexts/ThemeContext'
import { darkTheme, dayTheme } from '../themeColors'

const CONTACT_DRAFTS_KEY = 'qsphere_contact_submissions'

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Us',
    detail: 'hello@quantumworld.dev',
    href: 'mailto:hello@quantumworld.dev',
  },
  {
    icon: Phone,
    title: 'Call Us',
    detail: '+1 (555) 123-4567',
    href: 'tel:+15551234567',
  },
  {
    icon: MapPin,
    title: 'Our Location',
    detail: 'Quantum Research Lab\nSan Francisco, CA',
    href: null,
  },
  {
    icon: Clock3,
    title: 'Working Hours',
    detail: 'Mon - Fri: 9:00 AM - 6:00 PM\n(PST)',
    href: null,
  },
]

const contactPromises = [
  {
    title: 'Collaboration first',
    text: 'We are open to research conversations, strategic partnerships, and ambitious quantum experiments.',
  },
  {
    title: 'Clarity over friction',
    text: 'Tell us what you are building, exploring, or needing help with, and we will route it with intent.',
  },
  {
    title: 'Fast signal back',
    text: 'Strong messages do not disappear into a void here. We aim to respond with clarity and direction.',
  },
]

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem('qsphere_onboarding_profile')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const showSnackbar = (message, type = 'success') => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('qsphere-snackbar', { detail: { message, type } }))
}

export default function ContactPage() {
  const videoRef = useRef(null)
  const profile = readStoredProfile()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(() => ({
    name: profile?.fullName || '',
    email: profile?.emailAddress || profile?.email || '',
    subject: '',
    message: '',
  }))
  const { theme } = useTheme()

  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme
  const currentVideo = isDayMode ? contactDayVideo : contactVideo

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [currentVideo])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Name is required'
    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!form.subject.trim()) nextErrors.subject = 'Subject is required'
    if (!form.message.trim()) nextErrors.message = 'Message is required'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      showSnackbar('Please complete the required contact fields.', 'error')
      return
    }

    setSending(true)

    window.setTimeout(() => {
      try {
        const existing = JSON.parse(localStorage.getItem(CONTACT_DRAFTS_KEY) || '[]')
        const submission = {
          id: Date.now(),
          ...form,
          submittedAt: new Date().toISOString(),
        }

        localStorage.setItem(CONTACT_DRAFTS_KEY, JSON.stringify([submission, ...existing]))
        setSent(true)
        setForm((current) => ({ ...current, subject: '', message: '' }))
        showSnackbar('Message saved successfully. We will get back to you soon.', 'success')
      } catch {
        showSnackbar('Unable to save your message right now.', 'error')
      } finally {
        setSending(false)
      }
    }, 900)
  }

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
      <Navbar currentPage="contact" />

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
        <div className="qs-page-container space-y-8">
          <section
            className="relative overflow-hidden rounded-[40px]"
            style={{
              animation: 'contactFadeUp 0.8s ease-out both',
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
                    Contact Us
                  </span>
                </div>

                <h1
                  className="type-heading-soft max-w-4xl"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: palette.textPrimary,
                    textShadow: isDayMode ? '0 12px 36px rgba(255,255,255,0.6)' : '0 0 40px rgba(16,185,129,0.08)',
                  }}
                >
                  Let's build the future
                  <br />
                  <span style={{ color: palette.accentPrimary }}>through better conversations.</span>
                </h1>

                <p className="mt-7 max-w-3xl text-base leading-8" style={{ color: palette.textSecondary }}>
                  Have a question, a collaboration idea, or a serious quantum initiative worth talking through? This page is built to make that outreach feel clean, direct, and intentional.
                </p>

                <div className="mt-10 grid gap-4 md:grid-cols-3">
                  {[
                    { label: 'Email lane', value: 'Direct' },
                    { label: 'Response style', value: 'Thoughtful' },
                    { label: 'Best for', value: 'Research + partnerships' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[28px] p-5 backdrop-blur-xl"
                      style={{
                        border: `1px solid ${palette.borderPrimary}`,
                        backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>
                        {item.label}
                      </div>
                      <div className="type-cardHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
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
                      ? 'linear-gradient(90deg, rgba(250,249,247,0.96) 0%, rgba(250,249,247,0.58) 20%, rgba(250,249,247,0.14) 48%, rgba(250,249,247,0.76) 100%)'
                      : 'linear-gradient(90deg, rgba(4,7,4,0.96) 0%, rgba(4,7,4,0.56) 20%, rgba(4,7,4,0.14) 48%, rgba(4,7,4,0.84) 100%)',
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
                      Conversation quality
                    </div>
                    <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                      We care about the signal, not just the message volume.
                    </h2>
                    <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                      Whether you are reaching out for a lab collaboration, research exchange, advisory conversation, or strategic partnership, we want the contact experience to feel sharp and worth your time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
            <aside
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
                Direct channels
              </div>
              <h2 className="mt-5 type-sectionHeading" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                Reach us through the route that fits best.
              </h2>
              <p className="mt-6 text-base leading-8" style={{ color: palette.textSecondary }}>
                Use the form for structured outreach, or jump straight into one of the channels below if your conversation already has a clear destination.
              </p>

              <div className="mt-8 space-y-4">
                {contactInfo.map((item, index) => {
                  const Icon = item.icon
                  const Wrapper = item.href ? 'a' : 'div'

                  return (
                    <Wrapper
                      key={item.title}
                      {...(item.href ? { href: item.href } : {})}
                      className={`group flex items-start gap-4 rounded-[26px] p-5 ${item.href ? 'no-underline transition-all' : ''}`}
                      style={{
                        animation: `contactFadeUp 0.7s ease-out ${0.08 + index * 0.08}s both`,
                        border: `1px solid ${palette.borderPrimary}`,
                        backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <div
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{
                          border: `1px solid ${palette.accentBorder}`,
                          backgroundColor: palette.accentSoft,
                          color: palette.accentPrimary,
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>
                          {item.title}
                        </div>
                        <div className="mt-3 whitespace-pre-line text-sm leading-7" style={{ color: palette.textSecondary }}>
                          {item.detail}
                        </div>
                      </div>
                    </Wrapper>
                  )
                })}
              </div>
            </aside>

            <section
              className="rounded-[34px] p-7 md:p-10"
              style={{
                border: `1px solid ${palette.borderPrimary}`,
                background: isDayMode
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,247,245,0.9))'
                  : 'linear-gradient(180deg, rgba(7,12,10,0.95), rgba(4,8,7,0.72))',
                boxShadow: isDayMode ? '0 20px 80px rgba(15,23,42,0.08)' : '0 20px 80px rgba(0,0,0,0.34)',
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>
                    Send a message
                  </div>
                  <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                    Start the conversation here.
                  </h2>
                </div>
                <div
                  className="hidden h-14 w-14 items-center justify-center rounded-2xl md:flex"
                  style={{
                    border: `1px solid ${palette.accentBorder}`,
                    backgroundColor: palette.accentSoft,
                    color: palette.accentPrimary,
                  }}
                >
                  <MessageSquareText size={24} />
                </div>
              </div>

              <p className="mt-6 text-base leading-8" style={{ color: palette.textSecondary }}>
                Share the context, keep it specific, and tell us what kind of response or collaboration path you are looking for.
              </p>

              {sent && (
                <div
                  className="mt-6 rounded-[24px] px-4 py-4 text-sm"
                  style={{
                    border: `1px solid ${palette.accentBorder}`,
                    backgroundColor: palette.accentSoft,
                    color: isDayMode ? palette.accentDark : palette.accentLight,
                  }}
                >
                  Your message draft has been saved. We will follow up through the email you provided.
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>
                    Your name *
                  </label>
                  <div
                    className="mt-2 rounded-2xl border"
                    style={{
                      borderColor: errors.name ? 'rgba(239,68,68,0.4)' : palette.borderPrimary,
                      backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <User size={16} style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }} />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        placeholder="Your name"
                        className="w-full bg-transparent outline-none"
                        style={{ color: palette.textPrimary, caretColor: palette.accentPrimary }}
                      />
                    </div>
                  </div>
                  {errors.name && <p className="mt-2 text-xs text-red-400">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>
                    Your email *
                  </label>
                  <div
                    className="mt-2 rounded-2xl border"
                    style={{
                      borderColor: errors.email ? 'rgba(239,68,68,0.4)' : palette.borderPrimary,
                      backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Mail size={16} style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }} />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-transparent outline-none"
                        style={{ color: palette.textPrimary, caretColor: palette.accentPrimary }}
                      />
                    </div>
                  </div>
                  {errors.email && <p className="mt-2 text-xs text-red-400">{errors.email}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>
                    Subject *
                  </label>
                  <div
                    className="mt-2 rounded-2xl border"
                    style={{
                      borderColor: errors.subject ? 'rgba(239,68,68,0.4)' : palette.borderPrimary,
                      backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Sparkles size={16} style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.7)' }} />
                      <input
                        type="text"
                        value={form.subject}
                        onChange={(event) => updateField('subject', event.target.value)}
                        placeholder="What are you reaching out about?"
                        className="w-full bg-transparent outline-none"
                        style={{ color: palette.textPrimary, caretColor: palette.accentPrimary }}
                      />
                    </div>
                  </div>
                  {errors.subject && <p className="mt-2 text-xs text-red-400">{errors.subject}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.8)' }}>
                    Message *
                  </label>
                  <div
                    className="mt-2 rounded-2xl border"
                    style={{
                      borderColor: errors.message ? 'rgba(239,68,68,0.4)' : palette.borderPrimary,
                      backgroundColor: isDayMode ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <textarea
                      value={form.message}
                      onChange={(event) => updateField('message', event.target.value)}
                      placeholder="Tell us what you are building, exploring, or hoping to collaborate on."
                      rows={7}
                      className="w-full resize-none bg-transparent px-4 py-3.5 outline-none"
                      style={{ color: palette.textPrimary, caretColor: palette.accentPrimary }}
                    />
                  </div>
                  {errors.message && <p className="mt-2 text-xs text-red-400">{errors.message}</p>}
                </div>

                <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      backgroundColor: palette.btnPrimaryBg,
                      color: palette.btnPrimaryText,
                      boxShadow: isDayMode ? '0 20px 45px rgba(30,158,107,0.18)' : 'none',
                    }}
                  >
                    <Send size={16} />
                    {sending ? 'Saving message...' : 'Send message'}
                  </button>
                  <a
                    href="mailto:hello@quantumworld.dev"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold no-underline transition-all"
                    style={{
                      border: `1px solid ${palette.btnSecondaryBorder}`,
                      backgroundColor: palette.btnSecondaryBg,
                      color: palette.btnSecondaryText,
                    }}
                  >
                    Email directly
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </form>
            </section>
          </section>

          <section
            className="overflow-hidden rounded-[34px] p-7 md:p-10"
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
                  What to expect
                </div>
                <h2 className="type-sectionHeading mt-4" style={{ fontFamily: 'var(--font-heading)', color: palette.textPrimary }}>
                  A better outreach experience by design.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7" style={{ color: palette.textSecondary }}>
                The page is built to make meaningful contact feel easier, cleaner, and more credible for serious collaborators.
              </p>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-3">
              {contactPromises.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-[30px] p-6 backdrop-blur-xl"
                  style={{
                    animation: `contactFadeUp 0.7s ease-out ${0.08 + index * 0.08}s both`,
                    border: `1px solid ${palette.borderPrimary}`,
                    backgroundColor: isDayMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: isDayMode ? palette.accentDark : 'rgba(110,231,183,0.78)' }}>
                    {item.title}
                  </div>
                  <p className="mt-4 text-sm leading-7" style={{ color: palette.textSecondary }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </div>

      <style>{`
        @keyframes contactFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
