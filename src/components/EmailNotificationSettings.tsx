import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Clock, 
  CheckSquare, 
  Save, 
  AlertTriangle,
  Calendar,
  FileText,
  Users,
  TrendingDown,
  CheckCircle,
  Landmark,
  Home,
  Building,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface NotificationSettings {
  id: string;
  email_notifications_enabled: boolean;
  bill_alerts_enabled: boolean;
  employee_alerts_enabled: boolean;
  expense_alerts_enabled: boolean;
  achievement_alerts_enabled: boolean;
  tax_alerts_enabled: boolean;
  asset_alerts_enabled: boolean;
  investment_alerts_enabled: boolean;
  notification_frequency: 'immediate' | 'daily' | 'weekly';
  notification_time: string;
  notification_email: string | null;
  last_notification_sent: string | null;
}

export default function EmailNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formChanged, setFormChanged] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('alert_notification_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        // If no settings found, create default settings
        if (error.code === 'PGRST116') {
          const defaultSettings = {
            user_id: user?.id,
            email_notifications_enabled: true,
            bill_alerts_enabled: true,
            employee_alerts_enabled: true,
            expense_alerts_enabled: true,
            achievement_alerts_enabled: true,
            tax_alerts_enabled: true,
            asset_alerts_enabled: true,
            investment_alerts_enabled: true,
            notification_frequency: 'immediate',
            notification_time: '08:00:00',
            notification_email: null
          };
          
          const { data: newData, error: insertError } = await supabase
            .from('alert_notification_settings')
            .insert([defaultSettings])
            .select()
            .single();
          
          if (insertError) throw insertError;
          
          setSettings(newData);
        } else {
          throw error;
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      setError('Erro ao carregar configurações de notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setSettings(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
    });
    
    setFormChanged(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const { error } = await supabase
        .from('alert_notification_settings')
        .update({
          email_notifications_enabled: settings.email_notifications_enabled,
          bill_alerts_enabled: settings.bill_alerts_enabled,
          employee_alerts_enabled: settings.employee_alerts_enabled,
          expense_alerts_enabled: settings.expense_alerts_enabled,
          achievement_alerts_enabled: settings.achievement_alerts_enabled,
          tax_alerts_enabled: settings.tax_alerts_enabled,
          asset_alerts_enabled: settings.asset_alerts_enabled,
          investment_alerts_enabled: settings.investment_alerts_enabled,
          notification_frequency: settings.notification_frequency,
          notification_time: settings.notification_time,
          notification_email: settings.notification_email,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      setSuccess('Configurações de notificações salvas com sucesso!');
      setFormChanged(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setError('Erro ao salvar configurações de notificações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Mail className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Configurações de Alertas por Email</h2>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-700 mb-1">Sobre Alertas por Email</h3>
              <p className="text-blue-600 text-sm">
                Configure como e quando deseja receber alertas por email. Os alertas também estarão sempre disponíveis na plataforma, independentemente destas configurações.
              </p>
            </div>
          </div>
        </div>
        
        {/* Main toggle */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-gray-700" />
            <div>
              <h3 className="font-medium text-gray-800">Alertas por Email</h3>
              <p className="text-sm text-gray-600">Ativar ou desativar todos os alertas por email</p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              name="email_notifications_enabled"
              checked={settings?.email_notifications_enabled || false}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {/* Notification Frequency */}
        <div className={`space-y-3 ${settings?.email_notifications_enabled ? '' : 'opacity-50 pointer-events-none'}`}>
          <label className="block text-sm font-medium text-gray-700">Frequência de Notificações</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="relative block cursor-pointer">
              <input 
                type="radio"
                name="notification_frequency"
                value="immediate"
                checked={settings?.notification_frequency === 'immediate'}
                onChange={handleChange}
                className="sr-only peer"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="p-4 border-2 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all duration-200">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-gray-700 peer-checked:text-blue-600" />
                  <span className="font-medium">Imediato</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Receba alertas assim que ocorrerem
                </p>
              </div>
            </label>
            
            <label className="relative block cursor-pointer">
              <input 
                type="radio"
                name="notification_frequency"
                value="daily"
                checked={settings?.notification_frequency === 'daily'}
                onChange={handleChange}
                className="sr-only peer"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="p-4 border-2 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all duration-200">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-700 peer-checked:text-blue-600" />
                  <span className="font-medium">Diário</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Resumo diário de todos os alertas
                </p>
              </div>
            </label>
            
            <label className="relative block cursor-pointer">
              <input 
                type="radio"
                name="notification_frequency"
                value="weekly"
                checked={settings?.notification_frequency === 'weekly'}
                onChange={handleChange}
                className="sr-only peer"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="p-4 border-2 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all duration-200">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-700 peer-checked:text-blue-600" />
                  <span className="font-medium">Semanal</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Resumo semanal de todos os alertas
                </p>
              </div>
            </label>
          </div>
        </div>
        
        {/* Additional Email */}
        <div className={settings?.email_notifications_enabled ? '' : 'opacity-50 pointer-events-none'}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Adicional para Alertas (opcional)
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              name="notification_email"
              value={settings?.notification_email || ''}
              onChange={handleChange}
              placeholder="Email adicional para receber alertas"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              disabled={!settings?.email_notifications_enabled}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Deixe em branco para receber apenas no seu email principal.
          </p>
        </div>
        
        {/* Alert Type Settings */}
        <div className={settings?.email_notifications_enabled ? '' : 'opacity-50 pointer-events-none'}>
          <h3 className="font-medium text-gray-800 mb-3">Tipos de Alertas por Email</h3>
          
          <div className="space-y-3 border border-gray-200 rounded-lg p-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="bill_alerts_enabled"
                checked={settings?.bill_alerts_enabled || false}
                onChange={handleChange}
                className="rounded text-blue-600 focus:ring-blue-500"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Contas a Vencer</span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="employee_alerts_enabled"
                checked={settings?.employee_alerts_enabled || false}
                onChange={handleChange}
                className="rounded text-blue-600 focus:ring-blue-500"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Funcionários (Férias, FGTS)</span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="expense_alerts_enabled"
                checked={settings?.expense_alerts_enabled || false}
                onChange={handleChange}
                className="rounded text-blue-600 focus:ring-blue-500"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span>Gastos Excessivos</span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="achievement_alerts_enabled"
                checked={settings?.achievement_alerts_enabled || false}
                onChange={handleChange}
                className="rounded text-blue-600 focus:ring-blue-500"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Conquistas Financeiras</span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="tax_alerts_enabled"
                checked={settings?.tax_alerts_enabled || false}
                onChange={handleChange}
                className="rounded text-blue-600 focus:ring-blue-500"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="flex items-center space-x-2">
                <Landmark className="h-4 w-4 text-indigo-600" />
                <span>Impostos</span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="asset_alerts_enabled"
                checked={settings?.asset_alerts_enabled || false}
                onChange={handleChange}
                className="rounded text-blue-600 focus:ring-blue-500"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="flex items-center space-x-2">
                <Home className="h-4 w-4 text-orange-600" />
                <span>Ativos (Imóveis, Veículos)</span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="investment_alerts_enabled"
                checked={settings?.investment_alerts_enabled || false}
                onChange={handleChange}
                className="rounded text-blue-600 focus:ring-blue-500"
                disabled={!settings?.email_notifications_enabled}
              />
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-blue-600" />
                <span>Investimentos</span>
              </div>
            </label>
          </div>
        </div>
        
        {/* Notification Time (for daily/weekly) */}
        {(settings?.notification_frequency === 'daily' || settings?.notification_frequency === 'weekly') && settings?.email_notifications_enabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Horário de Envio
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="time"
                name="notification_time"
                value={settings?.notification_time?.slice(0, 5) || '08:00'}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        )}
        
        {settings?.last_notification_sent && (
          <div className="text-sm text-gray-600">
            <p>Último alerta enviado: {new Date(settings.last_notification_sent).toLocaleString('pt-BR')}</p>
          </div>
        )}
        
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving || !formChanged}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}