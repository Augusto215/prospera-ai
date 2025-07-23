
-- Tabela para armazenar recomendações da IA
CREATE TABLE IF NOT EXISTS goal_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    potential_savings NUMERIC(10,2) DEFAULT 0,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    category TEXT NOT NULL,
    is_applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    application_result JSONB,
    action_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para limites de orçamento criados pela IA
CREATE TABLE IF NOT EXISTS budget_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    monthly_limit NUMERIC(10,2) NOT NULL,
    current_spent NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_ai BOOLEAN DEFAULT FALSE,
    ai_recommendation_id UUID REFERENCES goal_recommendations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atualizar tabela de alertas para incluir campos da IA
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS ai_recommendation_id UUID REFERENCES goal_recommendations(id);

-- Atualizar tabela de metas financeiras para incluir campos da IA
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS ai_recommendation_id UUID REFERENCES goal_recommendations(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_goal_recommendations_user_id ON goal_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_recommendations_created_at ON goal_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_recommendations_is_applied ON goal_recommendations(is_applied);
CREATE INDEX IF NOT EXISTS idx_budget_limits_user_id ON budget_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_limits_category ON budget_limits(category);
CREATE INDEX IF NOT EXISTS idx_alerts_created_by_ai ON alerts(created_by_ai);
CREATE INDEX IF NOT EXISTS idx_financial_goals_created_by_ai ON financial_goals(created_by_ai);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goal_recommendations_updated_at 
    BEFORE UPDATE ON goal_recommendations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_limits_updated_at 
    BEFORE UPDATE ON budget_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Policies
ALTER TABLE goal_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;

-- Política para goal_recommendations
CREATE POLICY "Users can view their own recommendations" ON goal_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations" ON goal_recommendations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" ON goal_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para budget_limits
CREATE POLICY "Users can view their own budget limits" ON budget_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget limits" ON budget_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget limits" ON budget_limits
    FOR UPDATE USING (auth.uid() = user_id);