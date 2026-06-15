const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', database: 'qsphere', user: 'postgres', password: 'password123' });

pool.query(`
  CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    "groupId" INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Pending',
    position VARCHAR(100) DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("groupId", "userEmail")
  );
`).then(() => {
  console.log('Table created');
}).catch(console.error).finally(() => pool.end());
