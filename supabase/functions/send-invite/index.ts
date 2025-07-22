import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { email, role } = await req.json();

    // Validate required parameters
    if (!email || !role) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    // Validate role
    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return corsResponse({ error: 'Invalid role. Must be "viewer", "editor", or "admin"' }, 400);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

    // Check if user is on family plan
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return corsResponse({ error: 'Failed to fetch user profile' }, 500);
    }

    if (profile.plan !== 'family') {
      return corsResponse({ error: 'User must be on family plan to invite others' }, 403);
    }

    // Generate invite token
    const { data: inviteData, error: inviteError } = await supabase.rpc(
      'create_invite',
      { 
        owner_id: user.id, 
        email: email, 
        role: role 
      }
    );

    if (inviteError) {
      console.error('Failed to create invite:', inviteError);
      return corsResponse({ error: 'Failed to create invite' }, 500);
    }

    // In a real implementation, you would send an email here with the invite link
    // For this demo, we'll just return success

    // Return a mock invite ID for the UI to use
    const mockInviteId = Math.random().toString(36).substring(2, 15);
    
    return corsResponse({
      success: true, 
      message: 'Invite sent successfully',
      inviteId: mockInviteId || inviteData
    });
  } catch (error: any) {
    console.error(`Invite error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});