import React, { useState } from 'react';
import { Phone, Shield, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PhoneVerificationProps {
  onVerified?: () => void;
  className?: string;
}

export default function PhoneVerification({ onVerified, className = '' }: PhoneVerificationProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!phone || !/^\(\d{2}\) \d{5}-\d{4}$/.test(phone)) {
      setError('Por favor, insira um número de telefone válido no formato (99) 99999-9999');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Update phone number in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone,
          phone_verified: false,
          phone_verification_status: 'pending'
        })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      // In a real app, this would trigger a serverless function to send SMS via Twilio
      // For demo, we'll simulate it by generating a code in the database
      
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (30 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      
      // Save to database
      const { error: codeError } = await supabase
        .from('profiles')
        .update({
          phone_verification_code: code,
          phone_verification_expires: expiresAt.toISOString(),
          phone_verification_attempts: 0
        })
        .eq('user_id', user.id);
      
      if (codeError) throw codeError;
      
      // In a real app, this would send an SMS via Twilio
      console.log(`Verification code: ${code}`); // For demo purposes only
      
      setSuccess('Código de verificação enviado! Verifique seu telefone.');
      setShowCodeInput(true);
    } catch (err) {
      console.error('Error sending verification code:', err);
      setError('Erro ao enviar código de verificação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Por favor, insira o código de 6 dígitos');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Get the current verification data
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('phone_verification_code, phone_verification_expires, phone_verification_attempts')
        .eq('user_id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Check if code has expired
      if (data.phone_verification_expires && new Date(data.phone_verification_expires) < new Date()) {
        setError('Código expirado. Solicite um novo código.');
        setLoading(false);
        return;
      }
      
      // Check if too many attempts
      if (data.phone_verification_attempts >= 5) {
        setError('Muitas tentativas. Solicite um novo código.');
        setLoading(false);
        return;
      }
      
      // Increment attempts
      await supabase
        .from('profiles')
        .update({
          phone_verification_attempts: (data.phone_verification_attempts || 0) + 1
        })
        .eq('user_id', user.id);
      
      // Check if code matches
      if (data.phone_verification_code !== verificationCode) {
        setError('Código inválido. Tente novamente.');
        setLoading(false);
        return;
      }
      
      // Code is valid, mark phone as verified
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone_verified: true,
          phone_verification_status: 'verified',
          phone_verification_code: null,
          phone_verification_expires: null
        })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      setSuccess('Telefone verificado com sucesso!');
      setShowCodeInput(false);
      
      // Call onVerified callback if provided
      if (onVerified) {
        onVerified();
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setError('Erro ao verificar código.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Format phone number as (99) 99999-9999
    let formattedValue = value.replace(/\D/g, ''); // Remove non-digits
    
    if (formattedValue.length <= 2) {
      formattedValue = formattedValue.replace(/^(\d{0,2})/, '($1');
    } else if (formattedValue.length <= 7) {
      formattedValue = formattedValue.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else {
      formattedValue = formattedValue.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    
    setPhone(formattedValue);
  };

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-blue-100 p-2 rounded-full">
          <Phone className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Verificação de Telefone</h3>
      </div>
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <p className="text-blue-700 font-medium">Por que verificar seu telefone?</p>
        </div>
        <p className="text-sm text-blue-600">
          A verificação de telefone adiciona uma camada extra de segurança à sua conta e permite que você receba notificações importantes.
        </p>
      </div>
      
      {!showCodeInput ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Número de Telefone
            </label>
            <input
              type="text"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(99) 99999-9999"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              maxLength={15}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: (99) 99999-9999
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading || !phone}
            className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span>{loading ? 'Enviando...' : 'Enviar Código de Verificação'}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Código de Verificação
            </label>
            <input
              type="text"
              id="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Digite o código de 6 dígitos"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              maxLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Digite o código de 6 dígitos enviado para {phone}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowCodeInput(false)}
              className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
            >
              {loading ? 'Verificando...' : 'Verificar Código'}
            </button>
          </div>
          
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading}
            className="w-full py-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reenviar código
          </button>
        </form>
      )}
    </div>
  );
}