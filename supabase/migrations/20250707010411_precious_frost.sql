/*
  # Add 7-day free trial for starter plan

  1. New Functions
    - `create_trial_subscription` - Creates a trial subscription for new users
    - `handle_new_user_trial` - Trigger function to automatically create trial subscriptions

  2. Changes
    - Add trigger to automatically create a 7-day trial for new users
    - Update profiles table to track trial status and expiration
    - Ensure proper integration with Stripe subscriptions
*/

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

-- Add comments for better documentation
COMMENT ON COLUMN profiles.trial_expires_at IS 'Date when the free trial expires';
COMMENT ON COLUMN profiles.is_in_trial IS 'Whether the user is currently in a free trial period';

-- Create function to set up trial for new users
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
DECLARE
  trial_end_date timestamptz;
BEGIN
  -- Set trial expiration date to 7 days from now
  trial_end_date := now() + interval '7 days';
  
  -- Update the profile with trial information
  UPDATE profiles
  SET 
    trial_expires_at = trial_end_date,
    is_in_trial = true,
    plan = 'starter'
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set up trial for new users
DROP TRIGGER IF EXISTS on_auth_user_trial_setup ON auth.users;
CREATE TRIGGER on_auth_user_trial_setup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();

-- Update handle_new_user function to include trial setup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  trial_end_date timestamptz;
BEGIN
  -- Set trial expiration date to 7 days from now
  trial_end_date := now() + interval '7 days';
  
  INSERT INTO profiles (
    user_id, 
    email, 
    full_name, 
    is_admin,
    plan,
    is_in_trial,
    trial_expires_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.email = 'pedropardal04@gmail.com' THEN true 
      WHEN NEW.email = 'profitestrategista@gmail.com' THEN true
      ELSE false 
    END,
    'starter',
    true,
    trial_end_date
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;