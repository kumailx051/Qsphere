import fs from 'fs/promises'
import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { uploadImageFileToImgBB } from './mediaService.js'
import { createNotification } from './notificationService.js'

const validProjectStatuses = new Set(['Planning', 'In Progress', 'Review', 'Completed'])

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

export const updateProject = async (idParam, payload = {}) => {
  const id = Number(idParam)
  const status = String(payload?.status || '').trim()
  const normalizedUserEmail = normalizeEmail(payload?.userEmail)

  if (!id || !status) throw createHttpError(400, 'Project and status are required')
  if (!validProjectStatuses.has(status)) throw createHttpError(400, 'Invalid project status')

  const projectResult = await pool.query(
    `
      SELECT
        p.*,
        g."ownerEmail" AS "groupOwnerEmail",
        g."groupTitle"
      FROM projects p
      LEFT JOIN groups g ON p."groupId" = g.id
      WHERE p.id = $1
    `,
    [id],
  )

  if (projectResult.rowCount === 0) throw createHttpError(404, 'Project not found')

  const project = projectResult.rows[0]
  const authorizedOwners = [project.ownerEmail, project.groupOwnerEmail].map((email) => normalizeEmail(email)).filter(Boolean)
  if (normalizedUserEmail && !authorizedOwners.includes(normalizedUserEmail)) {
    throw createHttpError(403, 'Only the project owner can change project status')
  }

  const updatedResult = await pool.query(
    `
      UPDATE projects
      SET
        status = $2::varchar,
        "completedAt" = CASE
          WHEN $2::varchar = 'Completed'::varchar THEN COALESCE("completedAt", NOW())
          ELSE NULL
        END
      WHERE id = $1
      RETURNING *
    `,
    [id, status],
  )

  if (status === 'Completed' && project.groupId) {
    const membersRes = await pool.query(
      'SELECT "userEmail" FROM group_members WHERE "groupId" = $1 AND status = $2',
      [project.groupId, 'Active'],
    )

    for (const member of membersRes.rows) {
      const memberEmail = normalizeEmail(member.userEmail)
      if (memberEmail && memberEmail !== normalizedUserEmail) {
        await createNotification({
          type: 'project_completed',
          title: 'Project completed',
          message: `The project "${project.title}" has been completed in "${project.groupTitle || 'your group'}".`,
          recipientEmail: memberEmail,
          linkUrl: `/groups/${project.groupId}?scroll=projects&section=completed`,
          groupId: project.groupId,
          projectId: project.id,
        })
      }
    }
  }

  return updatedResult.rows[0]
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

  const normalizedAssigneeEmail = normalizeEmail(assignedToEmail) || null
  const fileUrl = file ? `/uploads/${file.filename}` : null
  const result = await pool.query(
    `
      INSERT INTO project_tasks ("projectId", "taskName", "taskType", "startDate", "targetDate", details, "referenceMaterialUrl", "assignedToEmail")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [projectId, taskName, taskType || null, startDate || null, targetDate || null, details || '', fileUrl, normalizedAssigneeEmail],
  )

  if (normalizedAssigneeEmail) {
    const projectRes = await pool.query(
      'SELECT title FROM projects WHERE id = $1 LIMIT 1',
      [projectId],
    )

    await createNotification({
      type: 'task_assigned',
      title: 'New task assigned to you',
      message: `You were assigned the task "${taskName}" in project "${projectRes.rows[0]?.title || 'a project'}".`,
      recipientEmail: normalizedAssigneeEmail,
      linkUrl: `/projects/${projectId}?tab=myTasks`,
      projectId,
    })
  }

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
        linkUrl: `/projects/${taskInfo.projectId}?tab=myTasks`,
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
  const normalizedSubmittedByEmail = normalizeEmail(submittedByEmail) || null
  const fileUrl = file ? `/uploads/${file.filename}` : null

  const result = await pool.query(
    `
      INSERT INTO task_submissions ("taskId", "submittedByEmail", "fileUrl", notes, status)
      VALUES ($1, $2, $3, $4, 'Review')
      RETURNING *
    `,
    [taskId, normalizedSubmittedByEmail, fileUrl, notes || ''],
  )

  await pool.query(`UPDATE project_tasks SET status = 'Review' WHERE id = $1`, [taskId])

  const taskResult = await pool.query(
    `
      SELECT
        t."taskName",
        t."assignedToEmail",
        p.id AS "projectId",
        p.title AS "projectTitle",
        p."ownerEmail",
        g."ownerEmail" AS "groupOwnerEmail"
      FROM project_tasks t
      JOIN projects p ON p.id = t."projectId"
      LEFT JOIN groups g ON g.id = p."groupId"
      WHERE t.id = $1
      LIMIT 1
    `,
    [taskId],
  )

  const taskInfo = taskResult.rows[0]
  const ownerRecipients = [...new Set([
    normalizeEmail(taskInfo?.ownerEmail),
    normalizeEmail(taskInfo?.groupOwnerEmail),
  ].filter(Boolean))]

  for (const ownerRecipient of ownerRecipients) {
    if (ownerRecipient && ownerRecipient !== normalizedSubmittedByEmail) {
      await createNotification({
        type: 'task_submitted',
        title: 'Task work submitted',
        message: `${normalizedSubmittedByEmail || 'A member'} submitted work for "${taskInfo?.taskName || 'a task'}".`,
        recipientEmail: ownerRecipient,
        linkUrl: `/projects/${taskInfo?.projectId || ''}?tab=details`,
        projectId: taskInfo?.projectId || null,
      })
    }
  }

  return result.rows[0]
}

export const listTaskSubmissions = async (taskIdParam) => {
  const taskId = Number(taskIdParam)
  const result = await pool.query(
    `
      SELECT
        ts.*,
        u."fullName" AS "submitterName",
        reviewer."fullName" AS "reviewedByName"
      FROM task_submissions ts
      LEFT JOIN users u ON ts."submittedByEmail" = u."emailAddress"
      LEFT JOIN users reviewer ON ts."reviewedByEmail" = reviewer."emailAddress"
      WHERE ts."taskId" = $1
      ORDER BY ts.created_at DESC
    `,
    [taskId],
  )
  return result.rows
}

export const reviewTaskSubmission = async (idParam, payload) => {
  const id = Number(idParam)
  const { status, remarks, reviewedByEmail } = payload || {}
  if (!status) throw createHttpError(400, 'Status required')
  if (status === 'Rework' && !String(remarks || '').trim()) {
    throw createHttpError(400, 'Rework instructions are required')
  }

  const existingSubmission = await pool.query(
    `
      SELECT
        ts.*,
        t."projectId",
        t."taskName",
        p.title AS "projectTitle"
      FROM task_submissions ts
      JOIN project_tasks t ON ts."taskId" = t.id
      JOIN projects p ON t."projectId" = p.id
      WHERE ts.id = $1
      LIMIT 1
    `,
    [id],
  )

  if (existingSubmission.rowCount === 0) throw createHttpError(404, 'Submission not found')

  const result = await pool.query(
    `
      UPDATE task_submissions
      SET
        status = $2,
        "reviewRemarks" = $3,
        "reviewedAt" = NOW(),
        "reviewedByEmail" = $4
      WHERE id = $1
      RETURNING *
    `,
    [id, status, String(remarks || '').trim(), normalizeEmail(reviewedByEmail) || null],
  )

  if (status === 'Accepted') {
    await pool.query(`UPDATE project_tasks SET status = 'Completed' WHERE id = $1`, [result.rows[0].taskId])
  } else if (status === 'Rework') {
    await pool.query(`UPDATE project_tasks SET status = 'Rework' WHERE id = $1`, [result.rows[0].taskId])
  }

  const submission = existingSubmission.rows[0]
  const submitterEmail = normalizeEmail(submission.submittedByEmail)
  const reviewerEmail = normalizeEmail(reviewedByEmail)

  if (submitterEmail && submitterEmail !== reviewerEmail) {
    await createNotification({
      type: status === 'Accepted' ? 'task_submission_accepted' : 'task_submission_rework',
      title: status === 'Accepted' ? 'Task submission accepted' : 'Task needs rework',
      message:
        status === 'Accepted'
          ? `Your submission for "${submission.taskName}" was accepted.`
          : `Your submission for "${submission.taskName}" needs rework.${String(remarks || '').trim() ? ` Instruction: ${String(remarks || '').trim()}` : ''}`,
      recipientEmail: submitterEmail,
      linkUrl: `/projects/${submission.projectId}?tab=myTasks`,
      projectId: submission.projectId,
    })
  }

  const detailedResult = await pool.query(
    `
      SELECT
        ts.*,
        u."fullName" AS "submitterName",
        reviewer."fullName" AS "reviewedByName"
      FROM task_submissions ts
      LEFT JOIN users u ON ts."submittedByEmail" = u."emailAddress"
      LEFT JOIN users reviewer ON ts."reviewedByEmail" = reviewer."emailAddress"
      WHERE ts.id = $1
      LIMIT 1
    `,
    [id],
  )

  return detailedResult.rows[0]
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

const getLocalUploadUrl = (file) => {
  if (!file?.filename) return null
  return `/uploads/${file.filename}`
}

const resolveAttachmentCategory = (file, explicitCategory = '') => {
  const normalizedExplicit = String(explicitCategory || '').trim().toLowerCase()
  if (normalizedExplicit === 'voice' || normalizedExplicit === 'audio') return 'audio'
  if (normalizedExplicit === 'image') return 'image'
  if (normalizedExplicit === 'video') return 'video'
  if (normalizedExplicit === 'file') return 'file'

  const mimeType = String(file?.mimetype || '').toLowerCase()
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

const storeProjectChatAttachment = async (file, attachmentCategoryHint) => {
  if (!file) return null

  const attachmentCategory = resolveAttachmentCategory(file, attachmentCategoryHint)
  let attachmentUrl = getLocalUploadUrl(file)

  if (attachmentCategory === 'image') {
    try {
      attachmentUrl = await uploadImageFileToImgBB(file.path)
    } catch (error) {
      console.warn('ImgBB upload failed, falling back to local upload URL.', error?.message || error)
      attachmentUrl = getLocalUploadUrl(file)
    }
  }

  return {
    attachmentCategory,
    attachmentUrl,
    attachmentName: file.originalname || file.filename || 'attachment',
    attachmentMimeType: file.mimetype || null,
    attachmentSizeBytes: Number(file.size || 0) || null,
  }
}

const normalizeConversationType = (value) => (
  String(value || 'channel').toLowerCase() === 'direct' ? 'direct' : 'channel'
)

const buildProjectChatConversationClause = ({
  conversationType,
  senderEmail,
  targetEmail,
  projectIdParamIndex = 1,
  senderEmailParamIndex = 2,
  conversationTypeParamIndex = 3,
  targetEmailParamIndex = 4,
  tableAlias = 'pc',
}) => `
  ${tableAlias}."projectId" = $${projectIdParamIndex}
  AND (
    ($${conversationTypeParamIndex} = 'channel' AND COALESCE(${tableAlias}."conversationType", 'channel') = 'channel')
    OR (
      $${conversationTypeParamIndex} = 'direct'
      AND COALESCE(${tableAlias}."conversationType", 'channel') = 'direct'
      AND (
        (LOWER(COALESCE(${tableAlias}."senderEmail", '')) = LOWER($${senderEmailParamIndex}::varchar)
          AND LOWER(COALESCE(${tableAlias}."recipientEmail", '')) = LOWER($${targetEmailParamIndex}::varchar))
        OR
        (LOWER(COALESCE(${tableAlias}."senderEmail", '')) = LOWER($${targetEmailParamIndex}::varchar)
          AND LOWER(COALESCE(${tableAlias}."recipientEmail", '')) = LOWER($${senderEmailParamIndex}::varchar))
      )
    )
  )
`

const buildProjectChatReadBySelect = (messageAlias = 'pc') => `
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'emailAddress', reaction_read_user."emailAddress",
          'fullName', reaction_read_user."fullName",
          'profileImage', reaction_read_user."profileImage",
          'readAt', reaction_read."readAt"
        )
        ORDER BY reaction_read."readAt" ASC
      )
      FROM project_chat_reads reaction_read
      LEFT JOIN users reaction_read_user
        ON reaction_read."userEmail" = reaction_read_user."emailAddress"
      WHERE reaction_read."messageId" = ${messageAlias}.id
    ),
    '[]'::json
  ) AS "readBy"
`

const buildProjectChatReactionsSelect = (messageAlias = 'pc') => `
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', reaction.id,
          'userEmail', reaction."userEmail",
          'emoji', reaction.emoji,
          'fullName', reaction_user."fullName",
          'profileImage', reaction_user."profileImage",
          'createdAt', reaction.created_at,
          'updatedAt', reaction.updated_at
        )
        ORDER BY reaction.created_at ASC
      )
      FROM project_chat_reactions reaction
      LEFT JOIN users reaction_user
        ON reaction."userEmail" = reaction_user."emailAddress"
      WHERE reaction."messageId" = ${messageAlias}.id
    ),
    '[]'::json
  ) AS reactions
`

export const listProjectChatMessages = async (projectIdParam, userEmail, conversationTypeParam, targetEmailParam) => {
  const projectId = Number(projectIdParam)
  const normalizedUserEmail = normalizeEmail(userEmail)
  const normalizedConversationType = normalizeConversationType(conversationTypeParam)
  const normalizedTargetEmail = normalizeEmail(targetEmailParam)

  if (!projectId) throw createHttpError(400, 'Project is required')
  if (normalizedConversationType === 'direct' && (!normalizedUserEmail || !normalizedTargetEmail)) {
    throw createHttpError(400, 'Direct message target is required')
  }

  const result = await pool.query(
    `
      SELECT
        pc.id,
        pc."projectId",
        pc."senderEmail",
        pc."recipientEmail",
        COALESCE(pc."conversationType", 'channel') AS "conversationType",
        pc.message,
        pc."attachmentUrl",
        pc."attachmentType",
        pc."attachmentName",
        pc."attachmentMimeType",
        pc."attachmentSizeBytes",
        pc.created_at,
        pc."editedAt",
        pc."editedByEmail",
        pc."deletedAt",
        pc."deletedByEmail",
        pc."deletedForEveryone",
        u."fullName" AS "senderName",
        u."profileImage" AS "senderAvatar",
        ${buildProjectChatReadBySelect('pc')},
        ${buildProjectChatReactionsSelect('pc')}
      FROM project_chat pc
      LEFT JOIN users u ON pc."senderEmail" = u."emailAddress"
      LEFT JOIN project_chat_hidden ph ON ph."messageId" = pc.id AND LOWER(ph."userEmail") = $2
      WHERE ${buildProjectChatConversationClause({
        conversationType: normalizedConversationType,
        senderEmail: normalizedUserEmail,
        targetEmail: normalizedTargetEmail,
      })}
        AND ph."messageId" IS NULL
      ORDER BY pc.created_at ASC
    `,
    [projectId, normalizedUserEmail, normalizedConversationType, normalizedTargetEmail],
  )
  return result.rows
}

export const getProjectChatUnreadCounts = async (projectIdParam, userEmail) => {
  const projectId = Number(projectIdParam)
  const normalizedUserEmail = normalizeEmail(userEmail)

  if (!projectId || !normalizedUserEmail) {
    throw createHttpError(400, 'Project and user email are required')
  }

  const channelUnreadResult = await pool.query(
    `
      SELECT COUNT(*)::int AS unread
      FROM project_chat pc
      LEFT JOIN project_chat_reads pr
        ON pr."messageId" = pc.id
       AND LOWER(pr."userEmail") = LOWER($2::varchar)
      LEFT JOIN project_chat_hidden ph
        ON ph."messageId" = pc.id
       AND LOWER(ph."userEmail") = LOWER($2::varchar)
      WHERE pc."projectId" = $1
        AND COALESCE(pc."conversationType", 'channel') = 'channel'
        AND LOWER(COALESCE(pc."senderEmail", '')) <> LOWER($2::varchar)
        AND COALESCE(pc."deletedForEveryone", FALSE) = FALSE
        AND ph."messageId" IS NULL
        AND pr.id IS NULL
    `,
    [projectId, normalizedUserEmail],
  )

  const directUnreadResult = await pool.query(
    `
      SELECT
        LOWER(COALESCE(pc."senderEmail", '')) AS "counterpartEmail",
        COUNT(*)::int AS unread
      FROM project_chat pc
      LEFT JOIN project_chat_reads pr
        ON pr."messageId" = pc.id
       AND LOWER(pr."userEmail") = LOWER($2::varchar)
      LEFT JOIN project_chat_hidden ph
        ON ph."messageId" = pc.id
       AND LOWER(ph."userEmail") = LOWER($2::varchar)
      WHERE pc."projectId" = $1
        AND COALESCE(pc."conversationType", 'channel') = 'direct'
        AND LOWER(COALESCE(pc."recipientEmail", '')) = LOWER($2::varchar)
        AND LOWER(COALESCE(pc."senderEmail", '')) <> LOWER($2::varchar)
        AND COALESCE(pc."deletedForEveryone", FALSE) = FALSE
        AND ph."messageId" IS NULL
        AND pr.id IS NULL
      GROUP BY LOWER(COALESCE(pc."senderEmail", ''))
    `,
    [projectId, normalizedUserEmail],
  )

  return {
    channelUnread: channelUnreadResult.rows[0]?.unread || 0,
    directUnreadByEmail: directUnreadResult.rows.reduce((accumulator, row) => {
      if (row.counterpartEmail) {
        accumulator[row.counterpartEmail] = row.unread || 0
      }
      return accumulator
    }, {}),
  }
}

export const sendProjectChatMessage = async (projectIdParam, payload, file) => {
  const projectId = Number(projectIdParam)
  const senderEmail = normalizeEmail(payload?.senderEmail) || null
  const message = String(payload?.message || '').trim()
  const conversationType = normalizeConversationType(payload?.conversationType)
  const recipientEmail = normalizeEmail(payload?.recipientEmail)
  const attachment = await storeProjectChatAttachment(file, payload?.attachmentCategory)

  if (!message && !attachment) throw createHttpError(400, 'Message or attachment required')
  if (conversationType === 'direct' && !recipientEmail) {
    throw createHttpError(400, 'Direct message recipient is required')
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO project_chat (
          "projectId",
          "senderEmail",
          "recipientEmail",
          "conversationType",
          message,
          "attachmentUrl",
          "attachmentType",
          "attachmentName",
          "attachmentMimeType",
          "attachmentSizeBytes",
          "deletedForEveryone"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE)
        RETURNING *
      `,
      [
        projectId,
        senderEmail,
        recipientEmail,
        conversationType,
        message,
        attachment?.attachmentUrl || null,
        attachment?.attachmentCategory || null,
        attachment?.attachmentName || null,
        attachment?.attachmentMimeType || null,
        attachment?.attachmentSizeBytes || null,
      ],
    )

    const full = await pool.query(
      `
        SELECT
          pc.*,
          COALESCE(pc."conversationType", 'channel') AS "conversationType",
          u."fullName" AS "senderName",
          u."profileImage" AS "senderAvatar",
          ${buildProjectChatReadBySelect('pc')},
          ${buildProjectChatReactionsSelect('pc')}
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
      if (conversationType === 'direct') {
        if (recipientEmail && recipientEmail !== senderEmail) {
          await createNotification({
            type: 'chat_direct_message',
            title: 'New direct message',
            message: `${payload.senderEmail || 'Someone'} sent you a direct message in "${project.title || project.groupTitle}".`,
            recipientEmail,
            linkUrl: `/projects/${projectId}?tab=discussion`,
            projectId,
            groupId: project.groupId,
          })
        }
      } else {
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
              linkUrl: `/projects/${projectId}?tab=discussion`,
              projectId,
              groupId: project.groupId,
            })
          }
        }
      }
    }

    return full.rows[0]
  } finally {
    if (file?.path && attachment?.attachmentUrl && !attachment.attachmentUrl.startsWith('/uploads/')) {
      await fs.unlink(file.path).catch(() => {})
    }
  }
}

export const markProjectChatRead = async (projectIdParam, readerEmail, conversationTypeParam, targetEmailParam) => {
  const projectId = Number(projectIdParam)
  const normalizedReaderEmail = normalizeEmail(readerEmail)
  const normalizedConversationType = normalizeConversationType(conversationTypeParam)
  const normalizedTargetEmail = normalizeEmail(targetEmailParam)

  if (!projectId || !normalizedReaderEmail) {
    throw createHttpError(400, 'Project and reader email are required')
  }
  if (normalizedConversationType === 'direct' && !normalizedTargetEmail) {
    throw createHttpError(400, 'Direct message target is required')
  }

  const result = await pool.query(
    `WITH inserted AS (
       INSERT INTO project_chat_reads ("messageId", "userEmail")
       SELECT pc.id, $2
       FROM project_chat pc
       WHERE ${buildProjectChatConversationClause({
         conversationType: normalizedConversationType,
         senderEmail: normalizedReaderEmail,
         targetEmail: normalizedTargetEmail,
       })}
         AND LOWER(COALESCE(pc."senderEmail", '')) <> LOWER($2::varchar)
         AND COALESCE(pc."deletedForEveryone", FALSE) = FALSE
       ON CONFLICT ("messageId", "userEmail") DO NOTHING
       RETURNING "messageId"
     )
     SELECT COUNT(*)::int AS updated FROM inserted`,
    [projectId, normalizedReaderEmail, normalizedConversationType, normalizedTargetEmail],
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

export const toggleProjectChatReaction = async (projectIdParam, messageIdParam, payload = {}) => {
  const projectId = Number(projectIdParam)
  const messageId = Number(messageIdParam)
  const normalizedUserEmail = normalizeEmail(payload?.userEmail)
  const emoji = String(payload?.emoji || '').trim()

  if (!projectId || !messageId || !normalizedUserEmail || !emoji) {
    throw createHttpError(400, 'Project, message, user, and emoji are required')
  }

  const project = await fetchProjectChatAccess(projectId)
  if (!project) throw createHttpError(404, 'Project not found')

  const messageResult = await pool.query(
    `SELECT id, "deletedForEveryone"
     FROM project_chat
     WHERE id = $1 AND "projectId" = $2`,
    [messageId, projectId],
  )

  if (messageResult.rowCount === 0) throw createHttpError(404, 'Message not found')
  if (messageResult.rows[0].deletedForEveryone) {
    throw createHttpError(409, 'Deleted messages cannot receive reactions')
  }

  const existingReaction = await pool.query(
    `SELECT id, emoji
     FROM project_chat_reactions
     WHERE "messageId" = $1
       AND LOWER("userEmail") = LOWER($2::varchar)
     LIMIT 1`,
    [messageId, normalizedUserEmail],
  )

  let active = true

  if (existingReaction.rowCount > 0) {
    const currentReaction = existingReaction.rows[0]
    if (String(currentReaction.emoji || '') === emoji) {
      await pool.query(`DELETE FROM project_chat_reactions WHERE id = $1`, [currentReaction.id])
      active = false
    } else {
      await pool.query(
        `UPDATE project_chat_reactions
         SET emoji = $1, updated_at = NOW()
         WHERE id = $2`,
        [emoji, currentReaction.id],
      )
    }
  } else {
    await pool.query(
      `INSERT INTO project_chat_reactions ("messageId", "userEmail", emoji)
       VALUES ($1, $2, $3)`,
      [messageId, normalizedUserEmail, emoji],
    )
  }

  const reactionsResult = await pool.query(
    `
      SELECT ${buildProjectChatReactionsSelect('pc')}
      FROM project_chat pc
      WHERE pc.id = $1
      LIMIT 1
    `,
    [messageId],
  )

  return {
    success: true,
    active,
    messageId,
    reactions: reactionsResult.rows[0]?.reactions || [],
  }
}

export const listProjectDocuments = async (projectIdParam) => {
  const projectId = Number(projectIdParam)
  const projectReferences = await pool.query(
    `
      SELECT
        p.id,
        p.title,
        p."referenceMaterialUrl",
        p."ownerEmail",
        u."fullName" AS "ownerName",
        p.created_at AS "documentDate"
      FROM projects p
      LEFT JOIN users u ON p."ownerEmail" = u."emailAddress"
      WHERE p.id = $1 AND p."referenceMaterialUrl" IS NOT NULL
    `,
    [projectId],
  )
  const taskReferences = await pool.query(
    `
      SELECT
        t.id,
        t."taskName" AS title,
        t."referenceMaterialUrl",
        t."assignedToEmail" AS "ownerEmail",
        u."fullName" AS "ownerName",
        t.created_at AS "documentDate"
      FROM project_tasks t
      LEFT JOIN users u ON t."assignedToEmail" = u."emailAddress"
      WHERE t."projectId" = $1 AND t."referenceMaterialUrl" IS NOT NULL
    `,
    [projectId],
  )
  const submissionReferences = await pool.query(
    `
      SELECT
        ts.id,
        t."taskName" AS title,
        ts."fileUrl" AS "referenceMaterialUrl",
        ts."submittedByEmail" AS "ownerEmail",
        u."fullName" AS "ownerName",
        ts.created_at AS "documentDate"
      FROM task_submissions ts
      JOIN project_tasks t ON ts."taskId" = t.id
      LEFT JOIN users u ON ts."submittedByEmail" = u."emailAddress"
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
