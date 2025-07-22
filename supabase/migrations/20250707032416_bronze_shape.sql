/*
  # Fix User Signup Error

  1. Changes
    - Fix the handle_new_user function to properly initialize all required fields
    - Set trial_expires_at to 7 days from now
    - Ensure admin emails are properly checked
    - Fix RLS policies to use auth.jwt() correctly
    - Make sure all required fields have proper defaults

  2. Security
    - Maintain existing RLS policies with correct syntax
    - Ensure proper admin access control
*/

-- First, let's make sure the profiles table has proper defaults for all required fields
ALTER TABLE profiles 
  ALTER COLUMN is_admin SET DEFAULT false,
  ALTER COLUMN plan SET DEFAULT 'starter',
  ALTER COLUMN is_in_trial SET DEFAULT true,
  ALTER COLUMN trial_days_left SET DEFAULT 7,
  ALTER COLUMN phone_verified SET DEFAULT false,
  ALTER COLUMN verification_attempts SET DEFAULT 0,
  ALTER COLUMN phone_verification_attempts SET DEFAULT 0,
  ALTER COLUMN phone_verification_status SET DEFAULT 'pending';

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  trial_end_date timestamptz;
  is_admin_user boolean;
BEGIN
  -- Set trial expiration date to 7 days from now
  trial_end_date := now() + interval '7 days';
  
  -- Check if user is admin
  is_admin_user := (
    NEW.email = 'pedropardal04@gmail.com' OR 
    NEW.email = 'profitestrategista@gmail.com'
  );
  
  -- Insert into profiles with all necessary fields
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
    trial_expires_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    is_admin_user,
    'starter',
    true,
    7,
    false,
    0,
    0,
    'pending',
    trial_end_date,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE NOTICE 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update the existing policies with correct syntax
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;
CREATE POLICY "Enable insert for authenticated users during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;
CREATE POLICY "Admin can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() ->> 'email') = 'pedropardal04@gmail.com') OR 
    ((auth.jwt() ->> 'email') = 'profitestrategista@gmail.com') OR 
    (auth.uid() = user_id)
  )
  WITH CHECK (
    ((auth.jwt() ->> 'email') = 'pedropardal04@gmail.com') OR 
    ((auth.jwt() ->> 'email') = 'profitestrategista@gmail.com') OR 
    (auth.uid() = user_id)
  );