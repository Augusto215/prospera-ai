import React from 'react';
import { Brain, BarChart3, Shield, Target, PieChart, Zap } from 'lucide-react';
import FeatureCard from './FeatureCard';

const features = [
  {
    icon: Brain,
    title: 'IA Financeira Avançada',
    description: 'Assistente inteligente que analisa seus gastos e oferece insights personalizados para otimizar suas finanças.',
    color: 'bg-indigo-600'
  },
  {
    icon: BarChart3,
    title: 'Dashboard Completo',
    description: 'Visão 360° do seu patrimônio com gráficos interativos e métricas em tempo real.',
    color: 'bg-blue-600'
  },
  {
    icon: Shield,
    title: 'Gestão de Patrimônio',
    description: 'Acompanhe investimentos, imóveis, previdência e evolução patrimonial vs inflação e CDI.',
    color: 'bg-green-600'
  },
  {
    icon: Target,
    title: 'Planejamento Inteligente',
    description: 'Metas financeiras automáticas baseadas no seu perfil e objetivos de vida.',
    color: 'bg-orange-600'
  },
  {
    icon: PieChart,
    title: 'Análise Avançada',
    description: 'Relatórios detalhados com análise de tendências e projeções futuras.',
    color: 'bg-teal-600'
  },
  {
    icon: Zap,
    title: 'Automação Total',
    description: 'Renovação automática de receitas e despesas mensais. Nunca mais esqueça um pagamento.',
    color: 'bg-purple-600'
  }
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Recursos que Transformam seu Patrimônio
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto">
            Tecnologia de ponta para automatizar, analisar e otimizar cada aspecto da sua vida financeira e patrimonial.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}