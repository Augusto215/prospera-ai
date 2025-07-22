/*
  # Fix user profile creation trigger

  1. Database Functions
    - Create or replace the `handle_new_user()` function to automatically create profile records
    - Function extracts user data from auth.users and inserts into profiles table

  2. Triggers
    - Create trigger on auth.users table to call handle_new_user() after insert
    - Ensures every new user gets a corresponding profile record

  3. Security
    - Function runs with SECURITY DEFINER to have proper permissions
    - Handles the automatic profile creation seamlessly
*/

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to automatically call handle_new_user when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();