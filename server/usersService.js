import crypto from 'node:crypto'
import pool from './db.js'

const OTP_CODE = '123456'

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      otp_code TEXT NOT NULL DEFAULT '123456',
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      onboarding_data JSONB,
      onboarding_completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

let readyPromise = null

export const ensureReady = async () => {
  if (!readyPromise) {
    readyPromise = ensureSchema()
  }

  await readyPromise
}

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return { salt, hash }
}

const verifyPassword = (password, salt, expectedHash) => {
  const { hash } = hashPassword(password, salt)
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
}

const toPublicUser = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  verified: row.is_verified,
  otpCode: row.otp_code,
  onboardingData: row.onboarding_data,
  onboardingCompletedAt: row.onboarding_completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const getUserByEmail = async (email) => {
  await ensureReady()
  const normalizedEmail = normalizeEmail(email)
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [normalizedEmail])
  return rows[0] ? toPublicUser(rows[0]) : null
}

export const createUser = async ({ fullName, email, password }) => {
  await ensureReady()
  const normalizedEmail = normalizeEmail(email)

  if (!fullName?.trim() || !normalizedEmail || !password) {
    const error = new Error('fullName, email, and password are required')
    error.status = 400
    throw error
  }

  const existing = await getUserByEmail(normalizedEmail)
  if (existing) {
    const error = new Error('Email already exists')
    error.status = 409
    throw error
  }

  const { salt, hash } = hashPassword(password)
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_salt, password_hash, otp_code, is_verified)
     VALUES ($1, $2, $3, $4, $5, FALSE)
     RETURNING *`,
    [fullName.trim(), normalizedEmail, salt, hash, OTP_CODE],
  )

  return toPublicUser(rows[0])
}

export const authenticateUser = async ({ email, password }) => {
  await ensureReady()
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !password) {
    const error = new Error('email and password are required')
    error.status = 400
    throw error
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [normalizedEmail])
  const row = rows[0]

  if (!row) {
    const error = new Error('Invalid credentials')
    error.status = 401
    throw error
  }

  if (!verifyPassword(password, row.password_salt, row.password_hash)) {
    const error = new Error('Invalid credentials')
    error.status = 401
    throw error
  }

  return toPublicUser(row)
}

export const verifyUserOtp = async ({ email, otp }) => {
  await ensureReady()
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || String(otp || '').trim() !== OTP_CODE) {
    const error = new Error('Invalid OTP')
    error.status = 400
    throw error
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET is_verified = TRUE,
         updated_at = NOW()
     WHERE email = $1
     RETURNING *`,
    [normalizedEmail],
  )

  if (!rows[0]) {
    const error = new Error('User not found')
    error.status = 404
    throw error
  }

  return toPublicUser(rows[0])
}

export const saveUserOnboarding = async ({ email, profile }) => {
  await ensureReady()
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    const error = new Error('email is required')
    error.status = 400
    throw error
  }

  const onboardingData = {
    ...profile,
    email: profile?.email || normalizedEmail,
    savedAt: new Date().toISOString(),
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET full_name = COALESCE(NULLIF($2, ''), full_name),
         onboarding_data = $3::jsonb,
         onboarding_completed_at = NOW(),
         updated_at = NOW()
     WHERE email = $1
     RETURNING *`,
    [normalizedEmail, String(profile?.fullName ?? '').trim(), JSON.stringify(onboardingData)],
  )

  if (!rows[0]) {
    const error = new Error('User not found')
    error.status = 404
    throw error
  }

  return toPublicUser(rows[0])
}

export const listUsers = async () => {
  await ensureReady()
  const { rows } = await pool.query('SELECT * FROM users ORDER BY id ASC')
  return rows.map(toPublicUser)
}
