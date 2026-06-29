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

ALTER TABLE events ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT 'Event';
ALTER TABLE events ADD COLUMN IF NOT EXISTS audience TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "ownerEmail" VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS "ownerName" VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

ALTER TABLE positions ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT 'Opportunity';
ALTER TABLE positions ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS requirements TEXT;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS "ownerEmail" VARCHAR(255);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS "ownerName" VARCHAR(255);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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
