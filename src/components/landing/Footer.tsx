import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-blue-600 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold text-white mb-2">PROSPERA.AI</h2>
          <p className="text-sm text-white/80">Gestão Financeira</p>
          <p className="text-white/60 text-sm mt-4">&copy; 2025 PROSPERA.AI. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}