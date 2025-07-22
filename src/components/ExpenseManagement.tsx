import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Receipt, 
  TrendingDown, 
  Calendar, 
  PieChart,
  FileText,
  CreditCard,
  Shield,
  Target,
  Home,
  Building,
  AlertTriangle,
  Edit,
  Trash2,
  Car,
  Landmark,
  Users,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DateRangeSelector from './DateRangeSelector';

interface ExpenseItem {
  id: string;
  type: 'transaction' | 'loan' | 'bill' | 'retirement' | 'real_estate_expense' | 'vehicle_expense' | 'tax' | 'employee_expense' | 'financial_goal';
  description: string;
  amount: number;
  category: string;
  date: string;
  source: string;
  recurring: boolean;
}

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, startDate, endDate]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const allExpenses: ExpenseItem[] = [];

      // Fetch transactions (expenses only) - COM FILTRO DE DATA
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      if (transactions) {
        const mappedTransactions = transactions.map(item => ({
          id: item.id,
          type: 'transaction' as const,
          description: item.description || 'Sem descrição',
          amount: Math.abs(item.amount || 0),
          category: item.category || 'Geral',
          date: item.date || item.created_at || new Date().toISOString(),
          source: 'Transação',
          recurring: item.is_recurring || false
        }));
        allExpenses.push(...mappedTransactions);
      }

      // Fetch loans - COM FILTRO DE DATA
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (loansError) throw loansError;

      if (loans) {
        const mappedLoans = loans.map(item => ({
          id: item.id,
          type: 'loan' as const,
          description: `${item.type} - ${item.bank}`,
          amount: Math.abs(item.monthly_payment || 0),
          category: item.type || 'Empréstimo',
          date: item.start_date || item.created_at || new Date().toISOString(),
          source: 'loans',
          recurring: true
        }));
        allExpenses.push(...mappedLoans);
      }

      // Fetch bills - COM FILTRO DE DATA
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (billsError) throw billsError;

      if (bills) {
        const mappedBills = bills.map(item => ({
          id: item.id,
          type: 'bill' as const,
          description: `${item.name} - ${item.company}`,
          amount: Math.abs(item.amount || 0),
          category: item.category || 'Conta',
          date: item.next_due || item.created_at || new Date().toISOString(),
          source: 'bills',
          recurring: item.is_recurring || false
        }));
        allExpenses.push(...mappedBills);
      }

      // Fetch retirement plans - COM FILTRO DE DATA
      const { data: retirement, error: retirementError } = await supabase
        .from('retirement_plans')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (retirementError) throw retirementError;

      if (retirement) {
        const mappedRetirement = retirement.map(item => ({
          id: item.id,
          type: 'retirement' as const,
          description: `${item.name} - ${item.company}`,
          amount: Math.abs(item.monthly_contribution || 0),
          category: item.type || 'Aposentadoria',
          date: item.start_date || item.created_at || new Date().toISOString(),
          source: 'retirement_plans',
          recurring: true
        }));
        allExpenses.push(...mappedRetirement);
      }

      // Fetch real estate expenses - COM FILTRO DE DATA
      const { data: realEstate, error: realEstateError } = await supabase
        .from('real_estate')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (realEstateError) throw realEstateError;

      if (realEstate) {
        const mappedRealEstate = realEstate.map(item => ({
          id: item.id,
          type: 'real_estate_expense' as const,
          description: `${item.type} - ${item.address}`,
          amount: Math.abs(item.expenses || 0),
          category: item.type || 'Imóvel',
          date: item.purchase_date || item.created_at || new Date().toISOString(),
          source: 'real_estate',
          recurring: false
        }));
        allExpenses.push(...mappedRealEstate);
      }

      // Fetch vehicle expenses - COM FILTRO DE DATA
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (vehiclesError) throw vehiclesError;

      if (vehicles) {
        const mappedVehicles = vehicles.map(item => ({
          id: item.id,
          type: 'vehicle_expense' as const,
          description: `${item.brand} ${item.model} (${item.year})`,
          amount: Math.abs(item.monthly_expenses || 0),
          category: item.type || 'Veículo',
          date: item.purchase_date || item.created_at || new Date().toISOString(),
          source: 'vehicles',
          recurring: true
        }));
        allExpenses.push(...mappedVehicles);
      }

      // Fetch employee expenses - COM FILTRO DE DATA
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (employeesError) throw employeesError;

      if (employees) {
        const mappedEmployees = employees.map(item => ({
          id: item.id,
          type: 'employee_expense' as const,
          description: `${item.name} - ${item.role}`,
          amount: Math.abs(item.salary || 0),
          category: 'Funcionário',
          date: item.hiring_date || item.created_at || new Date().toISOString(),
          source: 'employees',
          recurring: true
        }));
        allExpenses.push(...mappedEmployees);
      }

      // Fetch financial goals - COM FILTRO DE DATA
      const { data: goals, error: goalsError } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (goalsError) throw goalsError;

      if (goals) {
        const mappedGoals = goals.map(item => {
          // Calculate monthly contribution needed
          const targetDate = new Date(item.target_date);
          const now = new Date();
          const monthsLeft = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          const remainingAmount = (item.target_amount || 0) - (item.current_amount || 0);
          const monthlyContribution = Math.max(0, remainingAmount / monthsLeft);

          return {
            id: item.id,
            type: 'financial_goal' as const,
            description: item.name,
            amount: monthlyContribution,
            category: item.category || 'Meta Financeira',
            date: item.target_date || item.created_at || new Date().toISOString(),
            source: 'financial_goals',
            recurring: true
          };
        });
        allExpenses.push(...mappedGoals);
      }

      setExpenses(allExpenses);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transaction': return Receipt;
      case 'loan': return CreditCard;
      case 'bill': return FileText;
      case 'retirement': return Shield;
      case 'real_estate_expense': return Home;
      case 'vehicle_expense': return Car;
      case 'tax': return Landmark;
      case 'employee_expense': return Users;
      case 'financial_goal': return Target;
      default: return Receipt;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transaction': return 'bg-red-100 text-red-500';
      case 'loan': return 'bg-orange-100 text-orange-500';
      case 'bill': return 'bg-yellow-100 text-yellow-500';
      case 'retirement': return 'bg-blue-100 text-blue-500';
      case 'real_estate_expense': return 'bg-purple-100 text-purple-500';
      case 'vehicle_expense': return 'bg-teal-100 text-teal-500';
      case 'employee_expense': return 'bg-pink-100 text-pink-500';
      case 'financial_goal': return 'bg-indigo-100 text-indigo-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'transaction': 'Transação',
      'loan': 'Empréstimo',
      'bill': 'Conta',
      'retirement': 'Aposentadoria',
      'real_estate_expense': 'Imóvel',
      'vehicle_expense': 'Veículo',
      'employee_expense': 'Funcionário',
      'financial_goal': 'Meta Financeira'
    };
    return labels[type] || type;
  };

  const filteredAndSortedExpenses = expenses
    .filter(expense => {
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || expense.type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalExpenses = filteredAndSortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expensesByType = filteredAndSortedExpenses.reduce((acc, expense) => {
    acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestão de Gastos</h1>
          <p className="text-gray-500 mt-1">Visão gerencial de todas as suas despesas</p>
        </div>
        <DateRangeSelector 
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }} 
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Total de Gastos</p>
              <p className="text-3xl font-bold mt-1">
                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-red-100 text-xs mt-1">
                Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Itens de Despesa</p>
              <p className="text-3xl font-bold mt-1">{filteredAndSortedExpenses.length}</p>
              <p className="text-blue-100 text-xs mt-1">
                {expenses.length} Total no período
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Categorias</p>
              <p className="text-3xl font-bold mt-1">{Object.keys(expensesByType).length}</p>
              <p className="text-purple-100 text-xs mt-1">Tipos diferentes</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <PieChart className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
            >
              <option value="all">Todos os Tipos</option>
              <option value="transaction">Transações</option>
              <option value="loan">Empréstimos</option>
              <option value="bill">Contas</option>
              <option value="retirement">Aposentadoria</option>
              <option value="real_estate_expense">Imóveis</option>
              <option value="vehicle_expense">Veículos</option>
              <option value="employee_expense">Funcionários</option>
              <option value="financial_goal">Metas</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'date' | 'amount' | 'type');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
            >
              <option value="date-desc">Data (Mais Recente)</option>
              <option value="date-asc">Data (Mais Antiga)</option>
              <option value="amount-desc">Valor (Maior)</option>
              <option value="amount-asc">Valor (Menor)</option>
              <option value="type-asc">Tipo (A-Z)</option>
              <option value="type-desc">Tipo (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Lista de Despesas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
          </p>
        </div>
        
        {filteredAndSortedExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma despesa encontrada</h3>
            <p className="text-gray-500">
              Não há despesas no período de {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Tente selecionar um período diferente ou verifique os filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAndSortedExpenses.map((expense) => {
              const IconComponent = getTypeIcon(expense.type);
              return (
                <div key={expense.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-xl ${getTypeColor(expense.type)}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{expense.description}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500">{getTypeLabel(expense.type)}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">{expense.category}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">
                            {new Date(expense.date).toLocaleDateString('pt-BR')}
                          </span>
                          {expense.recurring && (
                            <>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                                Recorrente
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-red-600">
                        -R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expenses by Type Chart */}
      {Object.keys(expensesByType).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Gastos por Tipo</h2>
          <div className="space-y-3">
            {Object.entries(expensesByType)
              .sort(([,a], [,b]) => b - a)
              .map(([type, amount]) => {
                const percentage = (amount / totalExpenses) * 100;
                const IconComponent = getTypeIcon(type);
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(type)}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-gray-700">{getTypeLabel(type)}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                      <span className="text-sm font-semibold text-gray-900 w-24 text-right">
                        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}