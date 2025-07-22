-- Create financial_goals table if it doesn't exist
CREATE TABLE IF NOT EXISTS financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount decimal(12,2) NOT NULL,
  current_amount decimal(12,2) NOT NULL DEFAULT 0,
  target_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('travel', 'business', 'wealth', 'home', 'education', 'other')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'))
);

-- Enable Row Level Security
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Check if the policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_goals' 
    AND policyname = 'Users can manage their own financial goals'
  ) THEN
    CREATE POLICY "Users can manage their own financial goals"
      ON financial_goals
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);
CREATE INDEX IF NOT EXISTS idx_financial_goals_target_date ON financial_goals(target_date);

-- Create goal_contributions table to track individual contributions
CREATE TABLE IF NOT EXISTS goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  contribution_date timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Enable Row Level Security
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

-- Check if the policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_contributions' 
    AND policyname = 'Users can manage their own goal contributions'
  ) THEN
    CREATE POLICY "Users can manage their own goal contributions"
      ON goal_contributions
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON goal_contributions(user_id);

-- Add columns to bills table for integration with financial goals if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'financial_goal_id') THEN
    ALTER TABLE bills ADD COLUMN financial_goal_id uuid REFERENCES financial_goals(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'is_goal_contribution') THEN
    ALTER TABLE bills ADD COLUMN is_goal_contribution boolean DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bills_financial_goal ON bills(financial_goal_id) WHERE financial_goal_id IS NOT NULL;

-- Create function to handle goal completion or abandonment
CREATE OR REPLACE FUNCTION handle_goal_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If goal status changed to completed or abandoned
  IF NEW.status IN ('completed', 'abandoned') AND 
     (OLD.status IS NULL OR OLD.status = 'active') THEN
    
    -- Deactivate any associated bills
    UPDATE bills
    SET is_active = false
    WHERE financial_goal_id = NEW.id AND is_goal_contribution = true;
    
  -- If goal reactivated
  ELSIF NEW.status = 'active' AND 
        (OLD.status IS NULL OR OLD.status IN ('completed', 'abandoned')) THEN
    
    -- Reactivate any associated bills
    UPDATE bills
    SET is_active = true
    WHERE financial_goal_id = NEW.id AND is_goal_contribution = true;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger first if it exists to avoid errors
DROP TRIGGER IF EXISTS goal_status_change_trigger ON financial_goals;

-- Create trigger for goal status changes
CREATE TRIGGER goal_status_change_trigger
  AFTER UPDATE OF status ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION handle_goal_status_change();

-- Create goal recommendations table
CREATE TABLE IF NOT EXISTS goal_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES financial_goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  potential_savings decimal(12,2) NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category text NOT NULL,
  is_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE goal_recommendations ENABLE ROW LEVEL SECURITY;

-- Check if the policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_recommendations' 
    AND policyname = 'Users can manage their own goal recommendations'
  ) THEN
    CREATE POLICY "Users can manage their own goal recommendations"
      ON goal_recommendations
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goal_recommendations_user_id ON goal_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_recommendations_goal_id ON goal_recommendations(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_recommendations_is_applied ON goal_recommendations(is_applied);