import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, FileText, DollarSign, Edit, Trash2, Save, X, AlertTriangle, Bell, CheckCircle, Clock, Briefcase, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  role: string;
  salary: number;
  hiring_date: string;
  document_number: string;
  document_type: 'cpf' | 'rg' | 'cnh' | 'ctps';
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'vacation' | 'leave' | 'terminated';
  vacation_start?: string;
  vacation_end?: string;
  last_vacation?: string;
  next_vacation?: string;
  fgts_percentage: number;
  inss_percentage: number;
  irrf_percentage: number;
  other_benefits: number;
  created_at: string;
  updated_at: string;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  name: string;
  file_type: string;
  file_url: string | null;
  upload_date: string;
  expiration_date?: string;
  created_at: string;
}

const employeeRoles = [
  { value: 'domestica', label: 'Empregada Doméstica', color: 'bg-purple-500' },
  { value: 'motorista', label: 'Motorista', color: 'bg-blue-500' },
  { value: 'jardineiro', label: 'Jardineiro', color: 'bg-green-500' },
  { value: 'cozinheira', label: 'Cozinheira', color: 'bg-orange-500' },
  { value: 'babá', label: 'Babá', color: 'bg-pink-500' },
  { value: 'cuidador', label: 'Cuidador', color: 'bg-indigo-500' },
  { value: 'outro', label: 'Outro', color: 'bg-gray-500' }
];

const documentTypes = [
  { value: 'cpf', label: 'CPF' },
  { value: 'rg', label: 'RG' },
  { value: 'cnh', label: 'CNH' },
  { value: 'ctps', label: 'Carteira de Trabalho' }
];

const employeeStatuses = [
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'vacation', label: 'Férias', color: 'bg-blue-100 text-blue-700' },
  { value: 'leave', label: 'Licença', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'terminated', label: 'Desligado', color: 'bg-red-100 text-red-700' }
];

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<{id: string, type: string, date: string, employee: string}[]>([]);

  useEffect(() => {
    if (user) {
      fetchEmployees();
      fetchDocuments();
    }
  }, [user]);

  useEffect(() => {
    if (employees.length > 0) {
      calculateUpcomingEvents();
    }
  }, [employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching employee documents:', err);
    }
  };

  const calculateUpcomingEvents = () => {
    const events: {id: string, type: string, date: string, employee: string}[] = [];
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    // Verificar próximas férias
    employees.forEach(employee => {
      if (employee.status === 'active' && employee.next_vacation) {
        const vacationDate = new Date(employee.next_vacation);
        if (vacationDate > today && vacationDate < threeMonthsFromNow) {
          events.push({
            id: `vacation-${employee.id}`,
            type: 'vacation',
            date: employee.next_vacation,
            employee: employee.name
          });
        }
      }
    });

    // Adicionar pagamentos mensais (FGTS, INSS, etc.)
    const nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 7);
    events.push({
      id: 'fgts-payment',
      type: 'fgts',
      date: nextPaymentDate.toISOString().split('T')[0],
      employee: 'Todos'
    });

    // Ordenar eventos por data
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setUpcomingEvents(events);
  };

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Calcular próximas férias (1 ano após a contratação)
      const hiringDate = new Date(employeeData.hiring_date);
      const nextVacation = new Date(hiringDate);
      nextVacation.setFullYear(nextVacation.getFullYear() + 1);

      const { error } = await supabase
        .from('employees')
        .insert([{
          ...employeeData,
          next_vacation: nextVacation.toISOString().split('T')[0],
          user_id: user?.id,
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      fetchEmployees();

      // Adicionar contas a pagar para FGTS e outros encargos
      await addEmployeePaymentBills(employeeData);
    } catch (err) {
      console.error('Error adding employee:', err);
      setError('Erro ao adicionar funcionário');
    }
  };

  const addEmployeePaymentBills = async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Calcular valor do FGTS (8% do salário)
      const fgtsAmount = employee.salary * (employee.fgts_percentage / 100);
      
      // Próximo dia 7 para pagamento do FGTS
      const today = new Date();
      const nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 7);
      
      // Adicionar conta de FGTS
      await supabase
        .from('bills')
        .insert([{
          user_id: user?.id,
          name: `FGTS - ${employee.name}`,
          company: 'Caixa Econômica Federal',
          amount: fgtsAmount,
          due_day: 7, // FGTS é pago até o dia 7 do mês seguinte
          category: 'Encargos Sociais',
          is_recurring: true,
          is_active: true,
          next_due: nextPaymentDate.toISOString().split('T')[0],
        }]);
      
      // Adicionar conta de INSS (se aplicável)
      if (employee.inss_percentage > 0) {
        const inssAmount = employee.salary * (employee.inss_percentage / 100);
        await supabase
          .from('bills')
          .insert([{
            user_id: user?.id,
            name: `INSS - ${employee.name}`,
            company: 'Receita Federal',
            amount: inssAmount,
            due_day: 20, // INSS é pago até o dia 20 do mês seguinte
            category: 'Encargos Sociais',
            is_recurring: true,
            is_active: true,
            next_due: new Date(today.getFullYear(), today.getMonth() + 1, 20).toISOString().split('T')[0],
          }]);
      }
      
      // Adicionar conta de IRRF (se aplicável)
      if (employee.irrf_percentage > 0) {
        const irrfAmount = employee.salary * (employee.irrf_percentage / 100);
        await supabase
          .from('bills')
          .insert([{
            user_id: user?.id,
            name: `IRRF - ${employee.name}`,
            company: 'Receita Federal',
            amount: irrfAmount,
            due_day: 20, // IRRF é pago junto com o INSS
            category: 'Encargos Sociais',
            is_recurring: true,
            is_active: true,
            next_due: new Date(today.getFullYear(), today.getMonth() + 1, 20).toISOString().split('T')[0],
          }]);
      }
    } catch (err) {
      console.error('Error adding employee payment bills:', err);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingId(employee.id);
    setEditForm({
      name: employee.name,
      role: employee.role,
      salary: employee.salary,
      hiring_date: employee.hiring_date,
      document_number: employee.document_number,
      document_type: employee.document_type,
      address: employee.address,
      phone: employee.phone,
      email: employee.email,
      status: employee.status,
      vacation_start: employee.vacation_start,
      vacation_end: employee.vacation_end,
      last_vacation: employee.last_vacation,
      next_vacation: employee.next_vacation,
      fgts_percentage: employee.fgts_percentage,
      inss_percentage: employee.inss_percentage,
      irrf_percentage: employee.irrf_percentage,
      other_benefits: employee.other_benefits
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setEditForm({});
      fetchEmployees();
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Erro ao atualizar funcionário');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError('Erro ao excluir funcionário');
    }
  };

  const handleAddDocument = async (employeeId: string, name: string, fileType: string, expirationDate?: string) => {
    try {
      const { error } = await supabase
        .from('employee_documents')
        .insert([{
          user_id: user?.id,
          employee_id: employeeId,
          name,
          file_type: fileType,
          upload_date: new Date().toISOString(),
          expiration_date: expirationDate
        }]);

      if (error) throw error;
      fetchDocuments();
    } catch (err) {
      console.error('Error adding document:', err);
      setError('Erro ao adicionar documento');
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      fetchDocuments();
    } catch (err) {
      console.error('Error removing document:', err);
      setError('Erro ao remover documento');
    }
  };

  const getEmployeeDocuments = (employeeId: string) => {
    return documents.filter(doc => doc.employee_id === employeeId);
  };

  const startVacation = async (employee: Employee) => {
    if (!confirm(`Confirmar início de férias para ${employee.name}?`)) return;

    try {
      const today = new Date();
      const vacationEnd = new Date();
      vacationEnd.setDate(today.getDate() + 30); // 30 dias de férias

      const { error } = await supabase
        .from('employees')
        .update({
          status: 'vacation',
          vacation_start: today.toISOString().split('T')[0],
          vacation_end: vacationEnd.toISOString().split('T')[0],
          last_vacation: today.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      console.error('Error starting vacation:', err);
      setError('Erro ao iniciar férias');
    }
  };

  const endVacation = async (employee: Employee) => {
    if (!confirm(`Confirmar retorno de férias para ${employee.name}?`)) return;

    try {
      const today = new Date();
      const nextVacation = new Date();
      nextVacation.setFullYear(today.getFullYear() + 1);

      const { error } = await supabase
        .from('employees')
        .update({
          status: 'active',
          next_vacation: nextVacation.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      console.error('Error ending vacation:', err);
      setError('Erro ao finalizar férias');
    }
  };

  const totalSalaries = employees
    .filter(emp => emp.status !== 'terminated')
    .reduce((sum, emp) => sum + emp.salary, 0);
  
  const totalFGTS = employees
    .filter(emp => emp.status !== 'terminated')
    .reduce((sum, emp) => sum + (emp.salary * emp.fgts_percentage / 100), 0);
  
  const totalINSS = employees
    .filter(emp => emp.status !== 'terminated')
    .reduce((sum, emp) => sum + (emp.salary * emp.inss_percentage / 100), 0);
  
  const totalIRRF = employees
    .filter(emp => emp.status !== 'terminated')
    .reduce((sum, emp) => sum + (emp.salary * emp.irrf_percentage / 100), 0);
  
  const totalBenefits = employees
    .filter(emp => emp.status !== 'terminated')
    .reduce((sum, emp) => sum + (emp.other_benefits || 0), 0);
  
  const totalCost = totalSalaries + totalFGTS + totalINSS + totalIRRF + totalBenefits;

  const getRoleLabel = (role: string) => {
    return employeeRoles.find(r => r.value === role)?.label || role;
  };

  const getRoleColor = (role: string) => {
    return employeeRoles.find(r => r.value === role)?.color || 'bg-gray-500';
  };

  const getStatusInfo = (status: string) => {
    return employeeStatuses.find(s => s.value === status) || employeeStatuses[0];
  };

  const calculateVacationStatus = (employee: Employee) => {
    if (employee.status === 'vacation') {
      return {
        label: 'Em férias',
        color: 'text-blue-600',
        detail: employee.vacation_end ? `Retorno em ${new Date(employee.vacation_end).toLocaleDateString('pt-BR')}` : 'Data de retorno não definida'
      };
    }

    if (!employee.next_vacation) return { label: 'Não definido', color: 'text-gray-500', detail: '' };

    const nextVacation = new Date(employee.next_vacation);
    const today = new Date();
    const diffTime = nextVacation.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { 
        label: 'Férias vencidas', 
        color: 'text-red-600',
        detail: `Venceu em ${nextVacation.toLocaleDateString('pt-BR')}`
      };
    } else if (diffDays <= 30) {
      return { 
        label: 'Férias próximas', 
        color: 'text-orange-600',
        detail: `Em ${diffDays} dias (${nextVacation.toLocaleDateString('pt-BR')})`
      };
    } else {
      return { 
        label: 'Férias programadas', 
        color: 'text-green-600',
        detail: `Em ${diffDays} dias (${nextVacation.toLocaleDateString('pt-BR')})`
      };
    }
  };

  const isDocumentExpired = (document: EmployeeDocument) => {
    if (!document.expiration_date) return false;
    
    const expirationDate = new Date(document.expiration_date);
    const today = new Date();
    return expirationDate < today;
  };

  const isDocumentExpiringSoon = (document: EmployeeDocument) => {
    if (!document.expiration_date) return false;
    
    const expirationDate = new Date(document.expiration_date);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 && diffDays <= 30;
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
          <h1 className="text-3xl font-bold text-gray-800">Funcionários</h1>
          <p className="text-gray-500 mt-1">Gerencie sua equipe, documentos e obrigações trabalhistas</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Funcionário</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Funcionários Ativos</p>
              <p className="text-3xl font-bold mt-1">{employees.filter(e => e.status !== 'terminated').length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-green-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Salários</p>
              <p className="text-3xl font-bold mt-1">R$ {totalSalaries.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Encargos</p>
              <p className="text-3xl font-bold mt-1">R$ {(totalFGTS + totalINSS + totalIRRF).toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-purple-600 p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Custo Total</p>
              <p className="text-3xl font-bold mt-1">R$ {totalCost.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Briefcase className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Próximos eventos */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Próximos Eventos</h2>
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className={`p-4 rounded-xl ${
                event.type === 'vacation' ? 'bg-blue-50 border border-blue-200' : 
                event.type === 'fgts' ? 'bg-green-50 border border-green-200' : 
                'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {event.type === 'vacation' ? (
                      <Calendar className="h-5 w-5 text-blue-600" />
                    ) : event.type === 'fgts' ? (
                      <DollarSign className="h-5 w-5 text-green-600" />
                    ) : (
                      <Bell className="h-5 w-5 text-gray-600" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {event.type === 'vacation' ? 'Férias' : 
                         event.type === 'fgts' ? 'Pagamento FGTS' : 
                         'Evento'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {event.type === 'vacation' ? `${event.employee} - Férias programadas` : 
                         event.type === 'fgts' ? 'Pagamento de FGTS de todos funcionários' : 
                         event.employee}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">{new Date(event.date).toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm text-gray-500">
                      {Math.ceil((new Date(event.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de funcionários */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Seus Funcionários</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {employees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum funcionário cadastrado</h3>
              <p className="text-gray-500">Adicione seus funcionários para gerenciar salários e obrigações.</p>
            </div>
          ) : (
            employees.map((employee) => {
              const vacationStatus = calculateVacationStatus(employee);
              const employeeDocuments = getEmployeeDocuments(employee.id);
              const hasExpiredDocuments = employeeDocuments.some(doc => isDocumentExpired(doc));
              const hasExpiringDocuments = employeeDocuments.some(doc => isDocumentExpiringSoon(doc));
              const statusInfo = getStatusInfo(employee.status);
              
              return (
                <div key={employee.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  {editingId === employee.id ? (
                    // Modo de edição
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="Nome completo"
                        />
                        <select
                          value={editForm.role || ''}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          {employeeRoles.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="number"
                          value={editForm.salary || ''}
                          onChange={(e) => setEditForm({ ...editForm, salary: Number(e.target.value) })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="Salário"
                          step="0.01"
                        />
                        <select
                          value={editForm.status || ''}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          {employeeStatuses.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={editForm.next_vacation || ''}
                          onChange={(e) => setEditForm({ ...editForm, next_vacation: e.target.value })}
                          className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="Próximas férias"
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getRoleColor(employee.role)}`}>
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-800">{employee.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${getRoleColor(employee.role)}`}>
                              {getRoleLabel(employee.role)}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {hasExpiredDocuments && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center space-x-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Documentos vencidos</span>
                              </span>
                            )}
                            {!hasExpiredDocuments && hasExpiringDocuments && (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>Documentos a vencer</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">
                              Contratação: {new Date(employee.hiring_date).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className={`text-sm ${vacationStatus.color}`}>
                              {vacationStatus.label}: {vacationStatus.detail}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-semibold text-lg text-gray-800">
                              R$ {employee.salary.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-sm text-gray-500">
                              Encargos: R$ {((employee.salary * employee.fgts_percentage / 100) + 
                                            (employee.salary * employee.inss_percentage / 100) + 
                                            (employee.salary * employee.irrf_percentage / 100)).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {employee.status === 'active' && (
                              <button
                                onClick={() => startVacation(employee)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Iniciar férias"
                              >
                                <Calendar className="h-4 w-4" />
                              </button>
                            )}
                            {employee.status === 'vacation' && (
                              <button
                                onClick={() => endVacation(employee)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                title="Finalizar férias"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowDocumentsModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                              title="Documentos"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEditEmployee(employee)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Excluir"
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

      {/* Modal de documentos */}
      {showDocumentsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Documentos - {selectedEmployee.name}</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-3 mb-6">
                {getEmployeeDocuments(selectedEmployee.id).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum documento cadastrado</p>
                ) : (
                  getEmployeeDocuments(selectedEmployee.id).map((document) => (
                    <div 
                      key={document.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isDocumentExpired(document) ? 'bg-red-50 border border-red-200' :
                        isDocumentExpiringSoon(document) ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <FileText className={`h-4 w-4 ${
                            isDocumentExpired(document) ? 'text-red-600' :
                            isDocumentExpiringSoon(document) ? 'text-yellow-600' :
                            'text-gray-600'
                          }`} />
                          <span className="text-sm font-medium text-gray-700">{document.name}</span>
                          {isDocumentExpired(document) && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Vencido</span>
                          )}
                          {isDocumentExpiringSoon(document) && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">A vencer</span>
                          )}
                        </div>
                        {document.expiration_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Validade: {new Date(document.expiration_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRemoveDocument(document.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const fileType = formData.get('file_type') as string;
                const expirationDate = formData.get('expiration_date') as string;
                
                if (name && fileType) {
                  handleAddDocument(selectedEmployee.id, name, fileType, expirationDate || undefined);
                  e.currentTarget.reset();
                }
              }} className="space-y-4">
                <h3 className="font-medium text-gray-800">Adicionar Documento</h3>
                
                <input
                  type="text"
                  name="name"
                  placeholder="Nome do documento"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="file"
                    name="file_type"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Data de validade (opcional)</label>
                    <input
                      type="date"
                      name="expiration_date"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDocumentsModal(false)}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de adicionar funcionário */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Novo Funcionário</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              handleAddEmployee({
                name: formData.get('name') as string,
                role: formData.get('role') as any,
                salary: Number(formData.get('salary')),
                hiring_date: formData.get('hiring_date') as string,
                document_number: formData.get('document_number') as string,
                document_type: formData.get('document_type') as any,
                address: formData.get('address') as string,
                phone: formData.get('phone') as string,
                email: formData.get('email') as string,
                status: 'active',
                fgts_percentage: Number(formData.get('fgts_percentage')),
                inss_percentage: Number(formData.get('inss_percentage')),
                irrf_percentage: Number(formData.get('irrf_percentage')),
                other_benefits: Number(formData.get('other_benefits') || 0),
                user_id: user?.id as string
              });
            }} className="p-6 space-y-6">
              {/* Informações Pessoais */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="name"
                    placeholder="Nome completo"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  
                  <select
                    name="role"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Função</option>
                    {employeeRoles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <select
                      name="document_type"
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Tipo de Documento</option>
                      {documentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <input
                    type="text"
                    name="document_number"
                    placeholder="Número do documento"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div className="mt-4">
                  <input
                    type="text"
                    name="address"
                    placeholder="Endereço completo"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Telefone"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              {/* Informações Trabalhistas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Trabalhistas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Contratação</label>
                    <input
                      type="date"
                      name="hiring_date"
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  
                  <input
                    type="number"
                    name="salary"
                    placeholder="Salário (R$)"
                    step="0.01"
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              {/* Encargos e Benefícios */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Encargos e Benefícios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FGTS (%)</label>
                    <input
                      type="number"
                      name="fgts_percentage"
                      placeholder="% do FGTS"
                      step="0.01"
                      defaultValue="8"
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">INSS (%)</label>
                    <input
                      type="number"
                      name="inss_percentage"
                      placeholder="% do INSS"
                      step="0.01"
                      defaultValue="11"
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IRRF (%)</label>
                    <input
                      type="number"
                      name="irrf_percentage"
                      placeholder="% do IRRF"
                      step="0.01"
                      defaultValue="0"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outros Benefícios (R$)</label>
                  <input
                    type="number"
                    name="other_benefits"
                    placeholder="Valor de outros benefícios (VR, VT, etc.)"
                    step="0.01"
                    defaultValue="0"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-800">Informações Importantes</h3>
                </div>
                <ul className="text-sm text-blue-700 space-y-1 ml-8 list-disc">
                  <li>O sistema criará automaticamente contas a pagar para FGTS e outros encargos</li>
                  <li>As férias serão calculadas automaticamente a partir da data de contratação</li>
                  <li>Você receberá lembretes para documentos próximos do vencimento</li>
                </ul>
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