export const EVENTS_STORAGE_KEY = 'qsphere_events'

export const DEFAULT_EVENTS = [
  {
    id: 'default-symposium',
    title: 'Quantum Physics Symposium 2026',
    type: 'Seminar',
    date: '2026-07-24T14:00',
    location: 'Virtual (Zoom Link)',
    audience: 'Students & Researchers',
    deadline: '2026-07-20',
    description:
      'An annual gathering to discuss breakthroughs in quantum teleportation, quantum entanglement, and materials science. Featuring keynote speakers from leading institutions worldwide.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-hackathon',
    title: 'QSphere Hackathon: Quantum Algorithms',
    type: 'Workshop',
    date: '2026-08-15T09:00',
    location: 'Hybrid - Room 402, Quantum Sciences Lab / Discord',
    audience: 'Open to all quantum enthusiasts and programmers',
    deadline: '2026-08-10',
    description:
      'A 48-hour challenge to design optimized quantum circuits and algorithms for NISQ-era hardware. Prizes for top teams. Mentors will be available throughout the event.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-webinar',
    title: 'Intro to Quantum Error Correction',
    type: 'Webinar',
    date: '2026-09-05T16:00',
    location: 'Virtual (YouTube Live)',
    audience: 'Undergraduate students, early-career researchers',
    deadline: '2026-09-03',
    description:
      'Learn the fundamentals of quantum error correction codes (Shor, Steane, surface codes) and how they enable fault-tolerant quantum computation.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const getStoredEvents = () => {
  try {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    return DEFAULT_EVENTS
  }

  return DEFAULT_EVENTS
}

export const getEventById = (eventId) => {
  const normalizedId = String(eventId || '')
  return getStoredEvents().find((event) => String(event.id) === normalizedId) ?? null
}

export const formatEventTime = (dateStr) => {
  if (!dateStr) return 'TBD'

  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const parseEventDate = (dateStr) => {
  if (!dateStr) {
    return {
      day: '--',
      month: '---',
      full: 'TBD',
      weekday: '',
      year: '',
    }
  }

  const date = new Date(dateStr)

  return {
    day: date.getDate(),
    month: MONTHS[date.getMonth()],
    full: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    year: String(date.getFullYear()),
  }
}

export const formatEventFullDate = (dateStr) => {
  if (!dateStr) return 'Date to be announced'

  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export const getRegistrationState = (deadline) => {
  if (!deadline) {
    return {
      label: 'Open registration window',
      tone: 'text-emerald-300',
      badge: 'Open',
    }
  }

  const end = new Date(deadline)
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    return {
      label: 'Registration has closed',
      tone: 'text-white/40',
      badge: 'Closed',
    }
  }

  if (daysLeft <= 5) {
    return {
      label: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to register`,
      tone: 'text-amber-300',
      badge: 'Closing Soon',
    }
  }

  return {
    label: `Registration closes ${parseEventDate(deadline).full}`,
    tone: 'text-emerald-300',
    badge: 'Open',
  }
}
