CREATE TABLE IF NOT EXISTS font_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  "fontFamily" VARCHAR(100) NOT NULL DEFAULT 'default',
  "sizeScales" JSONB NOT NULL DEFAULT '{}',
  "createdBy" VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_font_templates_created_by ON font_templates ("createdBy");
