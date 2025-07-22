import React, { useState, useEffect } from 'react';

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building, 
  Home, 
  Shield, 
  CreditCard, 
  Banknote,
  Car,
  Gem,
  Landmark,
  Target
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useSupabaseData';

interface BreakdownProps {
  type: string | null;
}

export default function FinancialBreakdown({ type }: BreakdownProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const financialData = useDashboardData();

  useEffect(() => {
    if (user && type) {
      fetchData();
    }
  }, [user, type]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let fetchedData: any[] = [];
      
      switch (type) {
        case 'income':
          const { data: incomeData } = await supabase
            .from('income_sources')
            .select('*')
            .eq('user_id', user?.id)
            .order('amount', { ascending: false });
          fetchedData = incomeData || [];
          break;
          
        case 'expenses':
          const { data: expenseData } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user?.id)
            .eq('type', 'expense')
            .order('amount', { ascending: false });
          fetchedData = expenseData || [];
          break;
          
        case 'investments':
          const { data: investmentData } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', user?.id)
            .order('amount', { ascending: false });
          fetchedData = investmentData || [];
          break;
          
        case 'real-estate':
          const { data: realEstateData } = await supabase
            .from('real_estate')
            .select('*')
            .eq('user_id', user?.id)
            .order('purchase_price', { ascending: false });
          fetchedData = realEstateData || [];
          break;
          
        case 'retirement':
          const { data: retirementData } = await supabase
            .from('retirement_plans')
            .select('*')
            .eq('user_id', user?.id)
            .order('total_contributed', { ascending: false });
          fetchedData = retirementData || [];
          break;
          
        case 'debts':
          const { data: loanData } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', user?.id)
            .order('remaining_amount', { ascending: false });
          fetchedData = loanData || [];
          break;
          
        case 'bank-accounts':
          const { data: accountData } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('user_id', user?.id)
            .order('balance', { ascending: false });
          fetchedData = accountData || [];
          break;
          
        case 'vehicles':
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('*')
            .eq('user_id', user?.id)
            .order('purchase_price', { ascending: false });
          fetchedData = vehicleData || [];
          break;
          
        case 'exotic-assets':
          const { data: exoticData } = await supabase
            .from('exotic_assets')
            .select('*')
            .eq('user_id', user?.id)
            .order('purchase_price', { ascending: false });
          fetchedData = exoticData || [];
          break;
          
        case 'taxes':
          // Buscar todas as fontes de impostos
          const [incomeTaxes, investmentTaxes, realEstateTaxes, transactionTaxes] = await Promise.all([
            // Impostos de fontes de renda
            supabase
              .from('income_sources')
              .select('*')
              .eq('user_id', user?.id)
              .not('tax_rate', 'is', null)
              .gt('tax_rate', 0),
            
            // Impostos de investimentos
            supabase
              .from('investments')
              .select('*')
              .eq('user_id', user?.id)
              .not('tax_rate', 'is', null)
              .gt('tax_rate', 0),
            
            // Impostos de imóveis
            supabase
              .from('real_estate')
              .select('*')
              .eq('user_id', user?.id)
              .eq('is_rented', true)
              .not('tax_rate', 'is', null)
              .gt('tax_rate', 0),
            
            // Transações de impostos
            supabase
              .from('transactions')
              .select('*')
              .eq('user_id', user?.id)
              .eq('category', 'Impostos')
          ]);
          
          // Processar fontes de renda
          const incomeTaxItems = (incomeTaxes.data || []).map(income => {
            let monthlyAmount = income.amount;
            switch (income.frequency) {
              case 'weekly': monthlyAmount = income.amount * 4.33; break;
              case 'yearly': monthlyAmount = income.amount / 12; break;
            }
            
            const taxAmount = (monthlyAmount * income.tax_rate) / 100;
            
            return {
              id: `income-tax-${income.id}`,
              name: income.name,
              source_type: 'Fonte de Renda',
              category: income.category,
              base_amount: monthlyAmount,
              tax_rate: income.tax_rate,
              tax_amount: taxAmount
            };
          });
          
          // Processar investimentos
          const investmentTaxItems = (investmentTaxes.data || []).map(inv => {
            let monthlyIncome = 0;
            
            // Calcular renda mensal para diferentes tipos de investimento
            if (inv.type === 'acoes' || inv.type === 'fundos-imobiliarios') {
              if (inv.dividend_yield && inv.quantity && inv.current_price) {
                const currentValue = inv.quantity * inv.current_price;
                monthlyIncome = (currentValue * inv.dividend_yield) / 100 / 12;
              } else if (inv.monthly_income) {
                monthlyIncome = inv.monthly_income;
              }
            } else if (inv.interest_rate && inv.amount) {
              monthlyIncome = (inv.amount * inv.interest_rate) / 100 / 12;
            } else if (inv.monthly_income) {
              monthlyIncome = inv.monthly_income;
            }
            
            const taxAmount = (monthlyIncome * inv.tax_rate) / 100;
            
            return {
              id: `investment-tax-${inv.id}`,
              name: inv.name,
              source_type: 'Investimento',
              category: inv.type,
              base_amount: monthlyIncome,
              tax_rate: inv.tax_rate,
              tax_amount: taxAmount
            };
          });
          
          // Processar imóveis
          const realEstateTaxItems = (realEstateTaxes.data || []).map(property => {
            const taxAmount = property.monthly_rent * (property.tax_rate / 100);
            
            return {
              id: `realestate-tax-${property.id}`,
              name: property.address,
              source_type: 'Imóvel',
              category: property.type,
              base_amount: property.monthly_rent,
              tax_rate: property.tax_rate,
              tax_amount: taxAmount
            };
          });
          
          // Processar transações de impostos
          const transactionTaxItems = (transactionTaxes.data || [])
            .filter(t => t.is_recurring)
            .map(t => ({
              id: `transaction-tax-${t.id}`,
              name: t.description,
              source_type: 'Transação',
              category: 'Impostos',
              base_amount: t.amount,
              tax_rate: null,
              tax_amount: t.amount
            }));
          
          // Combinar todos os itens de imposto
          fetchedData = [
            ...incomeTaxItems,
            ...investmentTaxItems,
            ...realEstateTaxItems,
            ...transactionTaxItems
          ].sort((a, b) => b.tax_amount - a.tax_amount);
          break;
          
        default:
          break;
      }
      
      setData(fetchedData);
    } catch (err) {
      console.error('Error fetching breakdown data:', err);
      setError('Erro ao carregar dados detalhados');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      );
    }

    switch (type) {
      case 'liquid-assets':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h3 className="font-semibold text-blue-800 mb-2">O que são Ativos Líquidos?</h3>
              <p className="text-gray-700">
                Ativos líquidos são recursos financeiros que podem ser rapidamente convertidos em dinheiro com pouca ou nenhuma perda de valor.
                Incluem contas bancárias e investimentos de alta liquidez.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Banknote className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Contas Bancárias</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {financialData.totalBankBalance.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Investimentos Líquidos (70%)</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {(financialData.totalInvestmentValue * 0.7).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        );
        
      case 'immobilized-assets':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <h3 className="font-semibold text-indigo-800 mb-2">O que são Ativos Imobilizados?</h3>
              <p className="text-gray-700">
                Ativos imobilizados são bens de longo prazo que não podem ser facilmente convertidos em dinheiro.
                Incluem imóveis, veículos, previdência e investimentos de baixa liquidez.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Home className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-800">Imóveis</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {financialData.totalRealEstateValue.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-800">Previdência</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {financialData.totalRetirementSaved.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-800">Investimentos Ilíquidos (30%)</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {(financialData.totalInvestmentValue * 0.3).toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Veículos</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {financialData.totalVehicleValue.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Gem className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">Ativos Exóticos</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {financialData.totalExoticAssetsValue.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        );
        
      case 'income':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">Renda Mensal Total</h3>
                  <p className="text-3xl font-bold text-green-700">R$ {financialData.totalMonthlyIncome.toLocaleString('pt-BR')}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Fontes de Renda</h3>
              
              {data.length === 0 ? (
                <p className="text-gray-500">Nenhuma fonte de renda cadastrada.</p>
              ) : (
                data.map((income, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800 flex items-center">
                          {income.name}
                          {income.tax_rate > 0 && (
                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center">
                              <Landmark className="h-3 w-3 mr-1" />
                              IRPF {income.tax_rate}%
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{income.category} • {income.frequency}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">R$ {income.amount.toLocaleString('pt-BR')}</p>
                        {income.tax_rate > 0 && (
                          <p className="text-xs text-indigo-600">
                            Imposto: R$ {((income.amount * income.tax_rate) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
        
      case 'expenses':
        // Agrupar despesas por categoria
        const expensesByCategory: Record<string, number> = {};
        data.forEach(expense => {
          expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + expense.amount;
        });
        
        // Ordenar categorias por valor
        const sortedCategories = Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b - a)
          .map(([category]) => category);
        
        return (
          <div className="p-6 space-y-6">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Despesas Mensais Totais</h3>
                  <p className="text-3xl font-bold text-red-700">R$ {financialData.totalMonthlyExpenses.toLocaleString('pt-BR')}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Despesas por Categoria</h3>
              
              {sortedCategories.length === 0 ? (
                <p className="text-gray-500">Nenhuma despesa cadastrada.</p>
              ) : (
                sortedCategories.map((category, index) => {
                  const amount = expensesByCategory[category];
                  const percentage = (amount / financialData.totalMonthlyExpenses) * 100;
                  
                  let icon;
                  let color;
                  
                  switch (category) {
                    case 'Empréstimos':
                      icon = <CreditCard className="h-5 w-5 text-orange-600" />;
                      color = 'bg-orange-100';
                      break;
                    case 'Imóveis':
                      icon = <Home className="h-5 w-5 text-purple-600" />;
                      color = 'bg-purple-100';
                      break;
                    case 'Previdência':
                      icon = <Shield className="h-5 w-5 text-blue-600" />;
                      color = 'bg-blue-100';
                      break;
                    case 'Veículos':
                      icon = <Car className="h-5 w-5 text-teal-600" />;
                      color = 'bg-teal-100';
                      break;
                    case 'Impostos':
                      icon = <Landmark className="h-5 w-5 text-indigo-600" />;
                      color = 'bg-indigo-100';
                      break;
                    default:
                      icon = <TrendingDown className="h-5 w-5 text-red-600" />;
                      color = 'bg-red-100';
                  }
                  
                  return (
                    <div key={index} className={`${color} p-4 rounded-xl border border-gray-100 shadow-sm`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          {icon}
                          <h4 className="font-medium text-gray-800">{category}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{percentage.toFixed(1)}%</p>
                      </div>
                      <p className="text-xl font-bold text-gray-900">R$ {amount.toLocaleString('pt-BR')}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
      );  
      
      case 'financial-goals':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-indigo-800 mb-1">Metas Financeiras</h3>
                  <p className="text-3xl font-bold text-indigo-700">
                    R$ {financialData.totalFinancialGoals.toLocaleString('pt-BR')}
                  </p>
                </div>
                <Target className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Detalhamento de Metas</h3>
              <p className="text-gray-600">As metas financeiras funcionam como uma alocação do seu patrimônio e também como despesas de investimento.</p>
              
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Target className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-medium text-gray-800">Como Meta Financeira Funciona</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  As metas financeiras têm dupla função no sistema:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="font-medium text-indigo-800">Como Patrimônio</p>
                    <p className="text-indigo-600">O valor acumulado para suas metas é considerado parte do seu patrimônio, similar a uma conta bancária dedicada.</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="font-medium text-green-800">Como Despesa Mensal</p>
                    <p className="text-green-600">As contribuições mensais para atingir suas metas são tratadas como despesas recorrentes no seu fluxo de caixa.</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => window.location.href = '/?tab=financial-goals'}
                className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Target className="h-4 w-4" />
                <span>Gerenciar Metas Financeiras</span>
              </button>
            </div>
          </div>
        );
      
      case 'balance':
        return (
          <div className="p-6 space-y-6">
            <div className={`${financialData.netMonthlyIncome >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'} p-4 rounded-xl border`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold ${financialData.netMonthlyIncome >= 0 ? 'text-blue-800' : 'text-orange-800'} mb-1`}>Saldo Mensal</h3>
                  <p className={`text-3xl font-bold ${financialData.netMonthlyIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    R$ {Math.abs(financialData.netMonthlyIncome).toLocaleString('pt-BR')}
                    {financialData.netMonthlyIncome >= 0 ? ' positivo' : ' negativo'}
                  </p>
                </div>
                {financialData.netMonthlyIncome >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-orange-600" />
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-800">Receitas Mensais</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {financialData.totalMonthlyIncome.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-gray-800">Despesas Mensais</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">R$ {(financialData.totalMonthlyIncome - financialData.netMonthlyIncome).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-2">Análise de Fluxo de Caixa</h3>
              <p className="text-gray-700">
                {financialData.netMonthlyIncome >= 0 
                  ? `Seu fluxo de caixa é positivo. Você tem um superávit mensal de R$ ${financialData.netMonthlyIncome.toLocaleString('pt-BR')}, que pode ser direcionado para investimentos ou reserva de emergência.`
                  : `Seu fluxo de caixa é negativo. Você tem um déficit mensal de R$ ${Math.abs(financialData.netMonthlyIncome).toLocaleString('pt-BR')}. Considere reduzir despesas ou aumentar receitas.`
                }
              </p>
            </div>
          </div>
        );
        
      case 'investments':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800 mb-1">Total Investido</h3>
                  <p className="text-3xl font-bold text-blue-700">R$ {financialData.totalInvestmentValue.toLocaleString('pt-BR')}</p>
                </div>
                <Building className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Seus Investimentos</h3>
              
              {data.length === 0 ? (
                <p className="text-gray-500">Nenhum investimento cadastrado.</p>
              ) : (
                data.map((investment, index) => {
                  // Calcular valor atual corretamente
                  let currentValue;
                  if ((investment.type === 'acoes' || investment.type === 'fundos-imobiliarios') && 
                      investment.quantity && investment.current_price) {
                    currentValue = investment.quantity * investment.current_price;
                  } else {
                    currentValue = investment.current_price || investment.purchase_price || investment.amount;
                  }
                  
                  // Calcular valor de compra corretamente
                  let purchaseValue;
                  if ((investment.type === 'acoes' || investment.type === 'fundos-imobiliarios') && 
                      investment.quantity && investment.purchase_price) {
                    purchaseValue = investment.quantity * investment.purchase_price;
                  } else {
                    purchaseValue = investment.amount;
                  }
                  
                  const profit = currentValue - purchaseValue;
                  const profitPercentage = ((profit / purchaseValue) * 100);
                  
                  // Calcular renda mensal
                  let monthlyIncome = 0;
                  if (investment.type === 'acoes' || investment.type === 'fundos-imobiliarios') {
                    if (investment.dividend_yield) {
                      monthlyIncome = (currentValue * investment.dividend_yield / 100) / 12;
                    }
                  } else if (investment.interest_rate) {
                    monthlyIncome = (investment.amount * investment.interest_rate / 100) / 12;
                  } else if (investment.monthly_income) {
                    monthlyIncome = investment.monthly_income;
                  }
                  
                  // Calcular imposto
                  const taxAmount = investment.tax_rate ? (monthlyIncome * investment.tax_rate / 100) : 0;
                  
                  return (
                    <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-800">{investment.name}</h4>
                          <p className="text-sm text-gray-500">{investment.broker} • {investment.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">R$ {currentValue.toLocaleString('pt-BR')}</p>
                          <p className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profit >= 0 ? '+' : ''}R$ {profit.toLocaleString('pt-BR')} ({profitPercentage.toFixed(2)}%)
                          </p>                      
                          <p className="text-sm text-purple-600">
                            +R$ {monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                            {taxAmount > 0 && (
                              <span className="text-indigo-600">
                                {' '}(IR: R$ {taxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
        
      case 'real-estate':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-orange-800 mb-1">Valor Total em Imóveis</h3>
                  <p className="text-3xl font-bold text-orange-700">R$ {financialData.totalRealEstateValue.toLocaleString('pt-BR')}</p>
                </div>
                <Home className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Seus Imóveis</h3>
              
              {data.length === 0 ? (
                <p className="text-gray-500">Nenhum imóvel cadastrado.</p>
              ) : (
                data.map((property, index) => {
                  const currentValue = property.current_value || property.purchase_price;
                  const appreciation = currentValue - property.purchase_price;
                  const appreciationPercentage = property.purchase_price > 0 ? ((appreciation / property.purchase_price) * 100) : 0;
                  
                  // Calcular yield para exibição
                  let displayYield = property.dividend_yield;
                  if (property.is_rented && property.monthly_rent && !displayYield) {
                    const valueToUse = property.current_value || property.purchase_price;
                    if (valueToUse > 0) {
                      const annualRent = property.monthly_rent * 12;
                      displayYield = (annualRent / valueToUse) * 100;
                    }
                  }
                  
                  // Calcular imposto sobre aluguel
                  const taxAmount = property.is_rented && property.monthly_rent && property.tax_rate 
                    ? (property.monthly_rent * property.tax_rate / 100) 
                    : 0;
                  
                  return (
                    <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-800">{property.address}</h4>
                          <p className="text-sm text-gray-500">{property.type} • {property.is_rented ? 'Alugado' : 'Não alugado'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">R$ {currentValue.toLocaleString('pt-BR')}</p>
                          <p className={`text-sm ${appreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {appreciation >= 0 ? '+' : ''}R$ {appreciation.toLocaleString('pt-BR')} ({appreciationPercentage.toFixed(2)}%)
                          </p>
                          {property.is_rented && property.monthly_rent && (
                            <p className="text-sm text-purple-600">
                              Renda: R$ {property.monthly_rent.toLocaleString('pt-BR')}/mês
                              {displayYield && (
                                <span className="text-purple-600"> ({displayYield.toFixed(2)}%)</span>
                              )}
                              {taxAmount > 0 && (
                                <span className="text-indigo-600">
                                  {' '}(IR: R$ {taxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
        
      case 'retirement':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">Total em Previdência</h3>
                  <p className="text-3xl font-bold text-green-700">R$ {financialData.totalRetirementSaved.toLocaleString('pt-BR')}</p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Seus Planos de Previdência</h3>
              
              {data.length === 0 ? (
                <p className="text-gray-500">Nenhum plano de previdência cadastrado.</p>
              ) : (
                data.map((plan, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-800">{plan.name}</h4>
                        <p className="text-sm text-gray-500">{plan.company} • {plan.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">R$ {plan.total_contributed.toLocaleString('pt-BR')}</p>
                        <p className="text-sm text-blue-600">
                          R$ {plan.monthly_contribution.toLocaleString('pt-BR')}/mês
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
        
      case 'taxes':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-indigo-800 mb-1">Total de Impostos Mensais</h3>
                  <p className="text-3xl font-bold text-indigo-700">R$ {financialData.totalTaxes.toLocaleString('pt-BR')}</p>
                </div>
                <Landmark className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Detalhamento de Impostos</h3>
              
              {data.length === 0 ? (
                <p className="text-gray-500">Nenhum imposto cadastrado.</p>
              ) : (
                data.map((tax, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-800">{tax.name}</h4>
                        <p className="text-sm text-gray-500">
                          {tax.source_type} • {tax.category}
                          {tax.tax_rate && (
                            <span className="ml-2 text-indigo-600">
                              Alíquota: {tax.tax_rate}%
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-indigo-600">R$ {tax.tax_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        {tax.base_amount && tax.tax_rate && (
                          <p className="text-xs text-gray-500">
                            Base: R$ {tax.base_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
        
      case 'debts':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Total em Dívidas</h3>
                  <p className="text-3xl font-bold text-red-700">R$ {financialData.totalDebt.toLocaleString('pt-BR')}</p>
                </div>
                <CreditCard className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Suas Dívidas</h3>
              
              {data.length === 0 ? (
                <p className="text-gray-500">Nenhuma dívida cadastrada.</p>
              ) : (
                data.map((loan, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-800">{loan.bank}</h4>
                        <p className="text-sm text-gray-500">{loan.type} • {loan.interest_rate}% a.m.</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">-R$ {loan.remaining_amount.toLocaleString('pt-BR')}</p>
                        <p className="text-sm text-gray-600">
                          R$ {loan.monthly_payment.toLocaleString('pt-BR')}/mês
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
        
      case 'vehicles':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800 mb-1">Total em Veículos</h3>
                  <p className="text-3xl font-bold text-blue-700">R$ {financialData.totalVehicleValue.toLocaleString('pt-BR')}</p>
                </div>
                <Car className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Seus Veículos</h3>
              
              {data.length === 0 ? (
                <p className="text-gray-500">Nenhum veículo cadastrado.</p>
              ) : (
                data.map((vehicle, index) => {
                  // Calcular valor atual
                  const purchaseDate = new Date(vehicle.purchase_date);
                  const currentDate = new Date();
                  const yearsOwned = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
                  
                  // Aplicar depreciação composta
                  const currentValue = vehicle.current_value || 
                    Math.max(
                      vehicle.purchase_price * Math.pow(1 - (vehicle.depreciation_rate / 100), yearsOwned),
                      vehicle.purchase_price * 0.1
                    );
                  
                  const depreciation = vehicle.purchase_price - currentValue;
                  const depreciationPercentage = (depreciation / vehicle.purchase_price) * 100;
                  
                  return (
                    <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-800">{vehicle.brand} {vehicle.model}</h4>
                          <p className="text-sm text-gray-500">{vehicle.year} • {vehicle.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">R$ {Math.round(currentValue).toLocaleString('pt-BR')}</p>
                          <p className="text-sm text-red-600">
                            -R$ {Math.round(depreciation).toLocaleString('pt-BR')} ({depreciationPercentage.toFixed(1)}%)
                          </p>
                          {vehicle.monthly_expenses > 0 && (
                            <p className="text-sm text-orange-600">
                              R$ {vehicle.monthly_expenses.toLocaleString('pt-BR')}/mês
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
        
      case 'exotic-assets':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-indigo-800 mb-1">Total em Ativos Exóticos</h3>
                  <p className="text-3xl font-bold text-indigo-700">R$ {financialData.totalExoticAssetsValue.toLocaleString('pt-BR')}</p>
                </div>
                <Gem className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Seus Ativos Exóticos</h3>
              
              {data.length === 0 ? (
                <p className="text-gray-500">Nenhum ativo exótico cadastrado.</p>
              ) : (
                data.map((asset, index) => {
                  const currentValue = asset.current_value || asset.purchase_price;
                  const appreciation = currentValue - asset.purchase_price;
                  const appreciationPercentage = ((appreciation / asset.purchase_price) * 100);
                  
                  return (
                    <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-800">{asset.name}</h4>
                          <p className="text-sm text-gray-500">{asset.category} • {asset.condition}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">R$ {currentValue.toLocaleString('pt-BR')}</p>
                          <p className={`text-sm ${appreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {appreciation >= 0 ? '+' : ''}R$ {appreciation.toLocaleString('pt-BR')} ({appreciationPercentage.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
        
      default:
        return (
          <div className="p-6">
            <p className="text-gray-500">Selecione uma categoria para ver detalhes.</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      {renderContent()}
    </div>
  );
}