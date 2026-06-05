import pool from './db.js'

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

const toGroup = (row) => ({
  id: Number(row.id),
  title: row.title,
  description: row.description,
  owner: row.owner,
  avatar: row.avatar,
  type: row.type,
  status: row.status,
  scope: row.scope,
  createdAt: row.created_at,
})

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

let readyPromise = null

export const ensureReady = async () => {
  if (!readyPromise) {
    readyPromise = ensureSchema()
  }

  await readyPromise
}

export const listGroups = async () => {
  await ensureReady()
  const { rows } = await pool.query('SELECT * FROM groups ORDER BY id ASC')
  return rows.map(toGroup)
}

export const upsertGroup = async (group) => {
  await ensureReady()
  const payload = {
    id: Number(group.id),
    title: String(group.title ?? ''),
    description: String(group.description ?? ''),
    owner: String(group.owner ?? 'QSphere Member'),
    avatar:
      String(group.avatar ?? '').trim() ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(group.owner || group.title || `group-${group.id}`)}`,
    type: group.type ?? 'Research',
    scope: group.scope ?? group.description ?? '',
    status: group.status ?? 'Active',
  }

  const { rows } = await pool.query(
    `INSERT INTO groups (id, title, description, owner, avatar, type, status, scope)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       owner = EXCLUDED.owner,
       avatar = EXCLUDED.avatar,
       type = EXCLUDED.type,
       status = EXCLUDED.status,
       scope = EXCLUDED.scope
     RETURNING *`,
    [payload.id, payload.title, payload.description, payload.owner, payload.avatar, payload.type, payload.status, payload.scope],
  )

  return toGroup(rows[0])
}

export const deleteGroup = async (groupId) => {
  await ensureReady()
  await pool.query('DELETE FROM groups WHERE id = $1', [Number(groupId)])
}