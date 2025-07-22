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

// This function would typically be triggered by a cron job every hour
// It processes the email notification queue
Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Get the admin key from request headers
    const adminKey = req.headers.get('x-admin-key');
    if (!adminKey || adminKey !== Deno.env.get('CRON_JOB_KEY')) {
      return corsResponse({ error: 'Unauthorized' }, 401);
    }

    // Process immediate notifications
    const immediateResult = await processImmediateEmails();
    
    // Process daily digests
    const dailyResult = await processDailyDigests();
    
    // Process weekly digests
    const weeklyResult = await processWeeklyDigests();

    return corsResponse({
      success: true,
      results: {
        immediate: immediateResult,
        daily: dailyResult,
        weekly: weeklyResult
      }
    });
  } catch (error: any) {
    console.error(`Error processing email queue: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

async function processImmediateEmails() {
  const processedEmails = {
    processed: 0,
    success: 0,
    failed: 0
  };

  try {
    // Get all pending notifications to be sent immediately
    const { data: notifications, error: fetchError } = await supabase
      .from('scheduled_email_notifications')
      .select('*')
      .eq('status', 'pending')
      .limit(100);

    if (fetchError) throw fetchError;
    if (!notifications || notifications.length === 0) {
      return processedEmails;
    }

    processedEmails.processed = notifications.length;

    // Process each notification
    for (const notification of notifications) {
      try {
        // In a real implementation, this would send the actual email via SMTP or a service like SendGrid/Mailgun
        console.log(`Would send email to ${notification.email_to} with subject: ${notification.email_subject}`);
        
        // Update notification status
        const { error: updateError } = await supabase
          .from('scheduled_email_notifications')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);
        
        if (updateError) throw updateError;
        
        // Update alert status
        if (notification.alert_ids && notification.alert_ids.length > 0) {
          const { error: alertUpdateError } = await supabase
            .from('alerts')
            .update({ 
              email_sent: true,
              email_sent_at: new Date().toISOString()
            })
            .in('id', notification.alert_ids);
          
          if (alertUpdateError) throw alertUpdateError;
        }

        processedEmails.success++;
      } catch (err) {
        console.error(`Failed to process notification ${notification.id}:`, err);
        
        // Mark as failed
        await supabase
          .from('scheduled_email_notifications')
          .update({ 
            status: 'failed',
            error_message: err.message || 'Unknown error'
          })
          .eq('id', notification.id);
          
        processedEmails.failed++;
      }
    }

    return processedEmails;
  } catch (error) {
    console.error('Error processing immediate emails:', error);
    throw error;
  }
}

async function processDailyDigests() {
  const result = {
    usersProcessed: 0,
    digestsSent: 0,
    errors: 0
  };

  try {
    // Get the current day
    const now = new Date();
    const currentHour = now.getUTCHours();
    
    // Find users with daily digest settings who haven't received notification today
    const { data: users, error: usersError } = await supabase
      .from('alert_notification_settings')
      .select('user_id, notification_email, notification_time, last_notification_sent')
      .eq('email_notifications_enabled', true)
      .eq('notification_frequency', 'daily')
      .filter('last_notification_sent', 'lt', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
    
    if (usersError) throw usersError;
    if (!users || users.length === 0) return result;
    
    result.usersProcessed = users.length;
    
    // Process each user who should receive a digest now (based on their preferred time)
    for (const userSettings of users) {
      try {
        // Parse notification time
        const [hours, minutes] = (userSettings.notification_time || '08:00:00').split(':').map(Number);
        
        // Skip if it's not time for this user's digest yet
        if (currentHour !== hours) continue;
        
        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userSettings.user_id);
        if (userError || !userData?.user) throw userError || new Error('User not found');
        
        const userEmail = userSettings.notification_email || userData.user.email;
        
        // Get unprocessed alerts for this user from the last 24 hours
        const { data: alerts, error: alertsError } = await supabase
          .from('alerts')
          .select('*')
          .eq('user_id', userSettings.user_id)
          .eq('email_sent', false)
          .gte('created_at', new Date(now.getTime() - 24*60*60*1000).toISOString())
          .order('priority', { ascending: false })
          .order('date', { ascending: true });
        
        if (alertsError) throw alertsError;
        if (!alerts || alerts.length === 0) continue;
        
        // Prepare digest email
        const alertIds = alerts.map(a => a.id);
        const emailSubject = 'PROSPERA.AI - Resumo Diário de Alertas';
        
        let emailBody = `Olá,

Segue o resumo diário dos seus alertas na PROSPERA.AI:

`;

        // Add each alert to the email body
        for (const alert of alerts) {
          emailBody += `
- ${alert.title} 
  ${alert.description}
  Data: ${new Date(alert.date).toLocaleDateString('pt-BR')}
  Prioridade: ${alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Média' : 'Baixa'}
`;
        }
        
        emailBody += `

Acesse a plataforma para mais detalhes: https://prospera.ai/smart-alerts

`;

        // Schedule the email notification
        const { error: insertError } = await supabase
          .from('scheduled_email_notifications')
          .insert({
            user_id: userSettings.user_id,
            alert_ids: alertIds,
            email_to: userEmail,
            email_subject: emailSubject,
            email_body: emailBody
          });
        
        if (insertError) throw insertError;
        
        // Update the last notification timestamp
        const { error: updateError } = await supabase
          .from('alert_notification_settings')
          .update({ 
            last_notification_sent: new Date().toISOString()
          })
          .eq('user_id', userSettings.user_id);
        
        if (updateError) throw updateError;
        
        result.digestsSent++;
      } catch (err) {
        console.error(`Error processing daily digest for user ${userSettings.user_id}:`, err);
        result.errors++;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error processing daily digests:', error);
    throw error;
  }
}

async function processWeeklyDigests() {
  const result = {
    usersProcessed: 0,
    digestsSent: 0,
    errors: 0
  };

  try {
    // Get the current day
    const now = new Date();
    const currentDayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getUTCHours();
    
    // Only process weekly digests on Mondays (day 1)
    if (currentDayOfWeek !== 1) return result;
    
    // Find users with weekly digest settings
    const { data: users, error: usersError } = await supabase
      .from('alert_notification_settings')
      .select('user_id, notification_email, notification_time, last_notification_sent')
      .eq('email_notifications_enabled', true)
      .eq('notification_frequency', 'weekly')
      .filter('last_notification_sent', 'lt', new Date(now.getTime() - 6*24*60*60*1000).toISOString());
    
    if (usersError) throw usersError;
    if (!users || users.length === 0) return result;
    
    result.usersProcessed = users.length;
    
    // Process each user who should receive a digest now (based on their preferred time)
    for (const userSettings of users) {
      try {
        // Parse notification time
        const [hours, minutes] = (userSettings.notification_time || '08:00:00').split(':').map(Number);
        
        // Skip if it's not time for this user's digest yet
        if (currentHour !== hours) continue;
        
        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userSettings.user_id);
        if (userError || !userData?.user) throw userError || new Error('User not found');
        
        const userEmail = userSettings.notification_email || userData.user.email;
        
        // Get unprocessed alerts for this user from the last 7 days
        const { data: alerts, error: alertsError } = await supabase
          .from('alerts')
          .select('*')
          .eq('user_id', userSettings.user_id)
          .eq('email_sent', false)
          .gte('created_at', new Date(now.getTime() - 7*24*60*60*1000).toISOString())
          .order('priority', { ascending: false })
          .order('date', { ascending: true });
        
        if (alertsError) throw alertsError;
        if (!alerts || alerts.length === 0) continue;
        
        // Prepare digest email
        const alertIds = alerts.map(a => a.id);
        const emailSubject = 'PROSPERA.AI - Resumo Semanal de Alertas';
        
        let emailBody = `Olá,

Segue o resumo semanal dos seus alertas na PROSPERA.AI:

`;

        // Add each alert to the email body
        for (const alert of alerts) {
          emailBody += `
- ${alert.title} 
  ${alert.description}
  Data: ${new Date(alert.date).toLocaleDateString('pt-BR')}
  Prioridade: ${alert.priority === 'high' ? 'Alta' : alert.priority === 'medium' ? 'Média' : 'Baixa'}
`;
        }
        
        emailBody += `

Acesse a plataforma para mais detalhes: https://prospera.ai/smart-alerts

`;

        // Schedule the email notification
        const { error: insertError } = await supabase
          .from('scheduled_email_notifications')
          .insert({
            user_id: userSettings.user_id,
            alert_ids: alertIds,
            email_to: userEmail,
            email_subject: emailSubject,
            email_body: emailBody
          });
        
        if (insertError) throw insertError;
        
        // Update the last notification timestamp
        const { error: updateError } = await supabase
          .from('alert_notification_settings')
          .update({ 
            last_notification_sent: new Date().toISOString()
          })
          .eq('user_id', userSettings.user_id);
        
        if (updateError) throw updateError;
        
        result.digestsSent++;
      } catch (err) {
        console.error(`Error processing weekly digest for user ${userSettings.user_id}:`, err);
        result.errors++;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error processing weekly digests:', error);
    throw error;
  }
}