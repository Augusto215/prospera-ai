import React, { useState, useEffect } from 'react';
import { Users, Mail, UserPlus, Trash2, Shield, Eye, Edit, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SharedAccess {
  id: string;
  owner_id: string;
  user_id: string;
  user_email: string;
  role: 'viewer' | 'editor' | 'admin';
  created_at: string;
  user_name?: string;
}

interface InviteData {
  id: string;
  owner_id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  token: string;
  created_at: string;
  expires_at: string;
  accepted: boolean;
}

export default function AccessManagement() {
  const { user, userPlan } = useAuth();
  const [sharedAccesses, setSharedAccesses] = useState<SharedAccess[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InviteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [inviteStatus, setInviteStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (user) {
      fetchSharedAccesses();
      fetchPendingInvites();
    }
  }, [user]);

  const fetchSharedAccesses = async () => {
    try {
      setLoading(true);
      // Fetch shared accesses from the real table
      const { data, error } = await supabase
        .from('user_shared_access')
        .select(`
          id,
          owner_id,
          user_id,
          role,
          created_at,
          profiles!shared_user_profiles(
            email,
            full_name
          )
        `)
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format data to match component's expected structure
      const formattedData: SharedAccess[] = (data || []).map(access => ({
        id: access.id,
        owner_id: access.owner_id,
        user_id: access.user_id,
        user_email: access.profiles?.email || '',
        user_name: access.profiles?.full_name || '',
        role: access.role,
        created_at: access.created_at
      }));

      setSharedAccesses(formattedData);
    } catch (err) {
      console.error('Error fetching shared accesses:', err);
      setError('Erro ao carregar acessos compartilhados');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      // Fetch pending invites from the real table
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('owner_id', user?.id)
        .eq('accepted', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPendingInvites(data || []);
    } catch (err) {
      console.error('Error fetching pending invites:', err);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail) {
      setInviteStatus({
        message: 'Por favor, informe um email válido',
        type: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Call the send-invite edge function
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          email: inviteEmail,
          role: inviteRole
        }
      });
      
      if (error) throw error;
      
      setInviteStatus({
        message: 'Convite enviado com sucesso!',
        type: 'success'
      });
      
      // Reset form
      setInviteEmail('');
      setInviteRole('viewer');
      
      // Refresh pending invites
      fetchPendingInvites();
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteStatus(null);
      }, 2000);
      
    } catch (err) {
      console.error('Error sending invite:', err);
      setInviteStatus({
        message: 'Erro ao enviar convite. Tente novamente.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    if (!confirm('Tem certeza que deseja revogar este acesso?')) return;
    
    try {
      setLoading(true); 

      // Delete the access record from the database
      const { error } = await supabase
        .from('user_shared_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      // Refresh the list of shared accesses
      fetchSharedAccesses();
    } catch (err) {
      console.error('Error revoking access:', err);
      setError('Erro ao revogar acesso');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este convite?')) return;
    
    try {
      setLoading(true); 

      // Delete the invite record from the database
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      // Refresh the list of pending invites
      fetchPendingInvites();
      
    } catch (err) {
      console.error('Error canceling invite:', err);
      setError('Erro ao cancelar convite');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'viewer': return 'Visualizador';
      case 'editor': return 'Editor';
      case 'admin': return 'Administrador';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'viewer': return 'bg-blue-100 text-blue-700';
      case 'editor': return 'bg-green-100 text-green-700';
      case 'admin': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'viewer': return <Eye className="h-4 w-4" />;
      case 'editor': return <Edit className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  if (userPlan !== 'family') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gerenciar Acessos</h1>
            <p className="text-gray-500 mt-1">Compartilhe o acesso à sua conta com familiares ou colaboradores</p>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Recurso Exclusivo do Plano Family</h3>
              <p className="text-yellow-700">Faça upgrade para o plano Family para compartilhar o acesso à sua conta com até 5 pessoas.</p>
              <button
                onClick={() => window.location.href = '/?tab=subscription'}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md"
              >
                Fazer Upgrade
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && sharedAccesses.length === 0 && pendingInvites.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800">Gerenciar Acessos</h1>
          <p className="text-gray-500 mt-1">Compartilhe o acesso à sua conta com familiares ou colaboradores</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md"
        >
          <UserPlus className="h-4 w-4" />
          <span>Convidar Usuário</span>
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
              <p className="text-white/80 text-sm font-medium">Acessos Compartilhados</p>
              <p className="text-3xl font-bold mt-1">{sharedAccesses.length}</p>
              <p className="text-white/80 text-sm">de 5 disponíveis</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-green-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Convites Pendentes</p>
              <p className="text-3xl font-bold mt-1">{pendingInvites.length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Mail className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Seu Plano</p>
              <p className="text-3xl font-bold mt-1">Family</p>
              <p className="text-white/80 text-sm">Compartilhamento ilimitado</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Acessos Compartilhados */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Acessos Compartilhados</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {sharedAccesses.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum acesso compartilhado</h3>
              <p className="text-gray-500">Compartilhe o acesso à sua conta com familiares ou colaboradores.</p>
            </div>
          ) : (
            sharedAccesses.map((access) => (
              <div key={access.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-800">{access.user_name || access.user_email}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-500">{access.user_email}</span>
                        <span className="text-gray-300">•</span>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${getRoleBadgeColor(access.role)}`}>
                          {getRoleIcon(access.role)}
                          <span>{getRoleLabel(access.role)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleRevokeAccess(access.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Revogar acesso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Convites Pendentes */}
      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Convites Pendentes</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-yellow-600" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-800">{invite.email}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${getRoleBadgeColor(invite.role)}`}>
                          {getRoleIcon(invite.role)}
                          <span>{getRoleLabel(invite.role)}</span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                          Pendente
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                          Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleCancelInvite(invite.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Cancelar convite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Convite */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Convidar Usuário</h2>
            </div>
            
            <form onSubmit={handleSendInvite} className="p-6 space-y-4">
              {inviteStatus && (
                <div className={`p-3 rounded-lg ${
                  inviteStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {inviteStatus.message}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email do Convidado</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  <option value="viewer">Visualizador (somente leitura)</option>
                  <option value="editor">Editor (pode editar)</option>
                  <option value="admin">Administrador (acesso total)</option>
                </select>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-700">
                  O convidado receberá um email com um link para acessar sua conta. Eles precisarão criar uma conta ou fazer login para aceitar o convite.
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteStatus(null);
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
                >
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}