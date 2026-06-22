import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { uploadImageToImgBB } from './mediaService.js'
import { hashPassword } from './securityService.js'

export const sanitizeUser = (user) => {
  if (!user) return null
  const cleaned = { ...user }
  cleaned.avatarPreview = cleaned.profileImage
  delete cleaned.password
  return cleaned
}

export const getUserByEmail = async (emailAddress) => {
  const normalized = normalizeEmail(emailAddress)
  if (!normalized) return null
  const result = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1 LIMIT 1', [normalized])
  return result.rows[0] || null
}

export const getUserById = async (id) => {
  const userId = Number(id)
  if (!userId) throw createHttpError(400, 'Invalid user id')

  const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId])
  if (result.rowCount === 0) throw createHttpError(404, 'User not found')
  return result.rows[0]
}

export const submitOnboarding = async ({ sessionEmail, payload }) => {
  if (!sessionEmail) throw createHttpError(404, 'Not found')

  const emailAddress = normalizeEmail(payload?.emailAddress)
  if (!emailAddress) throw createHttpError(400, 'emailAddress is required')

  let profileImageUrl = null
  if (payload.avatarPreview && payload.avatarPreview.startsWith('data:image/')) {
    profileImageUrl = await uploadImageToImgBB(payload.avatarPreview)
  } else if (payload.avatarPreview) {
    profileImageUrl = payload.avatarPreview
  }

  const fieldsToUpdate = {
    role: payload.role,
    gender: payload.gender,
    cellMain: payload.cellMain,
    cellAlternative: payload.cellAlternative,
    cnic: payload.cnic,
    passportNo: payload.passportNo,
    dateOfBirth: payload.dateOfBirth,
    city: payload.city,
    address: payload.address,
    institute: payload.institute,
    degree: payload.degree,
    semester: payload.semester,
    majors: payload.majors,
    interests: payload.interests,
    referralId: payload.referralId,
    discipline: payload.discipline,
    dateOfGraduation: payload.dateOfGraduation,
    organization: payload.organization,
    jobDescription: payload.jobDescription,
    roleTitle: payload.roleTitle,
    qualification: payload.qualification,
    experience: payload.experience,
    designation: payload.designation,
    post: payload.post,
    researchInterest: payload.researchInterest,
    researchFocus: payload.researchFocus,
    isOnboarded: true,
  }

  if (profileImageUrl) {
    fieldsToUpdate.profileImage = profileImageUrl
  }

  const keys = Object.keys(fieldsToUpdate)
  const values = Object.values(fieldsToUpdate)
  const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ')
  const result = await pool.query(
    `UPDATE users
     SET ${setClause}
     WHERE "emailAddress" = $1
     RETURNING *`,
    [emailAddress, ...values],
  )

  if (result.rowCount === 0) throw createHttpError(404, 'User not found.')
  return sanitizeUser(result.rows[0])
}

export const getProfileByEmail = async (emailAddress) => {
  const user = await getUserByEmail(emailAddress)
  if (!user) throw createHttpError(404, 'User not found')
  return sanitizeUser(user)
}

export const updateProfile = async (payload) => {
  const emailAddress = normalizeEmail(payload?.emailAddress)
  if (!emailAddress) throw createHttpError(400, 'emailAddress is required')

  const validColumns = [
    'fullName',
    'role',
    'gender',
    'cellMain',
    'cellAlternative',
    'cnic',
    'passportNo',
    'dateOfBirth',
    'city',
    'address',
    'institute',
    'degree',
    'semester',
    'majors',
    'interests',
    'referralId',
    'discipline',
    'dateOfGraduation',
    'organization',
    'jobDescription',
    'roleTitle',
    'qualification',
    'experience',
    'designation',
    'post',
    'researchInterest',
    'researchFocus',
  ]

  const fieldsToUpdate = {}
  validColumns.forEach((column) => {
    if (payload[column] !== undefined) fieldsToUpdate[column] = payload[column]
  })

  if (payload.avatarPreview && payload.avatarPreview.startsWith('data:image/')) {
    fieldsToUpdate.profileImage = await uploadImageToImgBB(payload.avatarPreview)
  } else if (payload.avatarPreview && payload.avatarPreview.startsWith('http')) {
    fieldsToUpdate.profileImage = payload.avatarPreview
  }

  const keys = Object.keys(fieldsToUpdate).filter((key) => fieldsToUpdate[key] !== undefined)
  if (keys.length === 0) return { success: true }

  const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ')
  const result = await pool.query(
    `UPDATE users
     SET ${setClause}
     WHERE "emailAddress" = $1
     RETURNING *`,
    [emailAddress, ...keys.map((key) => fieldsToUpdate[key])],
  )

  if (result.rowCount === 0) throw createHttpError(404, 'User not found')
  return { success: true, user: sanitizeUser(result.rows[0]) }
}

export const updatePassword = async ({ emailAddress, currentPassword, newPassword }) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  if (!normalizedEmail || !currentPassword || !newPassword) {
    throw createHttpError(400, 'Missing required fields')
  }

  const user = await getUserByEmail(normalizedEmail)
  if (!user) throw createHttpError(404, 'User not found')
  if (user.password !== hashPassword(currentPassword)) {
    throw createHttpError(401, 'Incorrect current password')
  }

  await pool.query('UPDATE users SET password = $1 WHERE "emailAddress" = $2', [
    hashPassword(newPassword),
    normalizedEmail,
  ])

  return { success: true }
}
