/*
  # Add plan field to profiles table

  1. New Columns
    - `plan` - User's subscription plan (starter, family)
    
  2. Changes
    - Add plan column to profiles table
    - This allows admins to manually set a user's plan
*/

-- Add plan column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan text DEFAULT 'starter';
  END IF;
END $$;

-- Add comment to plan column for better documentation
COMMENT ON COLUMN profiles.plan IS 'User subscription plan (starter, family) - can be set by admin';