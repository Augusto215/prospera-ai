import React from 'react';
import { Heart, X } from 'lucide-react';
import { useObserveLandingStore } from '../stores/LandingStore'
import RegisterWithPhone from './RegisterWithPhone';
import LoginForm from './LoginForm';

export default function AuthModal() {
  const store = useObserveLandingStore();
  
  if (!store.showAuthModal) return null;

  const handleSuccess = (userData?: any) => {
    if (userData) {
      store.setUser(userData);
    }
    store.closeModal();
  };

  const handleSwitchToRegister = () => {
    store.setAuthMode('register');
  };

  const handleSwitchToLogin = () => {
    store.setAuthMode('login');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-slideUp">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {store.authMode === 'login' ? 'Entrar' : 'Criar Conta'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {store.authMode === 'login' 
                  ? 'Acesse sua conta PROSPERA.AI' 
                  : 'Comece a controlar suas finanças'
                }
              </p>
              {store.isLoading && (
                <p className="text-blue-600 text-xs mt-1 flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                  {store.authMode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => store.closeModal()}
            disabled={store.isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {store.authMode === 'login' ? (
            <LoginForm 
              onSuccess={handleSuccess}
              onRegisterClick={handleSwitchToRegister}
            />
          ) : (
            <RegisterWithPhone 
              onSuccess={handleSuccess}
              onBack={handleSwitchToLogin}
            />
          )}
        </div>
      </div>
    </div>
  );
}