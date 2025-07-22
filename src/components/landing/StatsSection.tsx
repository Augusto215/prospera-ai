import React from 'react';
import Counter from './../ui/Counter'; // ajuste o caminho conforme necessário

export default function StatsSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">
              <Counter targetNumber={50000} suffix="+" />
            </div>
            <div className="text-blue-100">Usuários Ativos</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">
              <Counter targetNumber={2_000_000_000} prefix="R$ " suffix="+" />
            </div>
            <div className="text-blue-100">Patrimônio Gerenciado</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">
              <Counter targetNumber={98} suffix="%" />
            </div>
            <div className="text-blue-100">Satisfação dos Clientes</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">
              <Counter targetNumber={30} suffix="%" />
            </div>
            <div className="text-blue-100">Economia Média</div>
          </div>
        </div>
      </div>
    </section>
  );
}