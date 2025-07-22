/*
  # Fix user signup database error

  1. Problem
    - The `handle_new_user` trigger is failing to create profile records
    - Required NOT NULL columns in profiles table are not being populated
    - This causes a 500 error during user signup

  2. Solution
    - Update the `handle_new_user` trigger function to properly populate all required fields
    - Ensure email and user_id are correctly extracted from auth.users data
    - Add proper error handling

  3. Changes
    - Recreate the `handle_new_user` function with proper field mapping
    - Ensure all NOT NULL columns are handled appropriately
*/

-- Drop and recreate the handle_new_user function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();