/*
  # Fix User Signup Database Policies

  This migration addresses the "Database error saving new user" issue by:
  1. Ensuring proper RLS policies for user profile creation
  2. Creating a trigger function to handle new user registration
  3. Setting up the trigger to automatically create profiles for new users
  4. Fixing any policy conflicts that prevent user registration

  ## Changes Made
  - Updated RLS policies on profiles table to allow user creation
  - Created/updated handle_new_user trigger function
  - Ensured proper permissions for authenticated users
*/

-- First, let's ensure the handle_new_user function exists and works correctly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to automatically create profiles for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;

-- Create comprehensive RLS policies for profiles table
CREATE POLICY "Enable insert for authenticated users during signup"
  ON profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

-- Ensure the users table exists in auth schema (this should already exist)
-- and that our function can access it properly

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
GRANT SELECT ON auth.users TO anon, authenticated;

-- Ensure the profiles table has proper permissions
GRANT ALL ON profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;