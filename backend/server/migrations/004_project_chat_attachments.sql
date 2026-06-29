ALTER TABLE project_chat
  ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;

ALTER TABLE project_chat
  ADD COLUMN IF NOT EXISTS "attachmentType" VARCHAR(20);

ALTER TABLE project_chat
  ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;

ALTER TABLE project_chat
  ADD COLUMN IF NOT EXISTS "attachmentMimeType" VARCHAR(255);

ALTER TABLE project_chat
  ADD COLUMN IF NOT EXISTS "attachmentSizeBytes" BIGINT;
