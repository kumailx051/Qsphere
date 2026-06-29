import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'
import { normalizeEmail } from '../utils/strings.js'
import { uploadImageToImgBB } from './mediaService.js'
import { createNotification } from './notificationService.js'

export const listBlogs = async () => {
  const result = await pool.query(
    `SELECT id, title, excerpt, "coverImage", category, author, "authorEmail", "readingTime", "dateOfPublish"
     FROM blogs
     ORDER BY "dateOfPublish" DESC`,
  )
  return result.rows
}

export const getBlogById = async (id) => {
  const blogId = Number(id)
  if (!blogId) throw createHttpError(400, 'Invalid blog id')

  const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [blogId])
  if (result.rowCount === 0) throw createHttpError(404, 'Blog not found')
  return result.rows[0]
}

export const listBlogsByUserEmail = async (email) => {
  if (!email) throw createHttpError(400, 'Email is required')

  const result = await pool.query(
    `SELECT id, title, excerpt, "coverImage", category, author, "authorEmail", "readingTime", "dateOfPublish"
     FROM blogs WHERE "authorEmail" = $1 ORDER BY "dateOfPublish" DESC`,
    [email],
  )
  return result.rows
}

export const createBlog = async (payload) => {
  if (!payload?.title) throw createHttpError(400, 'Title is required')

  let coverImageUrl = payload.coverImage || null
  if (payload.coverImage && payload.coverImage.startsWith('data:image/')) {
    coverImageUrl = await uploadImageToImgBB(payload.coverImage)
  }

  const result = await pool.query(
    `INSERT INTO blogs (title, excerpt, "blogData", "coverImage", category, author, "authorEmail", "readingTime")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.title,
      payload.excerpt || null,
      payload.blogData || null,
      coverImageUrl,
      payload.category || null,
      payload.author || 'QSphere Contributor',
      payload.authorEmail || null,
      payload.readingTime || null,
    ],
  )

  return result.rows[0]
}

export const updateBlog = async (id, payload) => {
  const blogId = Number(id)
  if (!blogId) throw createHttpError(400, 'Invalid blog id')

  let coverImageUrl = payload?.coverImage
  if (payload?.coverImage && payload.coverImage.startsWith('data:image/')) {
    coverImageUrl = await uploadImageToImgBB(payload.coverImage)
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
    [
      blogId,
      payload?.title || null,
      payload?.excerpt || null,
      payload?.blogData || null,
      coverImageUrl || null,
      payload?.category || null,
      payload?.author || null,
      payload?.readingTime || null,
    ],
  )

  if (result.rowCount === 0) throw createHttpError(404, 'Blog not found')
  return result.rows[0]
}

export const deleteBlog = async (id) => {
  const blogId = Number(id)
  if (!blogId) throw createHttpError(400, 'Invalid blog id')

  const result = await pool.query('DELETE FROM blogs WHERE id = $1 RETURNING id', [blogId])
  if (result.rowCount === 0) throw createHttpError(404, 'Blog not found')
  return { deleted: true, id: blogId }
}

export const listBlogCategories = async () => {
  const result = await pool.query('SELECT * FROM blog_categories ORDER BY name ASC')
  return result.rows
}

export const createBlogCategory = async ({ name }) => {
  const trimmed = String(name || '').trim().toUpperCase()
  if (!trimmed) throw createHttpError(400, 'Category name is required')

  const result = await pool.query(
    `INSERT INTO blog_categories (name) VALUES ($1)
     ON CONFLICT (name) DO NOTHING
     RETURNING *`,
    [trimmed],
  )

  if (result.rowCount === 0) throw createHttpError(409, 'Category already exists')
  return result.rows[0]
}

export const listBlogComments = async (id) => {
  const blogId = Number(id)
  if (!blogId) throw createHttpError(400, 'Invalid blog id')

  const result = await pool.query('SELECT * FROM blog_comments WHERE "blogId" = $1 ORDER BY created_at DESC', [blogId])
  return result.rows
}

export const addBlogComment = async (id, payload) => {
  const blogId = Number(id)
  if (!blogId) throw createHttpError(400, 'Invalid blog id')
  if (!payload?.text || !payload.text.trim()) throw createHttpError(400, 'Comment text is required')

  const blogResult = await pool.query(
    'SELECT id, title, author, "authorEmail" FROM blogs WHERE id = $1',
    [blogId],
  )
  if (blogResult.rowCount === 0) throw createHttpError(404, 'Blog not found')

  const trimmedName = String(payload.name || 'Anonymous').trim()
  const trimmedText = payload.text.trim()
  const normalizedCommenterEmail = normalizeEmail(payload.commenterEmail) || null

  const result = await pool.query(
    `INSERT INTO blog_comments ("blogId", name, text, "commenterEmail")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [blogId, trimmedName, trimmedText, normalizedCommenterEmail],
  )

  const newComment = result.rows[0]
  const blog = blogResult.rows[0]
  const normalizedAuthorEmail = normalizeEmail(blog.authorEmail)

  if (normalizedAuthorEmail && normalizedAuthorEmail !== normalizedCommenterEmail) {
    await createNotification({
      type: 'blog_comment',
      title: 'New comment on your blog',
      message: `${trimmedName} commented on "${blog.title}".`,
      recipientEmail: normalizedAuthorEmail,
      linkUrl: `/blogs/${blogId}?commentId=${newComment.id}`,
      blogId,
      commentId: newComment.id,
    })
  }

  return newComment
}

export const updateBlogComment = async (commentId, payload) => {
  const parsedId = Number(commentId)
  if (!parsedId) throw createHttpError(400, 'Invalid comment id')
  if (!payload?.text || !payload.text.trim()) throw createHttpError(400, 'Comment text is required')
  if (!payload?.commenterEmail) throw createHttpError(400, 'commenterEmail is required')

  const existing = await pool.query('SELECT * FROM blog_comments WHERE id = $1', [parsedId])
  if (existing.rowCount === 0) throw createHttpError(404, 'Comment not found')

  const comment = existing.rows[0]
  if (normalizeEmail(comment.commenterEmail) !== normalizeEmail(payload.commenterEmail)) {
    throw createHttpError(403, 'You can only edit your own comments')
  }

  const result = await pool.query(
    'UPDATE blog_comments SET text = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [payload.text.trim(), parsedId],
  )
  return result.rows[0]
}

export const deleteBlogComment = async (commentId, payload) => {
  const parsedId = Number(commentId)
  if (!parsedId) throw createHttpError(400, 'Invalid comment id')
  if (!payload?.commenterEmail) throw createHttpError(400, 'commenterEmail is required')

  const existing = await pool.query('SELECT * FROM blog_comments WHERE id = $1', [parsedId])
  if (existing.rowCount === 0) throw createHttpError(404, 'Comment not found')

  const comment = existing.rows[0]
  if (normalizeEmail(comment.commenterEmail) !== normalizeEmail(payload.commenterEmail)) {
    throw createHttpError(403, 'You can only delete your own comments')
  }

  await pool.query('DELETE FROM blog_comments WHERE id = $1', [parsedId])
  return { success: true }
}

export const createBlogReport = async (id, payload) => {
  const blogId = Number(id)
  if (!blogId) throw createHttpError(400, 'Invalid blog id')

  const reporterEmail = normalizeEmail(payload?.reportedByEmail)
  const reporterName = String(payload?.reportedByName || '').trim()
  const reason = String(payload?.reason || '').trim()
  const details = String(payload?.details || '').trim()

  if (!reporterEmail) throw createHttpError(400, 'Reporter email is required')
  if (!reporterName) throw createHttpError(400, 'Reporter name is required')
  if (!reason) throw createHttpError(400, 'Report reason is required')

  const blogResult = await pool.query(
    'SELECT id, title, author, "authorEmail" FROM blogs WHERE id = $1 LIMIT 1',
    [blogId],
  )
  if (blogResult.rowCount === 0) throw createHttpError(404, 'Blog not found')

  const blog = blogResult.rows[0]
  if (normalizeEmail(blog.authorEmail) === reporterEmail) {
    throw createHttpError(400, 'You cannot report your own blog')
  }

  try {
    const insertResult = await pool.query(
      `INSERT INTO blog_reports (
        "blogId",
        "blogTitle",
        "blogAuthorEmail",
        "reportedByEmail",
        "reportedByName",
        reason,
        details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        blogId,
        blog.title,
        normalizeEmail(blog.authorEmail),
        reporterEmail,
        reporterName,
        reason,
        details || null,
      ],
    )

    return insertResult.rows[0]
  } catch (error) {
    if (error?.code === '23505') {
      throw createHttpError(409, 'You have already reported this blog')
    }
    throw error
  }
}
