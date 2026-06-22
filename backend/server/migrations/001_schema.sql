CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "fullName" VARCHAR(255) NOT NULL,
  "emailAddress" VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "profileImage" TEXT,
  role VARCHAR(50),
  gender VARCHAR(50),
  "cellMain" VARCHAR(50),
  "cellAlternative" VARCHAR(50),
  cnic VARCHAR(50),
  "passportNo" VARCHAR(50),
  "dateOfBirth" VARCHAR(50),
  city VARCHAR(100),
  address TEXT,
  institute VARCHAR(255),
  degree VARCHAR(255),
  semester VARCHAR(50),
  majors VARCHAR(255),
  interests TEXT,
  "referralId" VARCHAR(50),
  discipline VARCHAR(255),
  "dateOfGraduation" VARCHAR(50),
  organization VARCHAR(255),
  "jobDescription" TEXT,
  "roleTitle" VARCHAR(255),
  qualification VARCHAR(255),
  experience VARCHAR(255),
  designation VARCHAR(255),
  post VARCHAR(255),
  "researchInterest" TEXT,
  "researchFocus" VARCHAR(255),
  "isVerified" BOOLEAN DEFAULT FALSE,
  "isOnboarded" BOOLEAN DEFAULT FALSE,
  "isActive" BOOLEAN DEFAULT TRUE,
  "mustChangePassword" BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS pending_registrations (
  "emailAddress" VARCHAR(255) PRIMARY KEY,
  "fullName" VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  "emailAddress" VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_email_address ON otps ("emailAddress");

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
);

CREATE TABLE IF NOT EXISTS blog_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_comments (
  id SERIAL PRIMARY KEY,
  "blogId" INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  name VARCHAR(255),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "parentId" INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE;
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "commenterEmail" VARCHAR(255);
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS "heartedBy" JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS group_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  "groupType" VARCHAR(255) NOT NULL,
  "groupTitle" VARCHAR(255) NOT NULL,
  "groupDescription" TEXT,
  "groupScope" TEXT,
  "ownerEmail" VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  "groupId" INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'Pending',
  position VARCHAR(100) DEFAULT 'Member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("groupId", "userEmail")
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  "groupId" INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  "ownerEmail" VARCHAR(255),
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
  "assignedToEmail" VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_submissions (
  id SERIAL PRIMARY KEY,
  "taskId" INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  "submittedByEmail" VARCHAR(255),
  "fileUrl" TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Review',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "recipientEmail" VARCHAR(255) NOT NULL,
  "linkUrl" TEXT,
  "blogId" INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
  "commentId" INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
  "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  "memberEmail" VARCHAR(255),
  "isRead" BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "linkUrl" TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "blogId" INTEGER REFERENCES blogs(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "commentId" INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "groupId" INTEGER REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "memberEmail" VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "projectId" INTEGER REFERENCES projects(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS project_chat (
  id SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "senderEmail" VARCHAR(255),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMPTZ;
ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "editedByEmail" VARCHAR(255);
ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "deletedByEmail" VARCHAR(255);
ALTER TABLE project_chat ADD COLUMN IF NOT EXISTS "deletedForEveryone" BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS project_chat_hidden (
  id SERIAL PRIMARY KEY,
  "messageId" INTEGER NOT NULL REFERENCES project_chat(id) ON DELETE CASCADE,
  "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  "hiddenAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("messageId", "userEmail")
);

CREATE TABLE IF NOT EXISTS project_chat_reads (
  id SERIAL PRIMARY KEY,
  "messageId" INTEGER NOT NULL REFERENCES project_chat(id) ON DELETE CASCADE,
  "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  "readAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("messageId", "userEmail")
);
