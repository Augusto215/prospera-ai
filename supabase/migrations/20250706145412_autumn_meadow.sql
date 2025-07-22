/*
  # Update Admin Access for Multiple Emails

  1. Security Changes
    - Update admin policy to include both pedropardal04@gmail.com and profitestrategista.com.br
    - Update handle_new_user function to automatically set admin status for both emails
    - Ensure proper access control for admin panel
*/

-- Drop the existing admin policy
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;

-- Create a new admin policy that includes both admin emails
CREATE POLICY "Admin can read all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'pedropardal04@gmail.com'
    OR auth.jwt() ->> 'email' = 'profitestrategista.com.br'
    OR auth.uid() = user_id
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'pedropardal04@gmail.com'
    OR auth.jwt() ->> 'email' = 'profitestrategista.com.br'
    OR auth.uid() = user_id
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
      WHEN NEW.email = 'profitestrategista.com.br' THEN true
      ELSE false 
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;