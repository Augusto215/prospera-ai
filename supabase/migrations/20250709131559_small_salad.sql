/*
  # Add Financial Goals Table

  1. New Tables
    - `financial_goals` - Stores user financial goals
      - Support for different goal types (travel, business, wealth, home, education, other)
      - Progress tracking with current and target amounts
      - Target dates and priority levels
      - Status tracking (active, completed, abandoned)

  2. Security
    - Enable RLS on new table
    - Add policies for users to access only their own goals
*/

-- Create financial_goals table
CREATE TABLE IF NOT EXISTS financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Create policy for users to access only their own goals
CREATE POLICY "Users can manage their own financial goals"
  ON financial_goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX idx_financial_goals_status ON financial_goals(status);
CREATE INDEX idx_financial_goals_target_date ON financial_goals(target_date);

-- Create goal_contributions table to track individual contributions
CREATE TABLE IF NOT EXISTS goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES financial_goals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(12,2) NOT NULL,
  contribution_date timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Enable Row Level Security
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access only their own contributions
CREATE POLICY "Users can manage their own goal contributions"
  ON goal_contributions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_user_id ON goal_contributions(user_id);

-- Create goal_recommendations table to track AI recommendations for goals
CREATE TABLE IF NOT EXISTS goal_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Create policy for users to access only their own recommendations
CREATE POLICY "Users can manage their own goal recommendations"
  ON goal_recommendations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_goal_recommendations_user_id ON goal_recommendations(user_id);
CREATE INDEX idx_goal_recommendations_goal_id ON goal_recommendations(goal_id);
CREATE INDEX idx_goal_recommendations_is_applied ON goal_recommendations(is_applied);