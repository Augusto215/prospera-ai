import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// In a real implementation, you would use Twilio or another SMS provider
// import { Twilio } from 'npm:twilio';

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

    const { action, phone, code, userId } = await req.json();

    // Validate required parameters
    if (!action || !userId) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    // Validate action
    if (!['send', 'verify'].includes(action)) {
      return corsResponse({ error: 'Invalid action. Must be "send" or "verify"' }, 400);
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

    // Check if the requesting user is the same as the target user
    if (user.id !== userId) {
      return corsResponse({ error: 'Unauthorized' }, 403);
    }

    // Handle send verification code
    if (action === 'send') {
      if (!phone) {
        return corsResponse({ error: 'Phone number is required' }, 400);
      }

      // Generate a random 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (30 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      
      // Update the user's profile with the verification code
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: phone,
          phone_verification_code: verificationCode,
          phone_verification_expires: expiresAt.toISOString(),
          phone_verification_attempts: 0,
          phone_verification_status: 'pending',
          phone_verified: false
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update profile with verification code:', updateError);
        return corsResponse({ error: 'Failed to send verification code' }, 500);
      }

      // In a real implementation, you would send the SMS here
      // const twilioClient = new Twilio(Deno.env.get('TWILIO_ACCOUNT_SID'), Deno.env.get('TWILIO_AUTH_TOKEN'));
      // await twilioClient.messages.create({
      //   body: `Your MyWealth 360 verification code is: ${verificationCode}`,
      //   from: Deno.env.get('TWILIO_PHONE_NUMBER'),
      //   to: phone
      // });

      console.log(`Verification code for ${phone}: ${verificationCode}`);

      return corsResponse({ success: true, message: 'Verification code sent' });
    }

    // Handle verify code
    if (action === 'verify') {
      if (!code) {
        return corsResponse({ error: 'Verification code is required' }, 400);
      }

      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone_verification_code, phone_verification_expires, phone_verification_attempts')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Failed to get profile:', profileError);
        return corsResponse({ error: 'Failed to verify code' }, 500);
      }

      // Check if code has expired
      if (profile.phone_verification_expires && new Date(profile.phone_verification_expires) < new Date()) {
        return corsResponse({ error: 'Verification code has expired' }, 400);
      }

      // Check if too many attempts
      if (profile.phone_verification_attempts >= 5) {
        return corsResponse({ error: 'Too many verification attempts' }, 400);
      }

      // Increment attempts
      const { error: incrementError } = await supabase
        .from('profiles')
        .update({
          phone_verification_attempts: (profile.phone_verification_attempts || 0) + 1
        })
        .eq('user_id', userId);

      if (incrementError) {
        console.error('Failed to increment verification attempts:', incrementError);
      }

      // Check if code matches
      if (profile.phone_verification_code !== code) {
        return corsResponse({ error: 'Invalid verification code' }, 400);
      }

      // Code is valid, mark phone as verified
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone_verified: true,
          phone_verification_status: 'verified',
          phone_verification_code: null,
          phone_verification_expires: null
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update profile after verification:', updateError);
        return corsResponse({ error: 'Failed to verify phone' }, 500);
      }

      return corsResponse({ success: true, message: 'Phone verified successfully' });
    }

    return corsResponse({ error: 'Invalid action' }, 400);
  } catch (error: any) {
    console.error(`Phone verification error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});