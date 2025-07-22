/*
  # Fix user signup trigger function

  1. Updates
    - Fix the `handle_new_user` trigger function to properly handle all required fields
    - Ensure email is extracted from auth.users and inserted into profiles
    - Handle all NOT NULL columns with appropriate values or defaults
    
  2. Security
    - Maintains existing RLS policies
    - Ensures proper user isolation
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the corrected trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    is_admin,
    created_at,
    updated_at,
    plan,
    trial_expires_at,
    is_in_trial,
    trial_days_left,
    phone_verified,
    verification_attempts,
    phone_verification_attempts,
    phone_verification_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    false,
    NOW(),
    NOW(),
    'starter',
    NOW() + INTERVAL '7 days',
    true,
    7,
    false,
    0,
    0,
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();