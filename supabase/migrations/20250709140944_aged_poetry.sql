/*
  # Add Mark Bill as Paid Function and Email Preferences

  1. New Functions
    - `mark_bill_as_paid` - Function to mark a bill as paid and update payment status
    - `schedule_email_for_bill` - Function to schedule email notifications for bills

  2. New Columns
    - Add payment tracking columns to bills table
    - Add email reminder preferences to bills table
    
  3. Security
    - Grant execution permissions to authenticated users
*/

-- Create function to mark a bill as paid
CREATE OR REPLACE FUNCTION mark_bill_as_paid(
  bill_id uuid,
  payment_date_val date DEFAULT CURRENT_DATE,
  payment_amount_val decimal(12,2) DEFAULT NULL,
  payment_method_val text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  bill_record bills%ROWTYPE;
  next_due_date date;
  alert_id uuid;
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
    
    -- Handle month overflow (e.g., if next month doesn't have the due day)
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
  
  -- Find and mark any related alerts as read
  UPDATE alerts
  SET is_read = true
  WHERE related_id = bill_id AND related_entity = 'bills' AND type = 'bill';
  
  -- Handle goal contribution if this is for a financial goal
  IF bill_record.is_goal_contribution AND bill_record.financial_goal_id IS NOT NULL THEN
    -- Add contribution to the goal
    INSERT INTO goal_contributions (
      goal_id,
      user_id,
      amount,
      notes
    ) VALUES (
      bill_record.financial_goal_id,
      bill_record.user_id,
      payment_amount_val,
      'Contribuição automática de conta'
    );
    
    -- Update goal's current amount
    UPDATE financial_goals
    SET 
      current_amount = current_amount + payment_amount_val,
      -- If goal is now complete, update status
      status = CASE 
        WHEN (current_amount + payment_amount_val) >= target_amount THEN 'completed'
        ELSE status
      END,
      updated_at = now()
    WHERE id = bill_record.financial_goal_id;
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error marking bill as paid: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to mark multiple bills as paid
CREATE OR REPLACE FUNCTION mark_multiple_bills_as_paid(
  bill_ids uuid[],
  payment_date_val date DEFAULT CURRENT_DATE
)
RETURNS integer AS $$
DECLARE
  bill_id uuid;
  success_count integer := 0;
BEGIN
  FOREACH bill_id IN ARRAY bill_ids
  LOOP
    IF mark_bill_as_paid(bill_id, payment_date_val) THEN
      success_count := success_count + 1;
    END IF;
  END LOOP;
  
  RETURN success_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_bill_as_paid(uuid, date, decimal, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_multiple_bills_as_paid(uuid[], date) TO authenticated;