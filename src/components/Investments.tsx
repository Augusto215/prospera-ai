import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, Building, DollarSign, Calendar, Edit, Trash2, PieChart, Save, X, Landmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DateRangeSelector from './DateRangeSelector';

// Interface Investment corrigida - com todos os campos da tabela
interface Investment {
  id: string;
  type: 'renda-fixa' | 'acoes' | 'fundos-imobiliarios' | 'private-equity' | 'titulos-credito';
  name: string;
  broker: string;
  amount: number;
  purchase_price?: number;
  current_price?: number;
  interest_rate?: number;
  dividend_yield?: number; // Dividend yield para ações e FIIs
  monthly_income?: number;
  purchase_date: string;
  maturity_date?: string;
  quantity?: number;
  tax_rate?: number; // Taxa de imposto
  created_at: string;
  updated_at: string;
}

const investmentTypes = [
  { value: 'renda-fixa', label: 'Renda Fixa', color: 'bg-blue-500' },
  { value: 'acoes', label: 'Ações', color: 'bg-green-500' },
  { value: 'fundos-imobiliarios', label: 'Fundos Imobiliários', color: 'bg-purple-500' },
  { value: 'private-equity', label: 'Private Equity', color: 'bg-yellow-500' },
  { value: 'titulos-credito', label: 'Títulos de Crédito', color: 'bg-indigo-500' }
];

const brokers = [
  'XP Investimentos', 'Rico', 'Inter', 'BTG Pactual', 'Nubank', 'Clear', 'Toro', 'Easynvest'
];

export default function Investments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Investment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');

  // Configuração inicial das datas - igual ao RevenueManagement
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [formData, setFormData] = useState({
    quantity: '',
    current_price: '',
    amount: '',
    dividend_yield: '',
    calculated_monthly_income: '',
    tax_rate: ''
  });

  // Define requiresQuantity function early to avoid initialization errors
  const requiresQuantity = (type: string) => {
    return type === 'acoes' || type === 'fundos-imobiliarios';
  };

  const requiresDividendYield = (type: string) => {
    return type === 'acoes' || type === 'fundos-imobiliarios';
  };

  const requiresInterestRate = (type: string) => {
    return type === 'renda-fixa' || type === 'private-equity' || type === 'titulos-credito';
  };

  const calculateMonthlyIncome = (investment: Investment) => {
    let calculatedIncome = 0;

    // Para ações e FIIs, usar dividend yield
    if (requiresDividendYield(investment.type) && investment.dividend_yield) {
      const currentValue = investment.quantity && investment.current_price
        ? investment.quantity * investment.current_price
        : investment.amount;
      calculatedIncome = (currentValue * investment.dividend_yield) / 100 / 12;
    }

    // Para renda fixa e outros, usar taxa de juros
    if (requiresInterestRate(investment.type) && investment.interest_rate && investment.amount) {
      calculatedIncome = (investment.amount * investment.interest_rate) / 100 / 12;
    }

    // Fallback para renda mensal manual
    if (investment.monthly_income) {
      calculatedIncome = investment.monthly_income;
    }

    return calculatedIncome;
  };

  const calculateCapitalGain = (investment: Investment) => {
    if (requiresQuantity(investment.type) && investment.quantity && investment.current_price && investment.purchase_price) {
      const currentValue = investment.quantity * investment.current_price;
      const purchaseValue = investment.quantity * investment.purchase_price;
      return currentValue - purchaseValue;
    }

    if (investment.current_price && investment.purchase_price) {
      return investment.current_price - investment.purchase_price;
    }

    return 0;
  };

  const getTypeLabel = (type: string) => {
    return investmentTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    return investmentTypes.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  // Calcular taxa de imposto com base no tipo de investimento
  const calculateTaxRate = (type: string, monthlyIncome: number = 0): number => {
    // Regras de imposto por tipo de investimento
    switch (type) {
      case 'renda-fixa':
        // Imposto regressivo para renda fixa
        return 15; // Taxa média para simplificar
      case 'acoes':
        // 15% para ações com venda acima de R$ 20.000/mês
        return 15;
      case 'fundos-imobiliarios':
        // FIIs são isentos para pessoa física
        return 0;
      case 'private-equity':
        // Taxa padrão para private equity
        return 15;
      case 'titulos-credito':
        // Títulos de crédito (similar a renda fixa)
        return 15;
      default:
        // Taxa padrão para outros tipos
        return 15;
    }
  };


// Função fetchInvestments corrigida - com todos os campos da tabela
const fetchInvestments = async () => {
  setLoading(true);
  try {
    // Buscar investimentos com filtro de data baseado na purchase_date
    const { data, error } = await supabase
      .from('investments')
      .select('id, name, type, broker, amount, purchase_price, current_price, interest_rate, monthly_income, purchase_date, maturity_date, quantity, dividend_yield, tax_rate, created_at, updated_at')
      .eq('user_id', user?.id)
      .gte('purchase_date', startDate)
      .lte('purchase_date', endDate + 'T23:59:59.999Z') // Incluir o dia completo
      .order('created_at', { ascending: false }); // Voltando para created_at

    if (error) throw error;
    setInvestments(data || []);
  } catch (err) {
    console.error('Error fetching investments:', err);
    setError('Erro ao carregar investimentos');
  } finally {
    setLoading(false);
  }
};

// Função handleSaveEdit corrigida - mantendo updated_at
const handleSaveEdit = async () => {
  if (!editingId) return;

  try {
    // Recalcular amount se for ações/FIIs e tiver quantidade e preço atual
    if (requiresQuantity(editForm.type || '') && editForm.quantity && editForm.current_price) {
      editForm.amount = editForm.quantity * editForm.current_price;
    }

    // Recalcular taxa de imposto
    if (editForm.type) {
      const monthlyIncome = editForm.monthly_income || 0;
      editForm.tax_rate = calculateTaxRate(editForm.type, monthlyIncome);
    }

    const { error } = await supabase
      .from('investments')
      .update({
        ...editForm,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingId);

    if (error) throw error;
    
    setEditingId(null);
    setEditForm({});
    fetchInvestments();
  } catch (err) {
    console.error('Error updating investment:', err);
    setError('Erro ao atualizar investimento');
  }
};

  // useEffect com dependências das datas - igual ao RevenueManagement
  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
  }, [user, startDate, endDate]);

  // Auto-calculate amount when quantity or current price change for stocks/FIIs
  useEffect(() => {
    if (requiresQuantity(selectedType) && formData.quantity && formData.current_price) {
      const calculatedAmount = Number(formData.quantity) * Number(formData.current_price);
      setFormData(prev => ({ ...prev, amount: calculatedAmount.toString() }));
    }
  }, [formData.quantity, formData.current_price, selectedType]);

  // Auto-calculate monthly income when dividend yield changes for stocks/FIIs
  useEffect(() => {
    if (requiresDividendYield(selectedType) && formData.dividend_yield && formData.amount) {
      const monthlyIncome = (Number(formData.amount) * Number(formData.dividend_yield)) / 100 / 12;
      setFormData(prev => ({ ...prev, calculated_monthly_income: monthlyIncome.toFixed(2) }));

      // Calcular taxa de imposto
      const taxRate = calculateTaxRate(selectedType, monthlyIncome);
      setFormData(prev => ({ ...prev, tax_rate: taxRate.toString() }));
    } else {
      setFormData(prev => ({ ...prev, calculated_monthly_income: '' }));
    }
  }, [formData.dividend_yield, formData.amount, selectedType]);

  // Atualizar taxa de imposto quando o tipo de investimento muda
  useEffect(() => {
    if (selectedType) {
      const taxRate = calculateTaxRate(selectedType);
      setFormData(prev => ({ ...prev, tax_rate: taxRate.toString() }));
    }
  }, [selectedType]);

  const handleAddInvestment = async (investmentData: Omit<Investment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('investments')
        .insert([{
          ...investmentData,
          user_id: user?.id,
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      setSelectedType('');
      setFormData({ 
        quantity: '', 
        current_price: '', 
        amount: '', 
        dividend_yield: '', 
        calculated_monthly_income: '',
        tax_rate: ''
      });
      fetchInvestments();
    } catch (err) {
      console.error('Error adding investment:', err);
      setError('Erro ao adicionar investimento');
    }
  };


  const handleEditInvestment = (investment: Investment) => {
    setEditingId(investment.id);
    setEditForm({
      type: investment.type,
      name: investment.name,
      broker: investment.broker,
      amount: investment.amount,
      purchase_price: investment.purchase_price,
      current_price: investment.current_price,
      interest_rate: investment.interest_rate,
      dividend_yield: investment.dividend_yield,
      monthly_income: investment.monthly_income,
      purchase_date: investment.purchase_date,
      maturity_date: investment.maturity_date,
      quantity: investment.quantity,
      tax_rate: investment.tax_rate
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este investimento?')) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchInvestments();
    } catch (err) {
      console.error('Error deleting investment:', err);
      setError('Erro ao excluir investimento');
    }
  };

  // Calcular valor total investido (preço de compra ou valor original)
  const totalInvested = investments.reduce((sum, inv) => {
    if (requiresQuantity(inv.type) && inv.quantity && inv.purchase_price) {
      return sum + (inv.quantity * inv.purchase_price);
    }
    return sum + inv.amount;
  }, 0);

  // Calcular valor atual total
  const totalCurrentValue = investments.reduce((sum, inv) => {
    if (requiresQuantity(inv.type) && inv.quantity && inv.current_price) {
      return sum + (inv.quantity * inv.current_price);
    }
    return sum + (inv.current_price || inv.purchase_price || inv.amount);
  }, 0);

  const totalMonthlyIncome = investments.reduce((sum, inv) => sum + calculateMonthlyIncome(inv), 0);
  const totalCapitalGain = investments.reduce((sum, inv) => sum + calculateCapitalGain(inv), 0);

  // Calcular total de impostos
  const totalTaxes = investments.reduce((sum, inv) => {
    const monthlyIncome = calculateMonthlyIncome(inv);
    return sum + (monthlyIncome * (inv.tax_rate || 0) / 100);
  }, 0);

  // Calcular rentabilidade total
  const totalReturn = totalCurrentValue - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const handleFormDataChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelection = (type: string) => {
    setSelectedType(type);
    setFormData({
      quantity: '',
      current_price: '',
      amount: '',
      dividend_yield: '',
      calculated_monthly_income: '',
      tax_rate: calculateTaxRate(type).toString()
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com DateRangeSelector - igual ao RevenueManagement */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Investimentos</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie sua carteira de investimentos</p>
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
            className="flex items-center space-x-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md text-sm sm:text-base"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Investimento</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Period Info - igual ao Dashboard */}
      {investments.length > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800 font-medium">
              Investimentos do período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800 font-medium">
              Nenhum investimento no período ({new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}). Tente selecionar um período diferente.
            </span>
          </div>
        </div>
      )}

      {/* Resumo - com cards limpos sem informação do período */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-blue-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Total Investido</p>
              <p className="text-base sm:text-2xl font-bold mt-1">R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <DollarSign className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
        </div>

        <div className="bg-green-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Valor Atual</p>
              <p className="text-base sm:text-2xl font-bold mt-1">R$ {totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
        </div>

        <div className={`${returnPercentage >= 0 ? 'bg-emerald-600' : 'bg-red-600'} p-4 sm:p-6 rounded-xl text-white shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium pr-2">Rentabilidade</p>
              <p className="text-base sm:text-2xl font-bold mt-1">
                {returnPercentage >= 0 ? '+ ' : ''}{returnPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <PieChart className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
        </div>

        <div className="bg-purple-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Renda Mensal</p>
              <p className="text-base sm:text-2xl font-bold mt-1">R$ {totalMonthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <Calendar className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
        </div>

        <div className={`${totalCapitalGain >= 0 ? 'bg-teal-600' : 'bg-orange-600'} p-4 sm:p-6 rounded-xl text-white shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Ganho Capital</p>
              <p className="text-base sm:text-2xl font-bold mt-1">
                {totalCapitalGain >= 0 ? '+ ' : ''}R$ {Math.abs(totalCapitalGain).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Impostos</p>
              <p className="text-base sm:text-2xl font-bold mt-1">R$ {totalTaxes.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
              <Landmark className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de investimentos */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Sua Carteira</h2>
            <div className="text-sm text-gray-500">
              Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {investments.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Building className="h-10 sm:h-12 w-10 sm:w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nenhum investimento encontrado</h3>
              <p className="text-sm sm:text-base text-gray-500">
                Não há investimentos no período de {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Tente selecionar um período diferente ou adicione um novo investimento.
              </p>
            </div>
          ) : (
            investments.map((investment) => {
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
                <div key={investment.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
                  {editingId === investment.id ? (
                    // Modo de edição
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                          value={editForm.type || ''}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                        >
                          {investmentTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editForm.broker || ''}
                          onChange={(e) => setEditForm({ ...editForm, broker: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                        >
                          {brokers.map(broker => (
                            <option key={broker} value={broker}>
                              {broker}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                        placeholder="Nome do investimento"
                      />
                      {requiresQuantity(editForm.type || '') ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input
                            type="number"
                            value={editForm.quantity || ''}
                            onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                            className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                            placeholder="Quantidade"
                            step="1"
                          />
                          <input
                            type="number"
                            value={editForm.current_price || ''}
                            onChange={(e) => setEditForm({ ...editForm, current_price: Number(e.target.value) })}
                            className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                            placeholder="Preço atual"
                            step="0.01"
                          />
                          <input
                            type="number"
                            value={editForm.purchase_price || ''}
                            onChange={(e) => setEditForm({ ...editForm, purchase_price: Number(e.target.value) })}
                            className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                            placeholder="Preço de compra"
                            step="0.01"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="number"
                            value={editForm.amount || ''}
                            onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                            className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                            placeholder="Valor investido"
                            step="0.01"
                          />
                          <input
                            type="number"
                            value={editForm.interest_rate || ''}
                            onChange={(e) => setEditForm({ ...editForm, interest_rate: Number(e.target.value) })}
                            className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                            placeholder="Taxa de juros (% a.a.)"
                            step="0.01"
                          />
                        </div>
                      )}
                      {requiresDividendYield(editForm.type || '') && (
                        <input
                          type="number"
                          value={editForm.dividend_yield || ''}
                          onChange={(e) => setEditForm({ ...editForm, dividend_yield: Number(e.target.value) })}
                          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white text-black"
                          placeholder="Dividend Yield (% a.a.)"
                          step="0.01"
                        />
                      )}
                      <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="py-2 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="py-2 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm text-sm"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo de visualização
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${getTypeColor(investment.type)}`}>
                          <Building className="h-5 sm:h-6 w-5 sm:w-6 text-white" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h3 className="font-medium text-gray-800 text-sm sm:text-base">{investment.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${getTypeColor(investment.type)}`}>
                              {getTypeLabel(investment.type)}
                            </span>
                            {investment.quantity && requiresQuantity(investment.type) && (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                {investment.quantity} {investment.type === 'acoes' ? 'ações' : 'cotas'}
                              </span>
                            )}
                            {investment.tax_rate && investment.tax_rate > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 flex items-center space-x-1">
                                <Landmark className="h-3 w-3" />
                                <span>IR {investment.tax_rate}%</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs sm:text-sm text-gray-500">{investment.broker}</span>
                            <span className="text-gray-300 hidden sm:inline">•</span>
                            <span className="text-xs sm:text-sm text-gray-500">
                              Compra: {new Date(investment.purchase_date).toLocaleDateString('pt-BR')}
                            </span>
                            {investment.dividend_yield && (
                              <>
                                <span className="text-gray-300 hidden sm:inline">•</span>
                                <span className="text-xs sm:text-sm text-gray-500">DY: {investment.dividend_yield}%</span>
                              </>
                            )}
                            {investment.interest_rate && (
                              <>
                                <span className="text-gray-300 hidden sm:inline">•</span>
                                <span className="text-xs sm:text-sm text-gray-500">{investment.interest_rate}% a.a.</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-semibold text-base sm:text-lg text-gray-800">
                              R$ {currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className={`text-xs sm:text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profit >= 0 ? '+' : ''}R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({profitPercentage.toFixed(2)}%)
                            </p>
                            {monthlyIncome > 0 && (
                              <p className="text-xs sm:text-sm text-purple-600">
                                +R$ {monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                                {taxAmount > 0 && ` (IR: R$ ${taxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditInvestment(investment)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvestment(investment.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de adicionar investimento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Novo Investimento</h2>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Primeira etapa: Seleção do tipo */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">1. Selecione o tipo de investimento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {investmentTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeSelection(type.value)}
                      className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left ${selectedType === type.value
                          ? 'border-green-500 bg-green-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${type.color} flex items-center justify-center mb-2`}>
                        <Building className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="font-medium text-gray-800 text-sm sm:text-base">{type.label}</h4>
                      {type.value === 'fundos-imobiliarios' && (
                        <p className="text-xs text-green-600 mt-1">Isento de IR para pessoa física</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Segunda etapa: Formulário específico */}
              {selectedType && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formDataObj = new FormData(e.currentTarget);

                  // Validar campos obrigatórios para ações e FIIs
                  if (requiresQuantity(selectedType)) {
                    if (!formDataObj.get('quantity')) {
                      alert('Quantidade é obrigatória para ações e fundos imobiliários');
                      return;
                    }
                    if (!formDataObj.get('current_price')) {
                      alert('Preço atual é obrigatório para ações e fundos imobiliários');
                      return;
                    }
                  }

                  // Para ações e FIIs, usar o valor calculado automaticamente
                  const amount = requiresQuantity(selectedType) && formData.amount
                    ? Number(formData.amount)
                    : Number(formDataObj.get('amount'));

                  // Usar a taxa de imposto calculada
                  const taxRate = formData.tax_rate ? Number(formData.tax_rate) : calculateTaxRate(selectedType);

                  handleAddInvestment({
                    type: selectedType as any,
                    name: formDataObj.get('name') as string,
                    broker: formDataObj.get('broker') as string,
                    amount: amount,
                    purchase_price: Number(formDataObj.get('purchase_price')) || undefined,
                    current_price: Number(formDataObj.get('current_price')) || undefined,
                    interest_rate: Number(formDataObj.get('interest_rate')) || undefined,
                    dividend_yield: Number(formDataObj.get('dividend_yield')) || undefined,
                    monthly_income: Number(formDataObj.get('monthly_income')) || undefined,
                    purchase_date: formDataObj.get('purchase_date') as string,
                    maturity_date: formDataObj.get('maturity_date') as string || undefined,
                    quantity: requiresQuantity(selectedType) ? Number(formDataObj.get('quantity')) : undefined,
                    tax_rate: taxRate
                  });
                }} className="space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">2. Informações do investimento</h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <input
                          type="text"
                          name="name"
                          placeholder="Nome do investimento (ex: PETR4, HGLG11)"
                          required
                          className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                        />

                        <select
                          name="broker"
                          required
                          className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                        >
                          <option value="">Corretora</option>
                          {brokers.map(broker => (
                            <option key={broker} value={broker}>
                              {broker}
                            </option>
                          ))}
                        </select>
                      </div>

                      {requiresQuantity(selectedType) ? (
                        // Layout para ações e FIIs
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <input
                              type="number"
                              name="quantity"
                              placeholder="Quantidade de ações/cotas *"
                              step="1"
                              required
                              value={formData.quantity}
                              onChange={(e) => handleFormDataChange('quantity', e.target.value)}
                              className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                            />
                            <input
                              type="number"
                              name="current_price"
                              placeholder="Preço atual (R$) *"
                              step="0.01"
                              required
                              value={formData.current_price}
                              onChange={(e) => handleFormDataChange('current_price', e.target.value)}
                              className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <input
                              type="number"
                              name="amount"
                              placeholder="Valor total investido (calculado automaticamente)"
                              step="0.01"
                              value={formData.amount}
                              readOnly
                              className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 text-sm sm:text-base"
                            />
                            <input
                              type="number"
                              name="purchase_price"
                              placeholder="Preço de compra (R$)"
                              step="0.01"
                              className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                            />
                          </div>

                          <div className="space-y-3">
                            <input
                              type="number"
                              name="dividend_yield"
                              placeholder="Dividend Yield (% a.a.) - opcional"
                              step="0.01"
                              value={formData.dividend_yield}
                              onChange={(e) => handleFormDataChange('dividend_yield', e.target.value)}
                              className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                            />

                            {formData.calculated_monthly_income && (
                              <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                                <p className="text-xs sm:text-sm text-green-700">
                                  💰 Renda mensal calculada: <strong>R$ {formData.calculated_monthly_income}</strong>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  Baseado em: {formData.quantity} × R$ {formData.current_price} × {formData.dividend_yield}% ÷ 12 meses
                                </p>
                              </div>
                            )}

                            {formData.tax_rate && Number(formData.tax_rate) > 0 && (
                              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                                <div className="flex items-center space-x-2">
                                  <Landmark className="h-4 w-4 text-indigo-600" />
                                  <p className="text-xs sm:text-sm text-indigo-700 font-medium">
                                    Taxa de imposto: {formData.tax_rate}%
                                  </p>
                                </div>
                                {selectedType === 'fundos-imobiliarios' && (
                                  <p className="text-xs text-green-600 mt-1">
                                    FIIs são isentos de IR para pessoa física
                                  </p>
                                )}
                                {selectedType !== 'fundos-imobiliarios' && (
                                  <p className="text-xs text-indigo-600 mt-1">
                                    Esta taxa será aplicada sobre os rendimentos mensais
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Layout para renda fixa e outros
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <input
                              type="number"
                              name="amount"
                              placeholder="Valor investido (R$) *"
                              step="0.01"
                              required
                              className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                            />
                            <input
                              type="number"
                              name="interest_rate"
                              placeholder="Taxa de juros (% a.a.) - opcional"
                              step="0.01"
                              className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                            />
                          </div>

                          {formData.tax_rate && Number(formData.tax_rate) > 0 && (
                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                              <div className="flex items-center space-x-2">
                                <Landmark className="h-4 w-4 text-indigo-600" />
                                <p className="text-xs sm:text-sm text-indigo-700 font-medium">
                                  Taxa de imposto: {formData.tax_rate}%
                                </p>
                              </div>
                              <p className="text-xs text-indigo-600 mt-1">
                                {selectedType === 'renda-fixa'
                                  ? 'Renda fixa tem imposto regressivo de 22.5% a 15% conforme o prazo'
                                  : 'Esta taxa será aplicada sobre os rendimentos mensais'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data de compra</label>
                          <input
                            type="date"
                            name="purchase_date"
                            required
                            className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Vencimento (opcional)</label>
                          <input
                            type="date"
                            name="maturity_date"
                            className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm sm:text-base bg-white text-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setSelectedType('');
                        setFormData({
                          quantity: '',
                          current_price: '',
                          amount: '',
                          dividend_yield: '',
                          calculated_monthly_income: '',
                          tax_rate: ''
                        });
                      }}
                      className="flex-1 py-2 sm:py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-sm sm:text-base"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm text-sm sm:text-base"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}