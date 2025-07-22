import React from 'react';
import { AlertTriangle, X, CreditCard, RefreshCw } from 'lucide-react';
import SubscriptionButton from './subscription/SubscriptionButton';
import { products } from '../stripe-config';

interface PaymentFailedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentFailedModal({ isOpen, onClose }: PaymentFailedModalProps) {
  if (!isOpen) return null;
  
  // When payment fails, redirect to subscription page
  React.useEffect(() => {
    if (isOpen) {
      // Force redirect to subscription page
      window.location.href = '/?tab=subscription';
    }
  }, [isOpen]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-slideUp">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Pagamento Recusado</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <p className="text-red-700">
              Infelizmente, seu último pagamento foi recusado. Para continuar utilizando o MyWealth 360, por favor atualize suas informações de pagamento.
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-3">
              <CreditCard className="h-5 w-5 text-gray-500" />
              <h3 className="font-medium text-gray-800">Atualizar método de pagamento</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Clique no botão abaixo para atualizar suas informações de pagamento e reativar sua assinatura.
            </p>
            <SubscriptionButton
              priceId={products[0].priceId}
              mode="subscription"
              className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar Pagamento</span>
            </SubscriptionButton>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p>
              Se precisar de ajuda, entre em contato com nosso suporte em <a href="mailto:suporte@prospera.ai" className="text-blue-600 hover:underline">suporte@prospera.ai</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}