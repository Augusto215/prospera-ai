import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Trash2, TrendingUp, Home, Building, Receipt, Save, X, Landmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DateRangeSelector from './DateRangeSelector';

interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'yearly' | 'one-time';
  category: string;
  next_payment: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tax_rate: number;
}

export default function RevenueManagement() {
  const { user } = useAuth();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IncomeSource>>({});
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [showTaxInfo, setShowTaxInfo] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as const,
    category: '',
    next_payment: '',
    tax_rate: ''
  });

  useEffect(() => {
    if (user) {
      fetchIncomeSources();
    }
  }, [user, startDate, endDate]);

  const fetchIncomeSources = async () => {
    setLoading(true);
    try {
      // Fetch da tabela income_sources com filtro de data
      const { data: incomeSourcesData, error: incomeError } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z') // Incluir o dia completo
        .order('created_at', { ascending: false });

      if (incomeError) throw incomeError;
      
      const allIncomeSources = incomeSourcesData || [];

      setIncomeSources(allIncomeSources);
      
      // Calcular total mensal corrigido
      const total = allIncomeSources
        .filter(source => source.is_active)
        .reduce((sum, source) => {
          let monthlyAmount = source.amount;
          
          switch (source.frequency) {
            case 'weekly':
              monthlyAmount = source.amount * 4.33;
              break;
            case 'yearly':
              monthlyAmount = source.amount / 12;
              break;
            case 'one-time':
              monthlyAmount = 0;
              break;
            default:
              monthlyAmount = source.amount;
          }
          
          return sum + monthlyAmount;
        }, 0);
      
      setTotalMonthlyIncome(total);
    } catch (error) {
      console.error('Error fetching income sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTax = (amount: number, frequency: string = 'monthly', rate?: number) => {
    if (!amount || amount <= 0) return { rate: 0, amount: 0 };
    
    const taxRate = rate || getTaxRateByIncome(amount, frequency);
    const taxAmount = (amount * taxRate) / 100;
    
    return { rate: taxRate, amount: taxAmount };
  };

  const getTaxRateByIncome = (amount: number, frequency: string) => {
    // Convert to monthly for calculation
    let monthlyAmount = amount;
    
    switch (frequency) {
      case 'weekly':
        monthlyAmount = amount * 4.33;
        break;
      case 'yearly':
        monthlyAmount = amount / 12;
        break;
      case 'one-time':
        monthlyAmount = amount;
        break;
    }

    // Brazilian tax brackets (simplified)
    if (monthlyAmount <= 2259.20) return 0;
    if (monthlyAmount <= 2826.65) return 7.5;
    if (monthlyAmount <= 3751.05) return 15;
    if (monthlyAmount <= 4664.68) return 22.5;
    return 27.5;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, frequency: string = 'monthly') => {
    const value = e.target.value;
    const amount = Number(value);
    
    setFormData(prev => ({ ...prev, amount: value }));
    
    if (amount > 0) {
      const { rate, amount: taxValue } = calculateTax(amount, frequency);
      setTaxRate(rate);
      setTaxAmount(taxValue);
      setShowTaxInfo(true);
    } else {
      setTaxRate(0);
      setTaxAmount(0);
      setShowTaxInfo(false);
    }
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>, amountValue?: string) => {
    const frequency = e.target.value;
    const amount = Number(amountValue || formData.amount);
    
    setFormData(prev => ({ ...prev, frequency: frequency as any }));
    
    if (amount > 0) {
      const { rate, amount: taxValue } = calculateTax(amount, frequency);
      setTaxRate(rate);
      setTaxAmount(taxValue);
    }
  };

  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const rate = Number(value);
    
    setFormData({ ...formData, tax_rate: value });
    
    if (rate >= 0 && rate <= 100) {
      setTaxRate(rate);
      const amount = Number(formData.amount || 0);
      if (amount > 0) {
        const taxValue = (amount * rate) / 100;
        setTaxAmount(taxValue);
      }
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const incomeData = {
      user_id: user.id,
      name: formData.get('name') as string,
      amount: Number(formData.get('amount')),
      frequency: formData.get('frequency') as IncomeSource['frequency'],
      category: formData.get('category') as string,
      next_payment: formData.get('next_payment') as string || null,
      tax_rate: taxRate || null,
      is_active: true
    };

    try {
      const { error } = await supabase
        .from('income_sources')
        .insert([incomeData]);

      if (error) throw error;
      
      setShowAddModal(false);
      setTaxRate(0);
      setTaxAmount(0);
      setShowTaxInfo(false);
      setFormData({ name: '', amount: '', frequency: 'monthly', category: '', next_payment: '', tax_rate: '' });
      await fetchIncomeSources();
    } catch (error) {
      console.error('Error adding income:', error);
      alert('Erro ao adicionar fonte de renda. Tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta fonte de renda?')) return;

    try {
      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchIncomeSources();
    } catch (error) {
      console.error('Error deleting income source:', error);
    }
  };

  const handleEdit = (income: IncomeSource) => {
    setEditingId(income.id);
    setEditForm(income);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.amount || !editForm.name) return;

    try {
      const { error } = await supabase
        .from('income_sources')
        .update({
          name: editForm.name,
          amount: editForm.amount,
          frequency: editForm.frequency,
          category: editForm.category,
          next_payment: editForm.next_payment,
          tax_rate: editForm.tax_rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchIncomeSources();
    } catch (error) {
      console.error('Error updating income source:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const calculateTotalYearlyIncome = () => {
    return totalMonthlyIncome * 12;
  };

  // Calcular renda por categoria
  const calculateIncomeByCategory = () => {
    const categories: Record<string, number> = {};
    
    incomeSources
      .filter(source => source.is_active)
      .forEach(source => {
        let monthlyAmount = source.amount;
        
        switch (source.frequency) {
          case 'weekly':
            monthlyAmount = source.amount * 4.33;
            break;
          case 'yearly':
            monthlyAmount = source.amount / 12;
            break;
          case 'one-time':
            monthlyAmount = 0;
            break;
          default:
            monthlyAmount = source.amount;
        }
        
        if (!categories[source.category]) {
          categories[source.category] = 0;
        }
        
        categories[source.category] += monthlyAmount;
      });
    
    const totalIncome = totalMonthlyIncome;
    const categoriesArray = Object.entries(categories).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0
    }));
    
    return categoriesArray.sort((a, b) => b.amount - a.amount);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatFrequency = (frequency: string) => {
    const frequencies = {
      monthly: 'Mensal',
      weekly: 'Semanal',
      yearly: 'Anual',
      'one-time': 'Única'
    };
    return frequencies[frequency as keyof typeof frequencies] || frequency;
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'aluguel':
        return <Home className="h-5 w-5 text-orange-500" />;
      case 'dividendos':
        return <Building className="h-5 w-5 text-blue-500" />;
      case 'transações':
        return <Receipt className="h-5 w-5 text-purple-500" />;
      case 'invest':
        return <TrendingUp className="h-5 w-5 text-indigo-500" />;
      case 'carga':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'salário':
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case 'freelance':
        return <DollarSign className="h-5 w-5 text-purple-500" />;
      default:
        return <DollarSign className="h-5 w-5 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const incomeCategories = calculateIncomeByCategory();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestão de Receitas</h1>
          <p className="text-gray-500 mt-1">Gerencie suas fontes de renda</p>
        </div>
        <div className="flex space-x-3">
          <DateRangeSelector 
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }} 
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Fonte de Renda</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Renda Mensal</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(totalMonthlyIncome)}</p>
              <p className="text-green-100 text-xs mt-1">
                Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Renda Anual</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(calculateTotalYearlyIncome())}</p>
              <p className="text-blue-100 text-xs mt-1">
                Baseado no período selecionado
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Fontes Ativas</p>
              <p className="text-3xl font-bold mt-1">{incomeSources.filter(s => s.is_active).length}</p>
              <p className="text-purple-100 text-sm">{incomeSources.length} Total no período</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <div className="h-6 w-6 flex items-center justify-center text-white font-bold">
                {incomeSources.filter(s => s.is_active).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income Categories */}
      <div className="bg-white rounded-xl shadow-md p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Receitas por Categoria</h2>
          <div className="text-sm text-gray-500">
            Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {incomeCategories.length > 0 ? (
            incomeCategories.map((category, index) => (
              <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-green-100">
                    {getCategoryIcon(category.category)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{category.category}</p>
                    <p className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="ml-auto">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(category.amount)}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, category.percentage)}%` }}></div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma receita encontrada no período selecionado</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Income Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Fonte de Renda</h3>
            <form onSubmit={handleAddIncome} className="space-y-4">
              <input
                name="name"
                placeholder="Nome da fonte (ex: Salário, Freelance)"
                required
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-gray-800"
              />
              
              <div className="relative">
                <input
                  type="number"
                  name="amount"
                  placeholder="Valor (R$)"
                  step="0.01" 
                  required
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e, formData.frequency)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-gray-800"
                />
              </div>
              
              <select
                name="frequency"
                required
                value={formData.frequency}
                onChange={(e) => handleFrequencyChange(e, formData.amount)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-gray-800"
              >
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="yearly">Anual</option>
                <option value="one-time">Única</option>
              </select>
              
              <input
                name="category"
                placeholder="Categoria (ex: Salário, Freelance)"
                required
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-gray-800"
              />
              
              <div className="relative">
                <input
                  type="number"
                  placeholder="Alíquota de IRPF (%)"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={handleTaxRateChange} 
                  className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-gray-800"
                />
                <Landmark className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-600" />
              </div>

              {showTaxInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Alíquota sugerida de IRPF: <span className="font-medium">{taxRate}%</span>
                  </p>
                  <p className="text-sm text-blue-600 flex items-center mt-1">
                    <Landmark className="h-3 w-3 mr-1" />
                    <span>Imposto estimado: <span className="font-medium">{formatCurrency(taxAmount)}</span></span>
                  </p>
                </div>
              )}
              
              <input
                type="date"
                name="next_payment"
                placeholder="Próximo pagamento"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-gray-800"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors font-medium shadow-sm"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setTaxRate(0);
                    setTaxAmount(0);
                    setShowTaxInfo(false);
                    setFormData({ name: '', amount: '', frequency: 'monthly', category: '', next_payment: '', tax_rate: '' });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Adicionar Nova Fonte de Renda</h3>
          <form onSubmit={handleAddIncome} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                >
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                  <option value="yearly">Anual</option>
                  <option value="one-time">Única</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Próximo Pagamento</label>
                <input
                  type="date"
                  value={formData.next_payment}
                  onChange={(e) => setFormData({...formData, next_payment: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Imposto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({...formData, tax_rate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Income Sources List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Suas Fontes de Renda</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {incomeSources.length === 0 && !loading ? (
            <div className="p-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma fonte de renda encontrada</h3>
              <p className="text-gray-500">
                Não há fontes de renda no período de {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Tente selecionar um período diferente ou adicione uma nova fonte de renda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomeSources.map((source) => (
                <div key={source.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  {editingId === source.id ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                        placeholder="Nome da fonte"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          value={editForm.amount || ''}
                          onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                          className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                          placeholder="Valor (R$)"
                          step="0.01"
                        />
                        <select
                          value={editForm.frequency || ''}
                          onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value as IncomeSource['frequency'] })}
                          className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                        >
                          <option value="monthly">Mensal</option>
                          <option value="weekly">Semanal</option>
                          <option value="yearly">Anual</option>
                          <option value="one-time">Única</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={editForm.category || ''}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                          placeholder="Categoria"
                        />
                        <input
                          type="number"
                          value={editForm.tax_rate || ''}
                          onChange={(e) => setEditForm({ ...editForm, tax_rate: Number(e.target.value) })}
                          className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                          placeholder="Taxa de Imposto (%)"
                          step="0.01"
                          min="0"
                          max="100"
                        />
                      </div>
                      <input
                        type="date"
                        value={editForm.next_payment || ''}
                        onChange={(e) => setEditForm({ ...editForm, next_payment: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-100">
                          {getCategoryIcon(source.category)}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-800">{source.name}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              {source.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatFrequency(source.frequency)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg text-gray-800">
                            {formatCurrency(source.amount)}
                          </p>
                          {source.tax_rate > 0 && (
                            <p className="text-sm text-red-600">
                              Imposto: {formatCurrency((source.amount * source.tax_rate) / 100)}
                            </p>
                          )}
                          {source.next_payment && (
                            <p className="text-sm text-blue-600">
                              Próximo: {new Date(source.next_payment).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(source)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(source.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}