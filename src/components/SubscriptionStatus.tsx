import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/formatters';
import { AlertTriangle } from 'lucide-react';

interface SubscriptionData {
  subscription_status: string | null;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
}

interface SubscriptionData {
  subscription_status: string | null;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
}

export default function SubscriptionStatus() {
  const { user, isInTrial, trialExpiresAt, trialDaysLeft } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentIssue, setPaymentIssue] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: subscriptionError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (subscriptionError) {
        throw subscriptionError;
      }

      console.log('Subscription data from DB:', data);
      
      // Check for payment issues
      if (data?.subscription_status === 'past_due' || data?.subscription_status === 'unpaid') {
        setPaymentIssue(true);
      } else {
        setPaymentIssue(false);
      }
      
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Erro ao carregar informações da assinatura');
    } finally {
      setLoading(false);
    }
  };

  // If there's a payment issue, show a warning
  if (paymentIssue) {
    return (
      <div className="text-white text-sm">
        <p className="text-xs text-red-300 mt-1 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Problema com pagamento. Atualize seus dados.
        </p>
      </div>
    );
  }

  // Show trial information if user is in trial period
  if (isInTrial) {
    return (
      <div className="text-white text-sm">
        <p className={`text-xs text-white/80 mt-1 flex items-center ${trialDaysLeft === 0 ? 'text-red-300' : ''}`}>
          <span className={`${trialDaysLeft > 0 ? 'bg-green-500' : 'bg-red-500'} h-2 w-2 rounded-full mr-1`}></span>
          Período de Teste: {trialDaysLeft > 0 ? `${trialDaysLeft} dias restantes` : 'Expirado'}
        </p>
      </div>
    );
  }

  // Show subscription information if user has an active subscription
  if (!subscription || !subscription.subscription_status || subscription.subscription_status === 'not_started') {
    return (
      <div className="text-white text-sm">
        <p className="text-xs text-white/80 mt-1">
          Sem assinatura ativa
        </p>
      </div>
    );
  }

  return (
    <div className="text-white text-sm">
      <p className="text-xs text-white/80 mt-1">
        Status: {subscription.subscription_status === 'active' ? 'Ativa' : 
                subscription.subscription_status === 'trialing' ? 'Em período de teste' : 
                subscription.subscription_status}
      </p>
      {subscription.current_period_end && (
        <p className="text-xs mt-1 text-white/80">
          {subscription.cancel_at_period_end 
            ? 'Cancela em: ' 
            : 'Próxima cobrança: '}{formatDate(subscription.current_period_end)}
        </p>
      )}
    </div>
  );
}