CREATE TABLE user_recommendation_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES goal_recommendations(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL, -- 'saved', 'viewed', 'dismissed', 'rated'
  interaction_value VARCHAR(10), -- 'up', 'down' para ratings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, recommendation_id, interaction_type)
);

-- Índices para performance
CREATE INDEX idx_user_recommendation_interactions_user_id ON user_recommendation_interactions(user_id);
CREATE INDEX idx_user_recommendation_interactions_rec_id ON user_recommendation_interactions(recommendation_id);

CREATE TABLE user_recommendation_relevance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES goal_recommendations(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 a 1.0
  is_dismissed BOOLEAN DEFAULT FALSE,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, recommendation_id)
);

-- Execute este bloco depois das tabelas
CREATE INDEX IF NOT EXISTS idx_user_recommendation_interactions_user_id 
ON user_recommendation_interactions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_recommendation_interactions_rec_id 
ON user_recommendation_interactions(recommendation_id);

CREATE INDEX IF NOT EXISTS idx_user_recommendation_interactions_user_type 
ON user_recommendation_interactions(user_id, interaction_type);

CREATE INDEX IF NOT EXISTS idx_user_recommendation_relevance_user_dismissed 
ON user_recommendation_relevance(user_id, is_dismissed);

CREATE INDEX IF NOT EXISTS idx_goal_recommendations_user_created 
ON goal_recommendations(user_id, created_at DESC);

-- Execute este bloco para criar a função principal
CREATE OR REPLACE FUNCTION get_relevant_recommendations_for_user(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  title TEXT,
  description TEXT,
  potential_savings INTEGER,
  priority TEXT,
  is_applied BOOLEAN,
  difficulty TEXT,
  category TEXT,
  action_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  relevance_score DECIMAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gr.id,
    gr.user_id,
    gr.type,
    gr.title,
    gr.description,
    gr.potential_savings,
    gr.priority,
    gr.is_applied,
    gr.difficulty,
    gr.category,
    gr.action_data,
    gr.created_at,
    COALESCE(urr.relevance_score, 1.0) as relevance_score
  FROM goal_recommendations gr
  LEFT JOIN user_recommendation_relevance urr 
    ON gr.id = urr.recommendation_id 
    AND urr.user_id = p_user_id
  WHERE 
    gr.user_id = p_user_id
    -- Não foi descartada pelo usuário
    AND COALESCE(urr.is_dismissed, false) = false
    -- Tem relevância mínima
    AND COALESCE(urr.relevance_score, 1.0) > 0.3
  ORDER BY 
    COALESCE(urr.relevance_score, 1.0) DESC,
    gr.potential_savings DESC,
    gr.created_at DESC
  LIMIT 20;
END;
$$;

-- Execute este bloco para criar a automação
CREATE OR REPLACE FUNCTION update_recommendation_relevance()
RETURNS TRIGGER AS $$
BEGIN
  -- Se usuário salvou a recomendação, aumenta relevância
  IF NEW.interaction_type = 'saved' THEN
    INSERT INTO user_recommendation_relevance (user_id, recommendation_id, relevance_score)
    VALUES (NEW.user_id, NEW.recommendation_id, 1.2)
    ON CONFLICT (user_id, recommendation_id) 
    DO UPDATE SET 
      relevance_score = LEAST(user_recommendation_relevance.relevance_score + 0.2, 1.0),
      calculated_at = NOW();
      
  -- Se usuário avaliou positivamente, aumenta um pouco
  ELSIF NEW.interaction_type = 'rated' AND NEW.interaction_value = 'up' THEN
    INSERT INTO user_recommendation_relevance (user_id, recommendation_id, relevance_score)
    VALUES (NEW.user_id, NEW.recommendation_id, 1.1)
    ON CONFLICT (user_id, recommendation_id) 
    DO UPDATE SET 
      relevance_score = LEAST(user_recommendation_relevance.relevance_score + 0.1, 1.0),
      calculated_at = NOW();
      
  -- Se usuário descartou, marca como dismissed
  ELSIF NEW.interaction_type = 'dismissed' THEN
    INSERT INTO user_recommendation_relevance (user_id, recommendation_id, relevance_score, is_dismissed)
    VALUES (NEW.user_id, NEW.recommendation_id, 0.0, true)
    ON CONFLICT (user_id, recommendation_id) 
    DO UPDATE SET 
      relevance_score = 0.0,
      is_dismissed = true,
      calculated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_update_recommendation_relevance ON user_recommendation_interactions;
CREATE TRIGGER trigger_update_recommendation_relevance
  AFTER INSERT OR UPDATE ON user_recommendation_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendation_relevance();


-- Execute este bloco para configurar segurança
-- Políticas para user_recommendation_interactions
ALTER TABLE user_recommendation_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own interactions" ON user_recommendation_interactions
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_recommendation_relevance
ALTER TABLE user_recommendation_relevance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relevance data" ON user_recommendation_relevance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage relevance data" ON user_recommendation_relevance
  FOR ALL USING (true); -- Permite que triggers funcionem