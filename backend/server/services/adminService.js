import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { sanitizeUser } from './usersService.js'

export const getAdminSummary = async () => {
  const [usersResult, blogsResult, groupsResult, projectsResult, commentsResult, reportsResult, recentUsersResult] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE("isActive", TRUE) = TRUE)::int AS active,
        COUNT(*) FILTER (WHERE COALESCE("isActive", TRUE) = FALSE)::int AS suspended,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(role, '')) = 'admin')::int AS admins,
        COUNT(*) FILTER (WHERE "isVerified" = TRUE)::int AS verified,
        COUNT(*) FILTER (WHERE "isOnboarded" = TRUE)::int AS onboarded
      FROM users
    `),
    pool.query('SELECT COUNT(*)::int AS count FROM blogs'),
    pool.query('SELECT COUNT(*)::int AS count FROM groups'),
    pool.query('SELECT COUNT(*)::int AS count FROM projects'),
    pool.query('SELECT COUNT(*)::int AS count FROM blog_comments'),
    pool.query(`SELECT COUNT(*)::int AS count FROM blog_reports WHERE LOWER(COALESCE(status, 'pending')) = 'pending'`),
    pool.query(`
      SELECT id, "fullName", "emailAddress", "profileImage", role, "isVerified", "isOnboarded",
             COALESCE("isActive", TRUE) AS "isActive", created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 6
    `),
  ])

  return {
    users: usersResult.rows[0],
    content: {
      blogs: blogsResult.rows[0]?.count || 0,
      groups: groupsResult.rows[0]?.count || 0,
      projects: projectsResult.rows[0]?.count || 0,
      comments: commentsResult.rows[0]?.count || 0,
      blogReports: reportsResult.rows[0]?.count || 0,
    },
    recentUsers: recentUsersResult.rows.map(sanitizeUser),
  }
}

export const listAdminUsers = async ({ search = '', role = '', status = '' }) => {
  const values = []
  const clauses = []

  if (search) {
    values.push(`%${String(search).trim()}%`)
    clauses.push(`("fullName" ILIKE $${values.length} OR "emailAddress" ILIKE $${values.length})`)
  }

  if (role && String(role).trim().toLowerCase() !== 'all') {
    values.push(String(role).trim().toLowerCase())
    clauses.push(`LOWER(COALESCE(role, '')) = $${values.length}`)
  }

  const normalizedStatus = String(status).trim().toLowerCase()
  if (normalizedStatus === 'active' || normalizedStatus === 'suspended') {
    values.push(normalizedStatus === 'active')
    clauses.push(`COALESCE("isActive", TRUE) = $${values.length}`)
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query(
    `SELECT id, "fullName", "emailAddress", "profileImage", role, city, institute, organization,
            "isVerified", "isOnboarded", COALESCE("isActive", TRUE) AS "isActive",
            created_at, updated_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC`,
    values,
  )

  return result.rows.map(sanitizeUser)
}

export const getAdminUserById = async (id) => {
  const userId = Number(id)
  if (!userId) throw createHttpError(400, 'Invalid user id')

  const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId])
  if (result.rowCount === 0) throw createHttpError(404, 'User not found')
  return sanitizeUser(result.rows[0])
}

export const updateAdminUser = async (id, payload, adminUser) => {
  const userId = Number(id)
  if (!userId) throw createHttpError(400, 'Invalid user id')

  const existing = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId])
  if (existing.rowCount === 0) throw createHttpError(404, 'User not found')

  const target = existing.rows[0]
  const targetIsCurrentAdmin =
    String(target.emailAddress || '').toLowerCase() === String(adminUser.emailAddress || '').toLowerCase()
  const nextRole = payload.role === undefined ? target.role : String(payload.role || '').trim().toLowerCase()
  const nextActive = payload.isActive === undefined ? target.isActive !== false : Boolean(payload.isActive)

  if (targetIsCurrentAdmin && (nextRole !== 'admin' || !nextActive)) {
    throw createHttpError(400, 'You cannot remove or suspend your own administrator access')
  }

  const result = await pool.query(
    `UPDATE users
     SET role = $2,
         "isActive" = $3,
         "isVerified" = $4,
         "isOnboarded" = $5,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      userId,
      nextRole || null,
      nextActive,
      payload.isVerified === undefined ? target.isVerified : Boolean(payload.isVerified),
      payload.isOnboarded === undefined ? target.isOnboarded : Boolean(payload.isOnboarded),
    ],
  )

  return { success: true, user: sanitizeUser(result.rows[0]) }
}

export const listAdminBlogReports = async ({ status = 'all', search = '' }) => {
  const values = []
  const clauses = []

  const normalizedStatus = String(status || 'all').trim().toLowerCase()
  if (normalizedStatus !== 'all') {
    values.push(normalizedStatus)
    clauses.push(`LOWER(COALESCE(br.status, 'pending')) = $${values.length}`)
  }

  if (String(search || '').trim()) {
    values.push(`%${String(search).trim()}%`)
    clauses.push(`(
      COALESCE(br."blogTitle", '') ILIKE $${values.length}
      OR COALESCE(br."reportedByName", '') ILIKE $${values.length}
      OR COALESCE(br."reportedByEmail", '') ILIKE $${values.length}
      OR COALESCE(br.reason, '') ILIKE $${values.length}
    )`)
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query(
    `SELECT
      br.*,
      b.title AS "currentBlogTitle",
      b.author AS "currentBlogAuthor",
      b."coverImage" AS "currentBlogCoverImage",
      b."dateOfPublish" AS "currentBlogPublishedAt",
      (b.id IS NOT NULL) AS "blogStillLive"
     FROM blog_reports br
     LEFT JOIN blogs b ON b.id = br."blogId"
     ${whereClause}
     ORDER BY
       CASE LOWER(COALESCE(br.status, 'pending'))
         WHEN 'pending' THEN 0
         WHEN 'under_review' THEN 1
         WHEN 'resolved' THEN 2
         WHEN 'dismissed' THEN 3
         ELSE 4
       END,
       br.created_at DESC`,
    values,
  )

  return result.rows
}

export const reviewAdminBlogReport = async (id, payload, adminUser) => {
  const reportId = Number(id)
  if (!reportId) throw createHttpError(400, 'Invalid report id')

  const status = String(payload?.status || '').trim().toLowerCase()
  const adminAction = String(payload?.adminAction || '').trim().toLowerCase()
  const adminNote = String(payload?.adminNote || '').trim()

  if (!status) throw createHttpError(400, 'Status is required')
  if (!['pending', 'under_review', 'resolved', 'dismissed'].includes(status)) {
    throw createHttpError(400, 'Invalid report status')
  }

  if (adminAction && !['none', 'kept', 'deleted'].includes(adminAction)) {
    throw createHttpError(400, 'Invalid admin action')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const reportResult = await client.query(
      `SELECT br.*, b.id AS "blogStillExists"
       FROM blog_reports br
       LEFT JOIN blogs b ON b.id = br."blogId"
       WHERE br.id = $1
       LIMIT 1`,
      [reportId],
    )

    if (reportResult.rowCount === 0) throw createHttpError(404, 'Report not found')
    const report = reportResult.rows[0]

    let finalStatus = status
    let finalAction = adminAction || 'none'

    if (finalAction === 'deleted' && report.blogId && report.blogStillExists) {
      await client.query('DELETE FROM blogs WHERE id = $1', [report.blogId])

      await client.query(
        `UPDATE blog_reports
         SET status = 'resolved',
             "adminAction" = 'deleted',
             "adminNote" = COALESCE($2, "adminNote"),
             "reviewedAt" = NOW(),
             "reviewedByEmail" = $3,
             "blogId" = NULL,
             updated_at = NOW()
         WHERE "blogId" = $1`,
        [report.blogId, adminNote || null, adminUser.emailAddress],
      )

      finalStatus = 'resolved'
    } else {
      await client.query(
        `UPDATE blog_reports
         SET status = $2,
             "adminAction" = $3,
             "adminNote" = $4,
             "reviewedAt" = NOW(),
             "reviewedByEmail" = $5,
             updated_at = NOW()
         WHERE id = $1`,
        [reportId, finalStatus, finalAction || 'none', adminNote || null, adminUser.emailAddress],
      )
    }

    const updatedResult = await client.query(
      `SELECT
        br.*,
        b.title AS "currentBlogTitle",
        b.author AS "currentBlogAuthor",
        b."coverImage" AS "currentBlogCoverImage",
        b."dateOfPublish" AS "currentBlogPublishedAt",
        (b.id IS NOT NULL) AS "blogStillLive"
       FROM blog_reports br
       LEFT JOIN blogs b ON b.id = br."blogId"
       WHERE br.id = $1
       LIMIT 1`,
      [reportId],
    )

    await client.query('COMMIT')
    return updatedResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
