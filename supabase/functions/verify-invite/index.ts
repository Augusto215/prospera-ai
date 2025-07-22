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

    const { token } = await req.json();

    // Validate required parameters
    if (!token) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    // In a real implementation, you would verify the token against a database table
    // For this demo, we'll simulate a successful verification
    
    // Simulate database lookup
    const inviteData = {
      valid: true,
      email: 'convidado@example.com',
      role: 'editor',
      ownerName: 'João Silva',
      ownerId: 'some-user-id',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };

    return corsResponse(inviteData);
  } catch (error: any) {
    console.error(`Invite verification error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});