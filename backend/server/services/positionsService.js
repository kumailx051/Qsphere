import pool from '../db.js'
import { sendPositionDecisionEmail } from './emailService.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { createNotification } from './notificationService.js'

const parsePositionId = (id) => {
  const parsed = Number(id)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, 'Invalid position id')
  }
  return parsed
}

const parseOptionalPositiveInt = (value) => {
  if (value === undefined || value === null || value === '') return null

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, 'Invalid application id')
  }

  return parsed
}

const ensurePositionExists = async (positionId) => {
  const result = await pool.query('SELECT id FROM positions WHERE id = $1', [positionId])
  if (result.rowCount === 0) throw createHttpError(404, 'Position not found')
}

const normalizeSkills = (skills) => {
  if (Array.isArray(skills)) {
    return skills.map((skill) => String(skill || '').trim()).filter(Boolean)
  }

  const rawValue = String(skills || '').trim()
  if (!rawValue) return []

  if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawValue)
      if (Array.isArray(parsed)) {
        return parsed.map((skill) => String(skill || '').trim()).filter(Boolean)
      }
    } catch {
      // fall back to comma-split below
    }
  }

  return rawValue
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)
}

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value
  return String(value || '').trim().toLowerCase() === 'true'
}

const normalizePhone = (value) => String(value || '').replace(/\D/g, '')
const normalizeDecisionStatus = (value) => String(value || '').trim().toLowerCase()

const applicationReturning = `
  id,
  "positionId",
  "fullName",
  email,
  phone,
  location,
  "currentRole",
  organization,
  "linkedinUrl",
  "portfolioUrl",
  availability,
  "yearsExperience",
  skills,
  motivation,
  "resumeFileName",
  "resumeFileUrl",
  "resumeSummary",
  "resumeAutofillUsed",
  "decisionStatus",
  "interviewDate",
  "interviewTime",
  "interviewLocation",
  "decisionNote",
  "decisionSentAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

const normalizeApplicationPayload = (payload = {}) => ({
  fullName: String(payload.fullName || '').trim(),
  email: normalizeEmail(payload.email),
  phone: String(payload.phone || '').trim(),
  location: String(payload.location || '').trim(),
  currentRole: String(payload.currentRole || '').trim(),
  organization: String(payload.organization || '').trim(),
  linkedinUrl: String(payload.linkedinUrl || '').trim(),
  portfolioUrl: String(payload.portfolioUrl || '').trim(),
  availability: String(payload.availability || '').trim(),
  yearsExperience: String(payload.yearsExperience || '').trim(),
  skills: normalizeSkills(payload.skills),
  motivation: String(payload.motivation || '').trim(),
  resumeFileName: String(payload.resumeFileName || '').trim(),
  resumeFileUrl: String(payload.resumeFileUrl || '').trim(),
  resumeSummary: String(payload.resumeSummary || '').trim(),
  resumeAutofillUsed: parseBoolean(payload.resumeAutofillUsed),
})

const positionSelect = `
  SELECT
    p.id,
    p.title,
    p.type,
    p.location,
    p.deadline,
    p.contact,
    p.requirements,
    p.description,
    p."ownerEmail",
    p."ownerName",
    p.created_at AS "createdAt",
    p.updated_at AS "updatedAt",
    COALESCE(COUNT(a.id), 0)::int AS "applicationCount"
  FROM positions p
  LEFT JOIN position_applicants a ON a."positionId" = p.id
`

const applicationSelect = `
  SELECT
    ${applicationReturning}
  FROM position_applicants
`

export const listPositions = async () => {
  const result = await pool.query(`
    ${positionSelect}
    GROUP BY p.id
    ORDER BY p.deadline ASC NULLS LAST, p.created_at DESC
  `)

  return result.rows
}

export const getPositionById = async (id) => {
  const positionId = parsePositionId(id)
  const result = await pool.query(
    `
      ${positionSelect}
      WHERE p.id = $1
      GROUP BY p.id
    `,
    [positionId],
  )

  if (result.rowCount === 0) throw createHttpError(404, 'Position not found')
  return result.rows[0]
}

export const createPosition = async (payload = {}) => {
  const title = String(payload.title || '').trim()
  const contact = String(payload.contact || '').trim()

  if (!title) throw createHttpError(400, 'Position title is required')
  if (!contact) throw createHttpError(400, 'Contact is required')

  const result = await pool.query(
    `
      INSERT INTO positions (
        title,
        type,
        location,
        deadline,
        contact,
        requirements,
        description,
        "ownerEmail",
        "ownerName"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        title,
        type,
        location,
        deadline,
        contact,
        requirements,
        description,
        "ownerEmail",
        "ownerName",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      title,
      String(payload.type || 'Opportunity').trim() || 'Opportunity',
      String(payload.location || '').trim() || null,
      payload.deadline || null,
      contact,
      String(payload.requirements || '').trim() || null,
      String(payload.description || '').trim() || null,
      normalizeEmail(payload.ownerEmail) || null,
      String(payload.ownerName || '').trim() || null,
    ],
  )

  return { ...result.rows[0], applicationCount: 0 }
}

export const getPositionApplicationForUser = async (positionId, email) => {
  const parsedPositionId = parsePositionId(positionId)
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) throw createHttpError(400, 'Email is required')

  await ensurePositionExists(parsedPositionId)

  const result = await pool.query(
    `
      ${applicationSelect}
      WHERE "positionId" = $1 AND email = $2
      LIMIT 1
    `,
    [parsedPositionId, normalizedEmail],
  )

  return result.rows[0] || null
}

export const getPositionApplicationConflicts = async (positionId, query = {}) => {
  const parsedPositionId = parsePositionId(positionId)
  const normalizedEmail = normalizeEmail(query.email)
  const normalizedPhone = normalizePhone(query.phone)
  const excludeId = parseOptionalPositiveInt(query.excludeId)

  await ensurePositionExists(parsedPositionId)

  if (!normalizedEmail && !normalizedPhone) {
    return { emailRegistered: false, phoneRegistered: false }
  }

  let emailRegistered = false
  let phoneRegistered = false

  if (normalizedEmail) {
    const emailResult = await pool.query(
      `
        SELECT 1
        FROM position_applicants
        WHERE "positionId" = $1
          AND email = $2
          AND ($3::int IS NULL OR id <> $3)
        LIMIT 1
      `,
      [parsedPositionId, normalizedEmail, excludeId],
    )

    emailRegistered = emailResult.rowCount > 0
  }

  if (normalizedPhone) {
    const phoneResult = await pool.query(
      `
        SELECT 1
        FROM position_applicants
        WHERE "positionId" = $1
          AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = $2
          AND ($3::int IS NULL OR id <> $3)
        LIMIT 1
      `,
      [parsedPositionId, normalizedPhone, excludeId],
    )

    phoneRegistered = phoneResult.rowCount > 0
  }

  return { emailRegistered, phoneRegistered }
}

export const upsertPositionApplication = async (positionId, payload = {}, resumeFile = null) => {
  const parsedPositionId = parsePositionId(positionId)
  const application = normalizeApplicationPayload(payload)
  const applicationId = parseOptionalPositiveInt(payload.applicationId)

  if (!application.fullName) throw createHttpError(400, 'Full name is required')
  if (!application.email) throw createHttpError(400, 'Email is required')
  if (!application.phone) throw createHttpError(400, 'Phone number is required')
  if (!application.motivation) throw createHttpError(400, 'Motivation is required')

  await ensurePositionExists(parsedPositionId)
  const conflicts = await getPositionApplicationConflicts(parsedPositionId, {
    email: application.email,
    phone: application.phone,
    excludeId: applicationId,
  })

  if (conflicts.emailRegistered) {
    throw createHttpError(409, 'This email is already applied for this position.')
  }

  if (conflicts.phoneRegistered) {
    throw createHttpError(409, 'This phone number is already applied for this position.')
  }

  const uploadedResumeUrl = resumeFile ? `/uploads/${resumeFile.filename}` : ''
  const resolvedResumeFileName =
    String(resumeFile?.originalname || '').trim() || application.resumeFileName || null
  const resolvedResumeFileUrl = uploadedResumeUrl || application.resumeFileUrl || null

  if (applicationId) {
    const result = await pool.query(
      `
        UPDATE position_applicants
        SET
          "fullName" = $3,
          email = $4,
          phone = $5,
          location = $6,
          "currentRole" = $7,
          organization = $8,
          "linkedinUrl" = $9,
          "portfolioUrl" = $10,
          availability = $11,
          "yearsExperience" = $12,
          skills = $13::jsonb,
          motivation = $14,
          "resumeFileName" = COALESCE($15, "resumeFileName"),
        "resumeFileUrl" = COALESCE($16, "resumeFileUrl"),
        "resumeSummary" = $17,
        "resumeAutofillUsed" = $18,
        updated_at = NOW()
        WHERE id = $1 AND "positionId" = $2
        RETURNING ${applicationReturning}
      `,
      [
        applicationId,
        parsedPositionId,
        application.fullName,
        application.email,
        application.phone,
        application.location || null,
        application.currentRole || null,
        application.organization || null,
        application.linkedinUrl || null,
        application.portfolioUrl || null,
        application.availability || null,
        application.yearsExperience || null,
        JSON.stringify(application.skills),
        application.motivation,
        resolvedResumeFileName,
        resolvedResumeFileUrl,
        application.resumeSummary || null,
        application.resumeAutofillUsed,
      ],
    )

    if (result.rowCount === 0) {
      throw createHttpError(404, 'Application not found')
    }

    return result.rows[0]
  }

  const result = await pool.query(
    `
      INSERT INTO position_applicants (
        "positionId",
        "fullName",
        email,
        phone,
        location,
        "currentRole",
        organization,
        "linkedinUrl",
        "portfolioUrl",
        availability,
        "yearsExperience",
        skills,
        motivation,
        "resumeFileName",
        "resumeFileUrl",
        "resumeSummary",
        "resumeAutofillUsed"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17)
      ON CONFLICT ("positionId", email)
      DO UPDATE SET
        "fullName" = EXCLUDED."fullName",
        phone = EXCLUDED.phone,
        location = EXCLUDED.location,
        "currentRole" = EXCLUDED."currentRole",
        organization = EXCLUDED.organization,
        "linkedinUrl" = EXCLUDED."linkedinUrl",
        "portfolioUrl" = EXCLUDED."portfolioUrl",
        availability = EXCLUDED.availability,
        "yearsExperience" = EXCLUDED."yearsExperience",
        skills = EXCLUDED.skills,
        motivation = EXCLUDED.motivation,
        "resumeFileName" = COALESCE(EXCLUDED."resumeFileName", position_applicants."resumeFileName"),
        "resumeFileUrl" = COALESCE(EXCLUDED."resumeFileUrl", position_applicants."resumeFileUrl"),
        "resumeSummary" = EXCLUDED."resumeSummary",
        "resumeAutofillUsed" = EXCLUDED."resumeAutofillUsed",
        updated_at = NOW()
      RETURNING ${applicationReturning}
    `,
    [
      parsedPositionId,
      application.fullName,
      application.email,
      application.phone,
      application.location || null,
      application.currentRole || null,
      application.organization || null,
      application.linkedinUrl || null,
      application.portfolioUrl || null,
      application.availability || null,
      application.yearsExperience || null,
      JSON.stringify(application.skills),
      application.motivation,
      resolvedResumeFileName,
      resolvedResumeFileUrl,
      application.resumeSummary || null,
      application.resumeAutofillUsed,
    ],
  )

  const positionOwnerResult = await pool.query(
    'SELECT title, "ownerEmail" FROM positions WHERE id = $1 LIMIT 1',
    [parsedPositionId],
  )

  const positionOwner = positionOwnerResult.rows[0]
  const normalizedOwnerEmail = normalizeEmail(positionOwner?.ownerEmail)
  if (normalizedOwnerEmail && normalizedOwnerEmail !== application.email) {
    await createNotification({
      type: 'position_application',
      title: 'New position application',
      message: `${application.fullName} applied for "${positionOwner?.title || 'your position'}".`,
      recipientEmail: normalizedOwnerEmail,
      linkUrl: `/dashboard/manage-positions`,
      groupId: null,
    })
  }

  return result.rows[0]
}

export const decidePositionApplication = async (positionId, applicationId, payload = {}) => {
  const parsedPositionId = parsePositionId(positionId)
  const parsedApplicationId = parseOptionalPositiveInt(applicationId)
  const decisionStatus = normalizeDecisionStatus(payload.decisionStatus)
  const ownerEmail = normalizeEmail(payload.ownerEmail)
  const senderName = String(payload.senderName || '').trim()
  const interviewDate = String(payload.interviewDate || '').trim()
  const interviewTime = String(payload.interviewTime || '').trim()
  const interviewLocation = String(payload.interviewLocation || '').trim()
  const nextStepNote = String(payload.nextStepNote || '').trim()
  const encouragementNote = String(payload.encouragementNote || '').trim()

  if (!parsedApplicationId) {
    throw createHttpError(400, 'Application id is required')
  }

  if (decisionStatus !== 'accepted' && decisionStatus !== 'rejected') {
    throw createHttpError(400, 'Decision status must be accepted or rejected')
  }

  if (!ownerEmail) {
    throw createHttpError(400, 'Owner email is required')
  }

  if (decisionStatus === 'accepted') {
    if (!interviewDate) throw createHttpError(400, 'Interview date is required')
    if (!interviewLocation) throw createHttpError(400, 'Interview location is required')
  }

  const positionResult = await pool.query(
    `
      SELECT id, title, "ownerEmail", "ownerName"
      FROM positions
      WHERE id = $1
      LIMIT 1
    `,
    [parsedPositionId],
  )

  if (positionResult.rowCount === 0) {
    throw createHttpError(404, 'Position not found')
  }

  const position = positionResult.rows[0]
  if (normalizeEmail(position.ownerEmail) !== ownerEmail) {
    throw createHttpError(403, 'Only the position owner can decide applications')
  }

  const applicationResult = await pool.query(
    `
      ${applicationSelect}
      WHERE id = $1 AND "positionId" = $2
      LIMIT 1
    `,
    [parsedApplicationId, parsedPositionId],
  )

  if (applicationResult.rowCount === 0) {
    throw createHttpError(404, 'Application not found')
  }

  const application = applicationResult.rows[0]
  const companyName = String(process.env.COMPANY_NAME || 'QSphere').trim() || 'QSphere'
  const websiteLink =
    String(process.env.APP_PUBLIC_URL || 'http://localhost:5173').trim() ||
    'http://localhost:5173'
  const logoUrl = String(process.env.EMAILJS_LOGO_URL || '').trim()
  const resolvedSenderName =
    senderName || String(position.ownerName || '').trim() || `${companyName} Hiring Team`
  const supportEmail = ownerEmail || normalizeEmail(position.ownerEmail) || 'support@qsphere.org'

  const isAccepted = decisionStatus === 'accepted'
  const decisionNote = isAccepted
    ? nextStepNote || 'Please reply to confirm your availability for the interview.'
    : encouragementNote ||
      'Thank you again for your interest in QSphere. We encourage you to apply again in the future for roles that align with your profile.'
  const emailSubject = isAccepted
    ? `QSphere Interview Invitation - ${position.title}`
    : `QSphere Application Update - ${position.title}`

  await sendPositionDecisionEmail(application.email, {
    name: application.fullName,
    position_title: position.title,
    company_name: companyName,
    website_link: websiteLink,
    support_email: supportEmail,
    sender_name: resolvedSenderName,
    logo_url: logoUrl,
    email_subject: emailSubject,
    is_accepted: isAccepted ? '1' : '',
    decision_status: decisionStatus,
    interview_date: isAccepted ? interviewDate : '',
    interview_time: isAccepted ? interviewTime || 'To be confirmed' : '',
    interview_location: isAccepted ? interviewLocation : '',
    next_step_note: isAccepted ? decisionNote : '',
    encouragement_note: isAccepted ? '' : decisionNote,
  })

  const result = await pool.query(
    `
      UPDATE position_applicants
      SET
        "decisionStatus" = $3,
        "interviewDate" = $4,
        "interviewTime" = $5,
        "interviewLocation" = $6,
        "decisionNote" = $7,
        "decisionSentAt" = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND "positionId" = $2
      RETURNING ${applicationReturning}
    `,
    [
      parsedApplicationId,
      parsedPositionId,
      decisionStatus,
      isAccepted ? interviewDate : null,
      isAccepted ? interviewTime || null : null,
      isAccepted ? interviewLocation : null,
      decisionNote || null,
    ],
  )

  return result.rows[0]
}

export const listManagedPositions = async (ownerEmail) => {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail)
  if (!normalizedOwnerEmail) throw createHttpError(400, 'Owner email is required')

  const positionsResult = await pool.query(
    `
      ${positionSelect}
      WHERE LOWER(COALESCE(p."ownerEmail", '')) = $1
      GROUP BY p.id
      ORDER BY p.deadline ASC NULLS LAST, p.created_at DESC
    `,
    [normalizedOwnerEmail],
  )

  const positions = positionsResult.rows
  if (positions.length === 0) return []

  const positionIds = positions.map((position) => position.id)
  const applicationsResult = await pool.query(
    `
      ${applicationSelect}
      WHERE "positionId" = ANY($1::int[])
      ORDER BY updated_at DESC, created_at DESC
    `,
    [positionIds],
  )

  const applicationsByPositionId = applicationsResult.rows.reduce((accumulator, application) => {
    const key = String(application.positionId)
    if (!accumulator[key]) accumulator[key] = []
    accumulator[key].push(application)
    return accumulator
  }, {})

  return positions.map((position) => ({
    ...position,
    applications: applicationsByPositionId[String(position.id)] || [],
    applicationCount: Number(position.applicationCount || 0),
  }))
}
