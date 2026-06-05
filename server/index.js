import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3001)

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: String(process.env.DB_SSL || 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
})

const DEFAULT_GROUPS = [
  {
    title: 'QR in Network Management',
    description: 'Q. Secure and Efficient network management system',
    owner: 'Ghulam Murtaza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ghulam',
    type: 'Research',
    status: 'Active',
    scope: 'Network management',
  },
  {
    title: 'Kyber Linux Efficient Implementation',
    description: 'Secure and Efficient Implementation of Kyber in Linux',
    owner: 'Ghulam Murtaza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Murtaza',
    type: 'Research',
    status: 'Active',
    scope: 'Kyber implementation',
  },
  {
    title: 'Quantum Resilient',
    description: 'Resiliency in Quantum Computing',
    owner: 'Ghulam Murtaza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Resilient',
    type: 'Research',
    status: 'Active',
    scope: 'Quantum resilience',
  },
  {
    title: 'PQ Development',
    description: 'Algorithms Development',
    owner: 'Anjum Ashraaf',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjum',
    type: 'Product & development',
    status: 'Active',
    scope: 'Algorithm development',
  },
]

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      owner TEXT NOT NULL,
      avatar TEXT NOT NULL,
      type TEXT,
      status TEXT,
      scope TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM groups')
  if (rows[0]?.count === 0) {
    for (const group of DEFAULT_GROUPS) {
      await pool.query(
        `INSERT INTO groups (id, title, description, owner, avatar, type, status, scope)
         VALUES (
           (SELECT COALESCE(MAX(id), 0) + 1 FROM groups),
           $1, $2, $3, $4, $5, $6, $7
         )`,
        [group.title, group.description, group.owner, group.avatar, group.type, group.status, group.scope],
      )
    }
  }
}

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', async (_request, response) => {
  try {
    const result = await pool.query('SELECT NOW() AS now')
    response.json({ ok: true, now: result.rows[0]?.now ?? null })
  } catch (error) {
    response.status(500).json({ ok: false, error: 'Database connection failed' })
  }
})

app.get('/api/groups', async (_request, response) => {
  try {
    const result = await pool.query('SELECT * FROM groups ORDER BY id ASC')
    response.json(result.rows)
  } catch (error) {
    response.status(500).json({ error: 'Failed to load groups' })
  }
})

app.post('/api/groups', async (request, response) => {
  const { id, title, description, owner, avatar, type, status, scope } = request.body ?? {}

  if (!title || !description || !owner) {
    return response.status(400).json({ error: 'title, description, and owner are required' })
  }

  try {
    const nextId = Number(id || 0)
    const result = await pool.query(
      `INSERT INTO groups (id, title, description, owner, avatar, type, status, scope)
       VALUES (
         COALESCE(NULLIF($1, 0), (SELECT COALESCE(MAX(id), 0) + 1 FROM groups)),
         $2, $3, $4, $5, $6, $7, $8
       )
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         owner = EXCLUDED.owner,
         avatar = EXCLUDED.avatar,
         type = EXCLUDED.type,
         status = EXCLUDED.status,
         scope = EXCLUDED.scope
       RETURNING *`,
      [nextId, title, description, owner, avatar || '', type || '', status || '', scope || ''],
    )

    response.status(201).json(result.rows[0])
  } catch (error) {
    response.status(500).json({ error: 'Failed to create group' })
  }
})

app.put('/api/groups', async (request, response) => {
  const { id, title, description, owner, avatar, type, status, scope } = request.body ?? {}

  if (!id) {
    return response.status(400).json({ error: 'id is required' })
  }

  try {
    const result = await pool.query(
      `UPDATE groups
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           owner = COALESCE($4, owner),
           avatar = COALESCE($5, avatar),
           type = COALESCE($6, type),
           status = COALESCE($7, status),
           scope = COALESCE($8, scope)
       WHERE id = $1
       RETURNING *`,
      [id, title ?? null, description ?? null, owner ?? null, avatar ?? null, type ?? null, status ?? null, scope ?? null],
    )

    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'Group not found' })
    }

    response.json(result.rows[0])
  } catch (error) {
    response.status(500).json({ error: 'Failed to update group' })
  }
})

app.delete('/api/groups', async (request, response) => {
  const id = Number(request.body?.id || request.query.id)

  if (!id) {
    return response.status(400).json({ error: 'id is required' })
  }

  try {
    const result = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING id', [id])
    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'Group not found' })
    }

    response.json({ deleted: true, id })
  } catch (error) {
    response.status(500).json({ error: 'Failed to delete group' })
  }
})

const start = async () => {
  await ensureSchema()
  app.listen(port, () => {
    console.log(`QSphere API running on http://localhost:${port}`)
  })
}

start().catch((error) => {
  console.error('Unable to start API server:', error)
  process.exit(1)
})