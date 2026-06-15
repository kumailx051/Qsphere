import pool from '../server/db.js'

export default async function handler(request, response) {
  try {
    const result = await pool.query('SELECT NOW() AS now')
    response.status(200).json({ ok: true, now: result.rows[0]?.now ?? null })
  } catch (error) {
    response.status(500).json({ ok: false, error: 'Database connection failed' })
  }
}
