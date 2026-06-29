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
