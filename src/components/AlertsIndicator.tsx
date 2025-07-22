import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
  actionPath?: string;
  actionLabel?: string;
}

export default function AlertsIndicator() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
    
    // Set up interval to periodically check for new alerts
    const interval = setInterval(fetchAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);
  
  useEffect(() => {
    // Update unread count whenever alerts change
    setUnreadCount(alerts.filter(a => !a.isRead).length);
  }, [alerts]);
  
  const fetchAlerts = async () => {
    if (!user) return;
    
    try {
      // In a real implementation, you would fetch alerts from a database table
      // For this demo, we're simulating with local data generation
      
      // Call our generateAlerts function or API endpoint
      const { data: alertsData, error: alertsError } = await supabase.functions.invoke('generate-alerts', {
        body: { userId: user.id }
      });
      
      if (alertsError) {
        console.error('Error fetching alerts:', alertsError);
        return;
      }
      
      // If we have real data, use it
      if (alertsData && Array.isArray(alertsData)) {
        setAlerts(alertsData);
        return;
      }
      
      // Otherwise use mock alerts
      generateMockAlerts();
    } catch (err) {
      console.error('Error in fetchAlerts:', err);
    }
  };
  
  const generateMockAlerts = () => {
    // Mock alerts for demo purposes
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'bill',
        title: 'Conta de água vence em 2 dias',
        description: 'Sabesp - R$ 120,00',
        date: new Date().toISOString(),
        priority: 'high',
        isRead: false,
        actionPath: '/bills',
        actionLabel: 'Ver Conta'
      },
      {
        id: '2',
        type: 'employee',
        title: 'Férias do motorista João',
        description: 'Programada para 15/08/2025',
        date: new Date().toISOString(),
        priority: 'medium',
        isRead: false,
        actionPath: '/employees',
        actionLabel: 'Ver Funcionário'
      },
      {
        id: '3',
        type: 'tax',
        title: 'FGTS vence em 5 dias',
        description: 'Valor: R$ 384,00',
        date: new Date().toISOString(),
        priority: 'medium',
        isRead: false,
        actionPath: '/bills',
        actionLabel: 'Ver Detalhes'
      }
    ];
    
    setAlerts(mockAlerts);
  };
  
  const markAsRead = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, isRead: true } : alert
    ));
  };
  
  const handleAlertClick = (alert: Alert) => {
    markAsRead(alert.id);
    if (alert.actionPath) {
      window.location.href = alert.actionPath;
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="relative">
      <button
        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors relative"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-medium text-gray-800">Notificações</h3>
            <button 
              className="text-gray-400 hover:text-gray-600 p-1"
              onClick={() => setShowDropdown(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nenhuma notificação no momento
              </div>
            ) : (
              <>
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-3 hover:bg-gray-50 cursor-pointer border-l-2 ${
                      !alert.isRead ? `${getPriorityColor(alert.priority)}` : 'border-transparent'
                    }`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-800 text-sm">{alert.title}</h4>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(alert.id);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">{alert.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(alert.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {alert.actionLabel && (
                        <span className="text-xs text-blue-600 font-medium flex items-center">
                          {alert.actionLabel} <ChevronRight className="h-3 w-3 ml-0.5" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-100 text-center">
            <a 
              href="/smart-alerts"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos os alertas
            </a>
          </div>
        </div>
      )}
    </div>
  );
}