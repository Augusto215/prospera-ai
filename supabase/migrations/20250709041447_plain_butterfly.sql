/*
  # Admin Exemption from Trial Restrictions

  1. Changes
    - Add function to check if user is admin
    - Update trial-related functions to exempt admins
    - Ensure admins are not restricted by trial expiration

  2. Security
    - Maintain existing RLS policies
    - Add specific exemptions for admin users
*/

-- Create or replace function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT p.is_admin INTO is_admin_user
  FROM profiles p
  WHERE p.user_id = is_admin.user_id;
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update calculate_trial_days_left function to exempt admins
CREATE OR REPLACE FUNCTION calculate_trial_days_left()
RETURNS TRIGGER AS $$
DECLARE
  days_left integer;
  is_admin_user boolean;
BEGIN
  -- Check if user is admin
  is_admin_user := is_admin(NEW.user_id);
  
  -- If admin, set trial_days_left to a high value (effectively unlimited)
  IF is_admin_user THEN
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

-- Update existing profiles to apply admin exemption
UPDATE profiles
SET trial_days_left = 999
WHERE is_admin = true;