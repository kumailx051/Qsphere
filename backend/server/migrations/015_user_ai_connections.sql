CREATE TABLE IF NOT EXISTS user_ai_connections (
  id SERIAL PRIMARY KEY,
  "userEmail" VARCHAR(255) NOT NULL REFERENCES users("emailAddress") ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  "apiKey" TEXT NOT NULL,
  model VARCHAR(255) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userEmail", provider)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_connections_user_email
  ON user_ai_connections ("userEmail");
