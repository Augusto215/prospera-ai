/*
  # Fix Bill Alerts Integration

  1. New Functions
    - `mark_bill_as_paid_with_alert` - Function to mark a bill as paid and update alert status
    - `schedule_bill_alert_for_id` - Function to manually schedule an alert for a specific bill
    - `update_all_bill_alerts` - Function to update all bill alerts at once

  2. Changes
    - Fix bill alert scheduling to properly handle due dates
    - Ensure alerts are properly marked as read when bills are paid
    - Add support for generating alerts on demand
*/

-- Create function to mark bill as paid with alert handling
CREATE OR REPLACE FUNCTION mark_bill_as_paid_with_alert(
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

-- Function to schedule alert for a specific bill
CREATE OR REPLACE FUNCTION schedule_bill_alert_for_id(bill_id uuid)
RETURNS void AS $$
DECLARE
  bill_record bills%ROWTYPE;
  alert_id uuid;
  days_until_due integer;
  alert_priority alert_priority;
  alert_title text;
  alert_description text;
  alert_date date;
BEGIN
  -- Get the bill record
  SELECT * INTO bill_record FROM bills WHERE id = bill_id;
  
  -- Only proceed if bill exists and is active
  IF bill_record IS NULL OR NOT bill_record.is_active THEN
    RETURN;
  END IF;
  
  -- Calculate days until due
  days_until_due := (bill_record.next_due::date - CURRENT_DATE);
  
  -- Determine priority based on due date
  IF days_until_due <= 1 THEN
    alert_priority := 'high';
  ELSIF days_until_due <= 3 THEN
    alert_priority := 'medium';
  ELSE
    alert_priority := 'low';
  END IF;
  
  -- Create alert title and description
  alert_title := 'Conta a vencer: ' || bill_record.name;
  alert_description := bill_record.company || ' - R$ ' || bill_record.amount || ' - Vence ' || 
                    CASE 
                      WHEN days_until_due = 0 THEN 'hoje'
                      WHEN days_until_due = 1 THEN 'amanhã'
                      ELSE 'em ' || days_until_due || ' dias'
                    END;
  
  -- Set alert date to one day before due date or today if due date is today/tomorrow
  IF days_until_due <= 1 THEN
    alert_date := CURRENT_DATE;
  ELSE
    alert_date := (bill_record.next_due::date - interval '1 day')::date;
  END IF;
  
  -- Check if an alert already exists for this bill
  SELECT id INTO alert_id FROM alerts 
  WHERE related_id = bill_record.id AND related_entity = 'bills' AND type = 'bill'
  LIMIT 1;
  
  -- If alert exists, update it
  IF alert_id IS NOT NULL THEN
    UPDATE alerts SET
      title = alert_title,
      description = alert_description,
      date = alert_date,
      priority = alert_priority,
      is_read = false,
      expires_at = bill_record.next_due + interval '1 day'
    WHERE id = alert_id;
  -- Otherwise create a new alert
  ELSE
    INSERT INTO alerts (
      user_id, 
      type, 
      title, 
      description, 
      date, 
      priority,
      related_id,
      related_entity,
      action_path,
      action_label,
      expires_at
    ) VALUES (
      bill_record.user_id,
      'bill',
      alert_title,
      alert_description,
      alert_date,
      alert_priority,
      bill_record.id,
      'bills',
      '/bills',
      'Ver Contas',
      bill_record.next_due + interval '1 day'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error scheduling bill alert for ID %: %', bill_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create function to update all bill alerts
CREATE OR REPLACE FUNCTION update_all_bill_alerts()
RETURNS void AS $$
DECLARE
  bill_record bills%ROWTYPE;
BEGIN
  -- Loop through all active bills
  FOR bill_record IN 
    SELECT * FROM bills 
    WHERE is_active = true AND payment_status != 'paid'
  LOOP
    -- Schedule alert for each bill
    PERFORM schedule_bill_alert_for_id(bill_record.id);
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error updating all bill alerts: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_bill_as_paid_with_alert(uuid, date, decimal, text) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_bill_alert_for_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_bill_alerts() TO authenticated;