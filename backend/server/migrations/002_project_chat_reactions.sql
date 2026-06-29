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
