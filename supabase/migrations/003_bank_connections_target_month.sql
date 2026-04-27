-- =====================================================
-- Add target_month column to bank_connections.
-- Lets users analyze a single specific month (YYYY-MM) instead of
-- a rolling N-month window. Reduces transactions to categorize → less
-- AI cost, faster sync.
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_connections (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    powens_connection_id TEXT NOT NULL,
    powens_user_token    TEXT NOT NULL,
    institution_name     TEXT NOT NULL DEFAULT 'Banque',
    institution_logo     TEXT NOT NULL DEFAULT '',
    status               TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'syncing', 'active', 'error')),
    file_id              UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
    period_months        INTEGER NOT NULL DEFAULT 13 CHECK (period_months BETWEEN 1 AND 24),
    last_synced_at       TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_connections
    ADD COLUMN IF NOT EXISTS target_month TEXT;

-- Soft format check (NULL allowed, otherwise must look like YYYY-MM)
ALTER TABLE bank_connections
    DROP CONSTRAINT IF EXISTS bank_connections_target_month_format;

ALTER TABLE bank_connections
    ADD CONSTRAINT bank_connections_target_month_format
    CHECK (target_month IS NULL OR target_month ~ '^[0-9]{4}-[0-9]{2}$');
