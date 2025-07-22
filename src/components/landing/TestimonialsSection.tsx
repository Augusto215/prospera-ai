import React from 'react';
import TestimonialCard from './TestimonialCard';

const testimonials = [
  {
    name: 'Maria Silva',
    role: 'Empresária',
    content: 'O PROSPERA.AI revolucionou como gerencio meu patrimônio. A IA me ajudou a economizar 30% em 6 meses!',
    rating: 5
  },
  {
    name: 'João Santos',
    role: 'Investidor',
    content: 'Finalmente encontrei uma plataforma que entende minhas necessidades. Os insights são incríveis!',
    rating: 5
  },
  {
    name: 'Ana Costa',
    role: 'Profissional Liberal',
    content: 'A automação das finanças me deu tempo para focar no que realmente importa. Recomendo!',
    rating: 5
  }
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg sm:text-xl text-gray-700">
            Milhares de famílias já transformaram seu patrimônio com o PROSPERA.AI
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              name={testimonial.name}
              role={testimonial.role}
              content={testimonial.content}
              rating={testimonial.rating}
            />
          ))}
        </div>
      </div>
    </section>
  );
}