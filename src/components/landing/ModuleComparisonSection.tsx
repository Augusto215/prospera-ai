import React from 'react';
import { BarChart3, FileText, TrendingUp, Building, Shield, Home, Car, Gem, Users, Brain, CheckCircle, Lock, Target } from 'lucide-react';

export default function ModuleComparisonSection() {
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Comparação de Módulos
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Veja quais recursos estão disponíveis em cada plano
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-4 px-6 text-left text-gray-500 font-medium">Módulo</th>
                  <th className="py-4 px-6 text-center text-gray-500 font-medium">Starter</th>
                  <th className="py-4 px-6 text-center text-gray-500 font-medium">Family</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { name: 'Dashboard', icon: BarChart3, starter: true, family: true },
                  { name: 'Transações', icon: FileText, starter: true, family: true },
                  { name: 'Renda', icon: TrendingUp, starter: true, family: true },
                  { name: 'Contas Bancárias', icon: Building, starter: true, family: true },
                  { name: 'Investimentos', icon: Building, starter: true, family: true },
                  { name: 'Previdência', icon: Shield, starter: true, family: true },
                  { name: 'Empréstimos', icon: FileText, starter: true, family: true },
                  { name: 'Contas', icon: FileText, starter: true, family: true },
                  { name: 'Documentos', icon: FileText, starter: true, family: true }, 
                  { name: 'Imóveis', icon: Home, starter: false, family: true },
                  { name: 'Veículos', icon: Car, starter: false, family: true },
                  { name: 'Ativos Exóticos', icon: Gem, starter: false, family: true },
                  { name: 'Funcionários', icon: Users, starter: false, family: true },
                  { name: 'Acesso Compartilhado', icon: Users, starter: false, family: true },
                  { name: 'Gestão de Patrimônio', icon: Target, starter: false, family: true },
                  { name: 'IA Insights', icon: Brain, starter: false, family: true },
                ].map((module, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <module.icon className="h-5 w-5 text-gray-500" />
                        <span className="font-medium text-gray-900">{module.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {module.starter ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                      ) : ( 
                        <Lock className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}