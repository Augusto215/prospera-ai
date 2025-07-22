/*
  # Add AI Insights Function

  1. New Functions
    - `generate_ai_insights` - Function to analyze user data and generate personalized insights
    - Adds support for analyzing transactions, investments, bills, and other financial data
    
  2. Security
    - Grant execute permissions to authenticated users
    - Ensure proper access control
*/

-- Create function to generate AI insights based on user data
CREATE OR REPLACE FUNCTION generate_ai_insights(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  insights jsonb;
  now_time timestamptz := now();
  transactions_count integer;
  investments_count integer;
  bills_count integer;
  goals_count integer;
  score integer := 70; -- Base score
BEGIN
  -- Get counts of various financial data
  SELECT count(*) INTO transactions_count FROM transactions WHERE user_id = user_id_param;
  SELECT count(*) INTO investments_count FROM investments WHERE user_id = user_id_param;
  SELECT count(*) INTO bills_count FROM bills WHERE user_id = user_id_param;
  SELECT count(*) INTO goals_count FROM financial_goals WHERE user_id = user_id_param;
  
  -- Adjust score based on financial activity
  score := score + LEAST(transactions_count / 5, 5); -- Up to 5 points for transactions
  score := score + LEAST(investments_count * 2, 10); -- Up to 10 points for investments
  score := score + LEAST(bills_count, 5); -- Up to 5 points for bills
  score := score + LEAST(goals_count * 2, 10); -- Up to 10 points for goals
  
  -- Get insights from alerts table
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', CASE 
        WHEN type = 'bill' OR type = 'expense' OR type = 'tax' THEN 'warning'
        WHEN type = 'achievement' THEN 'achievement'
        WHEN type = 'investment' OR type = 'asset' THEN 'suggestion'
        ELSE 'feature'
      END,
      'title', title,
      'description', description,
      'impact', priority,
      'date', date,
      'action_path', action_path,
      'action_label', action_label
    )
  )
  INTO insights
  FROM alerts
  WHERE user_id = user_id_param
  ORDER BY 
    CASE priority 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      ELSE 3 
    END,
    date DESC
  LIMIT 10;
  
  -- If no insights found, generate some default ones
  IF insights IS NULL THEN
    insights := jsonb_build_array(
      jsonb_build_object(
        'id', 'default-1',
        'type', 'feature',
        'title', 'Novo recurso: Gerenciamento de Acessos',
        'description', 'O plano Family agora permite compartilhar acesso à sua conta com familiares e colaboradores.',
        'impact', 'high',
        'date', now_time
      ),
      jsonb_build_object(
        'id', 'default-2',
        'type', 'suggestion',
        'title', 'Otimize seus investimentos',
        'description', 'Com base no seu perfil, considere diversificar sua carteira para reduzir riscos.',
        'impact', 'medium',
        'date', now_time
      )
    );
  END IF;
  
  -- Return insights and score
  RETURN jsonb_build_object(
    'insights', insights,
    'score', LEAST(score, 100) -- Cap score at 100
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_ai_insights(uuid) TO authenticated;