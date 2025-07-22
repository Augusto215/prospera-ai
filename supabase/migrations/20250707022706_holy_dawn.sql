/*
  # Add Phone Verification Fields and Setup Production Authentication

  1. New Columns
    - `phone_verification_code` - Code sent to user for verification
    - `phone_verification_expires` - When the verification code expires
    - `phone_verification_attempts` - Track number of verification attempts
    - `phone_verification_status` - Status of verification process

  2. Security
    - Maintain existing RLS policies
    - Ensure proper data validation
*/

-- Add phone verification fields to profiles table
DO $$
BEGIN
  -- Add phone_verification_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verification_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verification_code text;
  END IF;

  -- Add phone_verification_expires column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verification_expires'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verification_expires timestamptz;
  END IF;

  -- Add phone_verification_attempts column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verification_attempts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verification_attempts integer DEFAULT 0;
  END IF;

  -- Add phone_verification_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verification_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verification_status text DEFAULT 'pending';
  END IF;
END $$;

-- Add comments for better documentation
COMMENT ON COLUMN profiles.phone_verification_code IS 'Verification code sent to user phone';
COMMENT ON COLUMN profiles.phone_verification_expires IS 'When the verification code expires';
COMMENT ON COLUMN profiles.phone_verification_attempts IS 'Number of verification attempts';
COMMENT ON COLUMN profiles.phone_verification_status IS 'Status of phone verification (pending, verified, failed)';

-- Create or replace function to handle phone verification
CREATE OR REPLACE FUNCTION handle_phone_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- If phone number is being updated and verification status is not 'verified'
  IF (TG_OP = 'UPDATE' AND OLD.phone != NEW.phone) OR 
     (TG_OP = 'INSERT' AND NEW.phone IS NOT NULL) THEN
    
    -- Reset verification status for new phone numbers
    NEW.phone_verified := false;
    NEW.phone_verification_status := 'pending';
    
    -- Generate a new verification code (in production this would be sent via Twilio)
    -- For demo purposes, we'll use a simple 6-digit code
    NEW.phone_verification_code := floor(random() * 900000 + 100000)::text;
    
    -- Set expiration time (30 minutes from now)
    NEW.phone_verification_expires := now() + interval '30 minutes';
    
    -- Reset verification attempts
    NEW.phone_verification_attempts := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for phone verification
DROP TRIGGER IF EXISTS on_phone_update ON profiles;
CREATE TRIGGER on_phone_update
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.phone IS NOT NULL AND NEW.phone_verified = false)
  EXECUTE FUNCTION handle_phone_verification();

-- Create function to verify phone code
CREATE OR REPLACE FUNCTION verify_phone_code(user_id uuid, verification_code text)
RETURNS boolean AS $$
DECLARE
  profile_record profiles%ROWTYPE;
  is_valid boolean;
BEGIN
  -- Get the profile record
  SELECT * INTO profile_record FROM profiles WHERE user_id = verify_phone_code.user_id;
  
  -- Check if profile exists
  IF profile_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Increment verification attempts
  UPDATE profiles 
  SET phone_verification_attempts = phone_verification_attempts + 1
  WHERE user_id = verify_phone_code.user_id;
  
  -- Check if code is valid and not expired
  is_valid := (
    profile_record.phone_verification_code = verification_code AND
    profile_record.phone_verification_expires > now() AND
    profile_record.phone_verification_attempts < 5
  );
  
  -- If valid, mark phone as verified
  IF is_valid THEN
    UPDATE profiles 
    SET 
      phone_verified = true,
      phone_verification_status = 'verified',
      phone_verification_code = NULL,
      phone_verification_expires = NULL
    WHERE user_id = verify_phone_code.user_id;
  ELSIF profile_record.phone_verification_attempts >= 5 THEN
    -- If too many attempts, mark as failed
    UPDATE profiles 
    SET phone_verification_status = 'failed'
    WHERE user_id = verify_phone_code.user_id;
  END IF;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;