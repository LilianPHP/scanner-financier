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
    direction   TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    category    TEXT NOT NULL DEFAULT 'autres',
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
-- Table : user_rules (corrections manuelles persistantes)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_rules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern     TEXT NOT NULL,
    category    TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pattern)
);

-- RLS
ALTER TABLE user_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own rules"
    ON user_rules FOR ALL
    USING (auth.uid() = user_id);
