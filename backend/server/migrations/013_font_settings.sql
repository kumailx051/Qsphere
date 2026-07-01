CREATE TABLE IF NOT EXISTS font_settings (
  id SERIAL PRIMARY KEY,
  "fontFamily" VARCHAR(100) NOT NULL DEFAULT 'default',
  "sizeScales" JSONB NOT NULL DEFAULT '{}',
  "updatedBy" VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_font_settings_updated_by ON font_settings ("updatedBy");
