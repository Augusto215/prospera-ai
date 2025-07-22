/*
  # Create Smart Alerts System

  1. New Tables
    - `alerts` - Stores user-specific alerts and notifications
      - Support for different types (bill, employee, expense, achievement, tax)
      - Priority levels (high, medium, low)
      - Read/unread status tracking
      - Relation to specific entities (bills, employees, etc.)

  2. Security
    - Enable RLS on new table
    - Add policies for users to access only their own alerts
*/

-- Create alerts type enums
CREATE TYPE alert_type AS ENUM ('bill', 'employee', 'expense', 'achievement', 'tax', 'asset', 'investment');
CREATE TYPE alert_priority AS ENUM ('high', 'medium', 'low');

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type alert_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  priority alert_priority NOT NULL DEFAULT 'medium',
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid,
  related_entity text,
  action_path text,
  action_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access only their own alerts
CREATE POLICY "Users can manage their own alerts"
  ON alerts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_date ON alerts(date);
CREATE INDEX idx_alerts_priority ON alerts(priority);
CREATE INDEX idx_alerts_expires_at ON alerts(expires_at) WHERE expires_at IS NOT NULL;

-- Add related_entity column to bills table to associate with other entities
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS associated_with text,
ADD COLUMN IF NOT EXISTS associated_id uuid,
ADD COLUMN IF NOT EXISTS associated_name text;

-- Create function to generate alerts for bills due soon
CREATE OR REPLACE FUNCTION generate_bill_alerts()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val uuid;
  alert_id uuid;
  days_until_due integer;
  alert_priority alert_priority;
BEGIN
  SELECT user_id INTO user_id_val FROM bills WHERE id = NEW.id;
  
  -- Calculate days until due
  days_until_due := (NEW.next_due::date - CURRENT_DATE);
  
  -- Determine priority based on due date
  IF days_until_due <= 2 THEN
    alert_priority := 'high';
  ELSIF days_until_due <= 5 THEN
    alert_priority := 'medium';
  ELSE
    alert_priority := 'low';
  END IF;
  
  -- Only create alert for bills due within 7 days
  IF days_until_due <= 7 AND days_until_due >= 0 THEN
    -- First check if an alert already exists for this bill
    SELECT id INTO alert_id FROM alerts 
    WHERE related_id = NEW.id AND related_entity = 'bills' AND type = 'bill'
    LIMIT 1;
    
    -- If alert exists, update it
    IF alert_id IS NOT NULL THEN
      UPDATE alerts SET
        title = 'Conta a vencer: ' || NEW.name,
        description = NEW.company || ' - R$ ' || NEW.amount || ' - Vence em ' || days_until_due || ' ' || 
                     CASE WHEN days_until_due = 1 THEN 'dia' ELSE 'dias' END,
        date = NEW.next_due,
        priority = alert_priority,
        is_read = false
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
        action_label
      ) VALUES (
        user_id_val,
        'bill',
        'Conta a vencer: ' || NEW.name,
        NEW.company || ' - R$ ' || NEW.amount || ' - Vence em ' || days_until_due || ' ' || 
        CASE WHEN days_until_due = 1 THEN 'dia' ELSE 'dias' END,
        NEW.next_due,
        alert_priority,
        NEW.id,
        'bills',
        '/bills',
        'Ver Contas'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bill alerts
DROP TRIGGER IF EXISTS bills_alert_trigger ON bills;
CREATE TRIGGER bills_alert_trigger
  AFTER INSERT OR UPDATE OF next_due, amount, name, company
  ON bills
  FOR EACH ROW
  EXECUTE FUNCTION generate_bill_alerts();

-- Add function to handle employee vacation alerts
CREATE OR REPLACE FUNCTION generate_employee_alerts()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val uuid;
  alert_id uuid;
  days_until_vacation integer;
  alert_priority alert_priority;
BEGIN
  SELECT user_id INTO user_id_val FROM employees WHERE id = NEW.id;
  
  -- Only process if next_vacation is set
  IF NEW.next_vacation IS NOT NULL THEN
    -- Calculate days until vacation
    days_until_vacation := (NEW.next_vacation::date - CURRENT_DATE);
    
    -- Determine priority based on vacation date
    IF days_until_vacation <= 7 THEN
      alert_priority := 'high';
    ELSIF days_until_vacation <= 30 THEN
      alert_priority := 'medium';
    ELSE
      alert_priority := 'low';
    END IF;
    
    -- Handle upcoming vacations (next 30 days)
    IF days_until_vacation <= 30 AND days_until_vacation > 0 THEN
      -- Check if an alert already exists for this vacation
      SELECT id INTO alert_id FROM alerts 
      WHERE related_id = NEW.id AND related_entity = 'employees' AND type = 'employee'
      AND title LIKE 'Férias do funcionário%'
      LIMIT 1;
      
      -- If alert exists, update it
      IF alert_id IS NOT NULL THEN
        UPDATE alerts SET
          title = 'Férias do funcionário ' || NEW.name,
          description = 'Férias programadas para ' || to_char(NEW.next_vacation::date, 'DD/MM/YYYY') || 
                       ' (em ' || days_until_vacation || ' dias)',
          date = NEW.next_vacation,
          priority = alert_priority,
          is_read = false
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
          action_label
        ) VALUES (
          user_id_val,
          'employee',
          'Férias do funcionário ' || NEW.name,
          'Férias programadas para ' || to_char(NEW.next_vacation::date, 'DD/MM/YYYY') || 
          ' (em ' || days_until_vacation || ' dias)',
          NEW.next_vacation,
          alert_priority,
          NEW.id,
          'employees',
          '/employees',
          'Ver Funcionários'
        );
      END IF;
    -- Handle overdue vacations
    ELSIF days_until_vacation <= 0 THEN
      -- Check if an alert already exists for this overdue vacation
      SELECT id INTO alert_id FROM alerts 
      WHERE related_id = NEW.id AND related_entity = 'employees' AND type = 'employee'
      AND title LIKE 'Férias vencidas%'
      LIMIT 1;
      
      -- If alert exists, update it
      IF alert_id IS NOT NULL THEN
        UPDATE alerts SET
          description = 'As férias deste funcionário venceram em ' || 
                       to_char(NEW.next_vacation::date, 'DD/MM/YYYY'),
          is_read = false
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
          action_label
        ) VALUES (
          user_id_val,
          'employee',
          'Férias vencidas: ' || NEW.name,
          'As férias deste funcionário venceram em ' || 
          to_char(NEW.next_vacation::date, 'DD/MM/YYYY'),
          CURRENT_DATE,
          'high',
          NEW.id,
          'employees',
          '/employees',
          'Ver Funcionários'
        );
      END IF;
    END IF;
  END IF;
  
  -- Handle FGTS payments (due on the 7th of each month)
  IF EXTRACT(DAY FROM CURRENT_DATE) <= 7 THEN
    -- Calculate FGTS amount
    DECLARE
      fgts_amount numeric;
      fgts_date date;
      days_until_fgts integer;
    BEGIN
      fgts_amount := NEW.salary * NEW.fgts_percentage / 100;
      fgts_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, EXTRACT(MONTH FROM CURRENT_DATE)::integer, 7);
      days_until_fgts := (fgts_date - CURRENT_DATE);
      
      -- Check if an alert already exists for this FGTS payment
      SELECT id INTO alert_id FROM alerts 
      WHERE related_id = NEW.id AND related_entity = 'employees' AND type = 'tax'
      AND title LIKE 'Pagamento FGTS%' AND date::date = fgts_date
      LIMIT 1;
      
      -- If alert exists, update it
      IF alert_id IS NOT NULL THEN
        UPDATE alerts SET
          description = 'O FGTS vence em ' || days_until_fgts || ' ' || 
                       CASE WHEN days_until_fgts = 1 THEN 'dia' ELSE 'dias' END || 
                       ' (dia 7). Valor: R$ ' || fgts_amount,
          is_read = false
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
          action_label
        ) VALUES (
          user_id_val,
          'tax',
          'Pagamento FGTS ' || NEW.name,
          'O FGTS vence em ' || days_until_fgts || ' ' || 
          CASE WHEN days_until_fgts = 1 THEN 'dia' ELSE 'dias' END || 
          ' (dia 7). Valor: R$ ' || fgts_amount,
          fgts_date,
          CASE WHEN days_until_fgts <= 2 THEN 'high' ELSE 'medium' END,
          NEW.id,
          'employees',
          '/employees',
          'Ver Funcionários'
        );
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for employee alerts
DROP TRIGGER IF EXISTS employees_alert_trigger ON employees;
CREATE TRIGGER employees_alert_trigger
  AFTER INSERT OR UPDATE OF next_vacation, salary, fgts_percentage, name
  ON employees
  FOR EACH ROW
  EXECUTE FUNCTION generate_employee_alerts();

-- Function to clean up expired alerts
CREATE OR REPLACE FUNCTION cleanup_expired_alerts()
RETURNS void AS $$
BEGIN
  -- Delete alerts that have expired
  DELETE FROM alerts WHERE expires_at IS NOT NULL AND expires_at < now();
  
  -- Mark old alerts as read automatically after 14 days
  UPDATE alerts SET is_read = true 
  WHERE is_read = false AND created_at < (now() - interval '14 days');
END;
$$ LANGUAGE plpgsql;

-- Schedule the cleanup function to run daily (this would typically be done with a cron job)
-- For Supabase, you would configure this outside of the migration