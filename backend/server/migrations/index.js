import fs from 'fs/promises'
import path from 'path'
import pool from '../db.js'

const migrationsDir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1')

export const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const existing = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1 LIMIT 1', [file])
    if (existing.rowCount > 0) continue

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
