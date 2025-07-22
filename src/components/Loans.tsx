import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, AlertTriangle, Calendar, Building, Edit, Trash2, Calculator, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Loan {
  id: string;
  type: 'pessoal' | 'consignado' | 'cartao' | 'financiamento' | 'cheque-especial';
  bank: string;
  amount: number;
  remaining_amount: number;
  interest_rate: number;
  monthly_payment: number;
  due_date: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

const loanTypes = [
  { value: 'pessoal', label: 'Empréstimo Pessoal', color: 'bg-blue-500' },
  { value: 'consignado', label: 'Consignado', color: 'bg-green-500' },
  { value: 'cartao', label: 'Cartão de Crédito', color: 'bg-red-500' },
  { value: 'financiamento', label: 'Financiamento', color: 'bg-purple-500' },
  { value: 'cheque-especial', label: 'Cheque Especial', color: 'bg-orange-500' }
];

const banks = [
  'Banco do Brasil', 'Caixa Econômica', 'Itaú', 'Bradesco', 'Santander',
  'Nubank', 'Inter', 'C6 Bank', 'BTG Pactual', 'Sicoob'
];

export default function Loans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Loan>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLoans();
    }
  }, [user]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError('Erro ao carregar empréstimos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLoan = async (loanData: Omit<Loan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('loans')
        .insert([{
          ...loanData,
          user_id: user?.id,
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      fetchLoans();
    } catch (err) {
      console.error('Error adding loan:', err);
      setError('Erro ao adicionar empréstimo');
    }
  };

  const handleEditLoan = (loan: Loan) => {
    setEditingId(loan.id);
    setEditForm({
      type: loan.type,
      bank: loan.bank,
      amount: loan.amount,
      remaining_amount: loan.remaining_amount,
      interest_rate: loan.interest_rate,
      monthly_payment: loan.monthly_payment,
      due_date: loan.due_date,
      start_date: loan.start_date,
      end_date: loan.end_date
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('loans')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchLoans();
    } catch (err) {
      console.error('Error updating loan:', err);
      setError('Erro ao atualizar empréstimo');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este empréstimo?')) return;

    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLoans();
    } catch (err) {
      console.error('Error deleting loan:', err);
      setError('Erro ao excluir empréstimo');
    }
  };

  const totalDebt = loans.reduce((sum, loan) => sum + loan.remaining_amount, 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + loan.monthly_payment, 0);
  const averageInterestRate = loans.length > 0 
    ? loans.reduce((sum, loan) => sum + loan.interest_rate, 0) / loans.length 
    : 0;

  const getTypeLabel = (type: string) => {
    return loanTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    return loanTypes.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  const calculateRemainingMonths = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, diffMonths);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Empréstimos e Dívidas</h1>
          <p className="text-gray-500 mt-1">Controle suas dívidas e planeje quitações</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Dívida</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Dívida Total</p>
              <p className="text-3xl font-bold mt-1">R$ {totalDebt.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-orange-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Pagamento Mensal</p>
              <p className="text-3xl font-bold mt-1">R$ {totalMonthlyPayment.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-purple-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Taxa Média</p>
              <p className="text-3xl font-bold mt-1">{averageInterestRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Calculator className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de empréstimos */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Suas Dívidas</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {loans.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma dívida cadastrada</h3>
              <p className="text-gray-500">Adicione seus empréstimos para acompanhar suas dívidas.</p>
            </div>
          ) : (
            loans.map((loan) => {
              const remainingMonths = calculateRemainingMonths(loan.end_date);
              const daysUntilDue = getDaysUntilDue(loan.due_date);
              const isOverdue = daysUntilDue < 0;
              const isDueSoon = daysUntilDue <= 5 && daysUntilDue >= 0;
              
              return (
                <div key={loan.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  {editingId === loan.id ? (
                    // Modo de edição
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                          value={editForm.type || ''}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        >
                          {loanTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editForm.bank || ''}
                          onChange={(e) => setEditForm({ ...editForm, bank: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        >
                          {banks.map(bank => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="number"
                          value={editForm.amount || ''}
                          onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                          placeholder="Valor total"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={editForm.remaining_amount || ''}
                          onChange={(e) => setEditForm({ ...editForm, remaining_amount: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                          placeholder="Valor restante"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={editForm.monthly_payment || ''}
                          onChange={(e) => setEditForm({ ...editForm, monthly_payment: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                          placeholder="Pagamento mensal"
                          step="0.01"
                        />
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo de visualização
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(loan.type)}`}>
                          <CreditCard className="h-6 w-6 text-white" />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-800">{loan.bank}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${getTypeColor(loan.type)}`}>
                              {getTypeLabel(loan.type)}
                            </span>
                            {isOverdue && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                Vencido
                              </span>
                            )}
                            {isDueSoon && (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                                Vence em {daysUntilDue} dias
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">
                              Taxa: {loan.interest_rate}% a.m.
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {remainingMonths} meses restantes
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              Próximo vencimento: {new Date(loan.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-semibold text-lg text-red-600">
                              R$ {loan.remaining_amount.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-sm text-gray-500">
                              de R$ {loan.amount.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-sm text-orange-600">
                              R$ {loan.monthly_payment.toLocaleString('pt-BR')}/mês
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleEditLoan(loan)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteLoan(loan.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Barra de progresso */}
                  {editingId !== loan.id && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progresso de pagamento</span>
                        <span>{((loan.amount - loan.remaining_amount) / loan.amount * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${((loan.amount - loan.remaining_amount) / loan.amount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de adicionar empréstimo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Nova Dívida</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddLoan({
                type: formData.get('type') as any,
                bank: formData.get('bank') as string,
                amount: Number(formData.get('amount')),
                remaining_amount: Number(formData.get('remaining_amount')),
                interest_rate: Number(formData.get('interest_rate')),
                monthly_payment: Number(formData.get('monthly_payment')),
                due_date: formData.get('due_date') as string,
                start_date: formData.get('start_date') as string,
                end_date: formData.get('end_date') as string,
              });
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  name="type"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                >
                  <option value="">Tipo de Dívida</option>
                  {loanTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                
                <select
                  name="bank"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                >
                  <option value="">Banco/Instituição</option>
                  {banks.map(bank => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="amount"
                  placeholder="Valor total (R$)"
                  step="0.01"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                />
                
                <input
                  type="number"
                  name="remaining_amount"
                  placeholder="Valor restante (R$)"
                  step="0.01"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="interest_rate"
                  placeholder="Taxa de juros (% a.m.)"
                  step="0.01"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                />
                
                <input
                  type="number"
                  name="monthly_payment"
                  placeholder="Pagamento mensal (R$)"
                  step="0.01"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Próximo vencimento</label>
                  <input
                    type="date"
                    name="due_date"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data final</label>
                  <input
                    type="date"
                    name="end_date"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-black"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}