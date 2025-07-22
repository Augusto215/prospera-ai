-- Add trial_expires_at column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trial_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_expires_at timestamptz;
  END IF;
END $$;

-- Add is_in_trial column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_in_trial'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_in_trial boolean DEFAULT true;
  END IF;
END $$;

-- Add trial_days_left column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trial_days_left'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_days_left integer DEFAULT 7;
  END IF;
END $$;

-- Add comments for better documentation
COMMENT ON COLUMN profiles.trial_expires_at IS 'Date when the free trial expires';
COMMENT ON COLUMN profiles.is_in_trial IS 'Whether the user is currently in a free trial period';
COMMENT ON COLUMN profiles.trial_days_left IS 'Number of days left in the trial period';

-- Create or replace function to calculate trial days left
CREATE OR REPLACE FUNCTION calculate_trial_days_left()
RETURNS TRIGGER AS $$
DECLARE
  days_left integer;
BEGIN
  -- Calculate days left based on trial_expires_at
  IF NEW.is_in_trial AND NEW.trial_expires_at IS NOT NULL THEN
    days_left := EXTRACT(DAY FROM (NEW.trial_expires_at - CURRENT_TIMESTAMP));
    
    -- Ensure days_left is not negative
    IF days_left < 0 THEN
      days_left := 0;
    END IF;
    
    -- Update trial_days_left
    NEW.trial_days_left := days_left;
  ELSE
    NEW.trial_days_left := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update trial_days_left
DROP TRIGGER IF EXISTS update_trial_days_left ON profiles;
CREATE TRIGGER update_trial_days_left
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_trial_days_left();

-- Update existing profiles to calculate trial_days_left
UPDATE profiles
SET trial_days_left = 
  CASE 
    WHEN is_in_trial AND trial_expires_at IS NOT NULL THEN
      GREATEST(0, EXTRACT(DAY FROM (trial_expires_at - CURRENT_TIMESTAMP))::integer)
    ELSE 0
  END
WHERE true;