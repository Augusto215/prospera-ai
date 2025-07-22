/*
  # Fix infinite recursion in profiles RLS policy

  1. Security Changes
    - Drop the problematic admin policy that causes infinite recursion
    - Create a simplified admin policy that doesn't reference the profiles table recursively
    - Keep other policies intact for normal user operations

  2. Changes Made
    - Remove the recursive admin policy
    - Add a direct admin policy using email comparison
*/

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;

-- Create a new admin policy that doesn't cause recursion
-- This policy allows the specific admin email to read all profiles
CREATE POLICY "Admin can read all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'pedropardal04@gmail.com'
    OR auth.uid() = user_id
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'pedropardal04@gmail.com'
    OR auth.uid() = user_id
  );