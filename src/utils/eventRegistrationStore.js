import { getStoredEvents } from './eventStore'
import { normalizeEmail } from './profileStore'

export const EVENT_REGISTRATIONS_STORAGE_KEY = 'qsphere_event_registrations'

const readRegistrations = () => {
  try {
    const raw = localStorage.getItem(EVENT_REGISTRATIONS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeRegistrations = (registrations) => {
  localStorage.setItem(EVENT_REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrations))
}

const byNewest = (left, right) =>
  new Date(right.updatedAt || right.submittedAt || 0).getTime() -
  new Date(left.updatedAt || left.submittedAt || 0).getTime()

export const getStoredEventRegistrations = () => readRegistrations().sort(byNewest)

export const getEventRegistrationsByEventId = (eventId) =>
  getStoredEventRegistrations().filter((registration) => String(registration.eventId) === String(eventId))

export const getEventRegistrationForAttendee = (eventId, email) =>
  getStoredEventRegistrations().find(
    (registration) =>
      String(registration.eventId) === String(eventId) &&
      normalizeEmail(registration.email) === normalizeEmail(email),
  ) || null

export const saveEventRegistration = (registrationDraft) => {
  const registrations = readRegistrations()
  const normalizedEventId = String(registrationDraft.eventId)
  const normalizedRegistrationEmail = normalizeEmail(registrationDraft.email)
  const existingIndex = registrations.findIndex(
    (item) =>
      String(item.eventId) === normalizedEventId &&
      normalizeEmail(item.email) === normalizedRegistrationEmail,
  )

  const existingItem = existingIndex >= 0 ? registrations[existingIndex] : null
  const nextRegistration = {
    ...existingItem,
    ...registrationDraft,
    email: normalizedRegistrationEmail,
    submittedAt: existingItem?.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    registrations.splice(existingIndex, 1, nextRegistration)
  } else {
    registrations.unshift(nextRegistration)
  }

  writeRegistrations(registrations)
  return nextRegistration
}

export const getManagedEventsWithRegistrations = (ownerEmail) => {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail)
  const registrations = readRegistrations()

  return getStoredEvents()
    .filter((event) => normalizeEmail(event.ownerEmail) === normalizedOwnerEmail)
    .map((event) => {
      const eventRegistrations = registrations
        .filter((registration) => String(registration.eventId) === String(event.id))
        .sort(byNewest)

      return {
        ...event,
        registrations: eventRegistrations,
        registrationCount: eventRegistrations.length,
      }
    })
    .sort((left, right) => {
      const leftTime = new Date(left.date || 0).getTime()
      const rightTime = new Date(right.date || 0).getTime()
      return leftTime - rightTime
    })
}

