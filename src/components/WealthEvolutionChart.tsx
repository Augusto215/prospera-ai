import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WealthData {
  month: string;
  total: number;
  investimentos: number;
  imoveis: number;
  contas: number;
  outros: number;
}

export default function WealthEvolutionChart() {
  const { user } = useAuth();
  const [wealthData, setWealthData] = useState<WealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchWealthData();
    }
  }, [user]);

  const fetchWealthData = async () => {
    try {
      setLoading(true);
      
      // Get the last 6 months
      const months = [];
      const today = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
          month: month.toLocaleString('pt-BR', { month: 'short' }),
          date: month
        });
      }
      
      // Fetch data from different asset tables
      const [investmentsData, realEstateData, bankAccountsData, exoticAssetsData] = await Promise.all([
        supabase.from('investments').select('*').eq('user_id', user?.id),
        supabase.from('real_estate').select('*').eq('user_id', user?.id),
        supabase.from('bank_accounts').select('*').eq('user_id', user?.id),
        supabase.from('exotic_assets').select('*').eq('user_id', user?.id)
      ]);
      
      // Calculate wealth data for each month
      const data = months.map(({ month, date }) => {
        // Only count assets purchased before or during this month
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        // Calculate investments value
        const investmentsValue = (investmentsData.data || [])
          .filter(item => new Date(item.purchase_date) <= monthEnd)
          .reduce((sum, item) => {
            if (item.quantity && item.current_price) {
              return sum + (item.quantity * item.current_price);
            }
            return sum + (item.current_price || item.purchase_price || item.amount);
          }, 0);
        
        // Calculate real estate value
        const realEstateValue = (realEstateData.data || [])
          .filter(item => new Date(item.purchase_date) <= monthEnd)
          .reduce((sum, item) => sum + (item.current_value || item.purchase_price), 0);
        
        // Bank accounts value (always current)
        const bankValue = (bankAccountsData.data || [])
          .reduce((sum, item) => sum + item.balance, 0);
        
        // Exotic assets value
        const otherValue = (exoticAssetsData.data || [])
          .filter(item => new Date(item.purchase_date) <= monthEnd)
          .reduce((sum, item) => sum + (item.current_value || item.purchase_price), 0);
        
        // Calculate total
        const total = investmentsValue + realEstateValue + bankValue + otherValue;
        
        return {
          month,
          total: Math.round(total),
          investimentos: Math.round(investmentsValue),
          imoveis: Math.round(realEstateValue),
          contas: Math.round(bankValue),
          outros: Math.round(otherValue)
        };
      });
      
      setWealthData(data);
    } catch (err) {
      console.error('Error fetching wealth data:', err);
      setError('Erro ao carregar dados de evolução patrimonial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 pt-0">
      <div className="h-64 sm:h-80 mt-2 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : wealthData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" className="overflow-x-auto">
            <AreaChart
              data={wealthData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => 
                  value === 0 ? '0' : 
                  value < 1000 ? `${value}` : 
                  value < 1000000 ? `${(value/1000).toFixed(0)}k` : 
                  `${(value/1000000).toFixed(1)}M`
                }
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }} 
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="total" 
                name="Total"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="investimentos"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
                strokeWidth={1.5}
                dot={{ fill: '#10b981', strokeWidth: 1, r: 2 }}
                name="Investimentos"
              />
              <Area
                type="monotone"
                dataKey="imoveis"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.1}
                strokeWidth={1.5}
                dot={{ fill: '#f59e0b', strokeWidth: 1, r: 2 }}
                name="Imóveis"
              />
              <Area
                type="monotone"
                dataKey="contas"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.1}
                strokeWidth={1.5}
                dot={{ fill: '#8b5cf6', strokeWidth: 1, r: 2 }}
                name="Contas"
              />
              <Area
                type="monotone"
                dataKey="outros"
                stroke="#ec4899"
                fill="#ec4899"
                fillOpacity={0.1}
                strokeWidth={1.5}
                dot={{ fill: '#ec4899', strokeWidth: 1, r: 2 }}
                name="Outros"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500">Sem dados para exibir</p>
          </div>
        )}
      </div>
    </div>
  );
}