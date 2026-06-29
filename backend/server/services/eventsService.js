import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { createNotification } from './notificationService.js'

const parseEventId = (id) => {
  const parsed = Number(id)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, 'Invalid event id')
  }
  return parsed
}

const parseOptionalPositiveInt = (value) => {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, 'Invalid registration id')
  }
  return parsed
}

const normalizePhone = (value) => String(value || '').replace(/\D/g, '')

const ensureEventExists = async (eventId) => {
  const result = await pool.query('SELECT id FROM events WHERE id = $1', [eventId])
  if (result.rowCount === 0) throw createHttpError(404, 'Event not found')
}

const normalizeEventApplicantPayload = (payload = {}) => ({
  fullName: String(payload.fullName || '').trim(),
  email: normalizeEmail(payload.email),
  phone: String(payload.phone || '').trim(),
  affiliation: String(payload.affiliation || '').trim(),
  roleTitle: String(payload.roleTitle || '').trim(),
  location: String(payload.location || '').trim(),
  profileUrl: String(payload.profileUrl || '').trim(),
  expectations: String(payload.expectations || '').trim(),
  notes: String(payload.notes || '').trim(),
})

const eventSelect = `
  SELECT
    e.id,
    e.title,
    e.type,
    e.date,
    e.location,
    e.audience,
    e.deadline,
    e.description,
    e."ownerEmail",
    e."ownerName",
    e.created_at AS "createdAt",
    e.updated_at AS "updatedAt",
    COALESCE(COUNT(a.id), 0)::int AS "registrationCount"
  FROM events e
  LEFT JOIN event_applicants a ON a."eventId" = e.id
`

const applicantSelect = `
  SELECT
    id,
    "eventId",
    "fullName",
    email,
    phone,
    affiliation,
    "roleTitle",
    location,
    "profileUrl",
    expectations,
    notes,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM event_applicants
`

export const listEvents = async () => {
  const result = await pool.query(`
    ${eventSelect}
    GROUP BY e.id
    ORDER BY e.date ASC, e.created_at DESC
  `)

  return result.rows
}

export const getEventById = async (id) => {
  const eventId = parseEventId(id)
  const result = await pool.query(
    `
      ${eventSelect}
      WHERE e.id = $1
      GROUP BY e.id
    `,
    [eventId],
  )

  if (result.rowCount === 0) throw createHttpError(404, 'Event not found')
  return result.rows[0]
}

export const createEvent = async (payload = {}) => {
  const title = String(payload.title || '').trim()
  const date = payload.date ? new Date(payload.date) : null
  const location = String(payload.location || '').trim()

  if (!title) throw createHttpError(400, 'Event title is required')
  if (!date || Number.isNaN(date.getTime())) throw createHttpError(400, 'Valid event date is required')
  if (!location) throw createHttpError(400, 'Event location is required')

  const result = await pool.query(
    `
      INSERT INTO events (
        title,
        type,
        date,
        location,
        audience,
        deadline,
        description,
        "ownerEmail",
        "ownerName"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        title,
        type,
        date,
        location,
        audience,
        deadline,
        description,
        "ownerEmail",
        "ownerName",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      title,
      String(payload.type || 'Event').trim() || 'Event',
      date.toISOString(),
      location,
      String(payload.audience || '').trim() || null,
      payload.deadline || null,
      String(payload.description || '').trim() || null,
      normalizeEmail(payload.ownerEmail) || null,
      String(payload.ownerName || '').trim() || null,
    ],
  )

  return { ...result.rows[0], registrationCount: 0 }
}

export const getEventRegistrationForUser = async (eventId, email) => {
  const parsedEventId = parseEventId(eventId)
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) throw createHttpError(400, 'Email is required')

  await ensureEventExists(parsedEventId)

  const result = await pool.query(
    `
      ${applicantSelect}
      WHERE "eventId" = $1 AND email = $2
      LIMIT 1
    `,
    [parsedEventId, normalizedEmail],
  )

  return result.rows[0] || null
}

export const getEventRegistrationConflicts = async (eventId, query = {}) => {
  const parsedEventId = parseEventId(eventId)
  const normalizedEmail = normalizeEmail(query.email)
  const normalizedPhone = normalizePhone(query.phone)
  const excludeId = parseOptionalPositiveInt(query.excludeId)

  await ensureEventExists(parsedEventId)

  if (!normalizedEmail && !normalizedPhone) {
    return { emailRegistered: false, phoneRegistered: false }
  }

  let emailRegistered = false
  let phoneRegistered = false

  if (normalizedEmail) {
    const emailResult = await pool.query(
      `
        SELECT 1
        FROM event_applicants
        WHERE "eventId" = $1
          AND email = $2
          AND ($3::int IS NULL OR id <> $3)
        LIMIT 1
      `,
      [parsedEventId, normalizedEmail, excludeId],
    )
    emailRegistered = emailResult.rowCount > 0
  }

  if (normalizedPhone) {
    const phoneResult = await pool.query(
      `
        SELECT 1
        FROM event_applicants
        WHERE "eventId" = $1
          AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = $2
          AND ($3::int IS NULL OR id <> $3)
        LIMIT 1
      `,
      [parsedEventId, normalizedPhone, excludeId],
    )
    phoneRegistered = phoneResult.rowCount > 0
  }

  return { emailRegistered, phoneRegistered }
}

export const upsertEventRegistration = async (eventId, payload = {}) => {
  const parsedEventId = parseEventId(eventId)
  const registration = normalizeEventApplicantPayload(payload)
  const registrationId = parseOptionalPositiveInt(payload.registrationId)

  if (!registration.fullName) throw createHttpError(400, 'Full name is required')
  if (!registration.email) throw createHttpError(400, 'Email is required')
  if (!registration.phone) throw createHttpError(400, 'Phone number is required')
  if (!registration.affiliation) throw createHttpError(400, 'Institute or organization is required')

  await ensureEventExists(parsedEventId)
  const conflicts = await getEventRegistrationConflicts(parsedEventId, {
    email: registration.email,
    phone: registration.phone,
    excludeId: registrationId,
  })

  if (conflicts.emailRegistered) {
    throw createHttpError(409, 'This email is already registered for this event.')
  }

  if (conflicts.phoneRegistered) {
    throw createHttpError(409, 'This phone number is already registered for this event.')
  }

  if (registrationId) {
    const result = await pool.query(
      `
        UPDATE event_applicants
        SET
          "fullName" = $3,
          email = $4,
          phone = $5,
          affiliation = $6,
          "roleTitle" = $7,
          location = $8,
          "profileUrl" = $9,
          expectations = $10,
          notes = $11,
          updated_at = NOW()
        WHERE id = $1 AND "eventId" = $2
        RETURNING
          id,
          "eventId",
          "fullName",
          email,
          phone,
          affiliation,
          "roleTitle",
          location,
          "profileUrl",
          expectations,
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        registrationId,
        parsedEventId,
        registration.fullName,
        registration.email,
        registration.phone,
        registration.affiliation,
        registration.roleTitle || null,
        registration.location || null,
        registration.profileUrl || null,
        registration.expectations || null,
        registration.notes || null,
      ],
    )

    if (result.rowCount === 0) {
      throw createHttpError(404, 'Registration not found')
    }

    return result.rows[0]
  }

  const result = await pool.query(
    `
      INSERT INTO event_applicants (
        "eventId",
        "fullName",
        email,
        phone,
        affiliation,
        "roleTitle",
        location,
        "profileUrl",
        expectations,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        "eventId",
        "fullName",
        email,
        phone,
        affiliation,
        "roleTitle",
        location,
        "profileUrl",
        expectations,
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      parsedEventId,
      registration.fullName,
      registration.email,
      registration.phone,
      registration.affiliation,
      registration.roleTitle || null,
      registration.location || null,
      registration.profileUrl || null,
      registration.expectations || null,
      registration.notes || null,
    ],
  )

  const eventOwnerResult = await pool.query(
    'SELECT title, "ownerEmail" FROM events WHERE id = $1 LIMIT 1',
    [parsedEventId],
  )

  const eventOwner = eventOwnerResult.rows[0]
  const normalizedOwnerEmail = normalizeEmail(eventOwner?.ownerEmail)
  if (normalizedOwnerEmail && normalizedOwnerEmail !== registration.email) {
    await createNotification({
      type: 'event_registration',
      title: 'New event registration',
      message: `${registration.fullName} registered for "${eventOwner?.title || 'your event'}".`,
      recipientEmail: normalizedOwnerEmail,
      linkUrl: `/dashboard/manage-events`,
      groupId: null,
    })
  }

  return result.rows[0]
}

export const listManagedEvents = async (ownerEmail) => {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail)
  if (!normalizedOwnerEmail) throw createHttpError(400, 'Owner email is required')

  const eventsResult = await pool.query(
    `
      ${eventSelect}
      WHERE LOWER(COALESCE(e."ownerEmail", '')) = $1
      GROUP BY e.id
      ORDER BY e.date ASC, e.created_at DESC
    `,
    [normalizedOwnerEmail],
  )

  const events = eventsResult.rows
  if (events.length === 0) return []

  const eventIds = events.map((event) => event.id)
  const applicantsResult = await pool.query(
    `
      ${applicantSelect}
      WHERE "eventId" = ANY($1::int[])
      ORDER BY updated_at DESC, created_at DESC
    `,
    [eventIds],
  )

  const applicantsByEventId = applicantsResult.rows.reduce((accumulator, applicant) => {
    const key = String(applicant.eventId)
    if (!accumulator[key]) accumulator[key] = []
    accumulator[key].push(applicant)
    return accumulator
  }, {})

  return events.map((event) => ({
    ...event,
    registrations: applicantsByEventId[String(event.id)] || [],
    registrationCount: Number(event.registrationCount || 0),
  }))
}
