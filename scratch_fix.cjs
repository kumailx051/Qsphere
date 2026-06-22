const fs = require('fs');
let content = fs.readFileSync('backend/server/index.js', 'utf8');

const regex = /\/\/ Create blogs table[\s\S]*?\/\/ Ensure groups table exists/m;

const replacement = `// Create blogs table
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS blogs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      excerpt TEXT,
      "blogData" TEXT,
      "coverImage" TEXT,
      category VARCHAR(100),
      author VARCHAR(255),
      "authorEmail" VARCHAR(255),
      "readingTime" VARCHAR(50),
      "dateOfPublish" TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  \`)

  // Create blog_categories table
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  \`)

  // Create blog_comments table
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS blog_comments (
      id SERIAL PRIMARY KEY,
      "blogId" INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      name VARCHAR(255),
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  \`)

  await pool.query('ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "parentId" INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE')
  await pool.query('ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "commenterEmail" VARCHAR(255)')
  await pool.query('ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "heartedBy" JSONB DEFAULT \\'[]\\'::jsonb')

  await pool.query(\`
    CREATE TABLE IF NOT EXISTS group_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  \`)

  // Ensure groups table exists`;

content = content.replace(regex, replacement);
fs.writeFileSync('backend/server/index.js', content);
console.log('Fixed backend/server/index.js');
