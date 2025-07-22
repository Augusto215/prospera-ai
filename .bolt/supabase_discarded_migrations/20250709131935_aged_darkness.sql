/*
  # Add Email Notifications for Alerts

  1. New Tables
    - `alert_notification_settings` - User preferences for email notifications
      - Controls which alert types trigger emails
      - Frequency settings (immediate, daily digest, weekly digest)
    
  2. New Columns
    - Add `email_sent` flag to existing alerts table
    - Add `notification_email` field to alerts for additional recipients
    
  3. New Functions
    - `schedule_email_notification()` - Prepares alert data for email sending
    - `send_scheduled_email_notifications()` - Background process to send pending emails
    - Enhance existing alert trigger functions to schedule emails
*/

-- Add email notification settings table
CREATE TABLE IF NOT EXISTS alert_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  bill_alerts_enabled boolean NOT NULL DEFAULT true,
  employee_alerts_enabled boolean NOT NULL DEFAULT true,
  expense_alerts_enabled boolean NOT NULL DEFAULT true,
  achievement_alerts_enabled boolean NOT NULL DEFAULT true,
  tax_alerts_enabled boolean NOT NULL DEFAULT true,
  asset_alerts_enabled boolean NOT NULL DEFAULT true,
  investment_alerts_enabled boolean NOT NULL DEFAULT true,
  notification_frequency text NOT NULL DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),
  notification_time time DEFAULT '08:00:00',
  last_notification_sent timestamptz,
  notification_email text, -- Additional email for notifications (optional)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE alert_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access only their own notification settings
CREATE POLICY "Users can manage their own notification settings"
  ON alert_notification_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add email notification tracking to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS email_scheduled_at timestamptz;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

-- Create table for scheduled email notifications
CREATE TABLE IF NOT EXISTS scheduled_email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_ids uuid[] NOT NULL,
  email_to text NOT NULL,
  email_subject text NOT NULL,
  email_body text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE scheduled_email_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access only their own scheduled notifications
CREATE POLICY "Users can view their own scheduled notifications"
  ON scheduled_email_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for service role to manage scheduled notifications
CREATE POLICY "Service role can manage scheduled notifications"
  ON scheduled_email_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to schedule email notification for a new alert
CREATE OR REPLACE FUNCTION schedule_alert_email_notification()
RETURNS TRIGGER AS $$
DECLARE
  settings alert_notification_settings%ROWTYPE;
  user_email text;
  notification_email text;
  alert_subject text;
  alert_body text;
  should_send boolean;
BEGIN
  -- Get user notification settings
  SELECT * INTO settings FROM alert_notification_settings 
  WHERE user_id = NEW.user_id
  LIMIT 1;
  
  -- Create default settings if none exist
  IF settings IS NULL THEN
    INSERT INTO alert_notification_settings (user_id)
    VALUES (NEW.user_id)
    RETURNING * INTO settings;
  END IF;
  
  -- Check if email notifications are enabled for this alert type
  should_send := settings.email_notifications_enabled AND
    CASE NEW.type
      WHEN 'bill' THEN settings.bill_alerts_enabled
      WHEN 'employee' THEN settings.employee_alerts_enabled
      WHEN 'expense' THEN settings.expense_alerts_enabled
      WHEN 'achievement' THEN settings.achievement_alerts_enabled
      WHEN 'tax' THEN settings.tax_alerts_enabled
      WHEN 'asset' THEN settings.asset_alerts_enabled
      WHEN 'investment' THEN settings.investment_alerts_enabled
      ELSE false
    END;
    
  -- Only proceed if notifications are enabled
  IF should_send THEN
    -- Get user's email
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
    
    -- Use additional notification email if set
    notification_email := COALESCE(settings.notification_email, user_email);
    
    -- Prepare email subject and body
    alert_subject := 'PROSPERA.AI - ' || 
      CASE NEW.type
        WHEN 'bill' THEN 'Alerta de Conta a Vencer'
        WHEN 'employee' THEN 'Alerta de Funcionário'
        WHEN 'expense' THEN 'Alerta de Gasto'
        WHEN 'achievement' THEN 'Conquista Financeira'
        WHEN 'tax' THEN 'Alerta de Imposto'
        WHEN 'asset' THEN 'Alerta de Ativo'
        WHEN 'investment' THEN 'Alerta de Investimento'
        ELSE 'Alerta'
      END;
    
    alert_body := 'Olá,

Um novo alerta foi gerado pelo PROSPERA.AI:

' || NEW.title || '

' || NEW.description || '

Data: ' || to_char(NEW.date, 'DD/MM/YYYY') || '

Prioridade: ' || 
      CASE NEW.priority
        WHEN 'high' THEN 'Alta'
        WHEN 'medium' THEN 'Média'
        WHEN 'low' THEN 'Baixa'
      END || '

Acesse a plataforma para mais detalhes: https://prospera.ai' || 
      CASE WHEN NEW.action_path IS NOT NULL THEN NEW.action_path ELSE '' END;
    
    -- For immediate notifications, schedule right away
    IF settings.notification_frequency = 'immediate' THEN
      -- Mark alert as scheduled for email
      NEW.email_scheduled_at := now();
      
      -- Insert into scheduled notifications
      INSERT INTO scheduled_email_notifications (
        user_id, 
        alert_ids, 
        email_to, 
        email_subject, 
        email_body
      ) VALUES (
        NEW.user_id,
        ARRAY[NEW.id],
        notification_email,
        alert_subject,
        alert_body
      );
    END IF;
    
    -- For daily/weekly digests, the alerts will be collected by a scheduled job
    -- We just need to mark them as not sent yet
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent alert creation
    RAISE LOG 'Error scheduling email notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for email notification scheduling
CREATE TRIGGER schedule_alert_email_notification_trigger
  AFTER INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION schedule_alert_email_notification();

-- Function to generate daily digest emails
CREATE OR REPLACE FUNCTION generate_daily_email_digests()
RETURNS void AS $$
DECLARE
  user_rec RECORD;
  user_alerts RECORD;
  alert_ids uuid[];
  email_subject text;
  email_body text;
  alert_count integer;
  notification_email text;
BEGIN
  -- Find users with daily digest settings who haven't received notification today
  FOR user_rec IN 
    SELECT ans.user_id, ans.notification_email, u.email as user_email
    FROM alert_notification_settings ans
    JOIN auth.users u ON ans.user_id = u.id
    WHERE 
      ans.email_notifications_enabled = true AND
      ans.notification_frequency = 'daily' AND
      (
        ans.last_notification_sent IS NULL OR
        (ans.last_notification_sent AT TIME ZONE 'UTC')::date < (now() AT TIME ZONE 'UTC')::date
      )
  LOOP
    -- Collect alerts for this user that haven't been sent via email
    SELECT array_agg(id) INTO alert_ids
    FROM alerts
    WHERE 
      user_id = user_rec.user_id AND
      email_sent = false AND
      created_at >= (now() - interval '1 day');
    
    -- Only proceed if there are alerts to send
    IF alert_ids IS NOT NULL AND array_length(alert_ids, 1) > 0 THEN
      -- Count alerts
      SELECT count(*) INTO alert_count FROM unnest(alert_ids) AS a;
      
      -- Determine email to use
      notification_email := COALESCE(user_rec.notification_email, user_rec.user_email);
      
      -- Prepare email subject and body
      email_subject := 'PROSPERA.AI - Resumo Diário de Alertas';
      
      email_body := 'Olá,

Segue o resumo diário dos seus alertas na PROSPERA.AI:

';

      -- Add each alert to the email body
      FOR user_alerts IN
        SELECT title, description, date, priority, action_path
        FROM alerts
        WHERE id = ANY(alert_ids)
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            ELSE 3 
          END,
          date ASC
      LOOP
        email_body := email_body || '
- ' || user_alerts.title || ' 
  ' || user_alerts.description || '
  Data: ' || to_char(user_alerts.date, 'DD/MM/YYYY') || '
  Prioridade: ' || 
          CASE user_alerts.priority
            WHEN 'high' THEN 'Alta'
            WHEN 'medium' THEN 'Média'
            ELSE 'Baixa'
          END || '
';
      END LOOP;
      
      email_body := email_body || '

Acesse a plataforma para mais detalhes: https://prospera.ai/smart-alerts

';

      -- Schedule the email notification
      INSERT INTO scheduled_email_notifications (
        user_id,
        alert_ids,
        email_to,
        email_subject,
        email_body
      ) VALUES (
        user_rec.user_id,
        alert_ids,
        notification_email,
        email_subject,
        email_body
      );
      
      -- Update alerts to mark them as scheduled
      UPDATE alerts
      SET email_scheduled_at = now()
      WHERE id = ANY(alert_ids);
      
      -- Update the last notification timestamp
      UPDATE alert_notification_settings
      SET 
        last_notification_sent = now(),
        updated_at = now()
      WHERE user_id = user_rec.user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate weekly digest emails (similar to daily but with different criteria)
CREATE OR REPLACE FUNCTION generate_weekly_email_digests()
RETURNS void AS $$
DECLARE
  user_rec RECORD;
  user_alerts RECORD;
  alert_ids uuid[];
  email_subject text;
  email_body text;
  alert_count integer;
  notification_email text;
  current_dow integer;
BEGIN
  -- Get current day of week (0 = Sunday, 6 = Saturday)
  current_dow := EXTRACT(DOW FROM now());
  
  -- Find users with weekly digest settings (assuming Monday = day 1 for weekly digests)
  -- who haven't received notification in the last 6 days
  FOR user_rec IN 
    SELECT ans.user_id, ans.notification_email, u.email as user_email
    FROM alert_notification_settings ans
    JOIN auth.users u ON ans.user_id = u.id
    WHERE 
      ans.email_notifications_enabled = true AND
      ans.notification_frequency = 'weekly' AND
      current_dow = 1 AND  -- Monday
      (
        ans.last_notification_sent IS NULL OR
        ans.last_notification_sent < (now() - interval '6 days')
      )
  LOOP
    -- Collect alerts for this user that haven't been sent via email
    SELECT array_agg(id) INTO alert_ids
    FROM alerts
    WHERE 
      user_id = user_rec.user_id AND
      email_sent = false AND
      created_at >= (now() - interval '7 days');
    
    -- Only proceed if there are alerts to send
    IF alert_ids IS NOT NULL AND array_length(alert_ids, 1) > 0 THEN
      -- Count alerts
      SELECT count(*) INTO alert_count FROM unnest(alert_ids) AS a;
      
      -- Determine email to use
      notification_email := COALESCE(user_rec.notification_email, user_rec.user_email);
      
      -- Prepare email subject and body
      email_subject := 'PROSPERA.AI - Resumo Semanal de Alertas';
      
      email_body := 'Olá,

Segue o resumo semanal dos seus alertas na PROSPERA.AI:

';

      -- Add each alert to the email body
      FOR user_alerts IN
        SELECT title, description, date, priority, action_path
        FROM alerts
        WHERE id = ANY(alert_ids)
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            ELSE 3 
          END,
          date ASC
      LOOP
        email_body := email_body || '
- ' || user_alerts.title || ' 
  ' || user_alerts.description || '
  Data: ' || to_char(user_alerts.date, 'DD/MM/YYYY') || '
  Prioridade: ' || 
          CASE user_alerts.priority
            WHEN 'high' THEN 'Alta'
            WHEN 'medium' THEN 'Média'
            ELSE 'Baixa'
          END || '
';
      END LOOP;
      
      email_body := email_body || '

Acesse a plataforma para mais detalhes: https://prospera.ai/smart-alerts

';

      -- Schedule the email notification
      INSERT INTO scheduled_email_notifications (
        user_id,
        alert_ids,
        email_to,
        email_subject,
        email_body
      ) VALUES (
        user_rec.user_id,
        alert_ids,
        notification_email,
        email_subject,
        email_body
      );
      
      -- Update alerts to mark them as scheduled
      UPDATE alerts
      SET email_scheduled_at = now()
      WHERE id = ANY(alert_ids);
      
      -- Update the last notification timestamp
      UPDATE alert_notification_settings
      SET 
        last_notification_sent = now(),
        updated_at = now()
      WHERE user_id = user_rec.user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to process scheduled email notifications
-- In a real implementation, this would send the actual emails via SMTP or a service like SendGrid/Mailgun
CREATE OR REPLACE FUNCTION process_scheduled_email_notifications()
RETURNS void AS $$
DECLARE
  notification_rec RECORD;
BEGIN
  -- Get all pending notifications
  FOR notification_rec IN 
    SELECT id, user_id, alert_ids, email_to, email_subject, email_body
    FROM scheduled_email_notifications
    WHERE status = 'pending'
    ORDER BY scheduled_at ASC
    LIMIT 100 -- Process in batches
  LOOP
    BEGIN
      -- In a real implementation, this would send the email
      -- For now, just log that we would send it
      RAISE NOTICE 'Would send email to % with subject: %', notification_rec.email_to, notification_rec.email_subject;
      
      -- Update notification status
      UPDATE scheduled_email_notifications
      SET 
        status = 'sent',
        sent_at = now()
      WHERE id = notification_rec.id;
      
      -- Update alerts to mark them as sent
      UPDATE alerts
      SET 
        email_sent = true,
        email_sent_at = now()
      WHERE id = ANY(notification_rec.alert_ids);
    EXCEPTION
      WHEN OTHERS THEN
        -- Mark as failed and record error
        UPDATE scheduled_email_notifications
        SET 
          status = 'failed',
          error_message = SQLERRM
        WHERE id = notification_rec.id;
        
        RAISE NOTICE 'Failed to process email notification %: %', notification_rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function that will be called by a cron job to handle all email processing
CREATE OR REPLACE FUNCTION process_all_email_notifications()
RETURNS void AS $$
BEGIN
  -- Generate digest emails
  PERFORM generate_daily_email_digests();
  PERFORM generate_weekly_email_digests();
  
  -- Process scheduled emails
  PERFORM process_scheduled_email_notifications();
END;
$$ LANGUAGE plpgsql;

-- Create or update a function to initialize notification settings for new users
CREATE OR REPLACE FUNCTION init_user_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default notification settings for new user
  INSERT INTO alert_notification_settings (
    user_id,
    email_notifications_enabled,
    notification_frequency
  ) VALUES (
    NEW.id,
    true,  -- Enable email notifications by default
    'immediate'  -- Send immediate notifications by default
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create notification settings for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_notification_settings ON auth.users;
CREATE TRIGGER on_auth_user_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION init_user_notification_settings();

-- Update existing users with default notification settings
INSERT INTO alert_notification_settings (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM alert_notification_settings)
ON CONFLICT (user_id) DO NOTHING;