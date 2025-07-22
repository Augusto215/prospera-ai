import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { useObserveLandingStore } from '../stores/LandingStore';

export default function Header() {
  const store = useObserveLandingStore();

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">PROSPERA.AI</h1>
            <span className="text-sm text-gray-500 border-l border-gray-200 pl-2">Gestão Financeira</span>
          </Link>

          {/* Center - Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-800 transition-colors">Recursos</a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-800 transition-colors">Depoimentos</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-800 transition-colors">Preços</a>
          </nav>

          {/* Right side - Auth buttons */}
          <div className="flex items-center space-x-4">
              <button
                onClick={() => store.openLoginModal()}
                disabled={store.isLoading}
                className={`text-gray-600 hover:text-gray-800 transition-colors ${store.showAuthModal && store.authMode === 'login' ? 'text-blue-600' : ''
                  } disabled:opacity-50`}
              >
                {store.isLoading && store.authMode === 'login' ? 'Entrando...' : 'Entrar'}
              </button>
              <Button
                onClick={() => store.openRegisterModal()}
                disabled={store.isLoading}
                className={`bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm ${store.isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {store.isLoading && store.authMode === 'register' ? 'Criando...' : 'Começar Agora'}
              </Button>
          </div>
        </div>
      </div>
    </header>
  );
}