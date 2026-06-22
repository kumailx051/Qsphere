import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { sendOtpEmail } from './emailService.js'
import { hashPassword } from './securityService.js'
import { getUserByEmail, sanitizeUser } from './usersService.js'

export const issueOtpForEmail = async (emailAddress) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [normalizedEmail])
  await pool.query(
    `INSERT INTO otps ("emailAddress", otp, "expiresAt")
     VALUES ($1, $2, $3)`,
    [normalizedEmail, otp, expiresAt],
  )

  await sendOtpEmail(normalizedEmail, otp)
  return otp
}

const verifyOtpRecord = async ({ emailAddress, otp }) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  const result = await pool.query(
    'SELECT * FROM otps WHERE "emailAddress" = $1 AND otp = $2 ORDER BY created_at DESC LIMIT 1',
    [normalizedEmail, String(otp || '')],
  )

  if (result.rowCount === 0) throw createHttpError(400, 'Invalid verification code.')
  if (new Date(result.rows[0].expiresAt) < new Date()) {
    throw createHttpError(400, 'Verification code has expired.')
  }

  return normalizedEmail
}

export const registerUser = async ({ fullName, emailAddress, password }) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  if (!fullName || !normalizedEmail || !password) {
    throw createHttpError(400, 'fullName, emailAddress, and password are required')
  }

  const existing = await getUserByEmail(normalizedEmail)
  if (existing) throw createHttpError(400, 'This email is already registered.')

  const pendingExisting = await pool.query(
    'SELECT * FROM pending_registrations WHERE "emailAddress" = $1',
    [normalizedEmail],
  )

  if (pendingExisting.rowCount === 0) {
    await pool.query(
      `INSERT INTO pending_registrations ("emailAddress", "fullName", password)
       VALUES ($1, $2, $3)`,
      [normalizedEmail, fullName, hashPassword(password)],
    )
  }

  await issueOtpForEmail(normalizedEmail)
  return { emailAddress: normalizedEmail, pendingRegistration: pendingExisting.rowCount > 0 }
}

export const verifyOtpAndApply = async ({ emailAddress, otp }) => {
  if (!emailAddress || !otp) throw createHttpError(400, 'emailAddress and otp are required')

  const normalizedEmail = await verifyOtpRecord({ emailAddress, otp })
  const pendingRes = await pool.query('SELECT * FROM pending_registrations WHERE "emailAddress" = $1', [normalizedEmail])

  if (pendingRes.rowCount === 0) {
    const user = await getUserByEmail(normalizedEmail)
    const isAdminSetup =
      user && String(user.role || '').toLowerCase() === 'admin' && user.mustChangePassword === true

    if (!isAdminSetup) {
      throw createHttpError(404, 'No pending verification found for this email address.')
    }

    await pool.query(
      `UPDATE users
       SET "isVerified" = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [user.id],
    )
    await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [normalizedEmail])

    return {
      success: true,
      adminFirstLogin: true,
      requiresPasswordChange: true,
      emailAddress: normalizedEmail,
      message: 'OTP verified. Create a new administrator password.',
    }
  }

  await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [normalizedEmail])
  const pending = pendingRes.rows[0]

  await pool.query(
    `INSERT INTO users ("fullName", "emailAddress", password, "isVerified", "isOnboarded")
     VALUES ($1, $2, $3, TRUE, FALSE)
     ON CONFLICT ("emailAddress") DO UPDATE SET
       "fullName" = EXCLUDED."fullName",
       password = EXCLUDED.password,
       "isVerified" = TRUE`,
    [pending.fullName, pending.emailAddress, pending.password],
  )

  await pool.query('DELETE FROM pending_registrations WHERE "emailAddress" = $1', [normalizedEmail])
  return { success: true, emailAddress: normalizedEmail, message: 'OTP verified successfully.' }
}

export const resendOtp = async ({ emailAddress }) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  if (!normalizedEmail) throw createHttpError(400, 'emailAddress is required')

  const pendingRes = await pool.query('SELECT * FROM pending_registrations WHERE "emailAddress" = $1', [normalizedEmail])
  if (pendingRes.rowCount === 0) {
    const user = await getUserByEmail(normalizedEmail)
    const isAdminSetup =
      user && String(user.role || '').toLowerCase() === 'admin' && user.mustChangePassword === true

    if (!isAdminSetup) {
      throw createHttpError(404, 'No pending verification found for this email address.')
    }

    if (user.isVerified) {
      return {
        success: true,
        adminFirstLogin: true,
        requiresPasswordChange: true,
        emailAddress: normalizedEmail,
        message: 'Email is already verified. Create your new administrator password.',
      }
    }
  }

  await issueOtpForEmail(normalizedEmail)
  return { success: true, emailAddress: normalizedEmail, message: 'A new OTP has been sent to your email.' }
}

export const completeAdminSetup = async ({ emailAddress, password, confirmPassword, verificationEmail }) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  if (!normalizedEmail || !password || !confirmPassword) {
    throw createHttpError(400, 'emailAddress, password, and confirmPassword are required')
  }

  if (!verificationEmail || verificationEmail !== normalizedEmail) {
    throw createHttpError(401, 'Your administrator setup session has expired. Sign in again.')
  }
  if (String(password).length < 6) {
    throw createHttpError(400, 'Password must be at least 6 characters long.')
  }
  if (password !== confirmPassword) {
    throw createHttpError(400, 'Passwords do not match.')
  }

  const user = await getUserByEmail(normalizedEmail)
  const canCompleteSetup =
    user &&
    String(user.role || '').toLowerCase() === 'admin' &&
    user.isVerified === true &&
    user.mustChangePassword === true

  if (!canCompleteSetup) {
    throw createHttpError(403, 'This administrator account does not have a pending setup.')
  }

  const updated = await pool.query(
    `UPDATE users
     SET password = $2,
         "mustChangePassword" = FALSE,
         "isOnboarded" = TRUE,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [user.id, hashPassword(password)],
  )

  return sanitizeUser(updated.rows[0])
}

export const startForgotPassword = async ({ emailAddress }) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  if (!normalizedEmail) throw createHttpError(400, 'emailAddress is required')

  const user = await getUserByEmail(normalizedEmail)
  if (!user) throw createHttpError(404, 'No account found for this email address.')
  if (!user.isVerified) {
    throw createHttpError(403, 'Please verify your email address before resetting your password.')
  }

  await issueOtpForEmail(normalizedEmail)
  return {
    success: true,
    emailAddress: normalizedEmail,
    message: 'A password reset code has been sent to your email.',
  }
}

export const resetPassword = async ({ emailAddress, otp, password, confirmPassword }) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  if (!normalizedEmail || !otp || !password || !confirmPassword) {
    throw createHttpError(400, 'emailAddress, otp, password, and confirmPassword are required')
  }
  if (String(password).length < 6) throw createHttpError(400, 'Password must be at least 6 characters long.')
  if (password !== confirmPassword) throw createHttpError(400, 'Passwords do not match.')

  const user = await getUserByEmail(normalizedEmail)
  if (!user) throw createHttpError(404, 'No account found for this email address.')

  await verifyOtpRecord({ emailAddress: normalizedEmail, otp })
  await pool.query('UPDATE users SET password = $2 WHERE "emailAddress" = $1', [
    normalizedEmail,
    hashPassword(password),
  ])
  await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [normalizedEmail])

  return { success: true, message: 'Password updated successfully.' }
}

export const loginUser = async ({ emailAddress, password }) => {
  const normalizedEmail = normalizeEmail(emailAddress)
  if (!normalizedEmail || !password) {
    throw createHttpError(400, 'emailAddress and password are required')
  }

  const user = await getUserByEmail(normalizedEmail)
  if (!user) {
    const pendingRes = await pool.query('SELECT * FROM pending_registrations WHERE "emailAddress" = $1', [normalizedEmail])
    if (pendingRes.rowCount > 0) {
      return {
        type: 'needsVerification',
        status: 403,
        payload: {
          error: 'Your email is not verified yet. Please verify the OTP first.',
          needsVerification: true,
          emailAddress: normalizedEmail,
        },
      }
    }

    throw createHttpError(401, 'Invalid email address or password.')
  }

  if (user.password !== hashPassword(password)) {
    throw createHttpError(401, 'Invalid email address or password.')
  }
  if (user.isActive === false) {
    throw createHttpError(403, 'This account has been suspended. Contact an administrator.')
  }

  const isAdmin = String(user.role || '').toLowerCase() === 'admin'
  if (isAdmin && user.mustChangePassword === true) {
    if (!user.isVerified) {
      await issueOtpForEmail(normalizedEmail)
      return {
        type: 'adminOtp',
        status: 403,
        payload: {
          error: 'Verify the OTP sent to your email to continue administrator setup.',
          needsVerification: true,
          adminFirstLogin: true,
          emailAddress: normalizedEmail,
        },
      }
    }

    return {
      type: 'adminPasswordChange',
      status: 403,
      payload: {
        error: 'Create a new password to finish administrator setup.',
        requiresPasswordChange: true,
        adminFirstLogin: true,
        emailAddress: normalizedEmail,
      },
    }
  }

  return {
    type: 'success',
    payload: {
      success: true,
      user: sanitizeUser(user),
      needsVerificationCookie: !user.isOnboarded,
      emailAddress: normalizedEmail,
    },
  }
}
