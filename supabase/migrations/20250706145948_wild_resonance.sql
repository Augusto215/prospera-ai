/*
  # Fix Admin Access for profitestrategista@gmail.com

  1. Security Changes
    - Update admin policy to include profitestrategista@gmail.com
    - Fix the email format (add @gmail.com to profitestrategista)
    - Update handle_new_user function to recognize both admin emails
    - Update existing profiles to set admin status

  2. Changes
    - Drop and recreate admin policy with correct email format
    - Update handle_new_user function
    - Set admin status for existing profiles
*/

-- Drop the existing admin policy
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;

-- Create a new admin policy that includes both admin emails with correct format
CREATE POLICY "Admin can read all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'pedropardal04@gmail.com'
    OR (auth.jwt() ->> 'email') = 'profitestrategista@gmail.com'
    OR (auth.uid() = user_id)
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'pedropardal04@gmail.com'
    OR (auth.jwt() ->> 'email') = 'profitestrategista@gmail.com'
    OR (auth.uid() = user_id)
  );

-- Update the handle_new_user function to set admin status for both emails
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (user_id, email, full_name, is_admin)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles to set admin status for both emails with correct format
UPDATE profiles
SET is_admin = true
WHERE email = 'profitestrategista@gmail.com'
   OR email = 'pedropardal04@gmail.com';