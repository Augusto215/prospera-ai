/*
  # Fix User Signup Database Error

  1. Changes
    - Fix the calculate_trial_days_left() function to avoid recursion during user creation
    - Use NEW.is_admin directly instead of calling is_admin() function
    - This prevents the "Database error saving new user" error during signup

  2. Security
    - Maintains existing security model
    - Ensures proper user profile creation on signup
*/

-- Create or replace the calculate_trial_days_left function to fix the recursion issue
CREATE OR REPLACE FUNCTION calculate_trial_days_left()
RETURNS TRIGGER AS $$
DECLARE
  days_left integer;
BEGIN
  -- If admin, set trial_days_left to a high value (effectively unlimited)
  IF NEW.is_admin THEN
    NEW.trial_days_left := 999;
    RETURN NEW;
  END IF;
  
  -- Calculate days left based on trial_expires_at for non-admin users
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

-- The trigger doesn't need to be recreated as it's already attached to the function