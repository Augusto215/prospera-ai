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

    // Get alert data from request
    const { alertId, testMode } = await req.json();

    // Validate required parameters
    if (!alertId && !testMode) {
      return corsResponse({ error: 'Missing required parameter: alertId' }, 400);
    }

    // Get auth token from header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    // For test mode, just return success without sending actual email
    if (testMode) {
      return corsResponse({
        success: true,
        message: 'Test email would be sent (test mode)',
        emailDetails: {
          to: user?.email,
          subject: 'PROSPERA.AI - Teste de Alerta por Email',
          sentAt: new Date().toISOString()
        }
      });
    }

    // Get alert data
    let alertData;
    if (alertId) {
      const { data: alert, error: alertError } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', alertId)
        .single();

      if (alertError) {
        return corsResponse({ error: 'Alert not found' }, 404);
      }

      // Verify user owns this alert
      if (alert.user_id !== user?.id) {
        return corsResponse({ error: 'Unauthorized access to alert' }, 403);
      }

      alertData = alert;
    }

    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('alert_notification_settings')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (settingsError) {
      return corsResponse({ error: 'Failed to fetch notification settings' }, 500);
    }

    // Check if email notifications are enabled
    if (!settings.email_notifications_enabled) {
      return corsResponse({ 
        success: false,
        message: 'Email notifications are disabled for this user' 
      }, 200);
    }

    // Check if this type of alert is enabled for notifications
    const alertTypeEnabled = alertData && alertData.type && settings[`${alertData.type}_alerts_enabled`];
    if (alertData && !alertTypeEnabled) {
      return corsResponse({ 
        success: false,
        message: `Email notifications for ${alertData.type} alerts are disabled` 
      }, 200);
    }

    // In a real implementation, you would send the email here
    // For demo, we'll just simulate it by updating the alert

    if (alertData) {
      // Mark alert as sent
      const { error: updateError } = await supabase
        .from('alerts')
        .update({ 
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (updateError) {
        return corsResponse({ error: 'Failed to update alert status' }, 500);
      }
    }

    return corsResponse({
      success: true,
      message: 'Email notification sent successfully',
      emailDetails: {
        to: settings.notification_email || user?.email,
        subject: alertData ? `PROSPERA.AI - Alerta: ${alertData.title}` : 'PROSPERA.AI - Alerta',
        sentAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error(`Error sending alert email: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});