import React from 'react';
import { Zap, ArrowRight, MessageCircle, CheckCircle, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import { products } from '../../stripe-config';
import SubscriptionButton from '../subscription/SubscriptionButton';

export default function HeroSection() {
  return (
    <section className="pt-20 sm:pt-24 pb-16 sm:pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-white rounded-3xl -z-10"></div>
        <div className="text-center py-8 sm:py-12">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            <span>Teste Grátis por 7 Dias • Cancele quando quiser</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">PROSPERA.AI</span>
            <span className="block">Controle Patrimonial Familiar Inteligente</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            A primeira plataforma de gestão patrimonial com IA que integra receitas, despesas e ativos para maximizar seu patrimônio e acelerar o crescimento da sua riqueza.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <SubscriptionButton
              priceId={products[0].priceId}
              mode="subscription"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-sm"
            >
              <span>Começar Teste Grátis</span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </SubscriptionButton>
            
            <Button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 shadow-sm">
              <MessageCircle className="h-5 w-5" />
              <span>Ver Demo</span>
            </Button>
          </div>
          
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>7 dias grátis, sem cobranças</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <span>Cartão necessário</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}