import React, { useState, useEffect } from 'react';
import { Plus, Shield, TrendingUp, Calendar, Building, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RetirementPlan {
  id: string;
  type: 'inss' | 'privada' | 'pgbl' | 'vgbl';
  name: string;
  company: string;
  monthly_contribution: number;
  total_contributed: number;
  expected_return?: number;
  start_date: string;
  retirement_age?: number;
  created_at: string;
  updated_at: string;
}

const retirementTypes = [
  { value: 'inss', label: 'INSS', color: 'bg-blue-500' },
  { value: 'privada', label: 'Previdência Privada', color: 'bg-green-500' },
  { value: 'pgbl', label: 'PGBL', color: 'bg-purple-500' },
  { value: 'vgbl', label: 'VGBL', color: 'bg-orange-500' }
];

const companies = [
  'Governo Federal', 'Bradesco Seguros', 'Itaú Seguros', 'SulAmérica', 'Porto Seguro',
  'Caixa Seguros', 'Santander Seguros', 'Mongeral Aegon', 'Icatu Seguros'
];

export default function Retirement() {
  const { user } = useAuth();
  const [retirements, setRetirements] = useState<RetirementPlan[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RetirementPlan>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRetirements();
    }
  }, [user]);

  const fetchRetirements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('retirement_plans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRetirements(data || []);
    } catch (err) {
      console.error('Error fetching retirement plans:', err);
      setError('Erro ao carregar planos de previdência');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRetirement = async (retirementData: Omit<RetirementPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('retirement_plans')
        .insert([{
          ...retirementData,
          user_id: user?.id,
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      fetchRetirements();
    } catch (err) {
      console.error('Error adding retirement plan:', err);
      setError('Erro ao adicionar plano de previdência');
    }
  };

  const handleEditRetirement = (retirement: RetirementPlan) => {
    setEditingId(retirement.id);
    setEditForm({
      type: retirement.type,
      name: retirement.name,
      company: retirement.company,
      monthly_contribution: retirement.monthly_contribution,
      total_contributed: retirement.total_contributed,
      expected_return: retirement.expected_return,
      start_date: retirement.start_date,
      retirement_age: retirement.retirement_age
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('retirement_plans')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchRetirements();
    } catch (err) {
      console.error('Error updating retirement plan:', err);
      setError('Erro ao atualizar plano de previdência');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteRetirement = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano de previdência?')) return;

    try {
      const { error } = await supabase
        .from('retirement_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRetirements();
    } catch (err) {
      console.error('Error deleting retirement plan:', err);
      setError('Erro ao excluir plano de previdência');
    }
  };

  const totalMonthlyContribution = retirements.reduce((sum, ret) => sum + ret.monthly_contribution, 0);
  const totalContributed = retirements.reduce((sum, ret) => sum + ret.total_contributed, 0);
  const totalExpectedReturn = retirements.reduce((sum, ret) => sum + (ret.expected_return || 0), 0);

  const getTypeLabel = (type: string) => {
    return retirementTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    return retirementTypes.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  const calculateYearsContributing = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
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
          <h1 className="text-3xl font-bold text-gray-800">Previdência</h1>
          <p className="text-gray-500 mt-1">Planeje sua aposentadoria com segurança</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Previdência</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Contribuição Mensal</p>
              <p className="text-3xl font-bold mt-1">R$ {totalMonthlyContribution.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-green-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Total Contribuído</p>
              <p className="text-3xl font-bold mt-1">R$ {totalContributed.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-purple-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Renda Esperada</p>
              <p className="text-3xl font-bold mt-1">R$ {totalExpectedReturn.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de previdências */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Seus Planos de Previdência</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {retirements.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum plano de previdência cadastrado</h3>
              <p className="text-gray-500">Adicione seus planos para acompanhar sua aposentadoria.</p>
            </div>
          ) : (
            retirements.map((retirement) => {
              const yearsContributing = calculateYearsContributing(retirement.start_date);
              
              return (
                <div key={retirement.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  {editingId === retirement.id ? (
                    // Modo de edição
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                          value={editForm.type || ''}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {retirementTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editForm.company || ''}
                          onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {companies.map(company => (
                            <option key={company} value={company}>
                              {company}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Nome do plano"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="number"
                          value={editForm.monthly_contribution || ''}
                          onChange={(e) => setEditForm({ ...editForm, monthly_contribution: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Contribuição mensal"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={editForm.total_contributed || ''}
                          onChange={(e) => setEditForm({ ...editForm, total_contributed: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Total contribuído"
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(retirement.type)}`}>
                          <Shield className="h-6 w-6 text-white" />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-800">{retirement.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${getTypeColor(retirement.type)}`}>
                              {getTypeLabel(retirement.type)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">{retirement.company}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {yearsContributing} anos contribuindo
                            </span>
                            {retirement.retirement_age && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-sm text-gray-500">
                                  Aposentadoria aos {retirement.retirement_age} anos
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-semibold text-lg text-gray-800">
                              R$ {retirement.monthly_contribution.toLocaleString('pt-BR')}/mês
                            </p>
                            <p className="text-sm text-gray-500">
                              Total: R$ {retirement.total_contributed.toLocaleString('pt-BR')}
                            </p>
                            {retirement.expected_return && (
                              <p className="text-sm text-green-600">
                                Renda: R$ {retirement.expected_return.toLocaleString('pt-BR')}/mês
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleEditRetirement(retirement)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRetirement(retirement.id)}
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

      {/* Modal de adicionar previdência */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Nova Previdência</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddRetirement({
                type: formData.get('type') as any,
                name: formData.get('name') as string,
                company: formData.get('company') as string,
                monthly_contribution: Number(formData.get('monthly_contribution')),
                total_contributed: Number(formData.get('total_contributed')),
                expected_return: Number(formData.get('expected_return')) || undefined,
                start_date: formData.get('start_date') as string,
                retirement_age: Number(formData.get('retirement_age')) || undefined,
              });
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  name="type"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                >
                  <option value="">Tipo de Previdência</option>
                  {retirementTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                
                <select
                  name="company"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                >
                  <option value="">Empresa/Seguradora</option>
                  {companies.map(company => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
              
              <input
                type="text"
                name="name"
                placeholder="Nome do plano"
                required
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="monthly_contribution"
                  placeholder="Contribuição mensal (R$)"
                  step="0.01"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                />
                
                <input
                  type="number"
                  name="total_contributed"
                  placeholder="Total já contribuído (R$)"
                  step="0.01"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="expected_return"
                  placeholder="Renda esperada (R$/mês) - opcional"
                  step="0.01"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                />
                
                <input
                  type="number"
                  name="retirement_age"
                  placeholder="Idade de aposentadoria - opcional"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
                <input
                  type="date"
                  name="start_date"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                />
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