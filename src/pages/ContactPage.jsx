import { useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import contactVideo from '../assets/contact.mp4'

const ContactPage = () => {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  const contactInfo = [
    { icon: '✉', title: 'Email Us', detail: 'hello@quantumworld.dev' },
    { icon: '📞', title: 'Call Us', detail: '+1 (555) 123-4567' },
    { icon: '📍', title: 'Our Location', detail: 'Quantum Research Lab\nSan Francisco, CA' },
    { icon: '🕐', title: 'Working Hours', detail: 'Mon - Fri: 9:00 AM - 6:00 PM\n(PST)' },
  ]

  return (
    <div className="relative bg-[#060a06]" style={{ minHeight: '100vh', overflow: 'hidden' }}>
      <Navbar currentPage="contact" />

      <div className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0 bg-[#060a06]" />

        <video
          ref={videoRef}
          className="absolute top-0 right-0 h-full object-cover"
          style={{
            width: '60%',
            opacity: 0.8,
            maskImage: 'linear-gradient(to right, transparent 0%, black 20%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%)',
          }}
          muted loop playsInline
        >
          <source src={contactVideo} type="video/mp4" />
        </video>

        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(6,10,6,0.4) 0%, rgba(6,10,6,0.7) 40%, rgba(6,10,6,0.95) 100%)',
          zIndex: 2,
        }} />

        {/* Main Content */}
        <div className="relative z-10 w-full min-h-screen p-6 md:p-10 lg:p-14">
          <div className="mx-auto max-w-7xl space-y-16 mt-12 md:mt-20">
            {/* Section 1: Hero + Form */}
            <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16" style={{ animation: 'contactFadeUp 0.8s ease-out 0.2s both' }}>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 12px rgba(16,185,129,0.8)' }} />
                  <span className="text-emerald-400 text-[11px] tracking-[0.4em] font-semibold">CONTACT US</span>
                </div>

                <h1
                  className="text-white font-black leading-[0.95] tracking-tight mb-8"
                  style={{
                    fontSize: 'clamp(2.1rem, 5.6vw, 5.4rem)',
                    fontFamily: "'Archivo Black', 'Inter', sans-serif",
                    letterSpacing: '-0.03em',
                  }}
                >
                  Let's Build the<br />
                  Future <span className="text-emerald-400" style={{ textShadow: '0 0 40px rgba(16,185,129,0.3)' }}>Together.</span>
                </h1>

                <p className="text-white/60 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
                  Have a question, collaboration idea, or just want to say hello? We'd love to hear from you.
                </p>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="relative">
                    <input type="text" placeholder="Your Name" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/40 transition-colors" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">👤</span>
                  </div>
                  <div className="relative">
                    <input type="email" placeholder="Your Email" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/40 transition-colors" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">✉️</span>
                  </div>
                  <div className="relative sm:col-span-2">
                    <input type="text" placeholder="Subject" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/40 transition-colors" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">✏️</span>
                  </div>
                  <div className="relative sm:col-span-2">
                    <textarea placeholder="Your Message" rows={5} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/40 transition-colors resize-none" />
                    <span className="absolute right-4 top-4 text-white/20 text-sm">✏️</span>
                  </div>
                  <div className="sm:col-span-2">
                    <button className="inline-flex items-center gap-3 bg-white text-black font-semibold text-sm px-6 py-3.5 rounded-xl hover:bg-white/90 transition-colors">
                      Send Message
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/10 text-black text-xs">↗</span>
                    </button>
                  </div>
                </div>
              </div>

              <aside className="lg:pt-20">
                <div 
                  className="rounded-3xl border border-emerald-400/10 bg-white/[0.03] p-6 md:p-7 backdrop-blur-xl relative"
                  style={{
                    boxShadow: '0 0 20px rgba(16,185,129,0.4), inset 0 0 20px rgba(16,185,129,0.1)',
                    animation: 'glowPulse 2s ease-in-out infinite',
                  }}
                >
                  <h3 className="text-white font-semibold text-xl mb-2">Get in Touch</h3>
                  <p className="text-white/40 text-sm mb-8 leading-relaxed">We're here to connect, collaborate, and create quantum possibilities.</p>

                  <div className="space-y-6">
                    {contactInfo.map((item, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base" style={{
                          border: '1px solid rgba(16,185,129,0.2)',
                          background: 'rgba(16,185,129,0.06)',
                        }}>
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-sm">{item.title}</div>
                          <div className="text-white/40 text-sm whitespace-pre-line">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>


          </div>
        </div>
      </div>

      <style>{`
        @keyframes contactFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { boxShadow: 0 0 20px rgba(16,185,129,0.4), inset 0 0 20px rgba(16,185,129,0.1); }
          50% { boxShadow: 0 0 40px rgba(16,185,129,0.6), inset 0 0 30px rgba(16,185,129,0.2); }
        }
      `}</style>
    </div>
  )
}

export default ContactPage
