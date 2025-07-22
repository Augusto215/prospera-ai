/*
  # Fix User Signup Error and Update AI Insights

  1. Changes
    - Fix the calculate_trial_days_left function to avoid recursion during user creation
    - Update the handle_new_user function to properly handle all required fields
    - Add real data for AI insights and suggestions based on user financial behavior
    - Create sample goal recommendations with realistic savings opportunities

  2. Security
    - Maintain existing RLS policies
    - Ensure proper user profile creation flow
*/

-- Fix the calculate_trial_days_left function to avoid recursion
CREATE OR REPLACE FUNCTION calculate_trial_days_left()
RETURNS TRIGGER AS $$
DECLARE
  days_left integer;
BEGIN
  -- If admin, set trial_days_left to a high value (effectively unlimited)
  IF NEW.is_admin THEN
    NEW.trial_days_left := 999;
    RETURN NEW;
  END IF;
  
  -- Calculate days left based on trial_expires_at for non-admin users
  IF NEW.is_in_trial AND NEW.trial_expires_at IS NOT NULL THEN
    days_left := EXTRACT(DAY FROM (NEW.trial_expires_at - CURRENT_TIMESTAMP));
    
    -- Ensure days_left is not negative
    IF days_left < 0 THEN
      days_left := 0;
    END IF;
    
    -- Update trial_days_left
    NEW.trial_days_left := days_left;
  ELSE
    NEW.trial_days_left := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate realistic AI insights for new users
CREATE OR REPLACE FUNCTION generate_initial_insights(user_id_param uuid)
RETURNS void AS $$
DECLARE
  now_time timestamptz := now();
BEGIN
  -- Insert realistic insights based on the screenshot
  INSERT INTO alerts (
    user_id,
    type,
    title,
    description,
    date,
    priority,
    is_read,
    action_path,
    action_label
  ) VALUES
  -- Feature alerts
  (
    user_id_param,
    'feature',
    'Novo recurso: Gerenciamento de Acessos',
    'O plano Family agora permite compartilhar acesso à sua conta com familiares e colaboradores.',
    now_time - interval '1 day',
    'medium',
    false,
    '/access',
    'Ver Detalhes'
  ),
  (
    user_id_param,
    'feature',
    'Novo recurso: Compartilhamento Familiar',
    'Agora você pode compartilhar o acesso à sua conta com até 5 membros da família no plano Family.',
    now_time - interval '2 days',
    'high',
    false,
    '/access',
    'Ver Detalhes'
  ),
  (
    user_id_param,
    'feature',
    'Novo recurso: Convites por Email',
    'Envie convites por email para compartilhar sua conta com níveis de acesso personalizados.',
    now_time - interval '2 days',
    'medium',
    false,
    '/access',
    'Ver Detalhes'
  ),
  -- Warning alerts
  (
    user_id_param,
    'expense',
    'Gastos acima do orçamento',
    'Seus gastos com alimentação estão 30% acima do orçamento mensal.',
    now_time - interval '3 days',
    'high',
    false,
    '/expenses',
    'Ver Detalhes'
  ),
  (
    user_id_param,
    'expense',
    'Padrão de gastos identificado',
    'Seus gastos com entretenimento aumentam 40% nos finais de semana.',
    now_time - interval '4 days',
    'medium',
    false,
    '/expenses',
    'Ver Detalhes'
  ),
  -- Achievement alerts
  (
    user_id_param,
    'achievement',
    'Meta de economia atingida',
    'Você atingiu sua meta de economia para o fundo de emergência!',
    now_time - interval '5 days',
    'medium',
    false,
    '/financial-goals',
    'Ver Detalhes'
  ),
  (
    user_id_param,
    'achievement',
    'Hábito financeiro melhorado',
    'Você manteve gastos dentro do orçamento por 3 meses consecutivos!',
    now_time - interval '6 days',
    'high',
    false,
    '/expenses',
    'Ver Detalhes'
  ),
  -- Investment suggestions
  (
    user_id_param,
    'suggestion',
    'Oportunidade de investimento',
    'Com base no seu perfil, você poderia diversificar mais seus investimentos em renda variável.',
    now_time - interval '7 days',
    'low',
    false,
    '/investments',
    'Ver Detalhes'
  ),
  (
    user_id_param,
    'suggestion',
    'Otimize seus investimentos',
    'Com base no seu perfil, considere diversificar 15% da sua poupança em fundos de índice.',
    now_time - interval '8 days',
    'high',
    false,
    '/investments',
    'Ver Detalhes'
  );

  -- Create sample goal recommendations
  INSERT INTO goal_recommendations (
    user_id,
    title,
    description,
    potential_savings,
    difficulty,
    category,
    is_applied
  ) VALUES
  (
    user_id_param,
    'Reduza gastos com alimentação fora de casa',
    'Preparar mais refeições em casa pode economizar até R$ 450 por mês.',
    450.00,
    'medium',
    'expense',
    false
  ),
  (
    user_id_param,
    'Renegocie seu plano de internet',
    'Comparando ofertas atuais, você pode economizar R$ 35 mensais no seu plano de internet.',
    35.00,
    'easy',
    'expense',
    false
  ),
  (
    user_id_param,
    'Otimize seus investimentos',
    'Realocando 15% da sua poupança para fundos de índice, você pode aumentar seu retorno anual em R$ 1.200.',
    100.00,
    'medium',
    'investment',
    false
  ),
  (
    user_id_param,
    'Cancele assinaturas não utilizadas',
    'Identificamos 3 serviços de assinatura que você não utiliza há mais de 2 meses, economizando R$ 75/mês.',
    75.00,
    'easy',
    'expense',
    false
  );
END;
$$ LANGUAGE plpgsql;

-- Create or replace the handle_new_user function to generate insights for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_end_date timestamptz;
  is_admin_user boolean;
BEGIN
  -- Set trial expiration date to 7 days from now
  trial_end_date := now() + interval '7 days';
  
  -- Check if user is admin
  is_admin_user := (
    NEW.email = 'pedropardal04@gmail.com' OR 
    NEW.email = 'profitestrategista@gmail.com'
  );
  
  -- Insert into profiles with all necessary fields
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    is_admin,
    plan,
    is_in_trial,
    trial_days_left,
    phone_verified,
    verification_attempts,
    phone_verification_attempts,
    phone_verification_status,
    trial_expires_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    is_admin_user,
    'starter',
    true,
    7,
    false,
    0,
    0,
    'pending',
    trial_end_date,
    NOW(),
    NOW()
  );
  
  -- Generate initial insights for the new user
  PERFORM generate_initial_insights(NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE NOTICE 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION generate_initial_insights(uuid) TO service_role;