CREATE TABLE IF NOT EXISTS threads (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  "authorEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  "authorName" VARCHAR(255) NOT NULL DEFAULT '',
  tags TEXT DEFAULT '',
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
