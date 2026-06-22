import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'

export const createNotification = async ({
  type,
  title,
  message,
  recipientEmail,
  linkUrl = null,
  blogId = null,
  commentId = null,
  groupId = null,
  memberEmail = null,
  projectId = null,
}) => {
  const normalizedRecipient = normalizeEmail(recipientEmail)
  if (!normalizedRecipient) return null

  const result = await pool.query(
    `INSERT INTO notifications (type, title, message, "recipientEmail", "linkUrl", "blogId", "commentId", "groupId", "memberEmail", "projectId")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [type, title, message, normalizedRecipient, linkUrl, blogId, commentId, groupId, memberEmail, projectId],
  )

  return result.rows[0]
}

export const listNotificationsByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) throw createHttpError(400, 'Email is required')

  const result = await pool.query(
    `SELECT *
     FROM notifications
     WHERE LOWER("recipientEmail") = $1
     ORDER BY "isRead" ASC, created_at DESC`,
    [normalizedEmail],
  )

  return result.rows
}

export const markAllNotificationsRead = async (email) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) throw createHttpError(400, 'Email is required')

  const result = await pool.query(
    `UPDATE notifications
     SET "isRead" = TRUE
     WHERE "recipientEmail" = $1 AND "isRead" = FALSE
     RETURNING *`,
    [normalizedEmail],
  )

  return { success: true, count: result.rowCount }
}

export const markNotificationRead = async (id) => {
  const notificationId = Number(id)
  if (!notificationId) throw createHttpError(400, 'Invalid notification id')

  const result = await pool.query(
    `UPDATE notifications
     SET "isRead" = TRUE
     WHERE id = $1
     RETURNING *`,
    [notificationId],
  )

  if (result.rowCount === 0) throw createHttpError(404, 'Notification not found')
  return result.rows[0]
}
