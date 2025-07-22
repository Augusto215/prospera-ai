/*
  # Add Financial Goals and Goal Contribution System

  1. New Tables
    - `financial_goals` - Store user financial goals with target and current amounts
    - `goal_contributions` - Track individual contributions to goals
    - `goal_recommendations` - Store AI recommendations to help achieve goals

  2. Bill Integration
    - Add columns to bills table to link with financial goals
    - Create functions to handle bill payments as goal contributions
    - Implement triggers to update goal progress automatically

  3. Security
    - Enable RLS on all new tables
    - Create policies to ensure users only access their own data
*/

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
  goal_id uuid NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Add columns to bills table for integration with financial goals
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS financial_goal_id uuid REFERENCES financial_goals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_goal_contribution boolean DEFAULT false;

-- Create index for better performance
CREATE INDEX idx_bills_financial_goal ON bills(financial_goal_id) WHERE financial_goal_id IS NOT NULL;

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

-- Create trigger for goal status changes
CREATE TRIGGER goal_status_change_trigger
  AFTER UPDATE OF status ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION handle_goal_status_change();

-- Function to update bill payment to contribute to a financial goal
CREATE OR REPLACE FUNCTION mark_bill_as_paid_with_goal(
  bill_id uuid,
  payment_date_val date DEFAULT CURRENT_DATE,
  payment_amount_val decimal(12,2) DEFAULT NULL,
  payment_method_val text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  bill_record bills%ROWTYPE;
  next_due_date date;
  goal_id uuid;
BEGIN
  -- Get the bill record
  SELECT * INTO bill_record FROM bills WHERE id = bill_id;
  
  -- Return false if bill not found
  IF bill_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Use bill amount if payment amount not provided
  payment_amount_val := COALESCE(payment_amount_val, bill_record.amount);
  
  -- Set payment status based on amount paid
  UPDATE bills SET
    payment_status = CASE 
      WHEN payment_amount_val >= bill_record.amount THEN 'paid'
      ELSE 'partial'
    END,
    payment_date = payment_date_val,
    payment_amount = payment_amount_val,
    payment_method = payment_method_val,
    last_paid = payment_date_val
  WHERE id = bill_id;
  
  -- If this is a recurring bill, update the next due date
  IF bill_record.is_recurring THEN
    -- Calculate next due date based on current due day
    next_due_date := make_date(
      EXTRACT(YEAR FROM payment_date_val)::int,
      CASE 
        WHEN EXTRACT(DAY FROM payment_date_val)::int >= bill_record.due_day THEN
          EXTRACT(MONTH FROM payment_date_val)::int + 1
        ELSE
          EXTRACT(MONTH FROM payment_date_val)::int
      END,
      bill_record.due_day
    );
    
    -- Handle month overflow
    IF EXTRACT(MONTH FROM next_due_date) <> 
       (CASE 
          WHEN EXTRACT(DAY FROM payment_date_val)::int >= bill_record.due_day THEN
            MOD(EXTRACT(MONTH FROM payment_date_val)::int, 12) + 1
          ELSE
            EXTRACT(MONTH FROM payment_date_val)::int
        END) THEN
      -- Use last day of month
      next_due_date := (date_trunc('month', next_due_date) + interval '1 month - 1 day')::date;
    END IF;
    
    -- Handle year overflow
    IF EXTRACT(MONTH FROM next_due_date) < EXTRACT(MONTH FROM payment_date_val)::int THEN
      next_due_date := make_date(
        EXTRACT(YEAR FROM payment_date_val)::int + 1,
        EXTRACT(MONTH FROM next_due_date)::int,
        EXTRACT(DAY FROM next_due_date)::int
      );
    END IF;
    
    -- Update next due date
    UPDATE bills SET
      next_due = next_due_date
    WHERE id = bill_id;
  END IF;
  
  -- If the bill is linked to a financial goal, add contribution
  IF bill_record.financial_goal_id IS NOT NULL AND bill_record.is_goal_contribution THEN
    goal_id := bill_record.financial_goal_id;
    
    -- Add the contribution
    INSERT INTO goal_contributions (
      goal_id,
      user_id,
      amount,
      contribution_date,
      notes
    ) VALUES (
      goal_id,
      bill_record.user_id,
      payment_amount_val,
      payment_date_val,
      'Contribuição via pagamento de conta'
    );
    
    -- Update the goal progress
    UPDATE financial_goals
    SET 
      current_amount = current_amount + payment_amount_val,
      updated_at = now(),
      -- If goal reached, mark as completed
      status = CASE 
        WHEN (current_amount + payment_amount_val) >= target_amount THEN 'completed'
        ELSE status
      END
    WHERE id = goal_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to create recurring bill for goal contribution
CREATE OR REPLACE FUNCTION create_goal_contribution_bill(
  goal_id uuid,
  monthly_amount decimal(12,2),
  due_day integer DEFAULT 5,
  start_date date DEFAULT CURRENT_DATE
)
RETURNS uuid AS $$
DECLARE
  bill_id uuid;
  goal_record financial_goals%ROWTYPE;
  bill_name text;
  bill_next_due date;
BEGIN
  -- Get the goal record
  SELECT * INTO goal_record FROM financial_goals WHERE id = goal_id;
  
  -- Return null if goal not found
  IF goal_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create bill name
  bill_name := 'Meta: ' || goal_record.name;
  
  -- Calculate next due date
  bill_next_due := make_date(
    EXTRACT(YEAR FROM start_date)::int,
    EXTRACT(MONTH FROM start_date)::int,
    due_day
  );
  
  -- If due day has passed for this month, move to next month
  IF EXTRACT(DAY FROM start_date)::int > due_day THEN
    bill_next_due := bill_next_due + interval '1 month';
  END IF;
  
  -- Insert the bill
  INSERT INTO bills (
    user_id,
    name,
    company,
    amount,
    due_day,
    category,
    is_recurring,
    is_active,
    next_due,
    financial_goal_id,
    is_goal_contribution,
    send_email_reminder,
    payment_status
  ) VALUES (
    goal_record.user_id,
    bill_name,
    'Meta Financeira',
    monthly_amount,
    due_day,
    'Investimentos',
    true,
    true,
    bill_next_due,
    goal_id,
    true,
    true,
    'pending'
  )
  RETURNING id INTO bill_id;
  
  RETURN bill_id;
END;
$$ LANGUAGE plpgsql;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_bill_as_paid_with_goal(uuid, date, decimal, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_goal_contribution_bill(uuid, decimal, integer, date) TO authenticated;