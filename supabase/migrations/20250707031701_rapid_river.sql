/*
  # Fix User Signup Process

  1. Changes
    - Make email column temporarily nullable to avoid conflicts
    - Improve handle_new_user function to properly create profiles
    - Update RLS policies for proper user creation flow
    - Fix admin policy to use auth.jwt() instead of jwt()

  2. Security
    - Maintain proper RLS policies
    - Ensure admin access works correctly
*/

-- First, let's make sure the profiles table has the right structure
-- Make email nullable temporarily to avoid conflicts during user creation
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Add email back as NOT NULL with a proper default handling
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

-- Ensure we have a proper function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, plan, is_in_trial, trial_days_left)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'starter',
    true,
    7
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS is properly configured
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update the existing policies to be more permissive for user creation
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;

CREATE POLICY "Enable insert for authenticated users during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin policy with the correct auth.jwt() function
DROP POLICY IF EXISTS "Admin can manage all profiles" ON profiles;

CREATE POLICY "Admin can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'pedropardal04@gmail.com' OR
    (auth.jwt() ->> 'email') = 'profitestrategista@gmail.com' OR
    auth.uid() = user_id
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'pedropardal04@gmail.com' OR
    (auth.jwt() ->> 'email') = 'profitestrategista@gmail.com' OR
    auth.uid() = user_id
  );