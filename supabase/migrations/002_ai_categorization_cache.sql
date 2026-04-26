-- =====================================================
-- Table : ai_categorization_cache
-- Persistent cache for Claude AI fallback categorization.
-- Globally shared across users — labels are merchant strings,
-- not personal data. Service role only (RLS denies clients).
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_categorization_cache (
    label_normalized TEXT PRIMARY KEY,
    category         TEXT NOT NULL,
    hits             INTEGER DEFAULT 1,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_updated_at
    ON ai_categorization_cache(updated_at DESC);

-- RLS — only the backend (service role) reads/writes this table.
-- No client-side access whatsoever.
ALTER TABLE ai_categorization_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only"
    ON ai_categorization_cache FOR ALL
    USING (false);
