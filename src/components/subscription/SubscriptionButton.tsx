import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import { Loader2 } from 'lucide-react';

interface SubscriptionButtonProps {
  priceId: string;
  children: React.ReactNode;
  mode?: 'subscription' | 'payment';
  className?: string; 
}

export default function SubscriptionButton({
  priceId,
  children,
  mode = 'subscription', 
  className = '', 
}: SubscriptionButtonProps) {
  const { user, isInTrial, trialDaysLeft } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      alert('Por favor, faça login para continuar.');
      return;
    }

    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // For trial period, don't require payment method
      if (isInTrial && trialDaysLeft > 0 && mode === 'subscription' && priceId === products[0].priceId) {
        // For starter plan during trial, just redirect to dashboard
        window.location.href = '/';
        return;
      }

      if (sessionError) {
        throw new Error('Erro ao obter sessão do usuário');
      } 

      // Use the create-checkout edge function URL
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/cancel`,
          mode: mode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Checkout error response:', errorData);
        throw new Error(errorData.error || 'Erro ao processar pagamento. Por favor, tente novamente.'); 
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL de checkout não encontrada');
      }
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
      alert('Ocorreu um erro ao processar sua solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSubscribe}
      disabled={loading}
      className={className}
    > 
      {loading ? (
        <span className="flex items-center justify-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processando...</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}