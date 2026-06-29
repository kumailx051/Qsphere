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

ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS "communitySlug" VARCHAR(120);

INSERT INTO thread_communities (slug, name, description, color, "isDefault")
VALUES
  ('general-questions', 'General Questions', 'Ask broad questions and get help from the QSphere community.', '#2EC58A', TRUE),
  ('quantum-basics', 'Quantum Basics', 'Foundational questions around quantum mechanics and entry-level learning.', '#22c55e', TRUE),
  ('algorithms', 'Algorithms', 'Discuss quantum algorithms, complexity, and problem-solving strategies.', '#6366f1', TRUE),
  ('hardware', 'Hardware', 'Talk about devices, qubits, control systems, and physical implementations.', '#06b6d4', TRUE),
  ('careers', 'Careers', 'Ask about internships, jobs, applications, resumes, and research pathways.', '#f59e0b', TRUE),
  ('research-showcase', 'Research Showcase', 'Share experiments, findings, and active research progress.', '#ec4899', TRUE)
ON CONFLICT (slug) DO NOTHING;

UPDATE threads
SET "communitySlug" = CASE
  WHEN LOWER(COALESCE(tags, '')) LIKE '%career%' OR LOWER(COALESCE(tags, '')) LIKE '%job%' THEN 'careers'
  WHEN LOWER(COALESCE(tags, '')) LIKE '%algorithm%' THEN 'algorithms'
  WHEN LOWER(COALESCE(tags, '')) LIKE '%hardware%' THEN 'hardware'
  WHEN LOWER(COALESCE(tags, '')) LIKE '%research%' THEN 'research-showcase'
  WHEN LOWER(COALESCE(tags, '')) LIKE '%basic%' THEN 'quantum-basics'
  ELSE 'general-questions'
END
WHERE "communitySlug" IS NULL;

ALTER TABLE threads
  ALTER COLUMN "communitySlug" SET DEFAULT 'general-questions';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'threads_community_slug_fkey'
  ) THEN
    ALTER TABLE threads
      ADD CONSTRAINT threads_community_slug_fkey
      FOREIGN KEY ("communitySlug") REFERENCES thread_communities(slug) ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_threads_community_slug ON threads ("communitySlug");
