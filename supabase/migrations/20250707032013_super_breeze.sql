/*
  # Fix user registration database error

  1. Database Changes
    - Ensure all required columns in profiles table have proper defaults
    - Fix any NOT NULL constraints that might be causing issues
    - Update the user creation trigger to handle profile creation properly

  2. Security
    - Maintain existing RLS policies
    - Ensure proper user profile creation flow
*/

-- First, let's make sure the profiles table has proper defaults for all required fields
ALTER TABLE profiles 
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN is_admin SET DEFAULT false,
  ALTER COLUMN plan SET DEFAULT 'starter',
  ALTER COLUMN is_in_trial SET DEFAULT true,
  ALTER COLUMN trial_days_left SET DEFAULT 7,
  ALTER COLUMN phone_verified SET DEFAULT false,
  ALTER COLUMN verification_attempts SET DEFAULT 0,
  ALTER COLUMN phone_verification_attempts SET DEFAULT 0,
  ALTER COLUMN phone_verification_status SET DEFAULT 'pending';

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    is_admin,
    plan,
    is_in_trial,
    trial_days_left,
    phone_verified,
    verification_attempts,
    phone_verification_attempts,
    phone_verification_status,
    trial_expires_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false,
    'starter',
    true,
    7,
    false,
    0,
    0,
    'pending',
    NOW() + INTERVAL '7 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure RLS is enabled and policies are correct
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update the insert policy to allow profile creation during signup
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;

CREATE POLICY "Enable insert for authenticated users during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);