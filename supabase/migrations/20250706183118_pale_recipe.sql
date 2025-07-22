/*
  # Fix User Signup Trigger

  1. Changes
    - Drop and recreate the trigger for user signup
    - Ensure the trigger is properly connected to the handle_new_user function
    - Fix the trigger to run after insert on auth.users

  2. Security
    - Maintains existing security model
    - Ensures proper user profile creation on signup
*/

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that automatically creates a profile for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();