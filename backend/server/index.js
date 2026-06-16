import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Pool } from 'pg'
import crypto from 'crypto'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3001)
const sessionSecret = process.env.SESSION_SECRET || 'qsphere-dev-session-secret'
const authCookieName = 'qsphere_auth'
const verifyCookieName = 'qsphere_verify_email'

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: String(process.env.DB_SSL || 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
})

// File upload configuration
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1')
const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, unique + path.extname(file.originalname))
  }
})
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }) // 50MB max

const baseCookieOptions = [
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
]

if (process.env.NODE_ENV === 'production') {
  baseCookieOptions.push('Secure')
}

const signCookieValue = (value) => {
  const payload = Buffer.from(String(value || ''), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

const verifyCookieValue = (value) => {
  if (!value || !value.includes('.')) return null
  const [payload, signature] = value.split('.')
  const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  if (signature !== expected) return null

  try {
    return Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

const parseCookies = (request) => {
  const header = request.headers.cookie || ''
  return header.split(';').reduce((accumulator, pair) => {
    const [key, ...rest] = pair.trim().split('=')
    if (!key) return accumulator
    accumulator[key] = decodeURIComponent(rest.join('='))
    return accumulator
  }, {})
}

const appendCookie = (response, cookieString) => {
  const current = response.getHeader('Set-Cookie')
  if (!current) {
    response.setHeader('Set-Cookie', [cookieString])
    return
  }

  const next = Array.isArray(current) ? [...current, cookieString] : [current, cookieString]
  response.setHeader('Set-Cookie', next)
}

const setSignedCookie = (response, name, value, maxAgeSeconds = null) => {
  const parts = [`${name}=${encodeURIComponent(signCookieValue(value))}`, ...baseCookieOptions]
  if (maxAgeSeconds !== null) parts.push(`Max-Age=${maxAgeSeconds}`)
  appendCookie(response, parts.join('; '))
}

const clearCookie = (response, name) => {
  appendCookie(response, `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
}

const getSignedCookie = (request, name) => verifyCookieValue(parseCookies(request)[name])

const sanitizeUser = (user) => {
  if (!user) return null
  const cleaned = { ...user }
  cleaned.avatarPreview = cleaned.profileImage
  delete cleaned.password
  return cleaned
}

const ensureSchema = async () => {

  // Create users table matching all requirements with no duplicate columns
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      "fullName" VARCHAR(255) NOT NULL,
      "emailAddress" VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      "profileImage" TEXT,
      role VARCHAR(50),
      gender VARCHAR(50),
      "cellMain" VARCHAR(50),
      "cellAlternative" VARCHAR(50),
      cnic VARCHAR(50),
      "passportNo" VARCHAR(50),
      "dateOfBirth" VARCHAR(50),
      city VARCHAR(100),
      address TEXT,
      institute VARCHAR(255),
      degree VARCHAR(255),
      semester VARCHAR(50),
      majors VARCHAR(255),
      interests TEXT,
      "referralId" VARCHAR(50),
      discipline VARCHAR(255),
      "dateOfGraduation" VARCHAR(50),
      organization VARCHAR(255),
      "jobDescription" TEXT,
      "roleTitle" VARCHAR(255),
      qualification VARCHAR(255),
      experience VARCHAR(255),
      designation VARCHAR(255),
      post VARCHAR(255),
      "researchInterest" TEXT,
      "researchFocus" VARCHAR(255),
      "isVerified" BOOLEAN DEFAULT FALSE,
      "isOnboarded" BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Store sign-up data temporarily until OTP verification succeeds
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      "emailAddress" VARCHAR(255) PRIMARY KEY,
      "fullName" VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Create otps table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id SERIAL PRIMARY KEY,
      "emailAddress" VARCHAR(255) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Create blogs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      excerpt TEXT,
      "blogData" TEXT,
      "coverImage" TEXT,
      category VARCHAR(100),
      author VARCHAR(255),
      "authorEmail" VARCHAR(255),
      "readingTime" VARCHAR(50),
      "dateOfPublish" TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Create blog_categories table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Create blog_comments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_comments (
      id SERIAL PRIMARY KEY,
      "blogId" INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      name VARCHAR(255),
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query('ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "parentId" INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE')
  await pool.query('ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "commenterEmail" VARCHAR(255)')
  await pool.query('ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "heartedBy" JSONB DEFAULT \'[]\'::jsonb')
  await pool.query('ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Ensure groups table exists without strict foreign key constraints
  await pool.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      "groupType" VARCHAR(255) NOT NULL,
      "groupTitle" VARCHAR(255) NOT NULL,
      "groupDescription" TEXT,
      "groupScope" TEXT,
      "ownerEmail" VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // group members table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      "groupId" INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'Pending',
      position VARCHAR(100) DEFAULT 'Member',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE("groupId", "userEmail")
    )
  `)

  // projects table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      "groupId" INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      "ownerEmail" VARCHAR(255),
      "startDate" DATE,
      "dueDate" DATE,
      status VARCHAR(50) DEFAULT 'Planning',
      "referenceMaterialUrl" TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // project tasks table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id SERIAL PRIMARY KEY,
      "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      "taskName" VARCHAR(255) NOT NULL,
      "taskType" VARCHAR(100),
      "startDate" DATE,
      "targetDate" DATE,
      details TEXT,
      "referenceMaterialUrl" TEXT,
      "assignedToEmail" VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // task submissions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_submissions (
      id SERIAL PRIMARY KEY,
      "taskId" INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
      "submittedByEmail" VARCHAR(255),
      "fileUrl" TEXT,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'Review',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      "recipientEmail" VARCHAR(255) NOT NULL,
      "linkUrl" TEXT,
      "blogId" INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
      "commentId" INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
      "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      "memberEmail" VARCHAR(255),
      "isRead" BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "linkUrl" TEXT')
  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "blogId" INTEGER REFERENCES blogs(id) ON DELETE CASCADE')
  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "commentId" INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE')
  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE')
  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "memberEmail" VARCHAR(255)')
  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE')
  await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "projectId" INTEGER REFERENCES projects(id) ON DELETE CASCADE')

  // project chat table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_chat (
      id SERIAL PRIMARY KEY,
      "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      "senderEmail" VARCHAR(255),
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query('ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMPTZ')
  await pool.query('ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "editedByEmail" VARCHAR(255)')
  await pool.query('ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ')
  await pool.query('ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "deletedByEmail" VARCHAR(255)')
  await pool.query('ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "deletedForEveryone" BOOLEAN DEFAULT FALSE')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_chat_hidden (
      id SERIAL PRIMARY KEY,
      "messageId" INTEGER NOT NULL REFERENCES project_chat(id) ON DELETE CASCADE,
      "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
      "hiddenAt" TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE("messageId", "userEmail")
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_chat_reads (
      id SERIAL PRIMARY KEY,
      "messageId" INTEGER NOT NULL REFERENCES project_chat(id) ON DELETE CASCADE,
      "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
      "readAt" TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE("messageId", "userEmail")
    )
  `)

  console.log('Database schema initialized.')
}

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', async (_request, response) => {
  try {
    const result = await pool.query('SELECT NOW() AS now')
    response.json({ ok: true, now: result.rows[0]?.now ?? null })
  } catch (error) {
    response.status(500).json({ ok: false, error: 'Database connection failed' })
  }
})

/* ─── Helpers for Password Hashing, EmailJS, and ImgBB ─────────── */
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex')
}

const sendOTPEmail = async (emailAddress, otp) => {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error('EmailJS credentials are not configured in environment variables.')
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email: emailAddress,
      email: emailAddress,
      otp: otp,
      code: otp,
    },
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`EmailJS API request failed: ${errText}`)
  }
}

const issueOtpForEmail = async (emailAddress) => {
  const otp = crypto.randomInt(100000, 1000000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [emailAddress])
  await pool.query(
    `INSERT INTO otps ("emailAddress", otp, "expiresAt")
     VALUES ($1, $2, $3)`,
    [emailAddress, otp, expiresAt]
  )

  await sendOTPEmail(emailAddress, otp)
  return otp
}

const uploadImageToImgBB = async (base64DataUrl) => {
  const apiKey = process.env.IMGBB_API_KEY
  if (!apiKey) {
    throw new Error('ImgBB API key is not configured in environment variables.')
  }

  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '')
  const params = new URLSearchParams()
  params.append('image', base64Data)

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: params,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`ImgBB upload request failed: ${errText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(`ImgBB returned failure: ${result.error?.message || 'Unknown error'}`)
  }

  return result.data.url
}

/* ─── Authentication Endpoints ─────────────────────────────────── */
app.post('/api/auth/register', async (request, response) => {
  const { fullName, emailAddress, password } = request.body ?? {}

  if (!fullName || !emailAddress || !password) {
    return response.status(400).json({ error: 'fullName, emailAddress, and password are required' })
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1', [emailAddress])
    if (existing.rowCount > 0) {
      return response.status(400).json({ error: 'This email is already registered.' })
    }

    const pendingExisting = await pool.query(
      'SELECT * FROM pending_registrations WHERE "emailAddress" = $1',
      [emailAddress]
    )

    const hashedPassword = hashPassword(password)

    if (pendingExisting.rowCount === 0) {
      await pool.query(
        `INSERT INTO pending_registrations ("emailAddress", "fullName", password)
         VALUES ($1, $2, $3)`,
        [emailAddress, fullName, hashedPassword]
      )
    }

    await issueOtpForEmail(emailAddress)
    setSignedCookie(response, verifyCookieName, emailAddress, 60 * 60)

    response.status(pendingExisting.rowCount > 0 ? 409 : 201).json({
      success: true,
      pendingRegistration: pendingExisting.rowCount > 0,
      message: pendingExisting.rowCount > 0
        ? 'You already have a pending verification. A new OTP has been sent to your email.'
        : 'OTP sent to your email.',
      emailAddress,
    })
  } catch (error) {
    console.error('Registration error:', error)
    response.status(500).json({ error: error.message || 'Registration failed' })
  }
})

app.post('/api/auth/verify-otp', async (request, response) => {
  const { emailAddress, otp } = request.body ?? {}

  if (!emailAddress || !otp) {
    return response.status(400).json({ error: 'emailAddress and otp are required' })
  }

  try {
    const pendingRes = await pool.query(
      'SELECT * FROM pending_registrations WHERE "emailAddress" = $1',
      [emailAddress]
    )

    if (pendingRes.rowCount === 0) {
      return response.status(404).json({ error: 'No pending registration found for this email address.' })
    }

    const res = await pool.query(
      'SELECT * FROM otps WHERE "emailAddress" = $1 AND otp = $2 ORDER BY created_at DESC LIMIT 1',
      [emailAddress, otp]
    )

    if (res.rowCount === 0) {
      return response.status(400).json({ error: 'Invalid verification code.' })
    }

    const record = res.rows[0]
    const expiresAt = new Date(record.expiresAt)
    if (expiresAt < new Date()) {
      return response.status(400).json({ error: 'Verification code has expired.' })
    }

    await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [emailAddress])
    const pending = pendingRes.rows[0]

    await pool.query(
      `INSERT INTO users ("fullName", "emailAddress", password, "isVerified", "isOnboarded")
       VALUES ($1, $2, $3, true, false)
       ON CONFLICT ("emailAddress") DO UPDATE SET
         "fullName" = EXCLUDED."fullName",
         password = EXCLUDED.password,
         "isVerified" = true`,
      [pending.fullName, pending.emailAddress, pending.password]
    )

    await pool.query('DELETE FROM pending_registrations WHERE "emailAddress" = $1', [emailAddress])
    setSignedCookie(response, verifyCookieName, emailAddress, 60 * 60)

    response.json({ success: true, message: 'OTP verified successfully.' })
  } catch (error) {
    console.error('OTP verification error:', error)
    response.status(500).json({ error: 'OTP verification failed' })
  }
})

app.post('/api/auth/resend-otp', async (request, response) => {
  const { emailAddress } = request.body ?? {}

  if (!emailAddress) {
    return response.status(400).json({ error: 'emailAddress is required' })
  }

  try {
    const pendingRes = await pool.query('SELECT * FROM pending_registrations WHERE "emailAddress" = $1', [emailAddress])
    if (pendingRes.rowCount === 0) {
      return response.status(404).json({ error: 'No pending registration found for this email address.' })
    }

    await issueOtpForEmail(emailAddress)
    setSignedCookie(response, verifyCookieName, emailAddress, 60 * 60)

    response.json({ success: true, message: 'A new OTP has been sent to your email.' })
  } catch (error) {
    console.error('Resend OTP error:', error)
    response.status(500).json({ error: error.message || 'Failed to resend OTP' })
  }
})

app.post('/api/auth/forgot-password', async (request, response) => {
  const { emailAddress } = request.body ?? {}

  if (!emailAddress) {
    return response.status(400).json({ error: 'emailAddress is required' })
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1', [emailAddress])
    if (userRes.rowCount === 0) {
      return response.status(404).json({ error: 'No account found for this email address.' })
    }

    const user = userRes.rows[0]
    if (!user.isVerified) {
      return response.status(403).json({ error: 'Please verify your email address before resetting your password.' })
    }

    await issueOtpForEmail(emailAddress)

    response.json({
      success: true,
      message: 'A password reset code has been sent to your email.',
      emailAddress,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    response.status(500).json({ error: error.message || 'Failed to start password reset' })
  }
})

app.post('/api/auth/reset-password', async (request, response) => {
  const { emailAddress, otp, password, confirmPassword } = request.body ?? {}

  if (!emailAddress || !otp || !password || !confirmPassword) {
    return response.status(400).json({ error: 'emailAddress, otp, password, and confirmPassword are required' })
  }

  if (String(password).length < 6) {
    return response.status(400).json({ error: 'Password must be at least 6 characters long.' })
  }

  if (password !== confirmPassword) {
    return response.status(400).json({ error: 'Passwords do not match.' })
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1', [emailAddress])
    if (userRes.rowCount === 0) {
      return response.status(404).json({ error: 'No account found for this email address.' })
    }

    const otpRes = await pool.query(
      'SELECT * FROM otps WHERE "emailAddress" = $1 AND otp = $2 ORDER BY created_at DESC LIMIT 1',
      [emailAddress, otp]
    )

    if (otpRes.rowCount === 0) {
      return response.status(400).json({ error: 'Invalid verification code.' })
    }

    const record = otpRes.rows[0]
    const expiresAt = new Date(record.expiresAt)
    if (expiresAt < new Date()) {
      return response.status(400).json({ error: 'Verification code has expired.' })
    }

    await pool.query('UPDATE users SET password = $2 WHERE "emailAddress" = $1', [emailAddress, hashPassword(password)])
    await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [emailAddress])
    clearCookie(response, authCookieName)
    clearCookie(response, verifyCookieName)

    response.json({ success: true, message: 'Password updated successfully.' })
  } catch (error) {
    console.error('Reset password error:', error)
    response.status(500).json({ error: error.message || 'Failed to reset password' })
  }
})

app.post('/api/auth/login', async (request, response) => {
  const { emailAddress, password } = request.body ?? {}

  if (!emailAddress || !password) {
    return response.status(400).json({ error: 'emailAddress and password are required' })
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1', [emailAddress])
    if (userRes.rowCount === 0) {
      clearCookie(response, authCookieName)
      const pendingRes = await pool.query('SELECT * FROM pending_registrations WHERE "emailAddress" = $1', [emailAddress])
      if (pendingRes.rowCount > 0) {
        setSignedCookie(response, verifyCookieName, emailAddress, 60 * 60)
        return response.status(403).json({
          error: 'Your email is not verified yet. Please verify the OTP first.',
          needsVerification: true,
          emailAddress,
        })
      }

      return response.status(401).json({ error: 'Invalid email address or password.' })
    }

    const user = userRes.rows[0]
    const hashedPassword = hashPassword(password)
    if (user.password !== hashedPassword) {
      clearCookie(response, authCookieName)
      return response.status(401).json({ error: 'Invalid email address or password.' })
    }

    if (!user.isOnboarded) {
      setSignedCookie(response, verifyCookieName, emailAddress, 60 * 60)
    } else {
      clearCookie(response, verifyCookieName)
    }

    setSignedCookie(response, authCookieName, emailAddress, 60 * 60 * 24 * 7)

    response.json({
      success: true,
      user: sanitizeUser(user),
    })
  } catch (error) {
    console.error('Login error:', error)
    response.status(500).json({ error: 'Login failed' })
  }
})

/* ─── Onboarding Endpoint ───────────────────────────────────────── */
app.post('/api/users/onboarding', async (request, response) => {
  const {
    emailAddress,
    role,
    gender,
    cellMain,
    cellAlternative,
    cnic,
    passportNo,
    dateOfBirth,
    city,
    address,
    institute,
    degree,
    semester,
    majors,
    interests,
    referralId,
    discipline,
    dateOfGraduation,
    organization,
    jobDescription,
    roleTitle,
    qualification,
    experience,
    designation,
    post,
    researchInterest,
    researchFocus,
    avatarPreview,
  } = request.body ?? {}

  if (!emailAddress) {
    return response.status(400).json({ error: 'emailAddress is required' })
  }

  try {
    let profileImageUrl = null
    if (avatarPreview && avatarPreview.startsWith('data:image/')) {
      try {
        profileImageUrl = await uploadImageToImgBB(avatarPreview)
      } catch (err) {
        console.error('ImgBB upload error:', err)
        return response.status(500).json({ error: 'Failed to upload profile image.' })
      }
    } else if (avatarPreview) {
      profileImageUrl = avatarPreview
    }

    const fieldsToUpdate = {
      role,
      gender,
      cellMain,
      cellAlternative,
      cnic,
      passportNo,
      dateOfBirth,
      city,
      address,
      institute,
      degree,
      semester,
      majors,
      interests,
      referralId,
      discipline,
      dateOfGraduation,
      organization,
      jobDescription,
      roleTitle,
      qualification,
      experience,
      designation,
      post,
      researchInterest,
      researchFocus,
      isOnboarded: true,
    }

    if (profileImageUrl) {
      fieldsToUpdate.profileImage = profileImageUrl
    }

    const keys = Object.keys(fieldsToUpdate)
    const values = Object.values(fieldsToUpdate)
    const setClause = keys.map((key, idx) => `"${key}" = $${idx + 2}`).join(', ')
    values.unshift(emailAddress)

    const updateQuery = `
      UPDATE users
      SET ${setClause}
      WHERE "emailAddress" = $1
      RETURNING *
    `

    const res = await pool.query(updateQuery, values)
    if (res.rowCount === 0) {
      clearCookie(response, authCookieName)
      return response.status(404).json({ error: 'User not found.' })
    }

    const updatedUser = res.rows[0]
    clearCookie(response, verifyCookieName)
    setSignedCookie(response, authCookieName, updatedUser.emailAddress, 60 * 60 * 24 * 7)
    response.json({
      success: true,
      user: sanitizeUser(updatedUser),
    })
  } catch (error) {
    console.error('Onboarding submission error:', error)
    response.status(500).json({ error: 'Onboarding submission failed.' })
  }
})

app.get('/api/auth/verification-target', (request, response) => {
  const emailAddress = getSignedCookie(request, verifyCookieName)
  if (!emailAddress) return response.status(404).json({ error: 'No verification target found' })
  response.json({ emailAddress })
})

app.get('/api/auth/me', async (request, response) => {
  const emailAddress = getSignedCookie(request, authCookieName)
  if (!emailAddress) return response.status(401).json({ error: 'Not authenticated' })

  try {
    const result = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1', [emailAddress])
    if (result.rowCount === 0) {
      clearCookie(response, authCookieName)
      return response.status(401).json({ error: 'Session expired' })
    }

    response.json({ success: true, user: sanitizeUser(result.rows[0]) })
  } catch (error) {
    console.error('Current user lookup error:', error)
    response.status(500).json({ error: 'Failed to load current user' })
  }
})

app.post('/api/auth/logout', (_request, response) => {
  clearCookie(response, authCookieName)
  clearCookie(response, verifyCookieName)
  response.json({ success: true })
})

/* ─── Account Management Endpoints ──────────────────────────────── */

app.get('/api/users/profile/:email', async (request, response) => {
  const email = request.params.email
  if (!email) return response.status(400).json({ error: 'Email is required' })

  try {
    const result = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1', [email])
    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'User not found' })
    }
    const user = result.rows[0]
    // Map database column to UI expected field
    user.avatarPreview = user.profileImage
    // Remove password from response
    delete user.password

    response.json(user)
  } catch (error) {
    console.error('Fetch profile error:', error)
    response.status(500).json({ error: 'Failed to load profile' })
  }
})

app.put('/api/users/profile', async (request, response) => {
  const payload = request.body ?? {}
  const emailAddress = payload.emailAddress
  
  if (!emailAddress) {
    return response.status(400).json({ error: 'emailAddress is required' })
  }

  try {
    const validColumns = [
      'fullName', 'role', 'gender', 'cellMain', 'cellAlternative', 'cnic', 
      'passportNo', 'dateOfBirth', 'city', 'address', 'institute', 'degree', 
      'semester', 'majors', 'interests', 'referralId', 'discipline', 
      'dateOfGraduation', 'organization', 'jobDescription', 'roleTitle', 
      'qualification', 'experience', 'designation', 'post', 'researchInterest', 
      'researchFocus'
    ]

    const fieldsToUpdate = {}
    validColumns.forEach(col => {
      if (payload[col] !== undefined) {
        fieldsToUpdate[col] = payload[col]
      }
    })

    // Handle avatar upload via ImgBB if it's a new base64 string
    if (payload.avatarPreview && payload.avatarPreview.startsWith('data:image/')) {
      try {
        const url = await uploadImageToImgBB(payload.avatarPreview)
        fieldsToUpdate.profileImage = url
      } catch (err) {
        console.error('ImgBB upload error during profile update:', err)
        return response.status(500).json({ error: 'Failed to upload profile image.' })
      }
    } else if (payload.avatarPreview && payload.avatarPreview.startsWith('http')) {
      // It's already an uploaded URL
      fieldsToUpdate.profileImage = payload.avatarPreview
    }

    const keys = Object.keys(fieldsToUpdate).filter(k => fieldsToUpdate[k] !== undefined)
    if (keys.length === 0) return response.json({ success: true })

    const setClause = keys.map((key, idx) => `"${key}" = $${idx + 2}`).join(', ')
    const values = [emailAddress, ...keys.map(k => fieldsToUpdate[k])]

    const res = await pool.query(
      `UPDATE users SET ${setClause} WHERE "emailAddress" = $1 RETURNING *`,
      values
    )

    if (res.rowCount === 0) {
      return response.status(404).json({ error: 'User not found' })
    }

    const updatedUser = res.rows[0]
    updatedUser.avatarPreview = updatedUser.profileImage
    response.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Profile update error:', error)
    response.status(500).json({ error: 'Failed to update profile' })
  }
})

app.put('/api/users/password', async (request, response) => {
  const { emailAddress, currentPassword, newPassword } = request.body ?? {}

  if (!emailAddress || !currentPassword || !newPassword) {
    return response.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE "emailAddress" = $1', [emailAddress])
    if (userRes.rowCount === 0) {
      return response.status(404).json({ error: 'User not found' })
    }

    const user = userRes.rows[0]
    const hashedCurrent = hashPassword(currentPassword)
    if (user.password !== hashedCurrent) {
      return response.status(401).json({ error: 'Incorrect current password' })
    }

    const hashedNew = hashPassword(newPassword)
    await pool.query('UPDATE users SET password = $1 WHERE "emailAddress" = $2', [hashedNew, emailAddress])

    response.json({ success: true })
  } catch (error) {
    console.error('Password update error:', error)
    response.status(500).json({ error: 'Failed to update password' })
  }
})

/* ─── Blog Endpoints ────────────────────────────────────────────── */

// GET all blogs (listing - lightweight fields for cards)
app.get('/api/blogs', async (_request, response) => {
  try {
    const result = await pool.query(
      `SELECT id, title, excerpt, "coverImage", category, author, "authorEmail", "readingTime", "dateOfPublish"
       FROM blogs ORDER BY "dateOfPublish" DESC`
    )
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching blogs:', error)
    response.status(500).json({ error: 'Failed to load blogs' })
  }
})

// GET single blog by id (full detail)
app.get('/api/blogs/:id', async (request, response) => {
  const blogId = Number(request.params.id)
  if (!blogId) return response.status(400).json({ error: 'Invalid blog id' })

  try {
    const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [blogId])
    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'Blog not found' })
    }
    response.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching blog:', error)
    response.status(500).json({ error: 'Failed to load blog' })
  }
})

// GET blogs by user email
app.get('/api/blogs/user/:email', async (request, response) => {
  const email = request.params.email
  if (!email) return response.status(400).json({ error: 'Email is required' })

  try {
    const result = await pool.query(
      `SELECT id, title, excerpt, "coverImage", category, author, "authorEmail", "readingTime", "dateOfPublish"
       FROM blogs WHERE "authorEmail" = $1 ORDER BY "dateOfPublish" DESC`,
      [email]
    )
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching user blogs:', error)
    response.status(500).json({ error: 'Failed to load user blogs' })
  }
})

// POST create a new blog
app.post('/api/blogs', async (request, response) => {
  const { title, excerpt, blogData, coverImage, category, author, authorEmail, readingTime } = request.body ?? {}

  if (!title) {
    return response.status(400).json({ error: 'Title is required' })
  }

  try {
    let coverImageUrl = coverImage || null
    if (coverImage && coverImage.startsWith('data:image/')) {
      try {
        coverImageUrl = await uploadImageToImgBB(coverImage)
      } catch (err) {
        console.error('ImgBB upload error for blog cover:', err)
        return response.status(500).json({ error: 'Failed to upload cover image.' })
      }
    }

    const result = await pool.query(
      `INSERT INTO blogs (title, excerpt, "blogData", "coverImage", category, author, "authorEmail", "readingTime")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, excerpt || null, blogData || null, coverImageUrl, category || null, author || 'QSphere Contributor', authorEmail || null, readingTime || null]
    )

    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating blog:', error)
    response.status(500).json({ error: 'Failed to create blog' })
  }
})

// PUT update a blog
app.put('/api/blogs/:id', async (request, response) => {
  const blogId = Number(request.params.id)
  if (!blogId) return response.status(400).json({ error: 'Invalid blog id' })

  const { title, excerpt, blogData, coverImage, category, author, readingTime } = request.body ?? {}

  try {
    let coverImageUrl = coverImage
    if (coverImage && coverImage.startsWith('data:image/')) {
      try {
        coverImageUrl = await uploadImageToImgBB(coverImage)
      } catch (err) {
        console.error('ImgBB upload error for blog cover update:', err)
        return response.status(500).json({ error: 'Failed to upload cover image.' })
      }
    }

    const result = await pool.query(
      `UPDATE blogs SET
        title = COALESCE($2, title),
        excerpt = COALESCE($3, excerpt),
        "blogData" = COALESCE($4, "blogData"),
        "coverImage" = COALESCE($5, "coverImage"),
        category = COALESCE($6, category),
        author = COALESCE($7, author),
        "readingTime" = COALESCE($8, "readingTime")
       WHERE id = $1
       RETURNING *`,
      [blogId, title || null, excerpt || null, blogData || null, coverImageUrl || null, category || null, author || null, readingTime || null]
    )

    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'Blog not found' })
    }
    response.json(result.rows[0])
  } catch (error) {
    console.error('Error updating blog:', error)
    response.status(500).json({ error: 'Failed to update blog' })
  }
})

// DELETE a blog
app.delete('/api/blogs/:id', async (request, response) => {
  const blogId = Number(request.params.id)
  if (!blogId) return response.status(400).json({ error: 'Invalid blog id' })

  try {
    const result = await pool.query('DELETE FROM blogs WHERE id = $1 RETURNING id', [blogId])
    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'Blog not found' })
    }
    response.json({ deleted: true, id: blogId })
  } catch (error) {
    console.error('Error deleting blog:', error)
    response.status(500).json({ error: 'Failed to delete blog' })
  }
})

/* ─── Blog Categories Endpoints ─────────────────────────────────── */

// GET all categories
app.get('/api/blog-categories', async (_request, response) => {
  try {
    const result = await pool.query('SELECT * FROM blog_categories ORDER BY name ASC')
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching categories:', error)
    response.status(500).json({ error: 'Failed to load categories' })
  }
})

// POST create a category
app.post('/api/blog-categories', async (request, response) => {
  const { name } = request.body ?? {}
  const trimmed = (name || '').trim().toUpperCase()
  if (!trimmed) {
    return response.status(400).json({ error: 'Category name is required' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO blog_categories (name) VALUES ($1)
       ON CONFLICT (name) DO NOTHING
       RETURNING *`,
      [trimmed]
    )

    if (result.rowCount === 0) {
      return response.status(409).json({ error: 'Category already exists' })
    }
    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating category:', error)
    response.status(500).json({ error: 'Failed to create category' })
  }
})

/* ─── Blog Comments Endpoints ───────────────────────────────────── */

app.get('/api/notifications/:email', async (request, response) => {
  const recipientEmail = String(request.params.email || '').trim().toLowerCase()
  if (!recipientEmail) {
    return response.status(400).json({ error: 'Email is required' })
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM notifications
       WHERE LOWER("recipientEmail") = $1
       ORDER BY "isRead" ASC, created_at DESC`,
      [recipientEmail]
    )

    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    response.status(500).json({ error: 'Failed to load notifications' })
  }
})

app.patch('/api/notifications/:email/read-all', async (request, response) => {
  const email = String(request.params.email || '').trim().toLowerCase()
  if (!email) return response.status(400).json({ error: 'Email is required' })

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET "isRead" = TRUE
       WHERE "recipientEmail" = $1 AND "isRead" = FALSE
       RETURNING *`,
      [email]
    )
    response.json({ success: true, count: result.rowCount })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    response.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

app.patch('/api/notifications/:id/read', async (request, response) => {
  const notificationId = Number(request.params.id)
  if (!notificationId) {
    return response.status(400).json({ error: 'Invalid notification id' })
  }

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET "isRead" = TRUE
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    )

    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'Notification not found' })
    }

    response.json(result.rows[0])
  } catch (error) {
    console.error('Error marking notification as read:', error)
    response.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

// GET comments for a blog
app.get('/api/blogs/:id/comments', async (request, response) => {
  const blogId = Number(request.params.id)
  if (!blogId) return response.status(400).json({ error: 'Invalid blog id' })

  try {
    const result = await pool.query(
      'SELECT * FROM blog_comments WHERE "blogId" = $1 ORDER BY created_at DESC',
      [blogId]
    )
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching comments:', error)
    response.status(500).json({ error: 'Failed to load comments' })
  }
})

// POST add a comment to a blog
app.post('/api/blogs/:id/comments', async (request, response) => {
  const blogId = Number(request.params.id)
  if (!blogId) return response.status(400).json({ error: 'Invalid blog id' })

  const { name, text, commenterEmail } = request.body ?? {}
  if (!text || !text.trim()) {
    return response.status(400).json({ error: 'Comment text is required' })
  }

  try {
    const blogResult = await pool.query(
      'SELECT id, title, author, "authorEmail" FROM blogs WHERE id = $1',
      [blogId]
    )

    if (blogResult.rowCount === 0) {
      return response.status(404).json({ error: 'Blog not found' })
    }

    const trimmedName = (name || 'Anonymous').trim()
    const trimmedText = text.trim()
    const normalizedCommenterEmail = String(commenterEmail || '').trim().toLowerCase() || null

    const result = await pool.query(
      `INSERT INTO blog_comments ("blogId", name, text, "commenterEmail")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [blogId, trimmedName, trimmedText, normalizedCommenterEmail]
    )

    const newComment = result.rows[0]
    const blog = blogResult.rows[0]
    const normalizedAuthorEmail = String(blog.authorEmail || '').trim().toLowerCase()

    if (normalizedAuthorEmail && normalizedAuthorEmail !== normalizedCommenterEmail) {
      try {
        await pool.query(
          `INSERT INTO notifications (type, title, message, "recipientEmail", "linkUrl", "blogId", "commentId")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'blog_comment',
            'New comment on your blog',
            `${trimmedName} commented on "${blog.title}".`,
            normalizedAuthorEmail,
            `/blogs/${blogId}?commentId=${newComment.id}`,
            blogId,
            newComment.id,
          ]
        )
      } catch (notificationError) {
        console.error('Error creating blog comment notification:', notificationError)
      }
    }

    response.status(201).json(newComment)
  } catch (error) {
    console.error('Error creating comment:', error)
    response.status(500).json({ error: 'Failed to post comment' })
  }
})

// PUT update a comment
app.put('/api/blogs/:id/comments/:commentId', async (request, response) => {
  const commentId = Number(request.params.commentId)
  if (!commentId) return response.status(400).json({ error: 'Invalid comment id' })

  const { text, commenterEmail } = request.body ?? {}
  if (!text || !text.trim()) {
    return response.status(400).json({ error: 'Comment text is required' })
  }
  if (!commenterEmail) {
    return response.status(400).json({ error: 'commenterEmail is required' })
  }

  try {
    const existing = await pool.query('SELECT * FROM blog_comments WHERE id = $1', [commentId])
    if (existing.rowCount === 0) {
      return response.status(404).json({ error: 'Comment not found' })
    }

    const comment = existing.rows[0]
    if (String(comment.commenterEmail || '').toLowerCase() !== String(commenterEmail).toLowerCase()) {
      return response.status(403).json({ error: 'You can only edit your own comments' })
    }

    const result = await pool.query(
      'UPDATE blog_comments SET text = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [text.trim(), commentId]
    )
    response.json(result.rows[0])
  } catch (error) {
    console.error('Error updating comment:', error)
    response.status(500).json({ error: 'Failed to update comment' })
  }
})

// DELETE a comment
app.delete('/api/blogs/:id/comments/:commentId', async (request, response) => {
  const commentId = Number(request.params.commentId)
  if (!commentId) return response.status(400).json({ error: 'Invalid comment id' })

  const { commenterEmail } = request.body ?? {}
  if (!commenterEmail) {
    return response.status(400).json({ error: 'commenterEmail is required' })
  }

  try {
    const existing = await pool.query('SELECT * FROM blog_comments WHERE id = $1', [commentId])
    if (existing.rowCount === 0) {
      return response.status(404).json({ error: 'Comment not found' })
    }

    const comment = existing.rows[0]
    if (String(comment.commenterEmail || '').toLowerCase() !== String(commenterEmail).toLowerCase()) {
      return response.status(403).json({ error: 'You can only delete your own comments' })
    }

    await pool.query('DELETE FROM blog_comments WHERE id = $1', [commentId])
    response.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    response.status(500).json({ error: 'Failed to delete comment' })
  }
})

/* ─── Group Endpoints ──────────────────────────────────────────── */

// GET all group types
app.get('/api/group-types', async (request, response) => {
  try {
    const result = await pool.query('SELECT * FROM group_types ORDER BY name ASC')
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching group types:', error)
    response.status(500).json({ error: 'Failed to fetch group types' })
  }
})

// POST create a new group type
app.post('/api/group-types', async (request, response) => {
  const { name } = request.body ?? {}
  if (!name || !name.trim()) return response.status(400).json({ error: 'Type name is required' })

  try {
    const result = await pool.query(
      'INSERT INTO group_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
      [name.trim()]
    )
    if (result.rowCount === 0) {
      // It already exists
      const existing = await pool.query('SELECT * FROM group_types WHERE name = $1', [name.trim()])
      return response.json(existing.rows[0])
    }
    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating group type:', error)
    response.status(500).json({ error: 'Failed to create group type' })
  }
})

// POST create a new group
app.post('/api/groups', async (request, response) => {
  const { groupType, groupTitle, groupDescription, groupScope, ownerEmail } = request.body ?? {}
  if (!groupTitle || !groupScope || !groupType || !ownerEmail) {
    return response.status(400).json({ error: 'Missing required group fields' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO groups ("groupType", "groupTitle", "groupDescription", "groupScope", "ownerEmail") 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [groupType, groupTitle, groupDescription, groupScope, ownerEmail]
    )
    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating group:', error)
    response.status(500).json({ error: error.message || 'Failed to create group' })
  }
})

// GET all groups (with owner info joined)
app.get('/api/groups', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT g.*, 
             u."fullName" AS owner, 
             u."profileImage" AS avatar
      FROM groups g
      JOIN users u ON g."ownerEmail" = u."emailAddress"
      ORDER BY g.created_at DESC
    `)
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching groups:', error)
    response.status(500).json({ error: 'Failed to fetch groups' })
  }
})

// GET groups for a specific user
app.get('/api/groups/my/:email', async (request, response) => {
  const email = request.params.email
  if (!email) return response.status(400).json({ error: 'Email required' })

  try {
    const result = await pool.query(`
      SELECT g.*, 
             u."fullName" AS owner, 
             u."profileImage" AS avatar
      FROM groups g
      JOIN users u ON g."ownerEmail" = u."emailAddress"
      WHERE g."ownerEmail" = $1
      ORDER BY g.created_at DESC
    `, [email])
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching user groups:', error)
    response.status(500).json({ error: 'Failed to fetch user groups' })
  }
})

// PUT update a group
app.put('/api/groups/:id', async (request, response) => {
  const id = Number(request.params.id)
  const { groupTitle, groupDescription, groupScope } = request.body ?? {}
  
  if (!id || !groupTitle || !groupScope) {
    return response.status(400).json({ error: 'Missing required update fields' })
  }

  try {
    const result = await pool.query(
      `UPDATE groups 
       SET "groupTitle" = $1, "groupDescription" = $2, "groupScope" = $3 
       WHERE id = $4 RETURNING *`,
      [groupTitle, groupDescription, groupScope, id]
    )
    if (result.rowCount === 0) return response.status(404).json({ error: 'Group not found' })
    response.json(result.rows[0])
  } catch (error) {
    console.error('Error updating group:', error)
    response.status(500).json({ error: 'Failed to update group' })
  }
})

// DELETE a group
app.delete('/api/groups/:id', async (request, response) => {
  const id = Number(request.params.id)
  if (!id) return response.status(400).json({ error: 'Invalid id' })

  try {
    const result = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING *', [id])
    if (result.rowCount === 0) return response.status(404).json({ error: 'Group not found' })
    response.json({ success: true })
  } catch (error) {
    console.error('Error deleting group:', error)
    response.status(500).json({ error: 'Failed to delete group' })
  }
})

// GROUP MEMBERS ENDPOINTS

// GET /api/groups/:id/members
app.get('/api/groups/:id/members', async (request, response) => {
  const groupId = Number(request.params.id)
  if (!groupId) return response.status(400).json({ error: 'Invalid group ID' })

  try {
    // Join with users to get avatar, name, etc.
    const result = await pool.query(`
      SELECT gm.id, gm."groupId", gm."userEmail" as email, gm.status, gm.position, gm.created_at,
             u."fullName" as name, u."profileImage" as avatar
      FROM group_members gm
      JOIN users u ON gm."userEmail" = u."emailAddress"
      WHERE gm."groupId" = $1
      ORDER BY gm.created_at ASC
    `, [groupId])
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching group members:', error)
    response.status(500).json({ error: 'Failed to fetch group members' })
  }
})

// POST /api/groups/:id/members (Request to join)
app.post('/api/groups/:id/members', async (request, response) => {
  const groupId = Number(request.params.id)
  const { userEmail } = request.body ?? {}
  if (!groupId || !userEmail) return response.status(400).json({ error: 'Missing required fields' })

  try {
    const normalizedUserEmail = String(userEmail || '').trim().toLowerCase()
    const groupResult = await pool.query(
      'SELECT id, "groupTitle", "ownerEmail" FROM groups WHERE id = $1',
      [groupId]
    )

    if (groupResult.rowCount === 0) {
      return response.status(404).json({ error: 'Group not found' })
    }

    const requesterResult = await pool.query(
      'SELECT "fullName" FROM users WHERE "emailAddress" = $1',
      [normalizedUserEmail]
    )

    const result = await pool.query(`
      INSERT INTO group_members ("groupId", "userEmail", status, position)
      VALUES ($1, $2, 'Pending', 'Member')
      ON CONFLICT ("groupId", "userEmail") DO NOTHING
      RETURNING *
    `, [groupId, normalizedUserEmail])
    
    if (result.rowCount === 0) {
      return response.status(400).json({ error: 'Request already exists or user already in group' })
    }

    const group = groupResult.rows[0]
    const normalizedOwnerEmail = String(group.ownerEmail || '').trim().toLowerCase()
    const requesterName = requesterResult.rows[0]?.fullName || normalizedUserEmail

    if (normalizedOwnerEmail && normalizedOwnerEmail !== normalizedUserEmail) {
      try {
        await pool.query(
          `INSERT INTO notifications (type, title, message, "recipientEmail", "linkUrl", "groupId", "memberEmail")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'group_join_request',
            'New group join request',
            `${requesterName} requested to join "${group.groupTitle}".`,
            normalizedOwnerEmail,
            `/groups/${groupId}?scroll=members`,
            groupId,
            normalizedUserEmail,
          ]
        )
      } catch (notificationError) {
        console.error('Error creating group join request notification:', notificationError)
      }
    }

    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error joining group:', error)
    response.status(500).json({ error: 'Failed to join group' })
  }
})

// PUT /api/groups/:id/members/:memberEmail
app.put('/api/groups/:id/members/:memberEmail', async (request, response) => {
  const groupId = Number(request.params.id)
  const memberEmail = request.params.memberEmail
  const { status, position } = request.body ?? {}
  
  try {
    const normalizedMemberEmail = String(memberEmail || '').trim().toLowerCase()
    const currentMemberResult = await pool.query(
      `SELECT gm."groupId", gm."userEmail", gm.status, gm.position,
              g."groupTitle", g."ownerEmail"
       FROM group_members gm
       JOIN groups g ON g.id = gm."groupId"
       WHERE gm."groupId" = $1 AND LOWER(gm."userEmail") = $2`,
      [groupId, normalizedMemberEmail]
    )

    if (currentMemberResult.rowCount === 0) {
      return response.status(404).json({ error: 'Member not found' })
    }

    const currentMember = currentMemberResult.rows[0]
    const fields = []
    const values = [groupId, normalizedMemberEmail]
    let counter = 3

    if (status) {
      fields.push(`status = $${counter++}`)
      values.push(status)
    }
    if (position) {
      fields.push(`position = $${counter++}`)
      values.push(position)
    }

    if (fields.length === 0) return response.status(400).json({ error: 'No fields to update' })

    const query = `
      UPDATE group_members
      SET ${fields.join(', ')}
      WHERE "groupId" = $1 AND "userEmail" = $2
      RETURNING *
    `
    const result = await pool.query(query, values)

    if (status === 'Active' && currentMember.status !== 'Active') {
      try {
        await pool.query(
          `INSERT INTO notifications (type, title, message, "recipientEmail", "linkUrl", "groupId", "memberEmail")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'group_join_accepted',
            'Your join request was accepted',
            `Your request to join "${currentMember.groupTitle}" was accepted.`,
            normalizedMemberEmail,
            `/groups/${groupId}?scroll=members`,
            groupId,
            normalizedMemberEmail,
          ]
        )
      } catch (notificationError) {
        console.error('Error creating group join acceptance notification:', notificationError)
      }
    }

    response.json(result.rows[0])
  } catch (error) {
    console.error('Error updating member:', error)
    response.status(500).json({ error: 'Failed to update member' })
  }
})

// DELETE /api/groups/:id/members/:memberEmail
app.delete('/api/groups/:id/members/:memberEmail', async (request, response) => {
  const groupId = Number(request.params.id)
  const memberEmail = request.params.memberEmail
  
  try {
    const result = await pool.query(
      `DELETE FROM group_members WHERE "groupId" = $1 AND "userEmail" = $2 RETURNING *`,
      [groupId, memberEmail]
    )
    if (result.rowCount === 0) return response.status(404).json({ error: 'Member not found' })
    response.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    response.status(500).json({ error: 'Failed to remove member' })
  }
})

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir))

/* ─── PROJECT ENDPOINTS ───────────────────────────────────── */

// GET all projects for a group
app.get('/api/groups/:groupId/projects', async (request, response) => {
  const groupId = Number(request.params.groupId)
  if (!groupId) return response.status(400).json({ error: 'Invalid group ID' })
  try {
    const result = await pool.query(`
      SELECT p.*, u."fullName" AS "ownerName"
      FROM projects p
      LEFT JOIN users u ON p."ownerEmail" = u."emailAddress"
      WHERE p."groupId" = $1
      ORDER BY p.created_at DESC
    `, [groupId])
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching projects:', error)
    response.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// GET single project
app.get('/api/projects/:id', async (request, response) => {
  const id = Number(request.params.id)
  if (!id) return response.status(400).json({ error: 'Invalid project ID' })
  try {
    const result = await pool.query(`
      SELECT p.*, u."fullName" AS "ownerName", g."groupTitle", g."ownerEmail" AS "groupOwnerEmail"
      FROM projects p
      LEFT JOIN users u ON p."ownerEmail" = u."emailAddress"
      LEFT JOIN groups g ON p."groupId" = g.id
      WHERE p.id = $1
    `, [id])
    if (result.rows.length === 0) return response.status(404).json({ error: 'Project not found' })
    response.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching project:', error)
    response.status(500).json({ error: 'Failed to fetch project' })
  }
})

// POST create project (with file upload)
app.post('/api/groups/:groupId/projects', upload.single('referenceFile'), async (request, response) => {
  const groupId = Number(request.params.groupId)
  const { title, description, ownerEmail, startDate, dueDate, status } = request.body ?? {}
  if (!title || !groupId) return response.status(400).json({ error: 'Title and group ID required' })

  const fileUrl = request.file ? `/uploads/${request.file.filename}` : null
  try {
    const result = await pool.query(`
      INSERT INTO projects ("groupId", title, description, "ownerEmail", "startDate", "dueDate", status, "referenceMaterialUrl")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [groupId, title, description || '', ownerEmail || null, startDate || new Date().toISOString().split('T')[0], dueDate || null, status || 'Planning', fileUrl])
    
    // Create notification for all members
    try {
      const groupRes = await pool.query('SELECT "groupTitle" FROM groups WHERE id = $1', [groupId])
      const groupName = groupRes.rows[0]?.groupTitle || 'a group'
      const membersRes = await pool.query('SELECT "userEmail" FROM group_members WHERE "groupId" = $1 AND status = $2', [groupId, 'Active'])
      
      const normalizedOwnerEmail = String(ownerEmail || '').trim().toLowerCase()
      for (const member of membersRes.rows) {
        if (member.userEmail && member.userEmail.toLowerCase() !== normalizedOwnerEmail) {
          await pool.query(`
            INSERT INTO notifications (type, title, message, "recipientEmail", "linkUrl", "groupId")
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            'project_created', 
            'New Project Created', 
            `A new project "${title}" was created in "${groupName}".`, 
            member.userEmail, 
            `/groups/${groupId}?scroll=projects`,
            groupId
          ])
        }
      }
    } catch (notifErr) {
      console.error('Error creating notifications:', notifErr)
    }

    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating project:', error)
    response.status(500).json({ error: 'Failed to create project' })
  }
})

// DELETE project
app.delete('/api/projects/:id', async (request, response) => {
  const id = Number(request.params.id)
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id])
    if (result.rowCount === 0) return response.status(404).json({ error: 'Project not found' })
    response.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    response.status(500).json({ error: 'Failed to delete project' })
  }
})

/* ─── TASK ENDPOINTS ───────────────────────────────────── */

// GET tasks for a project
app.get('/api/projects/:projectId/tasks', async (request, response) => {
  const projectId = Number(request.params.projectId)
  try {
    const result = await pool.query(`
      SELECT t.*, u."fullName" AS "assigneeName", u."profileImage" AS "assigneeAvatar"
      FROM project_tasks t
      LEFT JOIN users u ON t."assignedToEmail" = u."emailAddress"
      WHERE t."projectId" = $1
      ORDER BY t.created_at DESC
    `, [projectId])
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    response.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// POST create task (with file upload)
app.post('/api/projects/:projectId/tasks', upload.single('referenceFile'), async (request, response) => {
  const projectId = Number(request.params.projectId)
  const { taskName, taskType, startDate, targetDate, details, assignedToEmail } = request.body ?? {}
  if (!taskName || !projectId) return response.status(400).json({ error: 'Task name required' })

  const fileUrl = request.file ? `/uploads/${request.file.filename}` : null
  try {
    const result = await pool.query(`
      INSERT INTO project_tasks ("projectId", "taskName", "taskType", "startDate", "targetDate", details, "referenceMaterialUrl", "assignedToEmail")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [projectId, taskName, taskType || null, startDate || null, targetDate || null, details || '', fileUrl, assignedToEmail || null])
    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating task:', error)
    response.status(500).json({ error: 'Failed to create task' })
  }
})

// PUT update task (status, assign, modify)
app.put('/api/tasks/:id', async (request, response) => {
  const id = Number(request.params.id)
  const { taskName, taskType, targetDate, details, assignedToEmail, status } = request.body ?? {}
  try {
    const fields = []
    const values = [id]
    let c = 2
    if (taskName) { fields.push(`"taskName" = $${c++}`); values.push(taskName) }
    if (taskType) { fields.push(`"taskType" = $${c++}`); values.push(taskType) }
    if (targetDate) { fields.push(`"targetDate" = $${c++}`); values.push(targetDate) }
    if (details !== undefined) { fields.push(`details = $${c++}`); values.push(details) }
    if (assignedToEmail !== undefined) { fields.push(`"assignedToEmail" = $${c++}`); values.push(assignedToEmail) }
    if (status) { fields.push(`status = $${c++}`); values.push(status) }
    if (fields.length === 0) return response.status(400).json({ error: 'No fields to update' })

    if (assignedToEmail !== undefined) {
      try {
        const taskRes = await pool.query(
          `SELECT t.id, t."taskName", t."projectId", p.title AS "projectTitle"
           FROM project_tasks t
           JOIN projects p ON p.id = t."projectId"
           WHERE t.id = $1`,
          [id]
        )
        if (taskRes.rowCount > 0) {
          const taskInfo = taskRes.rows[0]
          await pool.query(
            `INSERT INTO notifications (type, title, message, "recipientEmail", "linkUrl", "projectId")
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              'task_assigned',
              'New task assigned to you',
              `You were assigned the task "${taskInfo.taskName}" in project "${taskInfo.projectTitle}".`,
              String(assignedToEmail).trim().toLowerCase(),
              `/projects/${taskInfo.projectId}`,
              taskInfo.projectId,
            ]
          )
        }
      } catch (notifErr) {
        console.error('Error creating task assignment notification:', notifErr)
      }
    }

    const result = await pool.query(`UPDATE project_tasks SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, values)
    if (result.rowCount === 0) return response.status(404).json({ error: 'Task not found' })
    response.json(result.rows[0])
  } catch (error) {
    console.error('Error updating task:', error)
    response.status(500).json({ error: 'Failed to update task' })
  }
})

// DELETE task
app.delete('/api/tasks/:id', async (request, response) => {
  const id = Number(request.params.id)
  try {
    const result = await pool.query('DELETE FROM project_tasks WHERE id = $1 RETURNING *', [id])
    if (result.rowCount === 0) return response.status(404).json({ error: 'Task not found' })
    response.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    response.status(500).json({ error: 'Failed to delete task' })
  }
})

/* ─── TASK SUBMISSIONS ENDPOINTS ───────────────────────────────── */

// POST submit work for a task
app.post('/api/tasks/:taskId/submit', upload.single('submissionFile'), async (request, response) => {
  const taskId = Number(request.params.taskId)
  const { submittedByEmail, notes } = request.body ?? {}
  const fileUrl = request.file ? `/uploads/${request.file.filename}` : null
  try {
    const result = await pool.query(`
      INSERT INTO task_submissions ("taskId", "submittedByEmail", "fileUrl", notes, status)
      VALUES ($1, $2, $3, $4, 'Review')
      RETURNING *
    `, [taskId, submittedByEmail || null, fileUrl, notes || ''])
    // Update task status to Review
    await pool.query(`UPDATE project_tasks SET status = 'Review' WHERE id = $1`, [taskId])
    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error submitting work:', error)
    response.status(500).json({ error: 'Failed to submit work' })
  }
})

// GET submissions for a task
app.get('/api/tasks/:taskId/submissions', async (request, response) => {
  const taskId = Number(request.params.taskId)
  try {
    const result = await pool.query(`
      SELECT ts.*, u."fullName" AS "submitterName"
      FROM task_submissions ts
      LEFT JOIN users u ON ts."submittedByEmail" = u."emailAddress"
      WHERE ts."taskId" = $1
      ORDER BY ts.created_at DESC
    `, [taskId])
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching submissions:', error)
    response.status(500).json({ error: 'Failed to fetch submissions' })
  }
})

// PUT review submission (accept or rework)
app.put('/api/submissions/:id/review', async (request, response) => {
  const id = Number(request.params.id)
  const { status } = request.body ?? {} // 'Accepted' or 'Rework'
  if (!status) return response.status(400).json({ error: 'Status required' })
  try {
    const result = await pool.query(`UPDATE task_submissions SET status = $2 WHERE id = $1 RETURNING *`, [id, status])
    if (result.rowCount === 0) return response.status(404).json({ error: 'Submission not found' })

    // If accepted, mark task as Completed
    if (status === 'Accepted') {
      await pool.query(`UPDATE project_tasks SET status = 'Completed' WHERE id = $1`, [result.rows[0].taskId])
    } else if (status === 'Rework') {
      await pool.query(`UPDATE project_tasks SET status = 'Rework' WHERE id = $1`, [result.rows[0].taskId])
    }
    response.json(result.rows[0])
  } catch (error) {
    console.error('Error reviewing submission:', error)
    response.status(500).json({ error: 'Failed to review submission' })
  }
})

/* ─── PROJECT CHAT ENDPOINTS ───────────────────────────────────── */

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

const fetchProjectChatAccess = async (projectId) => {
  const result = await pool.query(
    `SELECT p.id, p."ownerEmail", g."ownerEmail" AS "groupOwnerEmail"
     FROM projects p
     LEFT JOIN groups g ON p."groupId" = g.id
     WHERE p.id = $1`,
    [projectId]
  )
  return result.rows[0] || null
}

const canControlProjectChat = (project, email) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return false
  return [project?.ownerEmail, project?.groupOwnerEmail].some((ownerEmail) => normalizeEmail(ownerEmail) === normalizedEmail)
}

// GET chat messages for project
app.get('/api/projects/:projectId/chat', async (request, response) => {
  const projectId = Number(request.params.projectId)
  const userEmail = normalizeEmail(request.query.userEmail)
  try {
    const result = await pool.query(`
      SELECT
        pc.id,
        pc."projectId",
        pc."senderEmail",
        pc.message,
        pc.created_at,
        pc."editedAt",
        pc."editedByEmail",
        pc."deletedAt",
        pc."deletedByEmail",
        pc."deletedForEveryone",
        u."fullName" AS "senderName",
        u."profileImage" AS "senderAvatar",
        COALESCE(
          json_agg(
            json_build_object(
              'emailAddress', ru."emailAddress",
              'fullName', ru."fullName",
              'profileImage', ru."profileImage",
              'readAt', pr."readAt"
            )
            ORDER BY pr."readAt" ASC
          ) FILTER (WHERE pr."userEmail" IS NOT NULL),
          '[]'::json
        ) AS "readBy"
      FROM project_chat pc
      LEFT JOIN users u ON pc."senderEmail" = u."emailAddress"
      LEFT JOIN project_chat_reads pr ON pr."messageId" = pc.id
      LEFT JOIN users ru ON pr."userEmail" = ru."emailAddress"
      LEFT JOIN project_chat_hidden ph ON ph."messageId" = pc.id AND LOWER(ph."userEmail") = $2
      WHERE pc."projectId" = $1
        AND ph."messageId" IS NULL
      GROUP BY pc.id, u."fullName", u."profileImage"
      ORDER BY pc.created_at ASC
    `, [projectId, userEmail])
    response.json(result.rows)
  } catch (error) {
    console.error('Error fetching chat:', error)
    response.status(500).json({ error: 'Failed to fetch chat' })
  }
})

// POST send chat message
app.post('/api/projects/:projectId/chat', async (request, response) => {
  const projectId = Number(request.params.projectId)
  const { senderEmail, message } = request.body ?? {}
  if (!message) return response.status(400).json({ error: 'Message required' })
  try {
    const result = await pool.query(`
      INSERT INTO project_chat ("projectId", "senderEmail", message, "deletedForEveryone")
      VALUES ($1, $2, $3, FALSE)
      RETURNING *
    `, [projectId, senderEmail || null, message])
    // Fetch with sender info
    const full = await pool.query(`
      SELECT pc.*, u."fullName" AS "senderName", u."profileImage" AS "senderAvatar", '[]'::json AS "readBy"
      FROM project_chat pc
      LEFT JOIN users u ON pc."senderEmail" = u."emailAddress"
      WHERE pc.id = $1
    `, [result.rows[0].id])
    // Notify all active group members except sender
    try {
      const projRes = await pool.query(
        `SELECT p.id, p.title, p."groupId", g."groupTitle"
         FROM projects p
         JOIN groups g ON g.id = p."groupId"
         WHERE p.id = $1`,
        [projectId]
      )
      if (projRes.rowCount > 0) {
        const proj = projRes.rows[0]
        const groupId = proj.groupId
        const projectTitle = proj.title || proj.groupTitle
        const membersRes = await pool.query(
          'SELECT "userEmail" FROM group_members WHERE "groupId" = $1 AND status = $2',
          [groupId, 'Active']
        )
        const normalizedSender = String(senderEmail || '').trim().toLowerCase()
        for (const member of membersRes.rows) {
          const memberEmail = String(member.userEmail || '').trim().toLowerCase()
          if (memberEmail && memberEmail !== normalizedSender) {
            await pool.query(
              `INSERT INTO notifications (type, title, message, "recipientEmail", "linkUrl", "projectId", "groupId")
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                'chat_message',
                'New message in project chat',
                `${senderEmail || 'Someone'} sent a message in "${projectTitle}".`,
                memberEmail,
                `/projects/${projectId}?scroll=discussion`,
                projectId,
                groupId,
              ]
            )
          }
        }
      }
    } catch (notifErr) {
      console.error('Error creating chat notification:', notifErr)
    }

    response.status(201).json(full.rows[0])
  } catch (error) {
    console.error('Error sending chat:', error)
    response.status(500).json({ error: 'Failed to send message' })
  }
})

// POST mark project chat messages as read
app.post('/api/projects/:projectId/chat/read', async (request, response) => {
  const projectId = Number(request.params.projectId)
  const readerEmail = normalizeEmail(request.body?.readerEmail)

  if (!projectId || !readerEmail) {
    return response.status(400).json({ error: 'Project and reader email are required' })
  }

  try {
    const result = await pool.query(
      `WITH inserted AS (
         INSERT INTO project_chat_reads ("messageId", "userEmail")
         SELECT pc.id, $2
         FROM project_chat pc
         WHERE pc."projectId" = $1
           AND LOWER(COALESCE(pc."senderEmail", '')) <> $2
           AND COALESCE(pc."deletedForEveryone", FALSE) = FALSE
         ON CONFLICT ("messageId", "userEmail") DO NOTHING
         RETURNING "messageId"
       )
       SELECT COUNT(*)::int AS updated FROM inserted`,
      [projectId, readerEmail]
    )

    response.json({ success: true, updated: result.rows[0]?.updated || 0 })
  } catch (error) {
    console.error('Error marking chat read:', error)
    response.status(500).json({ error: 'Failed to mark chat as read' })
  }
})

// PUT edit project chat message
app.put('/api/projects/:projectId/chat/:messageId', async (request, response) => {
  const projectId = Number(request.params.projectId)
  const messageId = Number(request.params.messageId)
  const { userEmail, message } = request.body ?? {}
  const normalizedUserEmail = normalizeEmail(userEmail)
  const trimmedMessage = String(message || '').trim()

  if (!projectId || !messageId || !normalizedUserEmail || !trimmedMessage) {
    return response.status(400).json({ error: 'Project, message, and user are required' })
  }

  try {
    const project = await fetchProjectChatAccess(projectId)
    if (!project) return response.status(404).json({ error: 'Project not found' })

    const current = await pool.query(
      `SELECT id, "senderEmail", "deletedForEveryone"
       FROM project_chat
       WHERE id = $1 AND "projectId" = $2`,
      [messageId, projectId]
    )

    if (current.rowCount === 0) return response.status(404).json({ error: 'Message not found' })

    const messageRow = current.rows[0]
    const canEdit = normalizeEmail(messageRow.senderEmail) === normalizedUserEmail
    if (!canEdit) return response.status(403).json({ error: 'You cannot edit this message' })
    if (messageRow.deletedForEveryone) return response.status(409).json({ error: 'Deleted messages cannot be edited' })

    const updated = await pool.query(
      `UPDATE project_chat
       SET message = $1,
           "editedAt" = NOW(),
           "editedByEmail" = $2
       WHERE id = $3 AND "projectId" = $4
       RETURNING *`,
      [trimmedMessage, normalizedUserEmail, messageId, projectId]
    )

    response.json(updated.rows[0])
  } catch (error) {
    console.error('Error editing chat message:', error)
    response.status(500).json({ error: 'Failed to edit message' })
  }
})

// DELETE project chat message (for me or everyone)
app.delete('/api/projects/:projectId/chat/:messageId', async (request, response) => {
  const projectId = Number(request.params.projectId)
  const messageId = Number(request.params.messageId)
  const { userEmail, scope } = request.body ?? {}
  const normalizedUserEmail = normalizeEmail(userEmail)
  const normalizedScope = String(scope || 'me').toLowerCase()

  if (!projectId || !messageId || !normalizedUserEmail) {
    return response.status(400).json({ error: 'Project, message, and user are required' })
  }

  try {
    const project = await fetchProjectChatAccess(projectId)
    if (!project) return response.status(404).json({ error: 'Project not found' })

    const current = await pool.query(
      `SELECT id, "senderEmail", "deletedForEveryone"
       FROM project_chat
       WHERE id = $1 AND "projectId" = $2`,
      [messageId, projectId]
    )

    if (current.rowCount === 0) return response.status(404).json({ error: 'Message not found' })

    const messageRow = current.rows[0]
    const isSender = normalizeEmail(messageRow.senderEmail) === normalizedUserEmail
    const canDeleteForEveryone = isSender || canControlProjectChat(project, normalizedUserEmail)

    if (normalizedScope === 'everyone') {
      if (!canDeleteForEveryone) {
        return response.status(403).json({ error: 'You cannot delete this message for everyone' })
      }

      const deleted = await pool.query(
        `UPDATE project_chat
         SET message = 'This message was deleted.',
             "deletedAt" = NOW(),
             "deletedByEmail" = $1,
             "deletedForEveryone" = TRUE
         WHERE id = $2 AND "projectId" = $3
         RETURNING *`,
        [normalizedUserEmail, messageId, projectId]
      )

      return response.json(deleted.rows[0])
    }

    await pool.query(
      `INSERT INTO project_chat_hidden ("messageId", "userEmail")
       VALUES ($1, $2)
       ON CONFLICT ("messageId", "userEmail") DO UPDATE
         SET "hiddenAt" = NOW()`,
      [messageId, normalizedUserEmail]
    )

    response.json({ success: true, scope: 'me' })
  } catch (error) {
    console.error('Error deleting chat message:', error)
    response.status(500).json({ error: 'Failed to delete message' })
  }
})

// GET all documents for a project (reference materials + task files + submissions)
app.get('/api/projects/:projectId/documents', async (request, response) => {
  const projectId = Number(request.params.projectId)
  try {
    // Project reference
    const projRef = await pool.query(`SELECT id, title, "referenceMaterialUrl", "ownerEmail" FROM projects WHERE id = $1 AND "referenceMaterialUrl" IS NOT NULL`, [projectId])
    // Task references
    const taskRefs = await pool.query(`
      SELECT t.id, t."taskName" AS title, t."referenceMaterialUrl", t."assignedToEmail" AS "ownerEmail"
      FROM project_tasks t WHERE t."projectId" = $1 AND t."referenceMaterialUrl" IS NOT NULL
    `, [projectId])
    // Submissions
    const subRefs = await pool.query(`
      SELECT ts.id, t."taskName" AS title, ts."fileUrl" AS "referenceMaterialUrl", ts."submittedByEmail" AS "ownerEmail"
      FROM task_submissions ts
      JOIN project_tasks t ON ts."taskId" = t.id
      WHERE t."projectId" = $1 AND ts."fileUrl" IS NOT NULL
    `, [projectId])

    const docs = [
      ...projRef.rows.map(r => ({ ...r, source: 'Project Reference' })),
      ...taskRefs.rows.map(r => ({ ...r, source: 'Task Reference' })),
      ...subRefs.rows.map(r => ({ ...r, source: 'Task Submission' }))
    ]
    response.json(docs)
  } catch (error) {
    console.error('Error fetching documents:', error)
    response.status(500).json({ error: 'Failed to fetch documents' })
  }
})

/* ─── AI Assistant Endpoints ───────────────────────────────────── */
app.post('/api/ai/generate-topic', async (request, response) => {
  const { topic } = request.body ?? {}
  if (!topic) return response.status(400).json({ error: 'Topic is required' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: "You are Qubi assistant, an expert SEO optimized blog topic generator. Generate exactly 1 highly optimized, catchy blog topic based on the user's input. Do not include quotes around it, just the text."
          },
          {
            role: "user",
            content: `Generate an SEO optimized topic for: ${topic}`
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const generatedTopic = data.choices[0].message.content.trim()
    response.json({ topic: generatedTopic })
  } catch (error) {
    console.error('Error generating AI topic:', error)
    response.status(500).json({ error: 'Failed to generate topic with Qubi Assistant' })
  }
})

app.post('/api/ai/optimize-group-title', async (request, response) => {
  const { title } = request.body ?? {}
  if (!title) return response.status(400).json({ error: 'Title is required' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant. The user will provide a group title. Optimize it to be professional and catchy, but it MUST be strictly under 10 words. Return ONLY the optimized title text, without quotes."
          },
          {
            role: "user",
            content: `Optimize this group title: ${title}`
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const optimized = data.choices[0].message.content.trim()
    response.json({ optimized })
  } catch (error) {
    console.error('Error optimizing title:', error)
    response.status(500).json({ error: 'Failed to optimize title' })
  }
})

app.post('/api/ai/generate-group-description', async (request, response) => {
  const { title } = request.body ?? {}
  if (!title) return response.status(400).json({ error: 'Title is required' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant. The user will provide a group title. Write a short, engaging description for this group (max 2 sentences). Return ONLY the description text, without quotes."
          },
          {
            role: "user",
            content: `Group title: ${title}`
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const description = data.choices[0].message.content.trim()
    response.json({ description })
  } catch (error) {
    console.error('Error generating description:', error)
    response.status(500).json({ error: 'Failed to generate description' })
  }
})

app.post('/api/ai/generate-blog-excerpt', async (request, response) => {
  const { title, content } = request.body ?? {}
  if (!title) return response.status(400).json({ error: 'Title is required' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant. The user will provide a blog title and optionally some content. Write a short, compelling excerpt for this blog (max 1 sentence). Return ONLY the excerpt text, without quotes."
          },
          {
            role: "user",
            content: `Blog title: ${title}\nContent: ${content || 'N/A'}`
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const excerpt = data.choices[0].message.content.trim()
    response.json({ excerpt })
  } catch (error) {
    console.error('Error generating excerpt:', error)
    response.status(500).json({ error: 'Failed to generate excerpt' })
  }
})

app.post('/api/ai/generate-blog-content', async (request, response) => {
  const { title } = request.body ?? {}
  if (!title) return response.status(400).json({ error: 'Title is required' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: "You are an AI blog writer. The user will provide a blog title. Write a well-structured, engaging blog post about this topic. Use markdown formatting (headings, bullet points, etc.). Return ONLY the blog content."
          },
          {
            role: "user",
            content: `Blog title: ${title}`
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const content = data.choices[0].message.content.trim()
    response.json({ content })
  } catch (error) {
    console.error('Error generating blog content:', error)
    response.status(500).json({ error: 'Failed to generate blog content' })
  }
})
app.post('/api/ai/suggest-project-description', async (request, response) => {
  const { title } = request.body ?? {}
  if (!title) return response.status(400).json({ error: 'Title is required' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant helping users create projects. Given a project title, generate a concise, professional project description (1-3 sentences) outlining typical goals and scope."
          },
          {
            role: "user",
            content: `Project Title: ${title}`
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const description = data.choices[0].message.content.trim()
    response.json({ description })
  } catch (error) {
    console.error('Error generating description:', error)
    response.status(500).json({ error: 'Failed to generate description' })
  }
})

app.post('/api/ai/suggest-titles', async (request, response) => {
  const { topic } = request.body ?? {}
  if (!topic) return response.status(400).json({ error: 'Topic is required' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: `You are an expert SEO blog title generator. Given a topic or existing title, generate exactly 3 highly engaging, SEO-optimized titles (each under 10-15 words). Provide a simulated "SEO rating" out of 100 for each.
Format your output exactly as a JSON array of objects. Example:
[
  { "title": "The Ultimate Guide to...", "rating": 95 },
  { "title": "10 Ways to Master...", "rating": 92 },
  { "title": "Why You Need...", "rating": 89 }
]`
          },
          {
            role: "user",
            content: `Topic: ${topic}`
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const content = data.choices[0].message.content.trim()
    try {
      const match = content.match(/\[[\s\S]*\]/)
      const jsonStr = match ? match[0] : content
      const titles = JSON.parse(jsonStr)
      response.json({ titles })
    } catch (e) {
      // Fallback
      response.json({ titles: [{ title: content.replace(/["\[\]{}]/g, '').split(',')[0], rating: 90 }] })
    }
  } catch (error) {
    console.error('Error suggesting titles:', error)
    response.status(500).json({ error: 'Failed to suggest titles' })
  }
})

app.post('/api/ai/modify-text', async (request, response) => {
  const { text, prompt, mode } = request.body ?? {}
  if (!text) return response.status(400).json({ error: 'Text is required' })

  let systemPrompt = "You are an AI writing assistant. The user will provide some text. Modify it according to their instructions. Return ONLY the modified text, with no conversational filler."
  if (mode === 'paraphrase') {
    systemPrompt = "You are an AI writing assistant. Paraphrase the following text clearly and professionally while retaining the original meaning. Return ONLY the paraphrased text."
  }

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mode === 'paraphrase' ? text : `Instructions: ${prompt || 'Improve this text'}\n\nText: ${text}` }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const modifiedText = data.choices[0].message.content.trim()
    response.json({ text: modifiedText })
  } catch (error) {
    console.error('Error modifying text:', error)
    response.status(500).json({ error: 'Failed to modify text' })
  }
})

app.post('/api/ai/autocomplete', async (request, response) => {
  const { text, context } = request.body ?? {}
  if (!text) return response.json({ suggestion: '' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: "You are an autocomplete AI. The user is typing a text field (e.g. description). Provide a short, logical continuation (1-5 words) that completes their thought. DO NOT repeat what they already wrote. ONLY output the continuation text. If the text seems complete, output nothing."
          },
          {
            role: "user",
            content: `Context: ${context || 'None'}\nCurrent text: ${text}\nContinuation:`
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const suggestion = data.choices[0].message.content.trim()
    response.json({ suggestion })
  } catch (error) {
    console.error('Error autocompleting:', error)
    response.json({ suggestion: '' }) // silently fail for autocomplete
  }
})

app.post('/api/ai/chat', async (request, response) => {
  const { message } = request.body ?? {}
  if (!message) return response.status(400).json({ error: 'Message is required' })

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: "You are Qubi assistant. Your primary purpose is to answer questions related to 'quantum' computing, quantum physics, etc. You may politely reply to basic greetings (like 'hi', 'hello', 'how are you'). However, if the user asks a completely irrelevant question (like 'who is usa president', 'what day is tomorrow', 'write me a poem about dogs', etc.), you must reply EXACTLY with: 'sorry i only answer questions related to quantam'. Keep all answers concise and polite."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    })

    const data = await aiRes.json()
    if (!aiRes.ok) throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')

    const reply = data.choices[0].message.content.trim()
    response.json({ reply })
  } catch (error) {
    console.error('Error in AI chat:', error)
    response.status(500).json({ error: 'Failed to chat with Qubi Assistant' })
  }
})

const start = async () => {
  await ensureSchema()
  app.listen(port, () => {
    console.log(`QSphere API running on http://localhost:${port}`)
  })
}

start().catch((error) => {
  console.error('Unable to start API server:', error)
  process.exit(1)
})
