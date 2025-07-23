import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Edit, 
  Trash2, 
  Save, 
  X 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DateRangeSelector from './DateRangeSelector';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Configuração inicial das datas - igual ao RevenueManagement e Investments
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // useEffect com dependências das datas - igual aos outros componentes
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedType, startDate, endDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Buscar receitas da tabela income_sources
      const transactionsData = await supabase
        .from('transactions')
        .select('id, type, description, amount, category, created_at, updated_at, date')
        .eq('user_id', user?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');
      console.log(transactionsData);

      const { data: incomeData, error: incomeError } = await supabase
        .from('transactions')
        .select('id, type, description, amount, category, created_at, updated_at, date')
        .eq('user_id', user?.id)
        .eq('type', 'income')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (transactionsData?.data) {
        console.error('Income error:', incomeError);
      }

      // Buscar despesas da tabela expenses  
      const { data: expenseData, error: expenseError } = await supabase
        .from('transactions')
        .select('id, type, description, amount, category, created_at, updated_at, date')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z');
      
      if (expenseError) {
        console.error('Expense error:', expenseError);
      }

      // Transformar dados para o formato de Transaction
      const incomeTransactions: Transaction[] = (incomeData || []).map(item => ({
        id: item.id,
        type: 'income' as const,
        amount: item.amount,
        category: item.category || 'Sem categoria',
        description: item.description,
        date: item.date || item.created_at,
        created_at: item.date,
        updated_at: item.updated_at
      }));

      const expenseTransactions: Transaction[] = (expenseData || []).map(item => ({
        id: item.id,
        type: 'expense' as const,
        amount: item.amount,
        category: item.category || 'Sem categoria',
        description: item.description,
        date: item.date || item.created_at, // Para expenses, usar created_at como data da transação
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      // Combinar e ordenar por data
      // let allTransactions = [...incomeTransactions, ...expenseTransactions];
      
      let allTransactions = transactionsData?.data;
      // Filtrar por tipo se necessário
      if (selectedType !== 'all') {
        allTransactions = transactionsData?.data?.filter(t => t.type === selectedType) || null;
      }

      // Ordenar por data (mais recente primeiro)
      allTransactions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (transactionData.type === 'income') {
        // Salvar receitas na tabela income_sources
        const { error } = await supabase
          .from('transactions')
          .insert([{
            user_id: user?.id,
            description: transactionData.description,
            type: 'income',
            amount: transactionData.amount,
            category: transactionData.category,
            is_active: true,
            date: transactionData.date
          }]);

        if (error) throw error;
      } else {
        // Salvar despesas na tabela expenses
        const { error } = await supabase
          .from('transactions')
          .insert([{
            user_id: user?.id,
            description: transactionData.description,
            amount: transactionData.amount,
            //is_recurring: transactionData.is_recuring, // Transações são sempre únicas
            type: 'expense',
            category: transactionData.category,
            date: transactionData.date
          }]);

        if (error) throw error;
      }
      
      setShowAddModal(false);
      fetchTransactions();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Erro ao adicionar transação');
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditForm({
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
      date: transaction.date
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const transaction = transactions.find(t => t.id === editingId);
      if (!transaction) return;

      if (transaction.type === 'income') {
        // Atualizar na tabela income_sources
        const { error } = await supabase
          .from('income_sources')
          .update({
            name: editForm.description,
            amount: editForm.amount,
            category: editForm.category,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Atualizar na tabela expenses
        const { error } = await supabase
          .from('expenses')
          .update({
            name: editForm.description,
            amount: editForm.amount,
            category: editForm.category,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      }
      
      setEditingId(null);
      setEditForm({});
      fetchTransactions();
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Erro ao atualizar transação');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return;

      if (transaction.type === 'income') {
        // Deletar da tabela income_sources
        const { error } = await supabase
          .from('income_sources')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // Deletar da tabela expenses
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Erro ao excluir transação');
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (searchTerm === '') return true;
    
    return (
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com DateRangeSelector - igual aos outros componentes */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Transações</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie suas receitas e despesas</p>
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
            className="flex items-center space-x-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg text-sm sm:text-base"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Period Info - igual ao Dashboard e Investments */}
      {transactions.length > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800 font-medium">
              Transações do período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800 font-medium">
              Nenhuma transação no período ({new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}). Tente selecionar um período diferente.
            </span>
          </div>
        </div>
      )}

      {/* Resumo - cards limpos sem informação do período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-green-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Receitas</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">R$ {totalIncome.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-red-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Despesas</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">R$ {totalExpense.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingDown className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>

        <div className={`${balance >= 0 ? 'bg-blue-600' : 'bg-orange-600'} p-4 sm:p-6 rounded-xl text-white shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Saldo</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">R$ {Math.abs(balance).toLocaleString('pt-BR')}</p>
              <p className="text-white/80 text-xs sm:text-sm">{balance >= 0 ? 'Positivo' : 'Negativo'}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
        </div>
      </div>

      {/* Lista de transações */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Suas Transações</h2>
            <div className="text-sm text-gray-500">
              Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Receipt className="h-10 sm:h-12 w-10 sm:w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nenhuma transação encontrada</h3>
              <p className="text-sm sm:text-base text-gray-500">
                {searchTerm ? 
                  `Nenhuma transação corresponde à busca "${searchTerm}" no período selecionado.` :
                  `Não há transações no período de ${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}`
                }
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm ? 
                  'Tente um termo de busca diferente ou limpe o filtro.' :
                  'Tente selecionar um período diferente ou adicione uma nova transação.'
                }
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
                {editingId === transaction.id ? (
                  // Modo de edição
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={editForm.type || ''}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'income' | 'expense' })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                      >
                        <option value="income">Receita</option>
                        <option value="expense">Despesa</option>
                      </select>
                      <input
                        type="number"
                        value={editForm.amount || ''}
                        onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                        placeholder="Valor"
                        step="0.01"
                      />
                    </div>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                      placeholder="Descrição"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                        placeholder="Categoria"
                      />
                      <input
                        type="date"
                        value={editForm.date || ''}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                      />
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-sm font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm text-sm font-medium"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo de visualização
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="h-5 sm:h-6 w-5 sm:w-6 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 sm:h-6 w-5 sm:w-6 text-red-600" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-800 text-sm sm:text-base">{transaction.description}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs sm:text-sm text-gray-500">{transaction.category}</span>
                          <span className="text-gray-300 hidden sm:inline">•</span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end sm:space-x-3">
                      <span className={`font-semibold text-base sm:text-lg ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}R$ {transaction.amount.toLocaleString('pt-BR')}
                      </span>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button 
                          onClick={() => handleEditTransaction(transaction)}
                          className="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex items-center"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de adicionar transação */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Nova Transação</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddTransaction({
                type: formData.get('type') as 'income' | 'expense',
                amount: Number(formData.get('amount')),
                category: formData.get('category') as string,
                description: formData.get('description') as string,
                date: formData.get('date') as string
              });
            }} className="p-4 sm:p-6 space-y-4">
              <select
                name="type"
                required
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
              >
                <option value="">Tipo de Transação</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
              
              <input
                type="number"
                name="amount"
                placeholder="Valor (R$)"
                step="0.01"
                required
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
              />
              
              <input
                type="text"
                name="description"
                placeholder="Descrição"
                required
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
              />
              
              <input
                type="text"
                name="category"
                placeholder="Categoria (ex: Alimentação, Transporte)"
                required
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
              />
              
              <input
                type="date"
                name="date"
                required
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
              />
                            
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 sm:py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm sm:text-base"
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