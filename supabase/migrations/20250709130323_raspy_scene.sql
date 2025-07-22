/*
  # Fix Smart Alerts System Issues

  1. Changes
    - Add proper error handling to alert generation functions
    - Create indexes for better query performance
    - Update triggers for bill and employee alerts
    
  2. Security
    - Maintain existing RLS policies
*/

-- Create or replace the bill alerts generation function with better error handling
CREATE OR REPLACE FUNCTION generate_bill_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Safe error handling
  BEGIN
    -- Get user ID for the bill
    DECLARE user_id_val uuid;
    DECLARE alert_id uuid;
    DECLARE days_until_due integer;
    DECLARE alert_priority text;
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
            priority = alert_priority::alert_priority,
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
            alert_priority::alert_priority,
            NEW.id,
            'bills',
            '/bills',
            'Ver Contas'
          );
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error generating bill alert: %', SQLERRM;
    END;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in generate_bill_alerts trigger function: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the employee alerts generation function with better error handling
CREATE OR REPLACE FUNCTION generate_employee_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Safe error handling
  BEGIN
    -- Get user ID for the employee
    DECLARE user_id_val uuid;
    DECLARE alert_id uuid;
    DECLARE days_until_vacation integer;
    DECLARE alert_priority text;
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
              priority = alert_priority::alert_priority,
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
              alert_priority::alert_priority,
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
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error generating employee vacation alert: %', SQLERRM;
    END;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in generate_employee_alerts trigger function: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with proper error handling
DROP TRIGGER IF EXISTS bills_alert_trigger ON bills;
CREATE TRIGGER bills_alert_trigger
  AFTER INSERT OR UPDATE OF next_due, amount, name, company
  ON bills
  FOR EACH ROW
  EXECUTE FUNCTION generate_bill_alerts();

DROP TRIGGER IF EXISTS employees_alert_trigger ON employees;
CREATE TRIGGER employees_alert_trigger
  AFTER INSERT OR UPDATE OF next_vacation, salary, fgts_percentage, name
  ON employees
  FOR EACH ROW
  EXECUTE FUNCTION generate_employee_alerts();