import React from 'react';
import SubscriptionButton from '../subscription/SubscriptionButton';
import { products } from '../../stripe-config';

export default function CTASection() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Pronto para transformar seu patrimônio?
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Junte-se a milhares de famílias que já estão no controle total do seu dinheiro e patrimônio.
        </p>
        <div className="flex flex-col items-center">
          <SubscriptionButton
            priceId={products[0].priceId}
            mode="subscription"
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm"
          >
            Começar Teste Grátis
          </SubscriptionButton>
          <p className="text-sm text-white/80 mt-3">7 dias grátis, depois R$ 79,90/mês. Cancele quando quiser.</p>
          <p className="text-sm text-white/80 mt-1">Sem necessidade de cartão para o período de teste.</p>
        </div>
      </div>
    </section>
  );
}