import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  CheckCircle, 
  X, 
  AlertTriangle,
  CreditCard,
  Mail,
  User as UserIcon,
  Calendar,
  Save,
  Shield,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  plan?: string; // Simulado, não existe no banco ainda
  plan_expires?: string; // Simulado, não existe no banco ainda
}

export default function AdminPanel() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'admin' | 'starter' | 'family'>('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    is_admin: false,
    plan: 'starter',
    plan_expires: new Date().toISOString().split('T')[0],
    is_in_trial: true,
    trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, selectedFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Simular dados de plano que ainda não existem no banco
      const usersWithPlan = (data || []).map(user => ({
        ...user,
        plan: user.plan || 'starter', // Use the plan from the database or default to starter
        plan_expires: user.plan_expires || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));
      
      setUsers(usersWithPlan);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por tipo
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'admin') {
        filtered = filtered.filter(user => user.is_admin);
      } else {
        filtered = filtered.filter(user => user.plan === selectedFilter);
      }
    }

    setFilteredUsers(filtered);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email,
      is_admin: user.is_admin || false, 
      plan: user.plan || 'starter', 
      plan_expires: user.plan_expires || new Date().toISOString().split('T')[0],
      is_in_trial: user.is_in_trial || false,
      trial_expires_at: user.trial_expires_at || new Date().toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    const originalPlan = editingUser.plan;
    const newPlan = editForm.plan || 'starter';
    const planChanged = originalPlan !== newPlan;

    try {
      // Atualizar perfil do usuário
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          is_admin: editForm.is_admin,
          plan: newPlan, 
          is_in_trial: editForm.is_in_trial,
          trial_expires_at: editForm.trial_expires_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)
        .select();

      if (error) throw error;
      
      // Atualizar usuário na lista local
      setUsers(prev => prev.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            full_name: editForm.full_name,
            is_admin: editForm.is_admin,
            plan: newPlan,
            plan_expires: editForm.plan_expires,
            is_in_trial: editForm.is_in_trial,
            trial_expires_at: editForm.trial_expires_at
          };
        }
        return u;
      }));
      
      // Se o plano foi alterado, emitir um evento para atualizar a UI
      if (planChanged) {
        console.log(`Plan changed from ${originalPlan} to ${newPlan} for user ${editingUser.user_id}`);
        
        // Criar um evento personalizado para notificar sobre a mudança de plano
        const planChangeEvent = new CustomEvent('userPlanChanged', {
          detail: { 
            userId: editingUser.user_id, 
            newPlan: newPlan
          }
        });
        
        window.dispatchEvent(planChangeEvent);
      }
      
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Em produção, você provavelmente usaria uma função RPC ou Edge Function
      // para deletar o usuário do Auth e todos os seus dados relacionados
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;
      
      // Remover usuário da lista local
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Erro ao excluir usuário');
    }
  };

  const calculateDaysLeft = (expiryDate: string) => {
    if (!expiryDate) return 0;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    
    // Reset time part for accurate day calculation
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Acesso Restrito</h3>
            <p className="text-red-600">Você não tem permissão para acessar o painel de administração.</p>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-800">Painel de Administração</h1>
          <p className="text-gray-500 mt-1">Gerencie usuários e assinaturas</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 rounded-xl text-white flex items-center space-x-2">
          <Shield className="h-4 w-4" />
          <span>Modo Admin</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Total de Usuários</p>
              <p className="text-3xl font-bold mt-1">{users.length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-green-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Plano Starter</p>
              <p className="text-3xl font-bold mt-1">{users.filter(u => u.plan === 'starter').length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Plano Family</p>
              <p className="text-3xl font-bold mt-1">{users.filter(u => u.plan === 'family').length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-red-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Administradores</p>
              <p className="text-3xl font-bold mt-1">{users.filter(u => u.is_admin).length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Todos os usuários</option>
              <option value="admin">Administradores</option>
              <option value="starter">Plano Starter</option>
              <option value="family">Plano Family</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de usuários */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Usuários</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dias Restantes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
                    <p className="text-gray-500">Tente ajustar os filtros para ver mais resultados.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userProfile) => (
                  <tr key={userProfile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{userProfile.full_name || 'Usuário'}</div>
                          <div className="text-sm text-gray-500">{userProfile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {userProfile.is_admin ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Usuário
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full inline-flex items-center w-fit ${
                          userProfile.plan === 'family' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {userProfile.plan === 'family' ? 'Family' : 'Starter'}
                        </span>
                        {userProfile.is_in_trial && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-flex items-center">
                            <span className="bg-green-500 h-2 w-2 rounded-full mr-1"></span>
                            Trial ativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userProfile.is_in_trial ? (
                        <span className="text-sm font-medium text-green-600">
                          {calculateDaysLeft(userProfile.trial_expires_at || '')} dias
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Trial expirado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(userProfile.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(userProfile)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userProfile)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Editar Usuário</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={editForm.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={editForm.plan}
                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="family">Family</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiração do Trial</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={editForm.trial_expires_at}
                    onChange={(e) => setEditForm({ ...editForm, trial_expires_at: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    disabled={!editForm.is_in_trial}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-xl border border-green-100">
                <input
                  type="checkbox"
                  id="is_in_trial"
                  checked={editForm.is_in_trial}
                  onChange={(e) => setEditForm({ ...editForm, is_in_trial: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="is_in_trial" className="text-green-700 font-medium">Ativar período de teste</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={editForm.is_admin}
                  onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="is_admin" className="text-gray-700">Administrador</label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Confirmar Exclusão</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-medium text-red-800">Atenção</h3>
                </div>
                <p className="text-gray-700">
                  Você está prestes a excluir o usuário <strong>{userToDelete.email}</strong>. Esta ação não pode ser desfeita e todos os dados associados a este usuário serão perdidos.
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200"
                >
                  Excluir Usuário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}