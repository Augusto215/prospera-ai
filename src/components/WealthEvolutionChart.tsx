import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WealthEvolutionChartProps {
  startDate?: string;
  endDate?: string;
  dateFilterApplied?: boolean;
}

interface WealthData {
  month: string;
  total: number;
  investimentos: number;
  imoveis: number;
  contas: number;
  outros: number;
}

export default function WealthEvolutionChart({ startDate, endDate, dateFilterApplied }: WealthEvolutionChartProps) {
  const { user } = useAuth();
  const [wealthData, setWealthData] = useState<WealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchWealthData();
    }
  }, [user, startDate, endDate, dateFilterApplied]);

  const fetchWealthData = async () => {
    try {
      setLoading(true);
      
      let months = [];
      
      if (dateFilterApplied && startDate && endDate) {
        // Quando há filtro aplicado, mostrar apenas os meses do período
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Calcular diferença em dias para determinar o agrupamento
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 365) {
          // Até 1 ano: mostrar por mês
          const current = new Date(start.getFullYear(), start.getMonth(), 1);
          const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
          
          while (current <= endMonth) {
            // Para períodos que cruzam anos, incluir o ano no label
            const shouldIncludeYear = start.getFullYear() !== end.getFullYear();
            const monthLabel = shouldIncludeYear ? 
              `${current.toLocaleString('pt-BR', { month: 'short' }).replace('.','')}/${current.getFullYear().toString().slice(2)}` :
              current.toLocaleString('pt-BR', { month: 'short' });
            
            months.push({
              month: monthLabel,
              date: new Date(current)
            });
            current.setMonth(current.getMonth() + 1);
          }
        } else {
          // Mais de 1 ano: agrupar por semestre
          const current = new Date(start.getFullYear(), Math.floor(start.getMonth() / 6) * 6, 1);
          const endSemester = new Date(end.getFullYear(), Math.floor(end.getMonth() / 6) * 6, 1);
          
          while (current <= endSemester) {
            const semester = Math.floor(current.getMonth() / 6) + 1;
            months.push({
              month: `S${semester}/${current.getFullYear().toString().slice(2)}`,
              date: new Date(current)
            });
            current.setMonth(current.getMonth() + 6);
          }
        }
      } else {
        // Comportamento original: últimos 6 meses
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
          months.push({
            month: month.toLocaleString('pt-BR', { month: 'short' }),
            date: month
          });
        }
      }
      
      // Calculate wealth data for each period
      const data = await Promise.all(months.map(async ({ month, date }) => {
        // Determinar o período (mês ou semestre)
        let periodStart, periodEnd;
        
        if (month.includes('S')) {
          // Semestre
          const semester = parseInt(month.charAt(1)) - 1;
          const year = 2000 + parseInt(month.split('/')[1]);
          periodStart = new Date(year, semester * 6, 1);
          periodEnd = new Date(year, (semester + 1) * 6, 0);
        } else {
          // Mês
          periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
          periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        }
        
        // Para filtros aplicados, limitar ao período selecionado
        if (dateFilterApplied && startDate && endDate) {
          const filterStart = new Date(startDate);
          const filterEnd = new Date(endDate);
          periodStart = periodStart < filterStart ? filterStart : periodStart;
          periodEnd = periodEnd > filterEnd ? filterEnd : periodEnd;
        }
        
        const [investmentsData, realEstateData, bankAccountsData, exoticAssetsData] = await Promise.all([
          supabase.from('investments').select('*').eq('user_id', user?.id),
          supabase.from('real_estate').select('*').eq('user_id', user?.id),
          supabase.from('bank_accounts').select('*').eq('user_id', user?.id),
          supabase.from('exotic_assets').select('*').eq('user_id', user?.id)
        ]);
        
        // Calculate investments value (only assets that existed in that period)
        const investmentsValue = (investmentsData.data || [])
          .filter(item => {
            const purchaseDate = new Date(item.purchase_date);
            return purchaseDate <= periodEnd;
          })
          .reduce((sum, item) => {
            // Para períodos com filtro aplicado, usar valor proporcional ao período
            if (dateFilterApplied) {
              // Se o ativo foi comprado no período, calcular valor baseado na data
              const purchaseDate = new Date(item.purchase_date);
              
              // Se foi comprado antes do período, usar valor atual
              // Se foi comprado durante o período, usar valor de compra + valorização
              if (purchaseDate < new Date(startDate!)) {
                // Ativo existia antes do filtro - usar valor atual
                if (item.quantity && item.current_price) {
                  return sum + (item.quantity * item.current_price);
                }
                return sum + (item.current_price || item.amount || 0);
              } else {
                // Ativo foi comprado durante o período - usar valor de compra inicialmente
                return sum + (item.purchase_price || item.amount || 0);
              }
            }
            
            // Sem filtro: usar valor atual
            if (item.quantity && item.current_price) {
              return sum + (item.quantity * item.current_price);
            }
            return sum + (item.current_price || item.purchase_price || item.amount || 0);
          }, 0);
        
        // Calculate real estate value (only properties that existed in that period)
        const realEstateValue = (realEstateData.data || [])
          .filter(item => {
            const purchaseDate = new Date(item.purchase_date);
            return purchaseDate <= periodEnd;
          })
          .reduce((sum, item) => {
            if (dateFilterApplied) {
              const purchaseDate = new Date(item.purchase_date);
              
              if (purchaseDate < new Date(startDate!)) {
                // Imóvel existia antes do filtro - usar valor atual
                return sum + (item.current_value || item.purchase_price || 0);
              } else {
                // Imóvel foi comprado durante o período - usar valor de compra
                return sum + (item.purchase_price || 0);
              }
            }
            
            // Sem filtro: usar valor atual
            return sum + (item.current_value || item.purchase_price || 0);
          }, 0);
        
        // Bank accounts value
        let bankValue = 0;
        if (dateFilterApplied) {
          // Para filtros, usar apenas contas que existiam no período
          bankValue = (bankAccountsData.data || [])
            .filter(item => {
              const createdDate = new Date(item.created_at || item.opened_date || item.purchase_date);
              return createdDate <= periodEnd;
            })
            .reduce((sum, item) => {
              // Para contas bancárias, sempre usar saldo atual pois é mais relevante
              return sum + (item.balance || 0);
            }, 0);
        } else {
          // Sem filtro: usar saldo atual de todas as contas
          bankValue = (bankAccountsData.data || [])
            .reduce((sum, item) => sum + (item.balance || 0), 0);
        }
        
        // Exotic assets value (only assets that existed in that period)
        const otherValue = (exoticAssetsData.data || [])
          .filter(item => {
            const purchaseDate = new Date(item.purchase_date);
            return purchaseDate <= periodEnd;
          })
          .reduce((sum, item) => {
            if (dateFilterApplied) {
              const purchaseDate = new Date(item.purchase_date);
              
              if (purchaseDate < new Date(startDate!)) {
                // Ativo existia antes do filtro - usar valor atual
                return sum + (item.current_value || item.purchase_price || 0);
              } else {
                // Ativo foi comprado durante o período - usar valor de compra
                return sum + (item.purchase_price || 0);
              }
            }
            
            // Sem filtro: usar valor atual
            return sum + (item.current_value || item.purchase_price || 0);
          }, 0);
        
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
      }));
      
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
      <div className="h-64 sm:h-80 mt-2 relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : wealthData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
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
                axisLine={false}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
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
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
                formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                labelStyle={{ color: '#374151', fontWeight: 'bold', fontSize: '12px' }}
                cursor={{ strokeDasharray: '3 3', stroke: '#9ca3af', strokeWidth: 1 }}
                animationDuration={150}
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