/*
  # Add trigger for automatic user profile creation

  1. Changes
    - Add trigger to automatically create profile when user signs up
    - Ensures every new user gets a profile record in the profiles table

  2. Security
    - Trigger runs with elevated privileges to insert into profiles table
    - Uses the existing handle_new_user function
*/

-- Create the trigger that automatically creates a profile for new users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();