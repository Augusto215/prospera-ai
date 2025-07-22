import React, { useState, useEffect } from 'react';
import { Plus, Banknote, Building, TrendingUp, Edit, Trash2, RefreshCw, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: 'corrente' | 'poupanca' | 'investimento';
  balance: number;
  last_updated: string;
  created_at: string;
}

const accountTypes = [
  { value: 'corrente', label: 'Conta Corrente', color: 'bg-blue-500' },
  { value: 'poupanca', label: 'Poupança', color: 'bg-green-500' },
  { value: 'investimento', label: 'Conta Investimento', color: 'bg-purple-500' }
];

const banks = [
  'Banco do Brasil', 'Caixa Econômica', 'Itaú', 'Bradesco', 'Santander',
  'Nubank', 'Inter', 'C6 Bank', 'BTG Pactual', 'Sicoob', 'Sicredi',
  'Banco Original', 'Neon', 'Next', 'PagBank'
];

export default function BankAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BankAccount>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setError('Erro ao carregar contas bancárias');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (accountData: Omit<BankAccount, 'id' | 'created_at' | 'last_updated'>) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .insert([{
          ...accountData,
          user_id: user?.id,
          last_updated: new Date().toISOString()
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      fetchAccounts();
    } catch (err) {
      console.error('Error adding bank account:', err);
      setError('Erro ao adicionar conta bancária');
    }
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingId(account.id);
    setEditForm({
      bank_name: account.bank_name,
      account_type: account.account_type,
      balance: account.balance
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          ...editForm,
          last_updated: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchAccounts();
    } catch (err) {
      console.error('Error updating bank account:', err);
      setError('Erro ao atualizar conta bancária');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta bancária?')) return;

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAccounts();
    } catch (err) {
      console.error('Error deleting bank account:', err);
      setError('Erro ao excluir conta bancária');
    }
  };

  const handleUpdateBalance = async (id: string, newBalance: number) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ 
          balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      fetchAccounts();
    } catch (err) {
      console.error('Error updating balance:', err);
      setError('Erro ao atualizar saldo');
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const accountsByType = accountTypes.map(type => ({
    ...type,
    accounts: accounts.filter(acc => acc.account_type === type.value),
    total: accounts.filter(acc => acc.account_type === type.value).reduce((sum, acc) => sum + acc.balance, 0)
  }));

  const getTypeLabel = (type: string) => {
    return accountTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    return accountTypes.find(t => t.value === type)?.color || 'bg-gray-500';
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
          <h1 className="text-3xl font-bold text-gray-800">Contas Bancárias</h1>
          <p className="text-gray-500 mt-1">Gerencie seus saldos e contas</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Conta</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-emerald-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Saldo Total</p>
              <p className="text-3xl font-bold mt-1">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Banknote className="h-6 w-6" />
            </div>
          </div>
        </div>

        {accountsByType.map((type) => (
          <div key={type.value} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{type.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  R$ {type.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500 mt-1">{type.accounts.length} contas</p>
              </div>
              <div className={`${type.color} p-3 rounded-xl bg-opacity-10`}>
                <Building className={`h-6 w-6 ${type.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de contas */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Suas Contas</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {accounts.length === 0 ? (
            <div className="p-12 text-center">
              <Banknote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta cadastrada</h3>
              <p className="text-gray-500">Adicione suas contas bancárias para acompanhar seus saldos.</p>
            </div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                {editingId === account.id ? (
                  // Modo de edição
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={editForm.bank_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        {banks.map(bank => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editForm.account_type || ''}
                        onChange={(e) => setEditForm({ ...editForm, account_type: e.target.value as any })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        {accountTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="number"
                      value={editForm.balance || ''}
                      onChange={(e) => setEditForm({ ...editForm, balance: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="Saldo atual"
                      step="0.01"
                    />
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
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(account.account_type)}`}>
                        <Banknote className="h-6 w-6 text-white" />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-800">{account.bank_name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full text-white ${getTypeColor(account.account_type)}`}>
                            {getTypeLabel(account.account_type)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-500">
                            Última atualização: {new Date(account.last_updated).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-2xl text-gray-800">
                          R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const newBalance = prompt('Novo saldo:', account.balance.toString());
                            if (newBalance && !isNaN(Number(newBalance))) {
                              handleUpdateBalance(account.id, Number(newBalance));
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditAccount(account)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
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

      {/* Modal de adicionar conta */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Nova Conta Bancária</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddAccount({
                bank_name: formData.get('bank_name') as string,
                account_type: formData.get('account_type') as any,
                balance: Number(formData.get('balance')),
              });
            }} className="p-6 space-y-4">
              <select
                name="bank_name"
                required
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
              >
                <option value="">Selecione o banco</option>
                {banks.map(bank => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
              
              <select
                name="account_type"
                required
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
              >
                <option value="">Tipo de conta</option>
                {accountTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                name="balance"
                placeholder="Saldo atual (R$)"
                step="0.01"
                required
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
              />
              
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