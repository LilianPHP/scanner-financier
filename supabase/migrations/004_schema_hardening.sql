-- =====================================================
-- Senzio — schema hardening / production alignment
-- Makes the database match the current backend and frontend code.
-- Safe to run after older local schemas.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Transactions fields used by upload and Powens imports.
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS amount_original NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
    ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Rename legacy user_rules when present, otherwise create the expected table.
DO $$
BEGIN
    IF to_regclass('public.user_category_rules') IS NULL
       AND to_regclass('public.user_rules') IS NOT NULL THEN
        ALTER TABLE user_rules RENAME TO user_category_rules;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_category_rules (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label_pattern TEXT NOT NULL,
    category      TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_category_rules
    ADD COLUMN IF NOT EXISTS label_pattern TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'autres',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_category_rules'
          AND column_name = 'pattern'
    ) THEN
        UPDATE user_category_rules
        SET label_pattern = pattern
        WHERE label_pattern IS NULL;
    END IF;
END $$;

DELETE FROM user_category_rules
WHERE label_pattern IS NULL OR trim(label_pattern) = '';

ALTER TABLE user_category_rules
    ALTER COLUMN label_pattern SET NOT NULL,
    ALTER COLUMN category DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_category_rules_unique
    ON user_category_rules(user_id, label_pattern);

ALTER TABLE user_category_rules ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'user_category_rules'
          AND policyname = 'Users can only access their own rules'
    ) THEN
        CREATE POLICY "Users can only access their own rules"
            ON user_category_rules FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Frontend direct Supabase tables.
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_student      BOOLEAN NOT NULL DEFAULT FALSE,
    travels_often   BOOLEAN NOT NULL DEFAULT FALSE,
    has_children    BOOLEAN NOT NULL DEFAULT FALSE,
    has_pet         BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'user_profiles'
          AND policyname = 'Users can only access their own profile'
    ) THEN
        CREATE POLICY "Users can only access their own profile"
            ON user_profiles FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS goals (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    name       TEXT NOT NULL,
    icon       TEXT NOT NULL DEFAULT '✨',
    target     NUMERIC(12, 2) NOT NULL CHECK (target > 0),
    current    NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current >= 0),
    months     INTEGER NOT NULL DEFAULT 12 CHECK (months >= 0),
    status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'paused')),
    deadline   DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'goals'
          AND policyname = 'Users can only access their own goals'
    ) THEN
        CREATE POLICY "Users can only access their own goals"
            ON goals FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Powens connections. The service role writes this table; RLS protects clients.
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
    target_month         TEXT,
    last_synced_at       TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT bank_connections_target_month_format
        CHECK (target_month IS NULL OR target_month ~ '^[0-9]{4}-[0-9]{2}$')
);

ALTER TABLE bank_connections
    ADD COLUMN IF NOT EXISTS powens_connection_id TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS powens_user_token TEXT,
    ADD COLUMN IF NOT EXISTS institution_name TEXT NOT NULL DEFAULT 'Banque',
    ADD COLUMN IF NOT EXISTS institution_logo TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS period_months INTEGER NOT NULL DEFAULT 13,
    ADD COLUMN IF NOT EXISTS target_month TEXT,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bank_connections'
          AND policyname = 'Users can only access their own bank connections'
    ) THEN
        CREATE POLICY "Users can only access their own bank connections"
            ON bank_connections FOR ALL
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Persistent backend rate limiting, shared by all API instances.
CREATE TABLE IF NOT EXISTS rate_limit_events (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_user_action_created
    ON rate_limit_events(user_id, action, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'rate_limit_events'
          AND policyname = 'Users can only access their own rate events'
    ) THEN
        CREATE POLICY "Users can only access their own rate events"
            ON rate_limit_events FOR ALL
            USING (auth.uid() = user_id);
    END IF;
END $$;
