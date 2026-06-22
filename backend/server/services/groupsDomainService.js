import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { createNotification } from './notificationService.js'

export const listGroupTypes = async () => {
  const result = await pool.query('SELECT * FROM group_types ORDER BY name ASC')
  return result.rows
}

export const createGroupType = async ({ name }) => {
  const trimmed = String(name || '').trim()
  if (!trimmed) throw createHttpError(400, 'Type name is required')

  const result = await pool.query(
    'INSERT INTO group_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
    [trimmed],
  )

  if (result.rowCount === 0) {
    const existing = await pool.query('SELECT * FROM group_types WHERE name = $1', [trimmed])
    return existing.rows[0]
  }

  return result.rows[0]
}

export const createGroup = async (payload) => {
  const { groupType, groupTitle, groupDescription, groupScope, ownerEmail } = payload || {}
  if (!groupTitle || !groupScope || !groupType || !ownerEmail) {
    throw createHttpError(400, 'Missing required group fields')
  }

  const result = await pool.query(
    `INSERT INTO groups ("groupType", "groupTitle", "groupDescription", "groupScope", "ownerEmail")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [groupType, groupTitle, groupDescription, groupScope, normalizeEmail(ownerEmail)],
  )

  return result.rows[0]
}

export const listGroups = async () => {
  const result = await pool.query(`
    SELECT g.*, u."fullName" AS owner, u."profileImage" AS avatar
    FROM groups g
    JOIN users u ON g."ownerEmail" = u."emailAddress"
    ORDER BY g.created_at DESC
  `)
  return result.rows
}

export const listGroupsByOwnerEmail = async (email) => {
  if (!email) throw createHttpError(400, 'Email required')

  const result = await pool.query(
    `
      SELECT g.*, u."fullName" AS owner, u."profileImage" AS avatar
      FROM groups g
      JOIN users u ON g."ownerEmail" = u."emailAddress"
      WHERE g."ownerEmail" = $1
      ORDER BY g.created_at DESC
    `,
    [normalizeEmail(email)],
  )

  return result.rows
}

export const updateGroup = async (id, payload) => {
  const groupId = Number(id)
  const { groupTitle, groupDescription, groupScope } = payload || {}

  if (!groupId || !groupTitle || !groupScope) {
    throw createHttpError(400, 'Missing required update fields')
  }

  const result = await pool.query(
    `UPDATE groups
     SET "groupTitle" = $1, "groupDescription" = $2, "groupScope" = $3
     WHERE id = $4 RETURNING *`,
    [groupTitle, groupDescription, groupScope, groupId],
  )

  if (result.rowCount === 0) throw createHttpError(404, 'Group not found')
  return result.rows[0]
}

export const deleteGroup = async (id) => {
  const groupId = Number(id)
  if (!groupId) throw createHttpError(400, 'Invalid id')

  const result = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING *', [groupId])
  if (result.rowCount === 0) throw createHttpError(404, 'Group not found')
  return { success: true }
}

export const listGroupMembers = async (id) => {
  const groupId = Number(id)
  if (!groupId) throw createHttpError(400, 'Invalid group ID')

  const result = await pool.query(
    `
      SELECT gm.id, gm."groupId", gm."userEmail" AS email, gm.status, gm.position, gm.created_at,
             u."fullName" AS name, u."profileImage" AS avatar
      FROM group_members gm
      JOIN users u ON gm."userEmail" = u."emailAddress"
      WHERE gm."groupId" = $1
      ORDER BY gm.created_at ASC
    `,
    [groupId],
  )

  return result.rows
}

export const requestGroupJoin = async (id, payload) => {
  const groupId = Number(id)
  const normalizedUserEmail = normalizeEmail(payload?.userEmail)
  if (!groupId || !normalizedUserEmail) throw createHttpError(400, 'Missing required fields')

  const groupResult = await pool.query('SELECT id, "groupTitle", "ownerEmail" FROM groups WHERE id = $1', [groupId])
  if (groupResult.rowCount === 0) throw createHttpError(404, 'Group not found')

  const requesterResult = await pool.query('SELECT "fullName" FROM users WHERE "emailAddress" = $1', [normalizedUserEmail])
  const result = await pool.query(
    `
      INSERT INTO group_members ("groupId", "userEmail", status, position)
      VALUES ($1, $2, 'Pending', 'Member')
      ON CONFLICT ("groupId", "userEmail") DO NOTHING
      RETURNING *
    `,
    [groupId, normalizedUserEmail],
  )

  if (result.rowCount === 0) {
    throw createHttpError(400, 'Request already exists or user already in group')
  }

  const group = groupResult.rows[0]
  const normalizedOwnerEmail = normalizeEmail(group.ownerEmail)
  const requesterName = requesterResult.rows[0]?.fullName || normalizedUserEmail

  if (normalizedOwnerEmail && normalizedOwnerEmail !== normalizedUserEmail) {
    await createNotification({
      type: 'group_join_request',
      title: 'New group join request',
      message: `${requesterName} requested to join "${group.groupTitle}".`,
      recipientEmail: normalizedOwnerEmail,
      linkUrl: `/groups/${groupId}?scroll=members`,
      groupId,
      memberEmail: normalizedUserEmail,
    })
  }

  return result.rows[0]
}

export const updateGroupMember = async (id, memberEmail, payload) => {
  const groupId = Number(id)
  const normalizedMemberEmail = normalizeEmail(memberEmail)
  const { status, position } = payload || {}

  const currentMemberResult = await pool.query(
    `SELECT gm."groupId", gm."userEmail", gm.status, gm.position,
            g."groupTitle", g."ownerEmail"
     FROM group_members gm
     JOIN groups g ON g.id = gm."groupId"
     WHERE gm."groupId" = $1 AND LOWER(gm."userEmail") = $2`,
    [groupId, normalizedMemberEmail],
  )

  if (currentMemberResult.rowCount === 0) throw createHttpError(404, 'Member not found')

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
  if (fields.length === 0) throw createHttpError(400, 'No fields to update')

  const result = await pool.query(
    `UPDATE group_members
     SET ${fields.join(', ')}
     WHERE "groupId" = $1 AND "userEmail" = $2
     RETURNING *`,
    values,
  )

  if (status === 'Active' && currentMember.status !== 'Active') {
    await createNotification({
      type: 'group_join_accepted',
      title: 'Your join request was accepted',
      message: `Your request to join "${currentMember.groupTitle}" was accepted.`,
      recipientEmail: normalizedMemberEmail,
      linkUrl: `/groups/${groupId}?scroll=members`,
      groupId,
      memberEmail: normalizedMemberEmail,
    })
  }

  return result.rows[0]
}

export const deleteGroupMember = async (id, memberEmail) => {
  const groupId = Number(id)
  const result = await pool.query(
    `DELETE FROM group_members WHERE "groupId" = $1 AND "userEmail" = $2 RETURNING *`,
    [groupId, normalizeEmail(memberEmail)],
  )
  if (result.rowCount === 0) throw createHttpError(404, 'Member not found')
  return { success: true }
}
