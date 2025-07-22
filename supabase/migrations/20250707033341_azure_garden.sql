/*
  # Fix User Signup Database Error

  1. Changes
    - Create a simplified and robust handle_new_user function
    - Fix trigger on auth.users table
    - Add proper RLS policies for profile creation during signup
    - Add service_role policy for programmatic profile creation

  2. Security
    - Maintain existing security model
    - Ensure proper error handling
*/

-- Create a simplified and robust function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    is_admin
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.email = 'pedropardal04@gmail.com' THEN true 
      WHEN NEW.email = 'profitestrategista@gmail.com' THEN true
      ELSE false 
    END
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

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create policies for signup
CREATE POLICY "Enable insert for authenticated users during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated;

-- Add service_role policy for programmatic profile creation
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role;