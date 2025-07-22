import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Receipt, 
  Calendar, 
  Building, 
  Bell, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Save, 
  X, 
  CheckCircle, 
  Tag, 
  Home, 
  Car, 
  Users, 
  CreditCard, 
  Shield, 
  FileText, 
  Mail, 
  DollarSign, 
  Clock 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DateRangeSelector from './DateRangeSelector';

interface Bill {
  id: string;
  name: string;
  company: string;
  amount: number;
  due_day: number;
  payment_status?: 'pending' | 'paid' | 'overdue' | 'partial';
  payment_date?: string;
  payment_amount?: number;
  payment_method?: string;
  send_email_reminder?: boolean;
  reminder_days_before?: number;
  category: string;
  is_recurring: boolean;
  is_active: boolean;
  last_paid?: string;
  next_due: string;
  created_at: string;
  updated_at: string;
  associated_with?: 'property' | 'vehicle' | 'employee' | 'loan';
  associated_id?: string;
  associated_name?: string;
}

interface BillCategory {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
  color?: string;
}

const categories: BillCategory[] = [
  { value: 'Utilidades', label: 'Utilidades', icon: Building },
  { value: 'Telecomunicações', label: 'Telecomunicações', icon: Receipt },
  { value: 'Cartão', label: 'Cartão', icon: CreditCard },
  { value: 'Financiamento', label: 'Financiamento', icon: CreditCard },
  { value: 'Seguro', label: 'Seguro', icon: Shield },
  { value: 'Assinatura', label: 'Assinatura', icon: Calendar },
  { value: 'Educação', label: 'Educação', icon: FileText },
  { value: 'Saúde', label: 'Saúde', icon: Shield },
  { value: 'Transporte', label: 'Transporte', icon: Car },
  { value: 'Imóvel', label: 'Imóvel', icon: Home },
  { value: 'Veículo', label: 'Veículo', icon: Car },
  { value: 'Funcionário', label: 'Funcionário', icon: Users },
  { value: 'Encargos Sociais', label: 'Encargos Sociais', icon: Users },
  { value: 'Outros', label: 'Outros', icon: Receipt }
];

export default function Bills() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Bill>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Properties, Vehicles, and Employees for associating bills
  const [properties, setProperties] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchBills();
      fetchAssociatedEntities();
    }
  }, [user, startDate, endDate]);

  useEffect(() => {
    // Atualizar contagem de contas pendentes
    const pending = bills.filter(bill => {
      return bill.is_active && bill.payment_status !== 'paid';
    }).length;
    
    setPendingCount(pending);
  }, [bills]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z')
        .order('next_due', { ascending: true });

      if (error) throw error;
      
      const filteredBills = data || [];
      setBills(filteredBills);
      
      // Update pending count
      const pending = filteredBills.filter(bill => {
        return bill.is_active && bill.payment_status !== 'paid';
      }).length;
      
      setPendingCount(pending);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAssociatedEntities = async () => {
    if (!user) return;

    try {
      // Fetch properties, vehicles, and employees in parallel
      const [propertiesResult, vehiclesResult, employeesResult, loansResult] = await Promise.all([
        supabase.from('real_estate').select('id, address, type').eq('user_id', user.id),
        supabase.from('vehicles').select('id, brand, model').eq('user_id', user.id),
        supabase.from('employees').select('id, name, role').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('loans').select('id, bank, type').eq('user_id', user.id)
      ]);
      
      if (propertiesResult.data) setProperties(propertiesResult.data);
      if (vehiclesResult.data) setVehicles(vehiclesResult.data);
      if (employeesResult.data) setEmployees(employeesResult.data);
      if (loansResult.data) setLoans(loansResult.data);
    } catch (err) {
      console.error('Error fetching associated entities:', err);
    }
  };

  const handleAddBill = async (billData: Omit<Bill, 'id' | 'created_at' | 'updated_at' | 'next_due'>) => {
    try {
      const today = new Date();
      const nextDue = new Date(today.getFullYear(), today.getMonth(), billData.due_day);
      if (nextDue <= today) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }

      const { error } = await supabase
        .from('bills')
        .insert([{
          ...billData,
          user_id: user?.id,
          next_due: nextDue.toISOString().split('T')[0],
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      fetchBills();
    } catch (err) {
      console.error('Error adding bill:', err);
      setError('Erro ao adicionar conta');
    }
  };

  const handleEditBill = (bill: Bill) => {
    setEditingId(bill.id);
    setEditForm({
      name: bill.name,
      company: bill.company,
      amount: bill.amount,
      due_day: bill.due_day,
      category: bill.category,
      is_recurring: bill.is_recurring,
      is_active: bill.is_active
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('bills')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchBills();
    } catch (err) {
      console.error('Error updating bill:', err);
      setError('Erro ao atualizar conta');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBills();
    } catch (err) {
      console.error('Error deleting bill:', err);
      setError('Erro ao excluir conta');
    }
  };

  // Mark bill as paid
  const markAsPaid = async (billId: string, amount?: number, paymentMethod?: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Call the mark_bill_as_paid_with_alert function to update bill and alert
      const { data, error } = await supabase.rpc('mark_bill_as_paid_with_alert', {
        bill_id: billId,
        payment_date_val: today,
        payment_amount_val: amount,
        payment_method_val: paymentMethod
      });

      if (error) throw error;
      fetchBills();
      
      // Show success message
      alert('Conta marcada como paga com sucesso!');
    } catch (err) {
      console.error('Error marking bill as paid:', err);
      setError('Erro ao marcar conta como paga');
    }
  };

  const markAllAsPaid = async () => {
    if (!confirm('Tem certeza que deseja marcar todas as contas pendentes como pagas?')) return;

    setLoading(true);
    try {
      const today = new Date();
      const pendingBills = bills.filter(bill => {
        return bill.is_active && bill.payment_status !== 'paid';
      });

      if (pendingBills.length === 0) {
        alert('Não há contas pendentes para pagar.');
        return;
      }

      // Get array of bill IDs
      const billIds = pendingBills.map(bill => bill.id);
      
      // Mark all bills as paid
      const { data, error } = await supabase.rpc('mark_multiple_bills_as_paid', {
        bill_ids: billIds,
        payment_date_val: today.toISOString().split('T')[0]
      });

      if (error) throw error;
      
      // Show success message
      alert(`${data} contas marcadas como pagas com sucesso!`);
      
      // Refresh bills
      fetchBills();
    } catch (err) {
      console.error('Error marking all bills as paid:', err);
      setError('Erro ao marcar todas as contas como pagas');
    } finally {
      setLoading(false);
    }
  };

  const totalMonthlyBills = bills
    .filter(bill => bill.is_active && bill.is_recurring)
    .reduce((sum, bill) => sum + bill.amount, 0);

  const upcomingBills = bills
    .filter(bill => bill.is_active && bill.payment_status !== 'paid') // ✅ Excluir contas pagas
    .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())
    .slice(0, 5); 

  const overdueBills = bills.filter(bill => {
    const dueDate = new Date(bill.next_due);
    const today = new Date();
    return bill.is_active && dueDate < today;
  });

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBillStatus = (bill: Bill) => {
    if (bill.payment_status === 'paid') {
      return 'paid';
    } else if (bill.payment_status === 'overdue' || 
        (bill.next_due && new Date(bill.next_due) < new Date())) {
      return 'overdue';
    } else {
      return 'pending';
    }
  };

  // Toggle email reminder for a bill
  const toggleEmailReminder = async (billId: string) => {
    try {
      const bill = bills.find(b => b.id === billId);
      if (!bill) return;
      
      const { error } = await supabase
        .from('bills')
        .update({
          send_email_reminder: !bill.send_email_reminder
        })
        .eq('id', billId);

      if (error) throw error;
      fetchBills();
    } catch (err) {
      console.error('Error toggling email reminder:', err);
      setError('Erro ao atualizar preferência de notificação');
    }
  };
  
  // Set reminder days before
  const setReminderDays = async (billId: string, days: number) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({
          reminder_days_before: days
        })
        .eq('id', billId);

      if (error) throw error;
      fetchBills();
    } catch (err) {
      console.error('Error setting reminder days:', err);
      setError('Erro ao atualizar dias de notificação');
    }
  };

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
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Contas a Pagar</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie suas contas e nunca mais esqueça um pagamento</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full flex items-center space-x-1">
              <Tag className="h-4 w-4" />
              <span>{pendingCount} pendentes</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <DateRangeSelector 
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }} 
          />
          {overdueBills.length > 0 && (
            <button 
              onClick={markAllAsPaid}
              className="flex items-center space-x-2 px-4 sm:px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-md text-sm sm:text-base"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Pagar Todas</span>
            </button>
          )}
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm text-sm sm:text-base"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Alertas */}
      {overdueBills.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center space-x-3 mb-3 sm:mb-0">
              <AlertTriangle className="h-5 sm:h-6 w-5 sm:w-6 text-red-600" />
              <h2 className="text-base sm:text-lg font-semibold text-red-800">Contas em Atraso</h2>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                {overdueBills.length} {overdueBills.length === 1 ? 'conta' : 'contas'}
              </span>
            </div>
            <button
              onClick={markAllAsPaid}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white text-xs sm:text-sm rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center space-x-2"
            >
              <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4" />
              <span>Marcar Todas como Pagas</span>
            </button>
          </div>
          <div className="space-y-2">
            {overdueBills.map(bill => (
              <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-lg">
                <div className="mb-2 sm:mb-0">
                  <span className="font-medium text-gray-800">{bill.name}</span>
                  <span className="text-xs sm:text-sm text-gray-500 ml-2">
                    Venceu em {new Date(bill.next_due).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:space-x-3">
                  <span className="font-semibold text-red-600 text-sm sm:text-base">
                    R$ {bill.amount.toLocaleString('pt-BR')}
                  </span>
                  <button
                    onClick={() => markAsPaid(bill.id)}
                    className="px-3 py-1 bg-green-500 text-white text-xs sm:text-sm rounded-lg hover:bg-green-600 transition-colors duration-200 ml-3 sm:ml-0"
                  >
                    Marcar como Pago
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Mensal</p>
              <p className="text-3xl font-bold mt-1">R$ {totalMonthlyBills.toLocaleString('pt-BR')}</p>
              <p className="text-blue-100 text-xs mt-1">
                Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Contas Ativas</p>
              <p className="text-3xl font-bold mt-1">{bills.filter(b => b.is_active).length}</p>
              <p className="text-green-100 text-xs mt-1">
                {bills.length} Total no período
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Building className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Próximas</p>
              <p className="text-3xl font-bold mt-1">{upcomingBills.length}</p>
              <p className="text-orange-100 text-xs mt-1">Nos próximos dias</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Bell className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Próximas contas */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Próximas Contas</h2>
        {upcomingBills.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {upcomingBills.map((bill) => {
              const daysUntilDue = getDaysUntilDue(bill.next_due);
              const isOverdue = daysUntilDue < 0;
              const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0;
              
              return (
                <div key={bill.id} className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                  isOverdue ? 'border-red-200 bg-red-50' :
                  isDueSoon ? 'border-yellow-200 bg-yellow-50' :
                  'border-gray-100 bg-gray-50'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-2 sm:mb-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                        isOverdue ? 'bg-red-500' :
                        isDueSoon ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}>
                        <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-800 text-sm sm:text-base">{bill.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">{bill.company} • {bill.category}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-base sm:text-lg text-gray-800">
                        R$ {bill.amount.toLocaleString('pt-BR')}
                      </p>
                      <p className={`text-xs sm:text-sm ${
                        isOverdue ? 'text-red-600' :
                        isDueSoon ? 'text-yellow-600' :
                        'text-gray-500'
                      }`}>
                        {isOverdue ? `${Math.abs(daysUntilDue)} dias em atraso` :
                         isDueSoon ? `Vence em ${daysUntilDue} dias` :
                         `Vence em ${daysUntilDue} dias`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta próxima</h3>
            <p className="text-gray-500">Você não tem contas a vencer nos próximos dias.</p>
          </div>
        )}
      </div>

      {/* Lista completa de contas */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-0">Todas as Contas</h2>
            <p className="text-sm text-gray-500">
              Período: {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={markAllAsPaid}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 shadow-sm mt-3 sm:mt-0"
            >
              <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4" />
              <span>Marcar Todas como Pagas</span>
            </button>
          )}
        </div>
        
        <div className="divide-y divide-gray-100">
          {bills.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
              <p className="text-gray-500">
                Não há contas no período de {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Tente selecionar um período diferente ou adicione uma nova conta.
              </p>
            </div>
          ) : (
            bills.map((bill) => (
              <div key={bill.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
                {editingId === bill.id ? (
                  // Modo de edição
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                        placeholder="Nome da conta"
                      />
                      <input
                        type="text"
                        value={editForm.company || ''}
                        onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-black"
                        placeholder="Empresa"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="number"
                        value={editForm.amount || ''}
                        onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Valor"
                        step="0.01"
                      />
                      <input
                        type="number"
                        value={editForm.due_day || ''}
                        onChange={(e) => setEditForm({ ...editForm, due_day: Number(e.target.value) })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Dia do vencimento (1-31)"
                        min="1"
                        max="31"
                      />
                      <select
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        {categories.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editForm.is_recurring || false}
                            onChange={(e) => setEditForm({ ...editForm, is_recurring: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-gray-700">Recorrente</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editForm.is_active || false}
                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-gray-700">Ativa</span>
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
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
                  </div>
                ) : (
                  // Modo de visualização
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                        bill.payment_status === 'paid' ? 'bg-green-500' : 
                        bill.payment_status === 'overdue' ? 'bg-red-500' : 
                        bill.is_active ? 'bg-blue-500' : 'bg-gray-400'
                      }`}>
                        <Receipt className="h-5 sm:h-6 w-5 sm:w-6 text-white" />
                      </div>
                      
                      <div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="font-medium text-gray-800 text-sm sm:text-base">{bill.name}</h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {bill.category}
                          </span>
                          {bill.payment_status === 'paid' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Pago</span>
                            </span>
                          )}
                          
                          {bill.associated_with && bill.associated_name && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              bill.associated_with === 'property' ? 'bg-orange-100 text-orange-700' :
                              bill.associated_with === 'vehicle' ? 'bg-blue-100 text-blue-700' :
                              bill.associated_with === 'employee' ? 'bg-purple-100 text-purple-700' :
                              bill.associated_with === 'loan' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            } flex items-center space-x-1`}>
                              {bill.associated_with === 'property' && <Home className="h-3 w-3" />}
                              {bill.associated_with === 'vehicle' && <Car className="h-3 w-3" />}
                              {bill.associated_with === 'employee' && <Users className="h-3 w-3" />}
                              {bill.associated_with === 'loan' && <CreditCard className="h-3 w-3" />}
                              <span>{bill.associated_name}</span>
                            </span>
                          )}
                          
                          {bill.payment_status === 'pending' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center space-x-1">
                              <Tag className="h-3 w-3" />
                              <span>Pendente</span>
                            </span>
                          )}
                          {!bill.is_active && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              Inativa
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs sm:text-sm text-gray-500">{bill.company}</span>
                          <span className="text-gray-300 hidden sm:inline">•</span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            Vence dia {bill.due_day}
                          </span>
                          {bill.payment_status === 'paid' && bill.payment_date && (
                            <>
                              <span className="text-gray-300 hidden sm:inline">•</span>
                              <span className="text-xs sm:text-sm text-green-600">
                                Pago em {new Date(bill.payment_date).toLocaleDateString('pt-BR')}
                              </span>
                            </>
                          )}
                          {bill.last_paid && (
                            <>
                              <span className="text-gray-300 hidden sm:inline">•</span>
                              <span className="text-xs sm:text-sm text-gray-500">
                                Último pagamento: {new Date(bill.last_paid).toLocaleDateString('pt-BR')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                      <div className="text-right">
                        <p className="font-semibold text-base sm:text-lg text-gray-800">
                          R$ {bill.amount.toLocaleString('pt-BR')}
                          {bill.payment_amount && bill.payment_amount !== bill.amount && (
                            <span className="text-xs text-gray-500 ml-1">
                              (Pago: R$ {bill.payment_amount.toLocaleString('pt-BR')})
                            </span>
                          )}
                        </p>
                        {bill.is_active && (
                          <p className="text-xs sm:text-sm text-gray-500">
                            Próximo: {new Date(bill.next_due).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        
                        {/* Email notification status */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmailReminder(bill.id);
                          }}
                          title={bill.send_email_reminder ? "Desativar notificações por email" : "Ativar notificações por email"}
                          className={`p-1 rounded-full ${
                            bill.send_email_reminder 
                              ? 'text-blue-600 hover:bg-blue-50' 
                              : 'text-gray-400 hover:bg-gray-50'
                          } transition-colors duration-200`}
                        >
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {bill.is_active && bill.payment_status !== 'paid' && (
                          <>
                            <button
                              onClick={() => {
                                const amount = prompt('Valor pago:', bill.amount.toString());
                                if (amount !== null) {
                                  const method = prompt('Método de pagamento (opcional):', '');
                                  markAsPaid(bill.id, parseFloat(amount), method || undefined);
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center shadow-sm"
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              <span>Marcar como Pago</span>
                            </button>
                            <button
                              onClick={() => {
                                supabase.rpc('schedule_bill_alert_for_id', { bill_id: bill.id })
                                  .then(() => {
                                    alert('Alerta gerado com sucesso!');
                                    fetchBills();
                                  })
                                  .catch(err => {
                                    console.error('Error generating alert:', err);
                                    alert('Erro ao gerar alerta');
                                  });
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center shadow-sm"
                            >
                              <Bell className="h-3 w-3 mr-1" />
                              <span>Gerar Alerta</span>
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleEditBill(bill)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteBill(bill.id)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Nova Conta</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddBill({
                name: formData.get('name') as string,
                company: formData.get('company') as string,
                amount: Number(formData.get('amount')),
                due_day: Number(formData.get('due_day')),
                category: formData.get('category') as string,
                is_recurring: formData.has('is_recurring'),
                is_active: true,
                last_paid: undefined,
              });
            }} className="p-4 sm:p-6 space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Nome da conta (ex: Energia Elétrica)"
                required
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
              />
              
              <input
                type="text"
                name="company"
                placeholder="Empresa (ex: CEMIG)"
                required
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
              />
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <input
                  type="number"
                  name="amount"
                  placeholder="Valor (R$)"
                  step="0.01"
                  required
                  className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                />
                
                <input
                  type="number"
                  name="due_day"
                  placeholder="Dia do vencimento (1-31)"
                  min="1"
                  max="31"
                  required
                  className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                />
              </div>
              
              <select
                name="category"
                required
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input id="is_recurring" type="checkbox" name="is_recurring" className="rounded text-blue-600 cursor-pointer" defaultChecked />
                <span className="text-gray-700 text-sm sm:text-base">Conta recorrente (mensal)</span>
              </label>
              
              <div className="flex items-center space-x-2 mt-4">
                <input id="send_email_reminder" type="checkbox" name="send_email_reminder" className="rounded text-blue-600 cursor-pointer" defaultChecked />
                <label htmlFor="send_email_reminder" className="text-gray-700 flex items-center space-x-2 text-sm sm:text-base cursor-pointer">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span>Receber notificações por email</span>
                </label>
              </div>
              
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
                  className="flex-1 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm text-sm sm:text-base"
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