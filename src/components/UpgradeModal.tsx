import React from 'react';
import { Lock, CheckCircle, X, Crown } from 'lucide-react';
import SubscriptionButton from './subscription/SubscriptionButton';
import { products } from '../stripe-config';
import { useAuth } from '../contexts/AuthContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function UpgradeModal({ isOpen, onClose, featureName }: UpgradeModalProps) {
  const { isInTrial } = useAuth();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-slideUp">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Upgrade para Family</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center space-x-3 mb-2">
              <Lock className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-800">
                {featureName 
                  ? `"${featureName}" é um recurso exclusivo do plano Family` 
                  : isInTrial 
                    ? 'Recurso disponível após o período de teste' 
                    : 'Recurso Exclusivo do Plano Family'}
              </h3>
            </div>
            <p className="text-gray-700">
              Faça upgrade para o plano Family e tenha acesso a todos os recursos premium.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
            <h3 className="font-medium text-indigo-800 mb-2">Plano Family inclui:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Gestão completa de patrimônio e ativos</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Controle de imóveis e veículos</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Ativos exóticos e colecionáveis</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Gestão de funcionários</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Acesso compartilhado para família</span>
              </li>
            </ul>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
            >
              Mais tarde
            </button>
            <SubscriptionButton
              priceId={products[1].priceId}
              mode="subscription"
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
            >
              Fazer Upgrade
            </SubscriptionButton>
          </div>
        </div>
      </div>
    </div>
  );
}