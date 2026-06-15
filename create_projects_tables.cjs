const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'qsphere',
  user: 'postgres',
  password: 'kumail123'
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        "groupId" INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "ownerEmail" VARCHAR(255) REFERENCES users("emailAddress") ON DELETE CASCADE,
        "startDate" DATE,
        "dueDate" DATE,
        status VARCHAR(50) DEFAULT 'Planning',
        "referenceMaterialUrl" TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS project_tasks (
        id SERIAL PRIMARY KEY,
        "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        "taskName" VARCHAR(255) NOT NULL,
        "taskType" VARCHAR(100),
        "startDate" DATE,
        "targetDate" DATE,
        details TEXT,
        "referenceMaterialUrl" TEXT,
        "assignedToEmail" VARCHAR(255) REFERENCES users("emailAddress") ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_submissions (
        id SERIAL PRIMARY KEY,
        "taskId" INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
        "submittedByEmail" VARCHAR(255) REFERENCES users("emailAddress") ON DELETE CASCADE,
        "fileUrl" TEXT,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'Review',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS project_chat (
        id SERIAL PRIMARY KEY,
        "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        "senderEmail" VARCHAR(255) REFERENCES users("emailAddress") ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("All project tables created successfully!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    pool.end();
  }
}

run();
