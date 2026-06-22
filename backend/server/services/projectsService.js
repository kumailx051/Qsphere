import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { createNotification } from './notificationService.js'

export const listProjectsByGroupId = async (groupIdParam) => {
  const groupId = Number(groupIdParam)
  if (!groupId) throw createHttpError(400, 'Invalid group ID')

  const result = await pool.query(
    `
      SELECT p.*, u."fullName" AS "ownerName"
      FROM projects p
      LEFT JOIN users u ON p."ownerEmail" = u."emailAddress"
      WHERE p."groupId" = $1
      ORDER BY p.created_at DESC
    `,
    [groupId],
  )
  return result.rows
}

export const getProjectById = async (idParam) => {
  const id = Number(idParam)
  if (!id) throw createHttpError(400, 'Invalid project ID')

  const result = await pool.query(
    `
      SELECT p.*, u."fullName" AS "ownerName", g."groupTitle", g."ownerEmail" AS "groupOwnerEmail"
      FROM projects p
      LEFT JOIN users u ON p."ownerEmail" = u."emailAddress"
      LEFT JOIN groups g ON p."groupId" = g.id
      WHERE p.id = $1
    `,
    [id],
  )

  if (result.rowCount === 0) throw createHttpError(404, 'Project not found')
  return result.rows[0]
}

export const createProject = async (groupIdParam, payload, file) => {
  const groupId = Number(groupIdParam)
  const { title, description, ownerEmail, startDate, dueDate, status } = payload || {}
  if (!title || !groupId) throw createHttpError(400, 'Title and group ID required')

  const fileUrl = file ? `/uploads/${file.filename}` : null
  const result = await pool.query(
    `
      INSERT INTO projects ("groupId", title, description, "ownerEmail", "startDate", "dueDate", status, "referenceMaterialUrl")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      groupId,
      title,
      description || '',
      normalizeEmail(ownerEmail) || null,
      startDate || new Date().toISOString().split('T')[0],
      dueDate || null,
      status || 'Planning',
      fileUrl,
    ],
  )

  const groupRes = await pool.query('SELECT "groupTitle" FROM groups WHERE id = $1', [groupId])
  const groupName = groupRes.rows[0]?.groupTitle || 'a group'
  const membersRes = await pool.query(
    'SELECT "userEmail" FROM group_members WHERE "groupId" = $1 AND status = $2',
    [groupId, 'Active'],
  )

  const normalizedOwnerEmail = normalizeEmail(ownerEmail)
  for (const member of membersRes.rows) {
    const memberEmail = normalizeEmail(member.userEmail)
    if (memberEmail && memberEmail !== normalizedOwnerEmail) {
      await createNotification({
        type: 'project_created',
        title: 'New Project Created',
        message: `A new project "${title}" was created in "${groupName}".`,
        recipientEmail: memberEmail,
        linkUrl: `/groups/${groupId}?scroll=projects`,
        groupId,
      })
    }
  }

  return result.rows[0]
}

export const deleteProject = async (idParam) => {
  const id = Number(idParam)
  const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id])
  if (result.rowCount === 0) throw createHttpError(404, 'Project not found')
  return { success: true }
}

export const listProjectTasks = async (projectIdParam) => {
  const projectId = Number(projectIdParam)
  const result = await pool.query(
    `
      SELECT t.*, u."fullName" AS "assigneeName", u."profileImage" AS "assigneeAvatar"
      FROM project_tasks t
      LEFT JOIN users u ON t."assignedToEmail" = u."emailAddress"
      WHERE t."projectId" = $1
      ORDER BY t.created_at DESC
    `,
    [projectId],
  )
  return result.rows
}

export const createProjectTask = async (projectIdParam, payload, file) => {
  const projectId = Number(projectIdParam)
  const { taskName, taskType, startDate, targetDate, details, assignedToEmail } = payload || {}
  if (!taskName || !projectId) throw createHttpError(400, 'Task name required')

  const fileUrl = file ? `/uploads/${file.filename}` : null
  const result = await pool.query(
    `
      INSERT INTO project_tasks ("projectId", "taskName", "taskType", "startDate", "targetDate", details, "referenceMaterialUrl", "assignedToEmail")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [projectId, taskName, taskType || null, startDate || null, targetDate || null, details || '', fileUrl, normalizeEmail(assignedToEmail) || null],
  )
  return result.rows[0]
}

export const updateProjectTask = async (idParam, payload) => {
  const id = Number(idParam)
  const { taskName, taskType, targetDate, details, assignedToEmail, status } = payload || {}
  const fields = []
  const values = [id]
  let counter = 2

  if (taskName) {
    fields.push(`"taskName" = $${counter++}`)
    values.push(taskName)
  }
  if (taskType) {
    fields.push(`"taskType" = $${counter++}`)
    values.push(taskType)
  }
  if (targetDate) {
    fields.push(`"targetDate" = $${counter++}`)
    values.push(targetDate)
  }
  if (details !== undefined) {
    fields.push(`details = $${counter++}`)
    values.push(details)
  }
  if (assignedToEmail !== undefined) {
    fields.push(`"assignedToEmail" = $${counter++}`)
    values.push(normalizeEmail(assignedToEmail) || null)
  }
  if (status) {
    fields.push(`status = $${counter++}`)
    values.push(status)
  }
  if (fields.length === 0) throw createHttpError(400, 'No fields to update')

  if (assignedToEmail !== undefined) {
    const taskRes = await pool.query(
      `SELECT t.id, t."taskName", t."projectId", p.title AS "projectTitle"
       FROM project_tasks t
       JOIN projects p ON p.id = t."projectId"
       WHERE t.id = $1`,
      [id],
    )

    if (taskRes.rowCount > 0) {
      const taskInfo = taskRes.rows[0]
      await createNotification({
        type: 'task_assigned',
        title: 'New task assigned to you',
        message: `You were assigned the task "${taskInfo.taskName}" in project "${taskInfo.projectTitle}".`,
        recipientEmail: normalizeEmail(assignedToEmail),
        linkUrl: `/projects/${taskInfo.projectId}`,
        projectId: taskInfo.projectId,
      })
    }
  }

  const result = await pool.query(`UPDATE project_tasks SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, values)
  if (result.rowCount === 0) throw createHttpError(404, 'Task not found')
  return result.rows[0]
}

export const deleteProjectTask = async (idParam) => {
  const id = Number(idParam)
  const result = await pool.query('DELETE FROM project_tasks WHERE id = $1 RETURNING *', [id])
  if (result.rowCount === 0) throw createHttpError(404, 'Task not found')
  return { success: true }
}

export const submitTaskWork = async (taskIdParam, payload, file) => {
  const taskId = Number(taskIdParam)
  const { submittedByEmail, notes } = payload || {}
  const fileUrl = file ? `/uploads/${file.filename}` : null

  const result = await pool.query(
    `
      INSERT INTO task_submissions ("taskId", "submittedByEmail", "fileUrl", notes, status)
      VALUES ($1, $2, $3, $4, 'Review')
      RETURNING *
    `,
    [taskId, normalizeEmail(submittedByEmail) || null, fileUrl, notes || ''],
  )

  await pool.query(`UPDATE project_tasks SET status = 'Review' WHERE id = $1`, [taskId])
  return result.rows[0]
}

export const listTaskSubmissions = async (taskIdParam) => {
  const taskId = Number(taskIdParam)
  const result = await pool.query(
    `
      SELECT ts.*, u."fullName" AS "submitterName"
      FROM task_submissions ts
      LEFT JOIN users u ON ts."submittedByEmail" = u."emailAddress"
      WHERE ts."taskId" = $1
      ORDER BY ts.created_at DESC
    `,
    [taskId],
  )
  return result.rows
}

export const reviewTaskSubmission = async (idParam, payload) => {
  const id = Number(idParam)
  const { status } = payload || {}
  if (!status) throw createHttpError(400, 'Status required')

  const result = await pool.query(`UPDATE task_submissions SET status = $2 WHERE id = $1 RETURNING *`, [id, status])
  if (result.rowCount === 0) throw createHttpError(404, 'Submission not found')

  if (status === 'Accepted') {
    await pool.query(`UPDATE project_tasks SET status = 'Completed' WHERE id = $1`, [result.rows[0].taskId])
  } else if (status === 'Rework') {
    await pool.query(`UPDATE project_tasks SET status = 'Rework' WHERE id = $1`, [result.rows[0].taskId])
  }

  return result.rows[0]
}

const fetchProjectChatAccess = async (projectId) => {
  const result = await pool.query(
    `SELECT p.id, p."ownerEmail", g."ownerEmail" AS "groupOwnerEmail"
     FROM projects p
     LEFT JOIN groups g ON p."groupId" = g.id
     WHERE p.id = $1`,
    [projectId],
  )
  return result.rows[0] || null
}

const canControlProjectChat = (project, email) => {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  return [project?.ownerEmail, project?.groupOwnerEmail].some((ownerEmail) => normalizeEmail(ownerEmail) === normalized)
}

export const listProjectChatMessages = async (projectIdParam, userEmail) => {
  const projectId = Number(projectIdParam)
  const normalizedUserEmail = normalizeEmail(userEmail)
  const result = await pool.query(
    `
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
    `,
    [projectId, normalizedUserEmail],
  )
  return result.rows
}

export const sendProjectChatMessage = async (projectIdParam, payload) => {
  const projectId = Number(projectIdParam)
  const senderEmail = normalizeEmail(payload?.senderEmail) || null
  const message = payload?.message
  if (!message) throw createHttpError(400, 'Message required')

  const result = await pool.query(
    `
      INSERT INTO project_chat ("projectId", "senderEmail", message, "deletedForEveryone")
      VALUES ($1, $2, $3, FALSE)
      RETURNING *
    `,
    [projectId, senderEmail, message],
  )

  const full = await pool.query(
    `
      SELECT pc.*, u."fullName" AS "senderName", u."profileImage" AS "senderAvatar", '[]'::json AS "readBy"
      FROM project_chat pc
      LEFT JOIN users u ON pc."senderEmail" = u."emailAddress"
      WHERE pc.id = $1
    `,
    [result.rows[0].id],
  )

  const projectRes = await pool.query(
    `SELECT p.id, p.title, p."groupId", g."groupTitle"
     FROM projects p
     JOIN groups g ON g.id = p."groupId"
     WHERE p.id = $1`,
    [projectId],
  )

  if (projectRes.rowCount > 0) {
    const project = projectRes.rows[0]
    const membersRes = await pool.query(
      'SELECT "userEmail" FROM group_members WHERE "groupId" = $1 AND status = $2',
      [project.groupId, 'Active'],
    )

    for (const member of membersRes.rows) {
      const memberEmail = normalizeEmail(member.userEmail)
      if (memberEmail && memberEmail !== senderEmail) {
        await createNotification({
          type: 'chat_message',
          title: 'New message in project chat',
          message: `${payload.senderEmail || 'Someone'} sent a message in "${project.title || project.groupTitle}".`,
          recipientEmail: memberEmail,
          linkUrl: `/projects/${projectId}?scroll=discussion`,
          projectId,
          groupId: project.groupId,
        })
      }
    }
  }

  return full.rows[0]
}

export const markProjectChatRead = async (projectIdParam, readerEmail) => {
  const projectId = Number(projectIdParam)
  const normalizedReaderEmail = normalizeEmail(readerEmail)
  if (!projectId || !normalizedReaderEmail) {
    throw createHttpError(400, 'Project and reader email are required')
  }

  const result = await pool.query(
    `WITH inserted AS (
       INSERT INTO project_chat_reads ("messageId", "userEmail")
       SELECT pc.id, $2
       FROM project_chat pc
       WHERE pc."projectId" = $1
         AND LOWER(COALESCE(pc."senderEmail", '')) <> LOWER($2::varchar)
         AND COALESCE(pc."deletedForEveryone", FALSE) = FALSE
       ON CONFLICT ("messageId", "userEmail") DO NOTHING
       RETURNING "messageId"
     )
     SELECT COUNT(*)::int AS updated FROM inserted`,
    [projectId, normalizedReaderEmail],
  )

  return { success: true, updated: result.rows[0]?.updated || 0 }
}

export const editProjectChatMessage = async (projectIdParam, messageIdParam, payload) => {
  const projectId = Number(projectIdParam)
  const messageId = Number(messageIdParam)
  const normalizedUserEmail = normalizeEmail(payload?.userEmail)
  const trimmedMessage = String(payload?.message || '').trim()

  if (!projectId || !messageId || !normalizedUserEmail || !trimmedMessage) {
    throw createHttpError(400, 'Project, message, and user are required')
  }

  const project = await fetchProjectChatAccess(projectId)
  if (!project) throw createHttpError(404, 'Project not found')

  const current = await pool.query(
    `SELECT id, "senderEmail", "deletedForEveryone"
     FROM project_chat
     WHERE id = $1 AND "projectId" = $2`,
    [messageId, projectId],
  )

  if (current.rowCount === 0) throw createHttpError(404, 'Message not found')
  if (normalizeEmail(current.rows[0].senderEmail) !== normalizedUserEmail) {
    throw createHttpError(403, 'You cannot edit this message')
  }
  if (current.rows[0].deletedForEveryone) {
    throw createHttpError(409, 'Deleted messages cannot be edited')
  }

  const updated = await pool.query(
    `UPDATE project_chat
     SET message = $1, "editedAt" = NOW(), "editedByEmail" = $2
     WHERE id = $3 AND "projectId" = $4
     RETURNING *`,
    [trimmedMessage, normalizedUserEmail, messageId, projectId],
  )

  return updated.rows[0]
}

export const deleteProjectChatMessage = async (projectIdParam, messageIdParam, payload) => {
  const projectId = Number(projectIdParam)
  const messageId = Number(messageIdParam)
  const normalizedUserEmail = normalizeEmail(payload?.userEmail)
  const normalizedScope = String(payload?.scope || 'me').toLowerCase()

  if (!projectId || !messageId || !normalizedUserEmail) {
    throw createHttpError(400, 'Project, message, and user are required')
  }

  const project = await fetchProjectChatAccess(projectId)
  if (!project) throw createHttpError(404, 'Project not found')

  const current = await pool.query(
    `SELECT id, "senderEmail", "deletedForEveryone"
     FROM project_chat
     WHERE id = $1 AND "projectId" = $2`,
    [messageId, projectId],
  )

  if (current.rowCount === 0) throw createHttpError(404, 'Message not found')

  const messageRow = current.rows[0]
  const isSender = normalizeEmail(messageRow.senderEmail) === normalizedUserEmail
  const canDeleteForEveryone = isSender || canControlProjectChat(project, normalizedUserEmail)

  if (normalizedScope === 'everyone') {
    if (!canDeleteForEveryone) {
      throw createHttpError(403, 'You cannot delete this message for everyone')
    }

    const deleted = await pool.query(
      `UPDATE project_chat
       SET message = 'This message was deleted.',
           "deletedAt" = NOW(),
           "deletedByEmail" = $1,
           "deletedForEveryone" = TRUE
       WHERE id = $2 AND "projectId" = $3
       RETURNING *`,
      [normalizedUserEmail, messageId, projectId],
    )

    return deleted.rows[0]
  }

  await pool.query(
    `INSERT INTO project_chat_hidden ("messageId", "userEmail")
     VALUES ($1, $2)
     ON CONFLICT ("messageId", "userEmail") DO UPDATE
       SET "hiddenAt" = NOW()`,
    [messageId, normalizedUserEmail],
  )

  return { success: true, scope: 'me' }
}

export const listProjectDocuments = async (projectIdParam) => {
  const projectId = Number(projectIdParam)
  const projectReferences = await pool.query(
    `SELECT id, title, "referenceMaterialUrl", "ownerEmail"
     FROM projects
     WHERE id = $1 AND "referenceMaterialUrl" IS NOT NULL`,
    [projectId],
  )
  const taskReferences = await pool.query(
    `
      SELECT t.id, t."taskName" AS title, t."referenceMaterialUrl", t."assignedToEmail" AS "ownerEmail"
      FROM project_tasks t
      WHERE t."projectId" = $1 AND t."referenceMaterialUrl" IS NOT NULL
    `,
    [projectId],
  )
  const submissionReferences = await pool.query(
    `
      SELECT ts.id, t."taskName" AS title, ts."fileUrl" AS "referenceMaterialUrl", ts."submittedByEmail" AS "ownerEmail"
      FROM task_submissions ts
      JOIN project_tasks t ON ts."taskId" = t.id
      WHERE t."projectId" = $1 AND ts."fileUrl" IS NOT NULL
    `,
    [projectId],
  )

  return [
    ...projectReferences.rows.map((row) => ({ ...row, source: 'Project Reference' })),
    ...taskReferences.rows.map((row) => ({ ...row, source: 'Task Reference' })),
    ...submissionReferences.rows.map((row) => ({ ...row, source: 'Task Submission' })),
  ]
}
