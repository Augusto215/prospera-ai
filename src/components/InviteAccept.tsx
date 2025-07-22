import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, AlertTriangle, ArrowRight, User, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<{
    email: string;
    role: string;
    ownerName: string;
  } | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    email: '', 
    password: '',
    fullName: ''
  });

  useEffect(() => {
    if (token) {
      verifyInvite();
    }
  }, [token]);

  const verifyInvite = useCallback(async () => {
    try {
      setLoading(true);
      
      // Verify the invite token with the backend
      const { data, error } = await supabase.functions.invoke('verify-invite', {
        body: { token }
      });
      
      if (error) {
        throw new Error(error.message || 'Erro ao verificar convite');
      }

      if (data && data.valid) {
        setInviteDetails({
          email: data.email,
          role: data.role,
          ownerName: data.ownerName
        });
        
        // Pre-fill the email field
        setFormData(prev => ({
          ...prev,
          email: data.email
        }));
        
        setShowAuthForm(true);
      } else {
        throw new Error('Convite inválido ou expirado');
      }
      
    } catch (err) {
      console.error('Error verifying invite:', err);
      setError('Este convite é inválido ou expirou. Por favor, solicite um novo convite.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleAcceptInvite = useCallback(async () => {
    try {
      setLoading(true);
      
      // Accept the invite through the backend
      const { data, error } = await supabase.functions.invoke('accept-invite', {
        body: { 
          token,
          userId: user?.id
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Erro ao aceitar convite');
      }

      setSuccess('Convite aceito com sucesso! Você agora tem acesso à conta compartilhada.');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Error accepting invite:', err);
      setError('Ocorreu um erro ao aceitar o convite. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [token, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (authMode === 'login') {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          setError(error.message);
          return;
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          setError(error.message);
          return;
        }
        
        // If signup successful, switch to login mode
        setAuthMode('login');
        setError('Conta criada com sucesso! Por favor, faça login para aceitar o convite.');
        return;
      }
      
      // If we get here, authentication was successful
      handleAcceptInvite();
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Ocorreu um erro durante a autenticação. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !inviteDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error && !showAuthForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Convite Inválido</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-all duration-200"
          >
            Voltar para a Página Inicial
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Convite Aceito!</h1>
          <p className="text-gray-600 mb-6">{success}</p>
          <div className="animate-pulse">
            <p className="text-sm text-gray-500">Redirecionando para o dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-blue-500" /> 
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Convite de Acesso</h1>
          <p className="text-gray-600">
            Você foi convidado por <strong>{inviteDetails?.ownerName}</strong> para acessar a conta com permissões de <strong>{inviteDetails?.role === 'viewer' ? 'Visualizador' : inviteDetails?.role === 'editor' ? 'Editor' : 'Administrador'}</strong>.
          </p>
        </div>

        <p className="text-gray-600">
          Este convite foi enviado para <strong>{inviteDetails?.email}</strong>. Por favor, faça login ou crie uma conta com este email para aceitar o convite.
        </p>

        {error && (
          <div className="bg-white border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Seu nome completo"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                readOnly={inviteDetails?.email ? true : false}
                placeholder="seu@email.com"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Sua senha"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
          >
            {loading ? (
              <span>Processando...</span>
            ) : (
              <>
                <span>{authMode === 'login' ? 'Entrar e Aceitar Convite' : 'Criar Conta'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
            >
              {authMode === 'login' 
                ? 'Não tem conta? Criar uma agora' 
                : 'Já tem conta? Fazer login'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}