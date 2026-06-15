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

  // Create group_types table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Create groups table — migrate from old schema if needed
  // Check if old schema exists (has 'title' column instead of 'groupTitle')
  const oldSchemaCheck = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'groups' AND column_name = 'title'
  `)
  if (oldSchemaCheck.rows.length > 0) {
    console.log('Migrating groups table from old schema...')
    await pool.query('DROP TABLE IF EXISTS groups CASCADE')
  }

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

    const otp = crypto.randomInt(100000, 1000000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [emailAddress])
    await pool.query(
      `INSERT INTO otps ("emailAddress", otp, "expiresAt")
       VALUES ($1, $2, $3)`,
      [emailAddress, otp, expiresAt]
    )

    await sendOTPEmail(emailAddress, otp)

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

    const otp = crypto.randomInt(100000, 1000000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await pool.query('DELETE FROM otps WHERE "emailAddress" = $1', [emailAddress])
    await pool.query(
      `INSERT INTO otps ("emailAddress", otp, "expiresAt")
       VALUES ($1, $2, $3)`,
      [emailAddress, otp, expiresAt]
    )

    await sendOTPEmail(emailAddress, otp)

    response.json({ success: true, message: 'A new OTP has been sent to your email.' })
  } catch (error) {
    console.error('Resend OTP error:', error)
    response.status(500).json({ error: error.message || 'Failed to resend OTP' })
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
      const pendingRes = await pool.query('SELECT * FROM pending_registrations WHERE "emailAddress" = $1', [emailAddress])
      if (pendingRes.rowCount > 0) {
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
      return response.status(401).json({ error: 'Invalid email address or password.' })
    }

    response.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        emailAddress: user.emailAddress,
        role: user.role,
        isVerified: user.isVerified,
        isOnboarded: user.isOnboarded,
        profileImage: user.profileImage,
        gender: user.gender,
        cellMain: user.cellMain,
        cellAlternative: user.cellAlternative,
        cnic: user.cnic,
        passportNo: user.passportNo,
        dateOfBirth: user.dateOfBirth,
        city: user.city,
        address: user.address,
        institute: user.institute,
        degree: user.degree,
        semester: user.semester,
        majors: user.majors,
        interests: user.interests,
        referralId: user.referralId,
        discipline: user.discipline,
        dateOfGraduation: user.dateOfGraduation,
        organization: user.organization,
        jobDescription: user.jobDescription,
        roleTitle: user.roleTitle,
        qualification: user.qualification,
        experience: user.experience,
        designation: user.designation,
        post: user.post,
        researchInterest: user.researchInterest,
        researchFocus: user.researchFocus,
      },
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
      return response.status(404).json({ error: 'User not found.' })
    }

    const updatedUser = res.rows[0]
    response.json({
      success: true,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        emailAddress: updatedUser.emailAddress,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        isOnboarded: updatedUser.isOnboarded,
        profileImage: updatedUser.profileImage,
        gender: updatedUser.gender,
        cellMain: updatedUser.cellMain,
        cellAlternative: updatedUser.cellAlternative,
        cnic: updatedUser.cnic,
        passportNo: updatedUser.passportNo,
        dateOfBirth: updatedUser.dateOfBirth,
        city: updatedUser.city,
        address: updatedUser.address,
        institute: updatedUser.institute,
        degree: updatedUser.degree,
        semester: updatedUser.semester,
        majors: updatedUser.majors,
        interests: updatedUser.interests,
        referralId: updatedUser.referralId,
        discipline: updatedUser.discipline,
        dateOfGraduation: updatedUser.dateOfGraduation,
        organization: updatedUser.organization,
        jobDescription: updatedUser.jobDescription,
        roleTitle: updatedUser.roleTitle,
        qualification: updatedUser.qualification,
        experience: updatedUser.experience,
        designation: updatedUser.designation,
        post: updatedUser.post,
        researchInterest: updatedUser.researchInterest,
        researchFocus: updatedUser.researchFocus,
      },
    })
  } catch (error) {
    console.error('Onboarding submission error:', error)
    response.status(500).json({ error: 'Onboarding submission failed.' })
  }
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

  const { name, text } = request.body ?? {}
  if (!text || !text.trim()) {
    return response.status(400).json({ error: 'Comment text is required' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO blog_comments ("blogId", name, text) VALUES ($1, $2, $3) RETURNING *`,
      [blogId, (name || 'Anonymous').trim(), text.trim()]
    )
    response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating comment:', error)
    response.status(500).json({ error: 'Failed to post comment' })
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
    const result = await pool.query(`
      INSERT INTO group_members ("groupId", "userEmail", status, position)
      VALUES ($1, $2, 'Pending', 'Member')
      ON CONFLICT ("groupId", "userEmail") DO NOTHING
      RETURNING *
    `, [groupId, userEmail])
    
    if (result.rowCount === 0) {
      return response.status(400).json({ error: 'Request already exists or user already in group' })
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
    const fields = []
    const values = [groupId, memberEmail]
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
    if (result.rowCount === 0) return response.status(404).json({ error: 'Member not found' })
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

// GET chat messages for project
app.get('/api/projects/:projectId/chat', async (request, response) => {
  const projectId = Number(request.params.projectId)
  try {
    const result = await pool.query(`
      SELECT pc.*, u."fullName" AS "senderName", u."profileImage" AS "senderAvatar"
      FROM project_chat pc
      LEFT JOIN users u ON pc."senderEmail" = u."emailAddress"
      WHERE pc."projectId" = $1
      ORDER BY pc.created_at ASC
    `, [projectId])
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
      INSERT INTO project_chat ("projectId", "senderEmail", message)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [projectId, senderEmail || null, message])
    // Fetch with sender info
    const full = await pool.query(`
      SELECT pc.*, u."fullName" AS "senderName", u."profileImage" AS "senderAvatar"
      FROM project_chat pc
      LEFT JOIN users u ON pc."senderEmail" = u."emailAddress"
      WHERE pc.id = $1
    `, [result.rows[0].id])
    response.status(201).json(full.rows[0])
  } catch (error) {
    console.error('Error sending chat:', error)
    response.status(500).json({ error: 'Failed to send message' })
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
