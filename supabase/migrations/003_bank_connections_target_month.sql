-- =====================================================
-- Add target_month column to bank_connections.
-- Lets users analyze a single specific month (YYYY-MM) instead of
-- a rolling N-month window. Reduces transactions to categorize → less
-- AI cost, faster sync.
-- =====================================================
ALTER TABLE bank_connections
    ADD COLUMN IF NOT EXISTS target_month TEXT;

-- Soft format check (NULL allowed, otherwise must look like YYYY-MM)
ALTER TABLE bank_connections
    DROP CONSTRAINT IF EXISTS bank_connections_target_month_format;

ALTER TABLE bank_connections
    ADD CONSTRAINT bank_connections_target_month_format
    CHECK (target_month IS NULL OR target_month ~ '^[0-9]{4}-[0-9]{2}$');
