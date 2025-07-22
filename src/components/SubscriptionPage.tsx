import React from 'react';
import { Crown, CheckCircle, Lock, Home, Car, Gem, Users, Target, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SubscriptionButton from './subscription/SubscriptionButton';
import { products } from '../stripe-config';

export default function SubscriptionPage() {
  const { userPlan, isInTrial, trialExpiresAt, trialDaysLeft } = useAuth();
  
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Planos de Assinatura</h1>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Escolha o plano ideal para transformar seu patrimônio e alcançar seus objetivos financeiros
        </p>

        {isInTrial && trialDaysLeft === 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-red-700 font-medium">
              Seu período de teste expirou. Escolha um plano para continuar.
            </p>
          </div>
        )}
        
        {userPlan && (
          <div className="mt-4 inline-block">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-medium flex items-center text-gray-800">
                <Crown className="h-5 w-5 mr-2 text-green-600" />
                Plano atual: {userPlan === 'family' ? 'Family' : 'Starter'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Starter Plan */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className="p-8 border-b border-gray-200">
            <h3 className="font-bold text-xl text-blue-600">Starter</h3>
            <p className="text-gray-600 mt-2">Controle financeiro essencial</p>
            <p className="text-3xl mt-4 font-bold text-blue-600">R$ 79,90<span className="text-sm text-gray-500">/mês</span></p>
            <div className="mt-2 text-green-700 text-sm flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>7 dias grátis, sem cartão necessário</span>
            </div>
            <div className="mt-2 text-blue-600 text-sm flex items-center justify-center">
              <span>Acesso a recursos essenciais</span>
            </div>
          </div>
          
          <div className="p-8">
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Dashboard básico</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Até 500 transações/mês</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Gestão de receitas e despesas</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Controle de investimentos</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Relatórios básicos</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Suporte por email</span>
              </li>
            </ul>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="font-medium text-gray-700 mb-3">Módulos bloqueados:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center text-gray-600">
                  <Lock className="h-4 w-4 mr-2" /> 
                  <span className="text-sm">Imóveis</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Lock className="h-4 w-4 mr-2" /> 
                  <span className="text-sm">Veículos</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Lock className="h-4 w-4 mr-2" /> 
                  <span className="text-sm">Ativos Exóticos</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Lock className="h-4 w-4 mr-2" /> 
                  <span className="text-sm">Funcionários</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Lock className="h-4 w-4 mr-2" /> 
                  <span className="text-sm">Gestão de Patrimônio</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Lock className="h-4 w-4 mr-2" /> 
                  <span className="text-sm">IA Insights</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-8 pb-8">
            <SubscriptionButton
              priceId={products[0].priceId}
              mode="subscription"
              className="w-full py-3 rounded-xl font-semibold transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Começar Gratuitamente
            </SubscriptionButton>
            <p className="text-xs text-center text-green-600 font-medium mt-2">
              Sem cartão necessário para o período de teste.
            </p>
          </div>
        </div>

        {/* Family Plan */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              Mais Popular
            </div>
          </div>
          
          <div className="p-8 border-b border-gray-200">
            <h3 className="font-bold text-xl text-blue-600">Family</h3>
            <p className="text-gray-600 mt-2">Controle patrimonial completo</p>
            <p className="text-3xl mt-4 font-bold text-blue-600">R$ 129,90<span className="text-sm text-gray-500">/mês</span></p>
          </div>
          
          <div className="p-8">
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Tudo do Starter</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Transações ilimitadas</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Gestão completa de patrimônio</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Controle de imóveis e veículos</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Ativos exóticos e colecionáveis</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Gestão de funcionários</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">IA Financeira avançada</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Automação total</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Suporte prioritário 24/7</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-800">Acesso compartilhado para família</span>
              </li>
            </ul>
          </div>
          
          <div className="px-8 pb-8">
            <SubscriptionButton
              priceId={products[1].priceId}
              mode="subscription"
              className="w-full py-3 rounded-xl font-semibold transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Assinar Agora
            </SubscriptionButton>
            <p className="text-xs text-center text-gray-500 mt-2">
              Inclui 7 dias de teste grátis
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-12 max-w-3xl mx-auto bg-blue-50 p-6 rounded-xl">
        <div className="flex flex-wrap items-center justify-center gap-4 text-gray-800">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            <span>7 dias grátis sem cartão</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            <span>Cancele quando quiser</span>
          </div>
        </div>
      </div>
    </div>
  );
}