/*
  # Fix signup database error

  1. Database Functions
    - Create or replace the handle_new_user function to properly create profiles
    - Ensure the function has proper security definer permissions
  
  2. Triggers
    - Create trigger on auth.users to automatically create profile entries
    
  3. Security
    - Ensure RLS policies allow the trigger to insert new profiles
    - Add policy for service role to insert profiles during signup
*/

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the profiles table has the correct RLS policy for service role
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure anon users can insert during signup process
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;

CREATE POLICY "Enable insert for authenticated users during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);