/*
  # Add Bill Payment Tracking and Status Updates

  1. New Columns
    - `payment_status` - Status of the bill (pending, paid, overdue)
    - `payment_date` - Date when the bill was paid
    - `payment_amount` - Amount that was actually paid
    - `payment_method` - Method used for payment
    - `send_email_reminder` - Flag to send email reminder for this bill
    
  2. Changes
    - Add new columns to the bills table for better bill tracking
    - Create indexes for performance improvements
    - Add email notification preferences
*/

-- Add new columns to bills table for payment tracking
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'partial'));
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_amount decimal(12,2);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS send_email_reminder boolean DEFAULT true;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS reminder_days_before integer DEFAULT 3;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_next_due ON bills(next_due);
CREATE INDEX IF NOT EXISTS idx_bills_payment_date ON bills(payment_date) WHERE payment_date IS NOT NULL;

-- Add function to mark a bill as paid
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
  
  RETURN true;
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

-- Function to update bill status based on due date
CREATE OR REPLACE FUNCTION update_bill_payment_status()
RETURNS void AS $$
BEGIN
  -- Update overdue bills
  UPDATE bills
  SET payment_status = 'overdue'
  WHERE 
    payment_status = 'pending' AND
    next_due < CURRENT_DATE AND
    is_active = true;
    
  -- Reset status for recurring bills that were paid but now have a new due date
  UPDATE bills
  SET payment_status = 'pending'
  WHERE 
    payment_status = 'paid' AND
    next_due < CURRENT_DATE AND
    is_active = true AND
    is_recurring = true AND
    payment_date < (next_due - interval '25 days');
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_bill_as_paid(uuid, date, decimal, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_multiple_bills_as_paid(uuid[], date) TO authenticated;

-- Set up nightly job to update bill statuses (would typically be done via cron)
-- This is just a placeholder comment - you would need to set up an actual scheduled job
-- COMMENT ON FUNCTION update_bill_payment_status() IS 'Run this nightly to update bill payment statuses';