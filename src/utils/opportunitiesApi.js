const parseJsonResponse = async (response, fallbackMessage) => {
  let data = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const error = new Error(data?.error || fallbackMessage)
    error.status = response.status
    throw error
  }

  return data
}

export const fetchEvents = async () => {
  const response = await fetch('/api/events')
  return parseJsonResponse(response, 'Failed to load events')
}

export const fetchEventById = async (eventId) => {
  const response = await fetch(`/api/events/${eventId}`)
  return parseJsonResponse(response, 'Failed to load event')
}

export const createEvent = async (payload) => {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse(response, 'Failed to create event')
}

export const fetchManagedEvents = async (ownerEmail) => {
  const response = await fetch(`/api/events/owner/${encodeURIComponent(ownerEmail)}/manage`)
  return parseJsonResponse(response, 'Failed to load managed events')
}

export const fetchEventRegistration = async (eventId, email) => {
  if (!email) return null

  const response = await fetch(
    `/api/events/${eventId}/registration?email=${encodeURIComponent(email)}`,
  )

  return parseJsonResponse(response, 'Failed to load registration')
}

export const checkEventRegistrationConflicts = async (eventId, { email, phone, excludeId } = {}) => {
  const params = new URLSearchParams()

  if (email) params.append('email', email)
  if (phone) params.append('phone', phone)
  if (excludeId) params.append('excludeId', String(excludeId))

  if (!params.toString()) {
    return { emailRegistered: false, phoneRegistered: false }
  }

  const response = await fetch(`/api/events/${eventId}/registration-conflicts?${params.toString()}`)
  return parseJsonResponse(response, 'Failed to validate registration details')
}

export const submitEventRegistration = async (eventId, payload) => {
  const response = await fetch(`/api/events/${eventId}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse(response, 'Failed to save registration')
}

export const fetchPositions = async () => {
  const response = await fetch('/api/positions')
  return parseJsonResponse(response, 'Failed to load positions')
}

export const fetchPositionById = async (positionId) => {
  const response = await fetch(`/api/positions/${positionId}`)
  return parseJsonResponse(response, 'Failed to load position')
}

export const createPosition = async (payload) => {
  const response = await fetch('/api/positions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse(response, 'Failed to create position')
}

export const fetchManagedPositions = async (ownerEmail) => {
  const response = await fetch(`/api/positions/owner/${encodeURIComponent(ownerEmail)}/manage`)
  return parseJsonResponse(response, 'Failed to load managed positions')
}

export const fetchPositionApplication = async (positionId, email) => {
  if (!email) return null

  const response = await fetch(
    `/api/positions/${positionId}/application?email=${encodeURIComponent(email)}`,
  )

  return parseJsonResponse(response, 'Failed to load application')
}

export const checkPositionApplicationConflicts = async (positionId, { email, phone, excludeId } = {}) => {
  const params = new URLSearchParams()

  if (email) params.append('email', email)
  if (phone) params.append('phone', phone)
  if (excludeId) params.append('excludeId', String(excludeId))

  if (!params.toString()) {
    return { emailRegistered: false, phoneRegistered: false }
  }

  const response = await fetch(`/api/positions/${positionId}/application-conflicts?${params.toString()}`)
  return parseJsonResponse(response, 'Failed to validate application details')
}

export const submitPositionApplication = async (positionId, payload) => {
  const formData = new FormData()

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (key === 'resumeFile' && value) {
      formData.append('resumeFile', value)
      return
    }
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value))
      return
    }
    formData.append(key, String(value))
  })

  const response = await fetch(`/api/positions/${positionId}/applications`, {
    method: 'POST',
    body: formData,
  })

  return parseJsonResponse(response, 'Failed to save application')
}

export const sendPositionApplicationDecision = async (positionId, applicationId, payload) => {
  const response = await fetch(`/api/positions/${positionId}/applications/${applicationId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse(response, 'Failed to send application decision')
}
