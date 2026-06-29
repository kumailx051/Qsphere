-- QSphere manual database setup
-- Run the CREATE DATABASE statement from an admin database such as postgres.

CREATE DATABASE qsphere;

-- After creating the database, connect to qsphere and run the table queries below.

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
  "updated_at" TIMESTAMPTZ,
  "parentId" INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
  "commenterEmail" VARCHAR(255),
  "heartedBy" JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_reports (
  id SERIAL PRIMARY KEY,
  "blogId" INTEGER REFERENCES blogs(id) ON DELETE SET NULL,
  "blogTitle" TEXT NOT NULL,
  "blogAuthorEmail" VARCHAR(255),
  "reportedByEmail" VARCHAR(255) REFERENCES users("emailAddress") ON DELETE SET NULL,
  "reportedByName" VARCHAR(255) NOT NULL,
  reason VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  "adminAction" VARCHAR(30) NOT NULL DEFAULT 'none',
  "adminNote" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "reviewedByEmail" VARCHAR(255) REFERENCES users("emailAddress") ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("blogId", "reportedByEmail")
);
CREATE INDEX IF NOT EXISTS idx_blog_reports_status ON blog_reports (status);
CREATE INDEX IF NOT EXISTS idx_blog_reports_blog_id ON blog_reports ("blogId");
CREATE INDEX IF NOT EXISTS idx_blog_reports_created_at ON blog_reports (created_at DESC);

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
  "completedAt" TIMESTAMPTZ,
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
  "reviewRemarks" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "reviewedByEmail" VARCHAR(255) REFERENCES users("emailAddress") ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type VARCHAR(100) DEFAULT 'Event',
  date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  audience TEXT,
  deadline DATE,
  description TEXT,
  "ownerEmail" VARCHAR(255),
  "ownerName" VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_owner_email ON events ("ownerEmail");
CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);

CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type VARCHAR(100) DEFAULT 'Opportunity',
  location VARCHAR(100),
  deadline DATE,
  contact TEXT NOT NULL,
  requirements TEXT,
  description TEXT,
  "ownerEmail" VARCHAR(255),
  "ownerName" VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_owner_email ON positions ("ownerEmail");
CREATE INDEX IF NOT EXISTS idx_positions_deadline ON positions (deadline);

CREATE TABLE IF NOT EXISTS event_applicants (
  id SERIAL PRIMARY KEY,
  "eventId" INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  "fullName" VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100) NOT NULL,
  affiliation TEXT NOT NULL,
  "roleTitle" VARCHAR(255),
  location VARCHAR(255),
  "profileUrl" TEXT,
  expectations TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("eventId", email)
);

CREATE INDEX IF NOT EXISTS idx_event_applicants_event_id ON event_applicants ("eventId");
CREATE INDEX IF NOT EXISTS idx_event_applicants_email ON event_applicants (email);

CREATE TABLE IF NOT EXISTS position_applicants (
  id SERIAL PRIMARY KEY,
  "positionId" INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  "fullName" VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  "currentRole" VARCHAR(255),
  organization VARCHAR(255),
  "linkedinUrl" TEXT,
  "portfolioUrl" TEXT,
  availability VARCHAR(255),
  "yearsExperience" VARCHAR(255),
  skills JSONB DEFAULT '[]'::jsonb,
  motivation TEXT NOT NULL,
  "resumeFileName" TEXT,
  "resumeFileUrl" TEXT,
  "resumeSummary" TEXT,
  "resumeAutofillUsed" BOOLEAN DEFAULT FALSE,
  "decisionStatus" VARCHAR(20) DEFAULT 'pending',
  "interviewDate" DATE,
  "interviewTime" VARCHAR(100),
  "interviewLocation" TEXT,
  "decisionNote" TEXT,
  "decisionSentAt" TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("positionId", email)
);
CREATE INDEX IF NOT EXISTS idx_position_applicants_position_id ON position_applicants ("positionId");
CREATE INDEX IF NOT EXISTS idx_position_applicants_email ON position_applicants (email);

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
  "projectId" INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_chat (
  id SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "senderEmail" VARCHAR(255),
  "recipientEmail" VARCHAR(255),
  "conversationType" VARCHAR(20) DEFAULT 'channel',
  message TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentType" VARCHAR(20),
  "attachmentName" TEXT,
  "attachmentMimeType" VARCHAR(255),
  "attachmentSizeBytes" BIGINT,
  "editedAt" TIMESTAMPTZ,
  "editedByEmail" VARCHAR(255),
  "deletedAt" TIMESTAMPTZ,
  "deletedByEmail" VARCHAR(255),
  "deletedForEveryone" BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_chat_project_conversation_created ON project_chat ("projectId", "conversationType", created_at);
CREATE INDEX IF NOT EXISTS idx_project_chat_recipient_email ON project_chat ("recipientEmail");

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

CREATE TABLE IF NOT EXISTS project_chat_reactions (
  id SERIAL PRIMARY KEY,
  "messageId" INTEGER NOT NULL REFERENCES project_chat(id) ON DELETE CASCADE,
  "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  emoji VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("messageId", "userEmail")
);

CREATE INDEX IF NOT EXISTS idx_project_chat_reactions_message_id
  ON project_chat_reactions ("messageId");
CREATE TABLE IF NOT EXISTS thread_communities (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color VARCHAR(32) NOT NULL DEFAULT '#2EC58A',
  "createdByEmail" VARCHAR(255) REFERENCES users("emailAddress") ON DELETE SET NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Threads / Q&A tables (Reddit-style discussion)
CREATE TABLE IF NOT EXISTS threads (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  "authorEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  "authorName" VARCHAR(255) NOT NULL DEFAULT '',
  tags TEXT DEFAULT '',
  "communitySlug" VARCHAR(120) NOT NULL DEFAULT 'general-questions' REFERENCES thread_communities(slug) ON DELETE RESTRICT,
  "upvoteCount" INTEGER DEFAULT 0,
  "downvoteCount" INTEGER DEFAULT 0,
  "replyCount" INTEGER DEFAULT 0,
  "isPinned" BOOLEAN DEFAULT FALSE,
  "isLocked" BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_threads_author_email ON threads ("authorEmail");
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_upvote_count ON threads ("upvoteCount" DESC);

CREATE TABLE IF NOT EXISTS thread_votes (
  id SERIAL PRIMARY KEY,
  "threadId" INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("threadId", "userEmail")
);

CREATE INDEX IF NOT EXISTS idx_thread_votes_thread_id ON thread_votes ("threadId");

CREATE TABLE IF NOT EXISTS thread_replies (
  id SERIAL PRIMARY KEY,
  "threadId" INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  "parentId" INTEGER REFERENCES thread_replies(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  "authorEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  "authorName" VARCHAR(255) NOT NULL DEFAULT '',
  "upvoteCount" INTEGER DEFAULT 0,
  "downvoteCount" INTEGER DEFAULT 0,
  "isAcceptedAnswer" BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_thread_replies_thread_id ON thread_replies ("threadId");
CREATE INDEX IF NOT EXISTS idx_thread_replies_parent_id ON thread_replies ("parentId");

CREATE TABLE IF NOT EXISTS thread_reply_votes (
  id SERIAL PRIMARY KEY,
  "replyId" INTEGER NOT NULL REFERENCES thread_replies(id) ON DELETE CASCADE,
  "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("replyId", "userEmail")
);

CREATE INDEX IF NOT EXISTS idx_thread_reply_votes_reply_id ON thread_reply_votes ("replyId");

INSERT INTO thread_communities (slug, name, description, color, "isDefault")
VALUES
  ('general-questions', 'General Questions', 'Ask broad questions and get help from the QSphere community.', '#2EC58A', TRUE),
  ('quantum-basics', 'Quantum Basics', 'Foundational questions around quantum mechanics and entry-level learning.', '#22c55e', TRUE),
  ('algorithms', 'Algorithms', 'Discuss quantum algorithms, complexity, and problem-solving strategies.', '#6366f1', TRUE),
  ('hardware', 'Hardware', 'Talk about devices, qubits, control systems, and physical implementations.', '#06b6d4', TRUE),
  ('careers', 'Careers', 'Ask about internships, jobs, applications, resumes, and research pathways.', '#f59e0b', TRUE),
  ('research-showcase', 'Research Showcase', 'Share experiments, findings, and active research progress.', '#ec4899', TRUE)
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_threads_community_slug ON threads ("communitySlug");

-- Admin user bootstrap
-- Change the values below before running this query to create a real admin account.
-- Replace 'QSphere Administrator' with the real admin name.
-- Replace 'admin@qsphere.com' in BOTH places below with the real admin email.
-- Replace 'ChangeMe123!' with a temporary password the admin will use for first login.
-- The admin will receive an OTP on that email, verify it, then be forced to set a new password.
-- If that email already belongs to a normal user account, use a different email instead.
-- pgcrypto is used to produce the SHA-256 password format expected by the backend.
-- The first successful login sends an OTP and then forces a new password.
-- If this email already belongs to a regular user, the query stops instead of
-- silently converting that account into an administrator.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE LOWER("emailAddress") = LOWER('admin@qsphere.com')
      AND LOWER(COALESCE(role, 'user')) <> 'admin'
  ) THEN
    RAISE EXCEPTION 'Email already exists as a user. Change the administrator email.';
  END IF;

  INSERT INTO users (
    "fullName",
    "emailAddress",
    password,
    role,
    "isVerified",
    "isOnboarded",
    "isActive",
    "mustChangePassword",
    updated_at
  )
  VALUES (
    'QSphere Administrator',
    'admin@qsphere.com',
    encode(digest('ChangeMe123!', 'sha256'), 'hex'),
    'admin',
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    NOW()
  )
  ON CONFLICT ("emailAddress") DO UPDATE SET
    "fullName" = EXCLUDED."fullName",
    password = EXCLUDED.password,
    "isVerified" = FALSE,
    "isOnboarded" = TRUE,
    "isActive" = TRUE,
    "mustChangePassword" = TRUE,
    updated_at = NOW()
  WHERE LOWER(COALESCE(users.role, '')) = 'admin';
END
$$;
