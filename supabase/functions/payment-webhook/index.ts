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

    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Handle specific event types
    switch (event.type) {
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    
    // Get the user ID from the customer mapping
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();
    
    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return;
    }
    
    const userId = customerData.user_id;
    
    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);
    
    if (subscriptionError) {
      console.error('Error updating subscription status:', subscriptionError);
    }
    
    console.log(`Payment failed for user ${userId}. Subscription marked as past_due.`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    
    // Get the user ID from the customer mapping
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();
    
    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return;
    }
    
    const userId = customerData.user_id;
    
    // Update subscription in database
    const { error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .update({
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);
    
    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      return;
    }
    
    // Update user's plan in profiles table
    let plan = 'starter';
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Determine plan based on price ID
      // In a real app, you would have a mapping of price IDs to plans
      if (subscription.items.data[0].price.id === 'price_1Ri18dGlaiiCwjLcoXmjeH1N') {
        plan = 'family';
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          plan,
          is_in_trial: subscription.status === 'trialing',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (profileError) {
        console.error('Error updating user plan:', profileError);
      }
    }
    
    console.log(`Subscription updated for user ${userId}. New status: ${subscription.status}, Plan: ${plan}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    
    // Get the user ID from the customer mapping
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();
    
    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return;
    }
    
    const userId = customerData.user_id;
    
    // Update subscription in database
    const { error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);
    
    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      return;
    }
    
    // Downgrade user to starter plan
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        plan: 'starter',
        is_in_trial: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (profileError) {
      console.error('Error updating user plan:', profileError);
    }
    
    console.log(`Subscription canceled for user ${userId}. Downgraded to starter plan.`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const customerId = session.customer as string;
    
    // Get the user ID from the customer mapping
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();
    
    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return;
    }
    
    const userId = customerData.user_id;
    
    // If this is a subscription checkout
    if (session.mode === 'subscription') {
      // The subscription details will be handled by the subscription.created event
      console.log(`Subscription checkout completed for user ${userId}`);
    }
    // If this is a one-time payment
    else if (session.mode === 'payment') {
      // Record the payment
      const { error: orderError } = await supabase
        .from('stripe_orders')
        .insert({
          checkout_session_id: session.id,
          payment_intent_id: session.payment_intent as string,
          customer_id: customerId,
          amount_subtotal: session.amount_subtotal || 0,
          amount_total: session.amount_total || 0,
          currency: session.currency || 'brl',
          payment_status: session.payment_status || 'unpaid',
          status: 'completed'
        });
      
      if (orderError) {
        console.error('Error recording order:', orderError);
      }
      
      console.log(`One-time payment completed for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}