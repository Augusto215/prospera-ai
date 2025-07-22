/*
  # Create Bill Alert System

  1. New Functions
    - `schedule_bill_alert` - Function to automatically schedule alerts for bills
    - `update_bill_alert_status` - Function to update alert status when bills are paid
    
  2. New Triggers
    - Add trigger to automatically create alerts when bills are created or updated
    - Add trigger to update alerts when bills are paid
    
  3. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Create function to schedule alerts for bills
CREATE OR REPLACE FUNCTION schedule_bill_alert()
RETURNS TRIGGER AS $$
DECLARE
  alert_id uuid;
  days_until_due integer;
  alert_priority alert_priority;
  alert_title text;
  alert_description text;
  alert_date date;
BEGIN
  -- Calculate days until due
  days_until_due := (NEW.next_due::date - CURRENT_DATE);
  
  -- Only create alert if due date is in the future and within reminder days
  IF days_until_due >= 0 AND days_until_due <= COALESCE(NEW.reminder_days_before, 3) THEN
    -- Determine priority based on due date
    IF days_until_due <= 1 THEN
      alert_priority := 'high';
    ELSIF days_until_due <= 3 THEN
      alert_priority := 'medium';
    ELSE
      alert_priority := 'low';
    END IF;
    
    -- Create alert title and description
    alert_title := 'Conta a vencer: ' || NEW.name;
    alert_description := NEW.company || ' - R$ ' || NEW.amount || ' - Vence ' || 
                        CASE 
                          WHEN days_until_due = 0 THEN 'hoje'
                          WHEN days_until_due = 1 THEN 'amanhã'
                          ELSE 'em ' || days_until_due || ' dias'
                        END;
    
    -- Set alert date to one day before due date
    alert_date := (NEW.next_due::date - interval '1 day')::date;
    
    -- Check if an alert already exists for this bill
    SELECT id INTO alert_id FROM alerts 
    WHERE related_id = NEW.id AND related_entity = 'bills' AND type = 'bill'
    LIMIT 1;
    
    -- If alert exists, update it
    IF alert_id IS NOT NULL THEN
      UPDATE alerts SET
        title = alert_title,
        description = alert_description,
        date = alert_date,
        priority = alert_priority,
        is_read = false,
        expires_at = NEW.next_due + interval '1 day'
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
        NEW.user_id,
        'bill',
        alert_title,
        alert_description,
        alert_date,
        alert_priority,
        NEW.id,
        'bills',
        '/bills',
        'Ver Contas',
        NEW.next_due + interval '1 day'
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent bill creation/update
    RAISE LOG 'Error scheduling bill alert: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bill alerts
DROP TRIGGER IF EXISTS schedule_bill_alert_trigger ON bills;
CREATE TRIGGER schedule_bill_alert_trigger
  AFTER INSERT OR UPDATE OF next_due, amount, name, company, due_day
  ON bills
  FOR EACH ROW
  WHEN (NEW.is_active = true AND NEW.payment_status != 'paid')
  EXECUTE FUNCTION schedule_bill_alert();

-- Create function to update alert status when bill is paid
CREATE OR REPLACE FUNCTION update_bill_alert_status()
RETURNS TRIGGER AS $$
DECLARE
  alert_id uuid;
BEGIN
  -- Only proceed if payment status changed to paid
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Find related alert
    SELECT id INTO alert_id FROM alerts 
    WHERE related_id = NEW.id AND related_entity = 'bills' AND type = 'bill'
    LIMIT 1;
    
    -- If alert exists, mark as read
    IF alert_id IS NOT NULL THEN
      UPDATE alerts SET
        is_read = true
      WHERE id = alert_id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent bill update
    RAISE LOG 'Error updating bill alert status: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating alert status
DROP TRIGGER IF EXISTS update_bill_alert_status_trigger ON bills;
CREATE TRIGGER update_bill_alert_status_trigger
  AFTER UPDATE OF payment_status
  ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_alert_status();

-- Create function to mark bill as paid and update alert
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
    
    -- Schedule alert for the next due date
    PERFORM schedule_bill_alert_for_id(bill_id);
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
BEGIN
  -- Get the bill record
  SELECT * INTO bill_record FROM bills WHERE id = bill_id;
  
  -- Only proceed if bill exists and is active
  IF bill_record IS NOT NULL AND bill_record.is_active THEN
    -- Create a temporary record to pass to the trigger function
    PERFORM schedule_bill_alert_direct(bill_record);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error scheduling bill alert for ID %: %', bill_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to directly schedule an alert for a bill (without trigger)
CREATE OR REPLACE FUNCTION schedule_bill_alert_direct(bill_record bills)
RETURNS void AS $$
DECLARE
  alert_id uuid;
  days_until_due integer;
  alert_priority alert_priority;
  alert_title text;
  alert_description text;
  alert_date date;
BEGIN
  -- Calculate days until due
  days_until_due := (bill_record.next_due::date - CURRENT_DATE);
  
  -- Only create alert if due date is in the future and within reminder days
  IF days_until_due >= 0 AND days_until_due <= COALESCE(bill_record.reminder_days_before, 3) THEN
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
    
    -- Set alert date to one day before due date
    alert_date := (bill_record.next_due::date - interval '1 day')::date;
    
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
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent bill creation/update
    RAISE LOG 'Error scheduling bill alert directly: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_bill_as_paid_with_alert(uuid, date, decimal, text) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_bill_alert_for_id(uuid) TO authenticated;

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
    PERFORM schedule_bill_alert_direct(bill_record);
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error updating all bill alerts: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_all_bill_alerts() TO authenticated;