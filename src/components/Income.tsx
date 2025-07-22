import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, Calendar, Edit, Trash2, Save, X, Landmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'yearly' | 'one-time';
  category: string;
  next_payment?: string;
  is_active: boolean;
  tax_rate?: number;
  created_at: string;
  updated_at: string;
}

export default function Income() {
  const { user } = useAuth();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IncomeSource>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [showTaxInfo, setShowTaxInfo] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    amount: '',
    frequency: 'monthly' as const,
    taxRate: ''
  });

  useEffect(() => {
    fetchIncomeSources();
  }, [user]);

  const fetchIncomeSources = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncomeSources(data || []);
    } catch (err) {
      console.error('Error fetching income sources:', err);
      setError('Failed to load income sources');
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
    
    setFormData({ ...formData, taxRate: value });
    
    if (rate >= 0 && rate <= 100) {
      setTaxRate(rate);
      const amount = Number(formData.amount || 0);
      if (amount > 0) {
        const taxValue = (amount * rate) / 100;
        setTaxAmount(taxValue);
      }
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'Mensal';
      case 'weekly': return 'Semanal'; 
      case 'yearly': return 'Anual';
      case 'one-time': return 'Única';
      default: return frequency;
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
      setFormData({ amount: '', frequency: 'monthly', taxRate: '' });
      fetchIncomeSources();
    } catch (err) {
      console.error('Error adding income:', err);
      setError('Failed to add income source');
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
    } catch (err) {
      console.error('Error updating income:', err);
      setError('Failed to update income source');
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
    } catch (err) {
      console.error('Error deleting income:', err);
      setError('Failed to delete income source');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Calcular total de receita - INCLUINDO transações únicas (igual ao RevenueManagement)
  const calculateTotalIncome = () => {
    return incomeSources.reduce((total, source) => {
      if (!source.is_active) return total;
      
      let monthlyAmount = source.amount;
      switch (source.frequency) {
        case 'weekly':
          monthlyAmount = source.amount * 4.33;
          break;
        case 'yearly':
          monthlyAmount = source.amount / 12;
          break;
        case 'one-time':
          // INCLUIR transações únicas (igual ao Dashboard e RevenueManagement)
          monthlyAmount = source.amount;
          break;
      }
      return total + monthlyAmount;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fontes de Renda</h2>
          <p className="text-gray-600">Gerencie suas fontes de renda</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Adicionar Renda
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-white/80 text-sm font-medium">Renda Mensal Total</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(calculateTotalIncome())}</p>
              <p className="text-white/80 text-xs mt-1">Incluindo transações únicas</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Fontes Ativas</p>
              <p className="text-3xl font-bold mt-1">{incomeSources.filter(s => s.is_active).length}</p>
              <p className="text-white/80 text-sm">
                {incomeSources.filter(s => s.frequency === 'monthly' && s.is_active).length} mensais, 
                {incomeSources.filter(s => s.frequency === 'yearly' && s.is_active).length} anuais, 
                {incomeSources.filter(s => s.frequency === 'one-time' && s.is_active).length} únicas
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-purple-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Próximos Pagamentos</p>
              <p className="text-3xl font-bold mt-1">{incomeSources.filter(s => s.next_payment && s.is_active).length}</p>
              <p className="text-white/80 text-sm">Nos próximos 30 dias</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Income Sources List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Suas Fontes de Renda</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Categorias:</span>
              <div className="flex flex-wrap gap-1">
                {[...new Set(incomeSources.map(i => i.category))].map(category => (
                  <span key={category} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {incomeSources.length === 0 && !loading ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhuma fonte de renda cadastrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomeSources.map((income) => (
                <div key={income.id} className="border border-gray-200 rounded-lg p-4">
                  {editingId === income.id ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                        placeholder="Nome da fonte"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          value={editForm.amount || ''}
                          onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                          placeholder="Valor (R$)"
                          step="0.01"
                        />
                        <select
                          value={editForm.frequency || ''}
                          onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value as IncomeSource['frequency'] })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                        >
                          <option value="monthly">Mensal</option>
                          <option value="weekly">Semanal</option>
                          <option value="yearly">Anual</option>
                          <option value="one-time">Única</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                        placeholder="Categoria"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <Save size={16} />
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditForm({});
                          }}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
                        >
                          <X size={16} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900">{income.name}</h4>
                            <p className="text-sm text-gray-600">{income.category}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{formatCurrency(income.amount)}</p>
                              <p className="text-sm text-gray-600">{getFrequencyLabel(income.frequency)}</p>
                            </div>
                            {income.tax_rate && (
                              <div className="text-sm text-gray-600">
                                <p>Imposto: {income.tax_rate}%</p>
                              </div>
                            )}
                            {income.next_payment && income.frequency !== 'one-time' && (
                              <div className="text-sm text-gray-600">
                                <p>Próximo: {new Date(income.next_payment).toLocaleDateString('pt-BR')}</p>
                              </div>
                            )}
                            {income.next_payment && income.frequency === 'one-time' && (
                              <div className="text-sm text-gray-600">
                                <p>Data: {new Date(income.next_payment).toLocaleDateString('pt-BR')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(income)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(income.id)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
                  value={formData.taxRate}
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
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
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
                    setFormData({ amount: '', frequency: 'monthly', taxRate: '' });
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
    </div>
  );
}