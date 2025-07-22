/*
  # Add bill-financial goal relationship

  1. New Columns
    - Add financial_goal_id and goal_contribution columns to bills table
    
  2. Changes
    - Allow bills to be linked to financial goals
    - Track recurring contributions to financial goals
*/

-- Add columns to link bills to financial goals
ALTER TABLE bills ADD COLUMN IF NOT EXISTS financial_goal_id uuid REFERENCES financial_goals(id) ON DELETE SET NULL;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_goal_contribution boolean DEFAULT false;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_bills_financial_goal ON bills(financial_goal_id) WHERE financial_goal_id IS NOT NULL;

-- Add function to create a recurring bill for a financial goal
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
    send_email_reminder
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
    true
  )
  RETURNING id INTO bill_id;
  
  RETURN bill_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_goal_contribution_bill(uuid, decimal, integer, date) TO authenticated;

-- Add function to update goal contribution bill
CREATE OR REPLACE FUNCTION update_goal_contribution_bill(
  goal_id uuid,
  monthly_amount decimal(12,2)
)
RETURNS boolean AS $$
DECLARE
  bill_record bills%ROWTYPE;
BEGIN
  -- Find the existing bill for this goal
  SELECT * INTO bill_record 
  FROM bills 
  WHERE financial_goal_id = goal_id AND is_goal_contribution = true
  LIMIT 1;
  
  -- If bill exists, update it
  IF bill_record IS NOT NULL THEN
    UPDATE bills
    SET amount = monthly_amount
    WHERE id = bill_record.id;
    
    RETURN true;
  END IF;
  
  -- Bill doesn't exist, return false
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_goal_contribution_bill(uuid, decimal) TO authenticated;

-- Function to handle goal completion or abandonment
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
DROP TRIGGER IF EXISTS goal_status_change_trigger ON financial_goals;
CREATE TRIGGER goal_status_change_trigger
  AFTER UPDATE OF status ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION handle_goal_status_change();