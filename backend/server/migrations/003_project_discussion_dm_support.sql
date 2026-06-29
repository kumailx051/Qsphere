ALTER TABLE project_chat
  ADD COLUMN IF NOT EXISTS "recipientEmail" VARCHAR(255);

ALTER TABLE project_chat
  ADD COLUMN IF NOT EXISTS "conversationType" VARCHAR(20) DEFAULT 'channel';

UPDATE project_chat
SET "conversationType" = 'channel'
WHERE "conversationType" IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_chat_project_conversation_created
  ON project_chat ("projectId", "conversationType", created_at);

CREATE INDEX IF NOT EXISTS idx_project_chat_recipient_email
  ON project_chat ("recipientEmail");
