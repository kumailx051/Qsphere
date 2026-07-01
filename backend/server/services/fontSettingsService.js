import pool from '../db.js'
import { createHttpError } from '../utils/errors.js'

export const getFontSettings = async () => {
  const result = await pool.query('SELECT * FROM font_settings ORDER BY id DESC LIMIT 1')
  const templatesResult = await pool.query(
    `SELECT id, name, "fontFamily", "sizeScales", "createdBy", created_at, updated_at
     FROM font_templates
     ORDER BY LOWER(name) ASC, id DESC`,
  ).catch(() => ({ rows: [] }))

  return {
    current: result.rows[0] || null,
    templates: templatesResult.rows || [],
  }
}

export const upsertFontSettings = async (fontFamily, sizeScales, adminEmail) => {
  if (!fontFamily) throw createHttpError(400, 'fontFamily is required')
  if (!sizeScales || typeof sizeScales !== 'object') throw createHttpError(400, 'sizeScales must be an object')

  const existing = await pool.query('SELECT id FROM font_settings ORDER BY id DESC LIMIT 1')

  if (existing.rows.length > 0) {
    const result = await pool.query(
      `UPDATE font_settings SET "fontFamily" = $1, "sizeScales" = $2, "updatedBy" = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [fontFamily, JSON.stringify(sizeScales), adminEmail, existing.rows[0].id],
    )
    return result.rows[0]
  }

  const result = await pool.query(
    `INSERT INTO font_settings ("fontFamily", "sizeScales", "updatedBy")
     VALUES ($1, $2, $3) RETURNING *`,
    [fontFamily, JSON.stringify(sizeScales), adminEmail],
  )
  return result.rows[0]
}

export const createFontTemplate = async (name, fontFamily, sizeScales, adminEmail) => {
  const cleanName = String(name || '').trim()
  if (!cleanName) throw createHttpError(400, 'Template name is required')
  if (!fontFamily) throw createHttpError(400, 'fontFamily is required')
  if (!sizeScales || typeof sizeScales !== 'object') throw createHttpError(400, 'sizeScales must be an object')

  const result = await pool.query(
    `INSERT INTO font_templates (name, "fontFamily", "sizeScales", "createdBy")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [cleanName, fontFamily, JSON.stringify(sizeScales), adminEmail],
  )

  return result.rows[0]
}

export const deleteFontTemplate = async (id) => {
  const templateId = Number(id)
  if (!templateId) throw createHttpError(400, 'Invalid template id')

  const result = await pool.query('DELETE FROM font_templates WHERE id = $1 RETURNING id', [templateId])
  if (result.rowCount === 0) throw createHttpError(404, 'Template not found')

  return { success: true }
}
