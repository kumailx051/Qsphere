ALTER TABLE position_applicants
ADD COLUMN IF NOT EXISTS "decisionStatus" VARCHAR(20) DEFAULT 'pending';

ALTER TABLE position_applicants
ADD COLUMN IF NOT EXISTS "interviewDate" DATE;

ALTER TABLE position_applicants
ADD COLUMN IF NOT EXISTS "interviewTime" VARCHAR(100);

ALTER TABLE position_applicants
ADD COLUMN IF NOT EXISTS "interviewLocation" TEXT;

ALTER TABLE position_applicants
ADD COLUMN IF NOT EXISTS "decisionNote" TEXT;

ALTER TABLE position_applicants
ADD COLUMN IF NOT EXISTS "decisionSentAt" TIMESTAMPTZ;
