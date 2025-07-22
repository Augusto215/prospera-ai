/*
  # Create Invite System for Family Plan Sharing

  1. New Tables
    - `invites` - Store user invitations with tokens and roles
    
  2. New Functions
    - `generate_invite_token()` - Creates secure random tokens for invites
    - `create_invite()` - Creates invites with validation and plan checks
    
  3. Security
    - Enable RLS on invites table
    - Add policies for authenticated users to manage their own invites
    - Create indexes for common query patterns
*/

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own invites"
  ON invites
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create function to generate unique invite tokens
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate a random token
    token := encode(gen_random_bytes(32), 'base64url');
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM invites WHERE invites.token = token) INTO token_exists;
    
    -- If token doesn't exist, we can use it
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN token;
END;
$$;

-- Create the create_invite function
CREATE OR REPLACE FUNCTION create_invite(
  owner_id uuid,
  email text,
  role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_id uuid;
  token text;
BEGIN
  -- Validate inputs
  IF owner_id IS NULL OR email IS NULL OR role IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;
  
  -- Validate role
  IF role NOT IN ('viewer', 'editor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be viewer, editor, or admin';
  END IF;
  
  -- Validate email format (basic check)
  IF email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Check if user has family plan
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = owner_id AND plan = 'family'
  ) THEN
    RAISE EXCEPTION 'User must have family plan to create invites';
  END IF;
  
  -- Check if invite already exists for this email from this owner
  IF EXISTS (
    SELECT 1 FROM invites 
    WHERE invites.owner_id = create_invite.owner_id 
    AND invites.email = create_invite.email 
    AND accepted = false 
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invite already exists for this email';
  END IF;
  
  -- Generate unique token
  token := generate_invite_token();
  
  -- Insert invite
  INSERT INTO invites (owner_id, email, role, token)
  VALUES (owner_id, email, role, token)
  RETURNING id INTO invite_id;
  
  RETURN invite_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_invite(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_token() TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invites_owner_id ON invites(owner_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);