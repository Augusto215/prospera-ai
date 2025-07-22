import React from 'react';
import { products } from '../../stripe-config';
import { Home, Car, Gem, Users, Target, CreditCard, Calendar, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from '../auth/AuthModal';

export default function PricingSection() {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const { user } = useAuth();

  // Define the plans with updated pricing
  const plans = [
    {
      name: 'Starter',
      price: 'R$ 79,90',
      period: '/mês',
      description: 'Controle financeiro essencial',
      features: [
        'Dashboard básico',
        'Até 500 transações/mês',
        'Gestão de receitas e despesas',
        'Controle de investimentos',
        'Relatórios básicos',
        'Suporte por email'
      ],
      priceId: products[0].priceId,
      popular: false,
      restrictedModules: [
        { icon: Home, name: 'Imóveis' }, 
        { icon: Car, name: 'Veículos' }, 
        { icon: Gem, name: 'Ativos Exóticos' }, 
        { icon: Users, name: 'Funcionários' }, 
        { icon: Target, name: 'Gestão de Patrimônio' } 
      ]
    },
    {
      name: 'Family',
      price: 'R$ 129,90',
      period: '/mês',
      description: 'Controle patrimonial completo',
      features: [
        'Tudo do Starter',
        'Transações ilimitadas',
        'Gestão completa de patrimônio',
        'Controle de imóveis e veículos',
        'Ativos exóticos e colecionáveis',
        'Gestão de funcionários',
        'IA Financeira avançada',
        'Automação total',
        'Suporte prioritário 24/7',
        'Acesso compartilhado para família'
      ],
      priceId: products[1].priceId,
      popular: true
    }
  ];

  const handlePlanClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      // If user is logged in, redirect to dashboard
      window.location.href = '/';
    }
  };

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4"> 
            Planos para cada necessidade
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Escolha o plano ideal para transformar seu patrimônio
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-xl inline-flex">
            <CreditCard className="h-4 w-4 text-blue-500" />
            <span>Experimente grátis por 7 dias - Cancele quando quiser</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`bg-white rounded-xl shadow-md ${plan.popular ? 'border-2 border-blue-500 relative' : 'border border-gray-200'}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Mais Popular
                  </div>
                </div>
              )}
              <div className="p-8 border-b border-gray-200">
                <h3 className="font-bold text-xl">{plan.name}</h3>
                <p className="text-gray-500 mt-2">{plan.description}</p>
                <p className="text-3xl mt-4 font-bold">{plan.price}<span className="text-sm text-gray-500">{plan.period}</span></p>
                {plan.name === 'Starter' && (
                  <div className="mt-2 text-green-700 text-sm flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span>7 dias grátis, sem cartão necessário</span>
                  </div>
                )}
              </div>
              
              <div className="p-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-800">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {plan.restrictedModules && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="font-medium text-gray-700 mb-3">Módulos bloqueados:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {plan.restrictedModules.map((module, idx) => (
                        <div key={idx} className="flex items-center text-gray-600">
                          <Lock className="h-4 w-4 mr-2" /> 
                          <span className="text-sm">{module.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-8 pb-8">
                <button
                  onClick={handlePlanClick}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                  }`}
                >
                  {plan.name === 'Starter' ? 'Começar Gratuitamente' : 'Assinar Agora'}
                </button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  <span className="text-gray-600">{plan.name === 'Starter' 
                    ? 'Cartão necessário. Sem cobrança nos primeiros 7 dias.'
                    : 'Inclui 7 dias de teste grátis'}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 max-w-3xl mx-auto bg-white border border-blue-200 p-6 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-700">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              <span>7 dias grátis sem cartão</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-500" />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        initialMode="register" 
      />
    </section>
  );
}