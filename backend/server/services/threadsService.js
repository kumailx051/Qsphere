import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { createNotification } from './notificationService.js'

const DEFAULT_THREAD_COMMUNITY = 'general-questions'

const parseTags = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeTagsInput = (value) => parseTags(value).join(', ')

const mapThreadRow = (row) => ({
  ...row,
  tags: parseTags(row.tags),
  score: Number(row.upvoteCount || 0) - Number(row.downvoteCount || 0),
})

export const listThreadCommunities = async () => {
  const result = await pool.query(`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.description,
      c.color,
      c."createdByEmail",
      c."isDefault",
      COUNT(t.id) FILTER (WHERE t."deletedAt" IS NULL) AS "threadCount"
    FROM thread_communities c
    LEFT JOIN threads t
      ON t."communitySlug" = c.slug
    GROUP BY c.id, c.slug, c.name, c.description, c.color, c."createdByEmail", c."isDefault"
    ORDER BY COUNT(t.id) FILTER (WHERE t."deletedAt" IS NULL) DESC, c.name ASC
  `)

  return result.rows.map((row) => ({
    ...row,
    threadCount: Number(row.threadCount || 0),
  }))
}

export const createThreadCommunity = async ({ name, slug, description, color, createdByEmail }) => {
  const trimmedName = String(name || '').trim()
  const derivedSlug = String(slug || trimmedName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!trimmedName) throw createHttpError(400, 'Community name is required.')
  if (!derivedSlug) throw createHttpError(400, 'A valid community slug is required.')
  if (!createdByEmail) throw createHttpError(401, 'Authentication required.')

  const result = await pool.query(
    `INSERT INTO thread_communities (slug, name, description, color, "createdByEmail", "isDefault")
     VALUES ($1, $2, $3, $4, $5, FALSE)
     ON CONFLICT (slug) DO NOTHING
     RETURNING id, slug, name, description, color, "createdByEmail", "isDefault"`,
    [derivedSlug, trimmedName, String(description || '').trim(), String(color || '#2EC58A').trim(), createdByEmail],
  )

  if (result.rows.length === 0) {
    throw createHttpError(409, 'A community with this name already exists.')
  }

  return { ...result.rows[0], threadCount: 0 }
}

export const listThreads = async ({ sort, tag, search, userEmail, community } = {}) => {
  let where = 'WHERE t."deletedAt" IS NULL'
  const params = []
  let paramIndex = 1

  if (community) {
    where += ` AND t."communitySlug" = $${paramIndex}`
    params.push(String(community).trim().toLowerCase())
    paramIndex += 1
  }

  if (tag) {
    where += ` AND t.tags ILIKE $${paramIndex}`
    params.push(`%${tag}%`)
    paramIndex += 1
  }

  if (search) {
    where += ` AND (t.title ILIKE $${paramIndex} OR t.body ILIKE $${paramIndex})`
    params.push(`%${search}%`)
    paramIndex += 1
  }

  let orderBy = 'ORDER BY t."isPinned" DESC, t.created_at DESC'
  if (sort === 'top') orderBy = 'ORDER BY t."isPinned" DESC, (t."upvoteCount" - t."downvoteCount") DESC, t.created_at DESC'
  else if (sort === 'hot') orderBy = 'ORDER BY t."isPinned" DESC, ((t."upvoteCount" * 2) + (t."replyCount" * 3) - t."downvoteCount") DESC, t.created_at DESC'
  else if (sort === 'oldest') orderBy = 'ORDER BY t.created_at ASC'

  const voteJoin = userEmail
    ? `LEFT JOIN LATERAL (SELECT value AS "myVote" FROM thread_votes WHERE "threadId" = t.id AND "userEmail" = $${paramIndex}) v ON true`
    : ''

  if (userEmail && voteJoin) {
    params.push(userEmail)
    paramIndex += 1
  }

  const sql = `
    SELECT
      t.id, t.title, t.body, t."authorEmail", t."authorName", t.tags,
      t."communitySlug", c.name AS "communityName", c.description AS "communityDescription", c.color AS "communityColor",
      t."upvoteCount", t."downvoteCount", t."replyCount",
      t."isPinned", t."isLocked", t.created_at AS "createdAt", t.updated_at AS "updatedAt"
      ${userEmail ? ', v."myVote"' : ', NULL AS "myVote"'}
    FROM threads t
    LEFT JOIN thread_communities c ON c.slug = t."communitySlug"
    ${voteJoin}
    ${where}
    ${orderBy}
  `

  const result = await pool.query(sql, params)
  const items = result.rows.map(mapThreadRow)
  const communities = await listThreadCommunities()

  const stats = {
    totalThreads: items.length,
    totalReplies: items.reduce((sum, row) => sum + Number(row.replyCount || 0), 0),
    totalVotes: items.reduce((sum, row) => sum + Number(row.upvoteCount || 0) + Number(row.downvoteCount || 0), 0),
  }

  return {
    items,
    communities,
    stats,
  }
}

export const getThread = async (threadId, userEmail) => {
  const voteJoin = userEmail
    ? `LEFT JOIN LATERAL (SELECT value AS "myVote" FROM thread_votes WHERE "threadId" = t.id AND "userEmail" = $2) v ON true`
    : ''

  const params = [threadId]
  if (userEmail) params.push(userEmail)

  const sql = `
    SELECT
      t.id, t.title, t.body, t."authorEmail", t."authorName", t.tags,
      t."communitySlug", c.name AS "communityName", c.description AS "communityDescription", c.color AS "communityColor",
      t."upvoteCount", t."downvoteCount", t."replyCount",
      t."isPinned", t."isLocked", t.created_at AS "createdAt", t.updated_at AS "updatedAt"
      ${userEmail ? ', v."myVote"' : ', NULL AS "myVote"'}
    FROM threads t
    LEFT JOIN thread_communities c ON c.slug = t."communitySlug"
    ${voteJoin}
    WHERE t.id = $1 AND t."deletedAt" IS NULL
  `

  const result = await pool.query(sql, params)
  if (result.rows.length === 0) throw createHttpError(404, 'Thread not found.')

  const thread = mapThreadRow(result.rows[0])

  const repliesSql = `
    SELECT
      r.id, r."threadId", r."parentId", r.body, r."authorEmail", r."authorName",
      r."upvoteCount", r."downvoteCount", r."isAcceptedAnswer",
      r.created_at AS "createdAt", r.updated_at AS "updatedAt"
      ${userEmail ? ', rv.value AS "myVote"' : ', NULL AS "myVote"'}
    FROM thread_replies r
    ${userEmail ? `LEFT JOIN LATERAL (SELECT value FROM thread_reply_votes WHERE "replyId" = r.id AND "userEmail" = $2) rv ON true` : ''}
    WHERE r."threadId" = $1 AND r."deletedAt" IS NULL AND r."parentId" IS NULL
    ORDER BY r."isAcceptedAnswer" DESC, r."upvoteCount" DESC, r.created_at ASC
  `

  const repliesResult = await pool.query(repliesSql, params)
  const replies = repliesResult.rows.map((r) => ({
    ...r,
    score: (r.upvoteCount || 0) - (r.downvoteCount || 0),
    children: [],
  }))

  const childSql = `
    SELECT
      r.id, r."threadId", r."parentId", r.body, r."authorEmail", r."authorName",
      r."upvoteCount", r."downvoteCount", r."isAcceptedAnswer",
      r.created_at AS "createdAt", r.updated_at AS "updatedAt"
      ${userEmail ? ', rv.value AS "myVote"' : ', NULL AS "myVote"'}
    FROM thread_replies r
    ${userEmail ? `LEFT JOIN LATERAL (SELECT value FROM thread_reply_votes WHERE "replyId" = r.id AND "userEmail" = $2) rv ON true` : ''}
    WHERE r."threadId" = $1 AND r."deletedAt" IS NULL AND r."parentId" IS NOT NULL
    ORDER BY r.created_at ASC
  `

  const childResult = await pool.query(childSql, params)
  const childMap = {}
  for (const child of childResult.rows) {
    child.score = (child.upvoteCount || 0) - (child.downvoteCount || 0)
    if (!childMap[child.parentId]) childMap[child.parentId] = []
    childMap[child.parentId].push(child)
  }

  for (const reply of replies) {
    reply.children = childMap[reply.id] || []
  }

  thread.replies = replies
  return thread
}

export const createThread = async ({ title, body, authorEmail, authorName, tags, communitySlug }) => {
  if (!title || !String(title).trim()) throw createHttpError(400, 'Title is required.')
  if (!authorEmail) throw createHttpError(401, 'Authentication required.')
  const normalizedCommunitySlug = String(communitySlug || DEFAULT_THREAD_COMMUNITY).trim().toLowerCase()

  const communityResult = await pool.query(
    'SELECT slug, name, description, color FROM thread_communities WHERE slug = $1 LIMIT 1',
    [normalizedCommunitySlug],
  )
  if (communityResult.rows.length === 0) {
    throw createHttpError(404, 'Selected community was not found.')
  }

  const result = await pool.query(
    `INSERT INTO threads (title, body, "authorEmail", "authorName", tags, "communitySlug")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, body, "authorEmail", "authorName", tags, "communitySlug",
       "upvoteCount", "downvoteCount", "replyCount",
       "isPinned", "isLocked", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [String(title).trim(), String(body || '').trim(), authorEmail, authorName || '', normalizeTagsInput(tags), normalizedCommunitySlug],
  )

  return mapThreadRow({
    ...result.rows[0],
    communityName: communityResult.rows[0].name,
    communityDescription: communityResult.rows[0].description,
    communityColor: communityResult.rows[0].color,
    myVote: null,
  })
}

export const updateThread = async (threadId, { title, body, tags, communitySlug, userEmail }) => {
  const existing = await pool.query(
    'SELECT * FROM threads WHERE id = $1 AND "deletedAt" IS NULL',
    [threadId],
  )
  if (existing.rows.length === 0) throw createHttpError(404, 'Thread not found.')

  const thread = existing.rows[0]
  if (thread.authorEmail !== userEmail) throw createHttpError(403, 'You can only edit your own threads.')

  let normalizedCommunitySlug = null
  if (communitySlug !== undefined) {
    normalizedCommunitySlug = String(communitySlug || '').trim().toLowerCase()
    if (!normalizedCommunitySlug) throw createHttpError(400, 'Community is required.')
    const communityResult = await pool.query(
      'SELECT slug FROM thread_communities WHERE slug = $1 LIMIT 1',
      [normalizedCommunitySlug],
    )
    if (communityResult.rows.length === 0) throw createHttpError(404, 'Selected community was not found.')
  }

  const result = await pool.query(
    `UPDATE threads SET
      title = COALESCE($1, title),
      body = COALESCE($2, body),
      tags = COALESCE($3, tags),
      "communitySlug" = COALESCE($4, "communitySlug"),
      updated_at = NOW()
     WHERE id = $5
     RETURNING id, title, body, "authorEmail", "authorName", tags, "communitySlug",
       "upvoteCount", "downvoteCount", "replyCount",
       "isPinned", "isLocked", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      title !== undefined ? String(title).trim() : null,
      body !== undefined ? String(body).trim() : null,
      tags !== undefined ? normalizeTagsInput(tags) : null,
      normalizedCommunitySlug,
      threadId,
    ],
  )

  const joined = await pool.query(
    `SELECT c.name, c.description, c.color
     FROM thread_communities c
     WHERE c.slug = $1`,
    [result.rows[0].communitySlug],
  )

  return mapThreadRow({
    ...result.rows[0],
    communityName: joined.rows[0]?.name,
    communityDescription: joined.rows[0]?.description,
    communityColor: joined.rows[0]?.color,
  })
}

export const deleteThread = async (threadId, userEmail) => {
  const existing = await pool.query(
    'SELECT * FROM threads WHERE id = $1 AND "deletedAt" IS NULL',
    [threadId],
  )
  if (existing.rows.length === 0) throw createHttpError(404, 'Thread not found.')

  const thread = existing.rows[0]
  if (thread.authorEmail !== userEmail) throw createHttpError(403, 'You can only delete your own threads.')

  await pool.query(
    'UPDATE threads SET "deletedAt" = NOW() WHERE id = $1',
    [threadId],
  )

  return { success: true }
}

export const voteThread = async (threadId, userEmail, value) => {
  if (![1, -1].includes(value)) throw createHttpError(400, 'Value must be 1 (upvote) or -1 (downvote).')

  const existing = await pool.query(
    'SELECT id, value FROM thread_votes WHERE "threadId" = $1 AND "userEmail" = $2',
    [threadId, userEmail],
  )

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (existing.rows.length > 0) {
      const oldValue = existing.rows[0].value

      if (oldValue === value) {
        await client.query(
          'DELETE FROM thread_votes WHERE id = $1',
          [existing.rows[0].id],
        )
        if (value === 1) {
          await client.query('UPDATE threads SET "upvoteCount" = GREATEST("upvoteCount" - 1, 0) WHERE id = $1', [threadId])
        } else {
          await client.query('UPDATE threads SET "downvoteCount" = GREATEST("downvoteCount" - 1, 0) WHERE id = $1', [threadId])
        }
        await client.query('COMMIT')
        return { action: 'removed', myVote: null }
      }

      await client.query(
        'UPDATE thread_votes SET value = $1, updated_at = NOW() WHERE id = $2',
        [value, existing.rows[0].id],
      )
      if (oldValue === 1) {
        await client.query('UPDATE threads SET "upvoteCount" = GREATEST("upvoteCount" - 1, 0), "downvoteCount" = "downvoteCount" + 1 WHERE id = $1', [threadId])
      } else {
        await client.query('UPDATE threads SET "downvoteCount" = GREATEST("downvoteCount" - 1, 0), "upvoteCount" = "upvoteCount" + 1 WHERE id = $1', [threadId])
      }
    } else {
      await client.query(
        'INSERT INTO thread_votes ("threadId", "userEmail", value) VALUES ($1, $2, $3)',
        [threadId, userEmail, value],
      )
      if (value === 1) {
        await client.query('UPDATE threads SET "upvoteCount" = "upvoteCount" + 1 WHERE id = $1', [threadId])
      } else {
        await client.query('UPDATE threads SET "downvoteCount" = "downvoteCount" + 1 WHERE id = $1', [threadId])
      }
    }

    await client.query('COMMIT')

    const updated = await client.query(
      'SELECT "upvoteCount", "downvoteCount" FROM threads WHERE id = $1',
      [threadId],
    )

    return {
      action: existing.rows.length > 0 ? 'changed' : 'added',
      myVote: value,
      upvoteCount: Number(updated.rows[0].upvoteCount),
      downvoteCount: Number(updated.rows[0].downvoteCount),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const createReply = async (threadId, { body, authorEmail, authorName, parentId }) => {
  if (!body || !String(body).trim()) throw createHttpError(400, 'Reply body is required.')
  if (!authorEmail) throw createHttpError(401, 'Authentication required.')

  if (parentId) {
    const parent = await pool.query(
      'SELECT id FROM thread_replies WHERE id = $1 AND "threadId" = $2 AND "deletedAt" IS NULL',
      [parentId, threadId],
    )
    if (parent.rows.length === 0) throw createHttpError(404, 'Parent reply not found.')
  }

  const result = await pool.query(
    `INSERT INTO thread_replies ("threadId", "parentId", body, "authorEmail", "authorName")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, "threadId", "parentId", body, "authorEmail", "authorName",
       "upvoteCount", "downvoteCount", "isAcceptedAnswer",
       created_at AS "createdAt", updated_at AS "updatedAt"`,
    [threadId, parentId || null, String(body).trim(), authorEmail, authorName || ''],
  )

  await pool.query(
    'UPDATE threads SET "replyCount" = "replyCount" + 1 WHERE id = $1',
    [threadId],
  )

  const threadResult = await pool.query(
    'SELECT title, "authorEmail" FROM threads WHERE id = $1 AND "deletedAt" IS NULL LIMIT 1',
    [threadId],
  )

  const thread = threadResult.rows[0]
  const normalizedThreadAuthorEmail = normalizeEmail(thread?.authorEmail)
  const normalizedReplyAuthorEmail = normalizeEmail(authorEmail)
  if (normalizedThreadAuthorEmail && normalizedThreadAuthorEmail !== normalizedReplyAuthorEmail) {
    await createNotification({
      type: 'thread_reply',
      title: 'New reply on your thread',
      message: `${authorName || 'Someone'} replied to "${thread?.title || 'your thread'}".`,
      recipientEmail: normalizedThreadAuthorEmail,
      linkUrl: `/threads/${threadId}`,
    })
  }

  return { ...result.rows[0], score: 0, myVote: null, children: [] }
}

export const updateReply = async (replyId, { body, userEmail }) => {
  const existing = await pool.query(
    'SELECT * FROM thread_replies WHERE id = $1 AND "deletedAt" IS NULL',
    [replyId],
  )
  if (existing.rows.length === 0) throw createHttpError(404, 'Reply not found.')
  if (existing.rows[0].authorEmail !== userEmail) throw createHttpError(403, 'You can only edit your own replies.')

  const result = await pool.query(
    `UPDATE thread_replies SET body = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, "threadId", "parentId", body, "authorEmail", "authorName",
       "upvoteCount", "downvoteCount", "isAcceptedAnswer",
       created_at AS "createdAt", updated_at AS "updatedAt"`,
    [String(body).trim(), replyId],
  )

  return { ...result.rows[0], score: (result.rows[0].upvoteCount || 0) - (result.rows[0].downvoteCount || 0) }
}

export const deleteReply = async (replyId, userEmail) => {
  const existing = await pool.query(
    'SELECT * FROM thread_replies WHERE id = $1 AND "deletedAt" IS NULL',
    [replyId],
  )
  if (existing.rows.length === 0) throw createHttpError(404, 'Reply not found.')
  if (existing.rows[0].authorEmail !== userEmail) throw createHttpError(403, 'You can only delete your own replies.')

  const threadId = existing.rows[0].threadId

  await pool.query(
    'UPDATE thread_replies SET "deletedAt" = NOW() WHERE id = $1',
    [replyId],
  )

  await pool.query(
    'UPDATE threads SET "replyCount" = GREATEST("replyCount" - 1, 0) WHERE id = $1',
    [threadId],
  )

  return { success: true }
}

export const voteReply = async (replyId, userEmail, value) => {
  if (![1, -1].includes(value)) throw createHttpError(400, 'Value must be 1 (upvote) or -1 (downvote).')

  const existing = await pool.query(
    'SELECT id, value FROM thread_reply_votes WHERE "replyId" = $1 AND "userEmail" = $2',
    [replyId, userEmail],
  )

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (existing.rows.length > 0) {
      const oldValue = existing.rows[0].value

      if (oldValue === value) {
        await client.query('DELETE FROM thread_reply_votes WHERE id = $1', [existing.rows[0].id])
        if (value === 1) {
          await client.query('UPDATE thread_replies SET "upvoteCount" = GREATEST("upvoteCount" - 1, 0) WHERE id = $1', [replyId])
        } else {
          await client.query('UPDATE thread_replies SET "downvoteCount" = GREATEST("downvoteCount" - 1, 0) WHERE id = $1', [replyId])
        }
        await client.query('COMMIT')
        return { action: 'removed', myVote: null }
      }

      await client.query('UPDATE thread_reply_votes SET value = $1, updated_at = NOW() WHERE id = $2', [value, existing.rows[0].id])
      if (oldValue === 1) {
        await client.query('UPDATE thread_replies SET "upvoteCount" = GREATEST("upvoteCount" - 1, 0), "downvoteCount" = "downvoteCount" + 1 WHERE id = $1', [replyId])
      } else {
        await client.query('UPDATE thread_replies SET "downvoteCount" = GREATEST("downvoteCount" - 1, 0), "upvoteCount" = "upvoteCount" + 1 WHERE id = $1', [replyId])
      }
    } else {
      await client.query('INSERT INTO thread_reply_votes ("replyId", "userEmail", value) VALUES ($1, $2, $3)', [replyId, userEmail, value])
      if (value === 1) {
        await client.query('UPDATE thread_replies SET "upvoteCount" = "upvoteCount" + 1 WHERE id = $1', [replyId])
      } else {
        await client.query('UPDATE thread_replies SET "downvoteCount" = "downvoteCount" + 1 WHERE id = $1', [replyId])
      }
    }

    await client.query('COMMIT')

    const updated = await client.query(
      'SELECT "upvoteCount", "downvoteCount" FROM thread_replies WHERE id = $1',
      [replyId],
    )

    return {
      action: existing.rows.length > 0 ? 'changed' : 'added',
      myVote: value,
      upvoteCount: Number(updated.rows[0].upvoteCount),
      downvoteCount: Number(updated.rows[0].downvoteCount),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const acceptReply = async (replyId, userEmail) => {
  const reply = await pool.query(
    'SELECT r.*, t."authorEmail" AS "threadAuthorEmail" FROM thread_replies r JOIN threads t ON t.id = r."threadId" WHERE r.id = $1 AND r."deletedAt" IS NULL',
    [replyId],
  )
  if (reply.rows.length === 0) throw createHttpError(404, 'Reply not found.')
  if (reply.rows[0].threadAuthorEmail !== userEmail) throw createHttpError(403, 'Only the thread author can accept an answer.')

  const threadId = reply.rows[0].threadId

  await pool.query('UPDATE thread_replies SET "isAcceptedAnswer" = FALSE WHERE "threadId" = $1', [threadId])
  await pool.query('UPDATE thread_replies SET "isAcceptedAnswer" = TRUE WHERE id = $1', [replyId])

  return { success: true, replyId }
}
