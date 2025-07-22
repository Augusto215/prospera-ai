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

    const { token, userId } = await req.json();

    // Validate required parameters
    if (!token || !userId) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    // In a real implementation, you would:
    // 1. Verify the token is valid and not expired
    // 2. Check if the user email matches the invited email
    // 3. Create a record in a shared_access table
    // 4. Mark the invite as accepted
    
    // For this demo, we'll simulate a successful acceptance
    
    // Simulate database update
    const result = {
      success: true,
      message: 'Invite accepted successfully',
      accessGranted: {
        userId: userId,
        ownerUserId: 'some-owner-id',
        role: 'editor',
        grantedAt: new Date().toISOString()
      }
    };

    return corsResponse(result);
  } catch (error: any) {
    console.error(`Invite acceptance error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});