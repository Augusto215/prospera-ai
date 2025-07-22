/*
  # Fix User Signup Database Error

  1. Problem
    - The `calculate_trial_days_left` function is causing a recursion error during user creation
    - It calls `is_admin(NEW.user_id)` which tries to query the profiles table before the record exists
    - This causes the "Database error saving new user" error during signup

  2. Solution
    - Modify the function to use `NEW.is_admin` directly from the trigger context
    - This avoids the recursive database query that was causing the error
    - Keep the rest of the function's logic the same

  3. Changes
    - Update the `calculate_trial_days_left` function with a more efficient implementation
    - Fix the recursion issue by using the trigger's NEW record directly
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