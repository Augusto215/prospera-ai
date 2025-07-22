/*
  # Add Phone Verification Support

  1. New Columns
    - `phone_verified` - Boolean flag indicating if phone is verified
    - `verification_code` - Store verification code (in a real implementation, this would be handled by Twilio/Supabase)
    - `verification_sent_at` - When the verification code was sent
    - `verification_attempts` - Count of verification attempts

  2. Security
    - Maintain existing RLS policies
*/

-- Add phone_verified column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add verification_code column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_code text;
  END IF;
END $$;

-- Add verification_sent_at column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_sent_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_sent_at timestamptz;
  END IF;
END $$;

-- Add verification_attempts column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_attempts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_attempts integer DEFAULT 0;
  END IF;
END $$;

-- Add comments for better documentation
COMMENT ON COLUMN profiles.phone_verified IS 'Whether the user has verified their phone number';
COMMENT ON COLUMN profiles.verification_code IS 'Verification code sent to the user phone';
COMMENT ON COLUMN profiles.verification_sent_at IS 'When the verification code was sent';
COMMENT ON COLUMN profiles.verification_attempts IS 'Number of verification attempts';