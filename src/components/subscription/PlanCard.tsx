import React from 'react';
import { CheckCircle } from 'lucide-react';
import SubscriptionButton from './SubscriptionButton';

interface RestrictedModule {
  name: string;
  icon: React.ComponentType<any>; 
}

interface PlanCardProps {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  priceId: string;
  popular?: boolean;
  restrictedModules?: RestrictedModule[];
}

export default function PlanCard({
  name,
  description,
  price,
  period,
  features,
  priceId,
  popular = false,
  restrictedModules
}: PlanCardProps) {
  return (
    <div className={`bg-white p-8 rounded-2xl shadow-lg border-2 ${
      popular ? 'border-blue-500 relative' : 'border-gray-100'
    }`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Mais Popular
          </div>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex items-baseline justify-center">
          <span className="text-4xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-600 ml-1">{period}</span>
        </div>
      </div>
      
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>
      
      {restrictedModules && (
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-500 mb-3">Módulos bloqueados:</p>
          <div className="grid grid-cols-2 gap-2">
            {restrictedModules.map((module, index) => (
              <div key={index} className="flex items-center space-x-2 text-gray-400">
                <module.icon className="h-4 w-4" /> 
                <span className="text-sm">{module.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <SubscriptionButton
        priceId={priceId} 
        mode="subscription"
        className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
          popular ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
         }`} 
      >
         {name.includes('Starter') ? 'Começar Gratuitamente' : 'Assinar Agora'}
      </SubscriptionButton>
    </div>
  );
}