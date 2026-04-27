-- =====================================================
-- Scanner Financier — Migration initiale
-- À exécuter dans l'éditeur SQL de Supabase
-- =====================================================

-- Extension UUID (déjà activée par défaut sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table : uploaded_files
-- =====================================================
CREATE TABLE IF NOT EXISTS uploaded_files (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    file_type   TEXT NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes par utilisateur
CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);

-- Row Level Security (RLS) — chaque user ne voit que ses fichiers
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own files"
    ON uploaded_files FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- Table : transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id     UUID NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    label_raw   TEXT NOT NULL,
    label_clean TEXT NOT NULL,
    amount      NUMERIC(12, 2) NOT NULL,
    amount_original NUMERIC(12, 2),
    currency    TEXT NOT NULL DEFAULT 'EUR',
    direction   TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    category    TEXT NOT NULL DEFAULT 'autres',
    subcategory TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes courantes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_file_id ON transactions(file_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own transactions"
    ON transactions FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- Table : analysis_results
-- =====================================================
CREATE TABLE IF NOT EXISTS analysis_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id         UUID NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    income_total    NUMERIC(12, 2) DEFAULT 0,
    expense_total   NUMERIC(12, 2) DEFAULT 0,
    cashflow        NUMERIC(12, 2) DEFAULT 0,
    savings_rate    NUMERIC(6, 2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own analysis"
    ON analysis_results FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- Table : user_category_rules (corrections manuelles persistantes)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_category_rules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label_pattern TEXT NOT NULL,
    category    TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, label_pattern)
);

-- RLS
ALTER TABLE user_category_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own rules"
    ON user_category_rules FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- Table : user_profiles (onboarding et préférences)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_student     BOOLEAN NOT NULL DEFAULT FALSE,
    travels_often  BOOLEAN NOT NULL DEFAULT FALSE,
    has_children   BOOLEAN NOT NULL DEFAULT FALSE,
    has_pet        BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own profile"
    ON user_profiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Table : goals (objectifs d'épargne)
-- =====================================================
CREATE TABLE IF NOT EXISTS goals (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    name        TEXT NOT NULL,
    icon        TEXT NOT NULL DEFAULT '✨',
    target      NUMERIC(12, 2) NOT NULL CHECK (target > 0),
    current     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current >= 0),
    months      INTEGER NOT NULL DEFAULT 12 CHECK (months >= 0),
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'paused')),
    deadline    DATE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own goals"
    ON goals FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Table : bank_connections (Open Banking Powens)
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
    target_month         TEXT,
    last_synced_at       TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT bank_connections_target_month_format
        CHECK (target_month IS NULL OR target_month ~ '^[0-9]{4}-[0-9]{2}$')
);

CREATE INDEX idx_bank_connections_user_id ON bank_connections(user_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own bank connections"
    ON bank_connections FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- Table : rate_limit_events (quotas backend persistants)
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limit_events (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_events_user_action_created
    ON rate_limit_events(user_id, action, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own rate events"
    ON rate_limit_events FOR ALL
    USING (auth.uid() = user_id);
