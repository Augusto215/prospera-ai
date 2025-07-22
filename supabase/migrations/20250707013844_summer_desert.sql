-- Add plan column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan text DEFAULT 'starter';
  END IF;
END $$;

-- Add comment to plan column for better documentation
COMMENT ON COLUMN profiles.plan IS 'User subscription plan (starter, family) - can be set by admin';