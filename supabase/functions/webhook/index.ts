import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'MyWealth 360 Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Process the event
    await handleEvent(event);

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = stripeData as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    
    if (!customerId) {
      console.error('No customer ID in checkout session');
      return;
    }

    // For subscription mode, sync the subscription
    if (session.mode === 'subscription') {
      console.log(`Processing subscription checkout for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
      
      // Update user's plan in the profiles table
      await updateUserPlan(customerId);
    } 
    // For one-time payment mode, record the order
    else if (session.mode === 'payment' && session.payment_status === 'paid') {
      console.log(`Processing one-time payment for customer: ${customerId}`);
      await recordOrder(session);
    }
  }
  // Handle subscription updated event
  else if (event.type === 'customer.subscription.updated') {
    const subscription = stripeData as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    console.log(`Subscription updated for customer: ${customerId}`);
    await syncCustomerFromStripe(customerId);
    await updateUserPlan(customerId);
  }
  // Handle subscription deleted event
  else if (event.type === 'customer.subscription.deleted') {
    const subscription = stripeData as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    console.log(`Subscription deleted for customer: ${customerId}`);
    await syncCustomerFromStripe(customerId);
    await updateUserPlan(customerId, true); // downgrade to starter plan
  }
}

// Update user's plan in the profiles table based on subscription
async function updateUserPlan(customerId: string, downgrade = false) {
  try {
    // Get the user ID from the customer mapping
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();
    
    if (customerError || !customerData) {
      console.error('Error fetching customer data:', customerError);
      return;
    }
    
    const userId = customerData.user_id;
    
    if (downgrade) {
      // Downgrade to starter plan
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          plan: 'starter',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error downgrading user plan:', updateError);
      } else {
        console.log(`User ${userId} downgraded to starter plan`);
      }
      
      return;
    }
    
    // Get the subscription details
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .select('price_id, status')
      .eq('customer_id', customerId)
      .single();
    
    if (subscriptionError || !subscriptionData) {
      console.error('Error fetching subscription data:', subscriptionError);
      return;
    }
    
    // Only update if subscription is active or trialing
    if (subscriptionData.status !== 'active' && subscriptionData.status !== 'trialing') {
      console.log(`Subscription not active for user ${userId}, status: ${subscriptionData.status}`);
      return;
    }
    
    // Determine plan based on price ID
    let plan = 'starter';
    if (subscriptionData.price_id === 'price_1Ri18dGlaiiCwjLcoXmjeH1N') {
      plan = 'family';
    }
    
    // Update the user's plan
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        plan,
        is_in_trial: false, // User has a paid subscription, so not in trial
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Error updating user plan:', updateError);
    } else {
      console.log(`User ${userId} plan updated to ${plan}`);
    }
  } catch (error) {
    console.error('Error in updateUserPlan:', error);
  }
}

// Record a one-time payment order
async function recordOrder(session: Stripe.Checkout.Session) {
  try {
    const {
      id: checkout_session_id,
      payment_intent,
      customer: customerId,
      amount_subtotal,
      amount_total,
      currency,
      payment_status,
    } = session;

    // Insert the order into the database
    const { error: orderError } = await supabase.from('stripe_orders').insert({
      checkout_session_id,
      payment_intent_id: payment_intent as string,
      customer_id: customerId as string,
      amount_subtotal: amount_subtotal || 0,
      amount_total: amount_total || 0,
      currency: currency || 'brl',
      payment_status: payment_status || 'unpaid',
      status: 'completed',
    });

    if (orderError) {
      console.error('Error inserting order:', orderError);
    } else {
      console.log(`Order recorded for session ${checkout_session_id}`);
    }
  } catch (error) {
    console.error('Error in recordOrder:', error);
  }
}

// Sync customer subscription data from Stripe
async function syncCustomerFromStripe(customerId: string) {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // If no subscriptions, update status to not_started
    if (subscriptions.data.length === 0) {
      console.log(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
      }
      return;
    }

    // Get the most recent subscription
    const subscription = subscriptions.data[0];

    // Store subscription state in database
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
    } else {
      console.log(`Successfully synced subscription for customer: ${customerId}`);
    }
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
  }
}