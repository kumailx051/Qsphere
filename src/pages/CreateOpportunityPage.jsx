import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, CalendarPlus, Briefcase } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import GhostInput from '../components/GhostInput'

const CreateOpportunityPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Determine initial type from URL
  const initialType = location.pathname.includes('/events') ? 'event' : 'position'
  const [activeTab, setActiveTab] = useState(initialType)

  // Event State
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState('Workshop')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventAudience, setEventAudience] = useState('')
  const [eventDeadline, setEventDeadline] = useState('')
  const [eventDescription, setEventDescription] = useState('')

  // Position State
  const [positionTitle, setPositionTitle] = useState('')
  const [positionType, setPositionType] = useState('Research Assistant')
  const [positionLocation, setPositionLocation] = useState('Remote')
  const [positionDeadline, setPositionDeadline] = useState('')
  const [positionContact, setPositionContact] = useState('')
  const [positionRequirements, setPositionRequirements] = useState('')
  const [positionDescription, setPositionDescription] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const logged = localStorage.getItem('qsphere_logged_in') === '1'
    if (!logged) {
      navigate('/auth', { state: { redirectTo: location.pathname } })
      return
    }
  }, [navigate, location.pathname])

  const handleCreate = async () => {
    setErrorMsg('')
    setMessage('')

    // Basic Validation
    if (activeTab === 'event') {
      if (!eventTitle.trim() || !eventDate || !eventLocation) {
        setErrorMsg('Please fill in the required event fields (Title, Date, Location).')
        return
      }
    } else {
      if (!positionTitle.trim() || !positionContact) {
        setErrorMsg('Please fill in the required position fields (Title, Contact).')
        return
      }
    }

    setSaving(true)

    // Simulate API call and save to localStorage
    setTimeout(() => {
      try {
        if (activeTab === 'event') {
          const storedEvents = JSON.parse(localStorage.getItem('qsphere_events') || '[]')
          const newEvent = {
            id: Date.now().toString(),
            title: eventTitle,
            type: eventType,
            date: eventDate,
            location: eventLocation,
            audience: eventAudience,
            deadline: eventDeadline,
            description: eventDescription,
            createdAt: new Date().toISOString(),
          }
          localStorage.setItem('qsphere_events', JSON.stringify([newEvent, ...storedEvents]))
        } else {
          const storedPositions = JSON.parse(localStorage.getItem('qsphere_positions') || '[]')
          const newPosition = {
            id: Date.now().toString(),
            title: positionTitle,
            type: positionType,
            location: positionLocation,
            deadline: positionDeadline,
            contact: positionContact,
            requirements: positionRequirements,
            description: positionDescription,
            createdAt: new Date().toISOString(),
          }
          localStorage.setItem('qsphere_positions', JSON.stringify([newPosition, ...storedPositions]))
        }
        
        setSaving(false)
        setMessage(`Successfully created ${activeTab}!`)
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } catch (err) {
        setSaving(false)
        setErrorMsg('An error occurred while saving. Please try again.')
      }
    }, 1500)
  }

  return (
    <div className="relative bg-[#08120d]" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentPage="create-opportunity" />

      {/* Background Effect */}
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

      <main className="relative z-10 flex-grow px-6 pt-32 pb-24 md:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-5xl">
          <button
            onClick={() => navigate('/dashboard')}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>

          <div className="mb-10 text-center" style={{ animation: 'dashFadeUp 0.6s ease-out both' }}>
            <h1
              className="text-white font-black text-4xl md:text-5xl tracking-tight"
              style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}
            >
              Create New{' '}
              <span className="text-emerald-400" style={{ textShadow: '0 0 40px rgba(16,185,129,0.25)' }}>
                Opportunity
              </span>
            </h1>
            <p className="mt-4 text-white/50 text-base max-w-xl mx-auto leading-relaxed">
              Launch a new event or open a position to collaborate with the QSphere community.
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex justify-center mb-10" style={{ animation: 'dashFadeUp 0.6s ease-out 0.1s both' }}>
            <div className="inline-flex items-center bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.08] backdrop-blur-md">
              <button
                onClick={() => setActiveTab('event')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'event'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <CalendarPlus size={18} />
                Event
              </button>
              <button
                onClick={() => setActiveTab('position')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'position'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Briefcase size={18} />
                Open Position
              </button>
            </div>
          </div>

          <div className="flip-container mx-auto w-full max-w-5xl">
            <div className={`flipper ${activeTab === 'position' ? 'flipped' : ''}`}>
              {/* Event Form (Front Face) */}
              <div 
                className={`front-face rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 md:p-10 backdrop-blur-xl shadow-2xl ${activeTab === 'position' ? 'pointer-events-none' : ''}`}
              >
                {errorMsg && (
                  <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {errorMsg}
                  </div>
                )}
                {message && (
                  <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    {message}
                  </div>
                )}

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Event Title *</label>
                    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                      <input
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g. Quantum Computing 101"
                        className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">
                      Event Type
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:bg-emerald-500/[0.02]"
                    >
                      <option className="bg-[#08120d] text-white" value="Workshop">Workshop</option>
                      <option className="bg-[#08120d] text-white" value="Seminar">Seminar</option>
                      <option className="bg-[#08120d] text-white" value="Webinar">Webinar</option>
                      <option className="bg-[#08120d] text-white" value="Meetup">Meetup</option>
                      <option className="bg-[#08120d] text-white" value="Other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Date & Time *</label>
                      <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                        <input
                          type="datetime-local"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Registration Deadline</label>
                      <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                        <input
                          type="date"
                          value={eventDeadline}
                          onChange={(e) => setEventDeadline(e.target.value)}
                          className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Location / Virtual Link *</label>
                    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                      <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="e.g. Zoom Link or Physical Address"
                        className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Target Audience</label>
                    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                      <input
                        type="text"
                        value={eventAudience}
                        onChange={(e) => setEventAudience(e.target.value)}
                        placeholder="e.g. Undergraduate students, Researchers"
                        className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Description</label>
                    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                      <textarea
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Provide details about the event agenda, speakers, etc."
                        rows={5}
                        className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none resize-y"
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={handleCreate}
                      disabled={saving}
                      className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-[#0a140f] transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {saving ? 'Creating...' : 'Create Event'}
                        {!saving && <CheckCircle2 size={18} className="transform group-hover:scale-110 transition-transform" />}
                      </span>
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Position Form (Back Face) */}
              <div 
                className={`back-face rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 md:p-10 backdrop-blur-xl shadow-2xl ${activeTab === 'event' ? 'pointer-events-none' : ''}`}
              >
                {errorMsg && (
                  <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {errorMsg}
                  </div>
                )}
                {message && (
                  <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    {message}
                  </div>
                )}

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Position / Role Title *</label>
                    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                      <input
                        type="text"
                        value={positionTitle}
                        onChange={(e) => setPositionTitle(e.target.value)}
                        placeholder="e.g. Quantum Algorithms Researcher"
                        className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">
                      Position Type
                    </label>
                    <select
                      value={positionType}
                      onChange={(e) => setPositionType(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:bg-emerald-500/[0.02]"
                    >
                      <option className="bg-[#08120d] text-white" value="Research Assistant">Research Assistant</option>
                      <option className="bg-[#08120d] text-white" value="Intern">Intern</option>
                      <option className="bg-[#08120d] text-white" value="Collaborator">Collaborator</option>
                      <option className="bg-[#08120d] text-white" value="Postdoc">Postdoc</option>
                      <option className="bg-[#08120d] text-white" value="Other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">
                        Location
                      </label>
                      <select
                        value={positionLocation}
                        onChange={(e) => setPositionLocation(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:bg-emerald-500/[0.02]"
                      >
                        <option className="bg-[#08120d] text-white" value="Remote">Remote</option>
                        <option className="bg-[#08120d] text-white" value="On-site">On-site</option>
                        <option className="bg-[#08120d] text-white" value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Application Deadline</label>
                      <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                        <input
                          type="date"
                          value={positionDeadline}
                          onChange={(e) => setPositionDeadline(e.target.value)}
                          className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Contact Email / Application Link *</label>
                    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                      <input
                        type="text"
                        value={positionContact}
                        onChange={(e) => setPositionContact(e.target.value)}
                        placeholder="e.g. apply@qsphere.com or https://forms.google.com/..."
                        className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Requirements / Qualifications</label>
                    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                      <textarea
                        value={positionRequirements}
                        onChange={(e) => setPositionRequirements(e.target.value)}
                        placeholder="List the skills, degrees, or experience required."
                        rows={4}
                        className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none resize-y"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Description / Responsibilities</label>
                    <div className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all focus-within:border-emerald-500/50 focus-within:bg-emerald-500/[0.02]">
                      <textarea
                        value={positionDescription}
                        onChange={(e) => setPositionDescription(e.target.value)}
                        placeholder="Describe what the applicant will be doing."
                        rows={5}
                        className="w-full px-5 py-4 bg-transparent text-white placeholder-white/30 outline-none resize-y"
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={handleCreate}
                      disabled={saving}
                      className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-[#0a140f] transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {saving ? 'Creating...' : 'Create Position'}
                        {!saving && <CheckCircle2 size={18} className="transform group-hover:scale-110 transition-transform" />}
                      </span>
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    </button>
                  </div>
                </div>
              </div>
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
        
        .flip-container {
          perspective: 1600px;
          animation: dashFadeUp 0.6s ease-out 0.2s both;
        }

        .flipper {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 1.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .flipper.flipped {
          transform: rotateY(180deg);
        }

        .front-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
        }

        .back-face {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          transform: rotateY(180deg);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  )
}

export default CreateOpportunityPage
