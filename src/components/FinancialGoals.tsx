import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  PiggyBank, 
  TrendingUp, 
  Briefcase, 
  Scissors,
  Plane,
  Home,
  Trash2,
  Edit,
  Brain,
  Save,
  X,
  Sparkles,
  BarChart3,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData, useFinancialGoals } from '../hooks/useSupabaseData';

interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: 'travel' | 'business' | 'wealth' | 'home' | 'education' | 'other';
  description: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'abandoned';
  priority: 'high' | 'medium' | 'low';
}

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  appliedToGoal?: string; // Goal ID if recommendation is applied
}

const GoalCategories = [
  { value: 'travel', label: 'Viagem', icon: Plane, color: 'from-blue-500 to-cyan-600' },
  { value: 'business', label: 'Negócio', icon: Briefcase, color: 'from-purple-500 to-indigo-600' },
  { value: 'wealth', label: 'Patrimônio', icon: PiggyBank, color: 'from-green-500 to-emerald-600' },
  { value: 'home', label: 'Imóvel', icon: Home, color: 'from-orange-500 to-amber-600' },
  { value: 'education', label: 'Educação', icon: BarChart3, color: 'from-red-500 to-pink-600' },
  { value: 'other', label: 'Outro', icon: Target, color: 'from-gray-500 to-gray-600' }
];

export default function FinancialGoals() {
  const { user } = useAuth();
  const { totalMonthlyIncome, totalMonthlyExpenses } = useDashboardData();
  const { goals: fetchedGoals } = useFinancialGoals();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Partial<Goal> | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [newGoalFormData, setNewGoalFormData] = useState({
    name: '',
    target_amount: '',
    target_date: '',
    category: 'wealth',
    description: '',
    priority: 'medium'
  });

  useEffect(() => {
    if (user) {
      fetchGoals();
      generateRecommendations();
    }
  }, [user]);

  useEffect(() => {
    if (fetchedGoals) {
      setGoals(fetchedGoals);
    }
  }, [fetchedGoals]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      // Fetch user's financial goals from the database
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError('Erro ao carregar metas financeiras');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      setAiLoading(true);
      // Call the AI service API
      const { data: aiData, error: aiError } = await supabase.functions.invoke('goal-recommendations', {
        body: { 
          userId: user?.id,
          goalId: selectedGoal?.id 
        }
      });

      if (aiError) throw aiError;

      // Use real recommendations if available, or fall back to empty array
      setRecommendations(aiData?.recommendations || []);
      
    } catch (err) {
      console.error('Error generating AI recommendations:', err);
      setError('Erro ao gerar recomendações de IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddGoal = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate monthly savings needed
      const targetDate = new Date(newGoalFormData.target_date);
      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();
      const diffMonths = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.4375))); // More accurate average month length
      const targetAmount = parseFloat(newGoalFormData.target_amount);
      const monthlySavingsNeeded = targetAmount / diffMonths;
      
      // Prepare goal data for database insertion
      const goalData = {
        user_id: user?.id,
        name: newGoalFormData.name,
        target_amount: targetAmount,
        current_amount: 0,
        target_date: newGoalFormData.target_date,
        category: newGoalFormData.category as 'travel' | 'business' | 'wealth' | 'home' | 'education' | 'other',
        description: newGoalFormData.description,
        status: 'active',
        priority: newGoalFormData.priority as 'high' | 'medium' | 'low'
      };
      
      // Insert the goal into the database
      const { data, error: insertError } = await supabase
        .from('financial_goals')
        .insert([goalData])
        .select();

      if (insertError) throw insertError;
      
      // Create recurring bill for this goal
      if (data && data.length > 0) {
        const goalId = data[0].id;
        const dueDay = 5; // Default due day
        
        // Create a bill for monthly contributions toward this goal
        const { error: billError } = await supabase
          .from('bills')
          .insert([{
            user_id: user?.id,
            name: `Meta: ${newGoalFormData.name}`,
            company: 'PROSPERA.AI',
            amount: monthlySavingsNeeded,
            due_day: dueDay,
            category: 'Investimentos',
            is_recurring: true,
            is_active: true,
            next_due: new Date(now.getFullYear(), now.getMonth(), dueDay > now.getDate() ? dueDay : dueDay + 30).toISOString().split('T')[0],
            financial_goal_id: goalId,
            is_goal_contribution: true
          }]);
          
        if (billError) {
          console.error('Error creating goal bill:', billError);
        }
      }
      
      // Reset form
      setNewGoalFormData({
        name: '',
        target_amount: '0',
        target_date: new Date().toISOString().split('T')[0],
        category: 'wealth',
        description: '',
        priority: 'medium'
      });
      
      setShowAddModal(false);
      
      // Refresh goals list
      fetchGoals();
      
    } catch (err) {
      console.error('Error adding goal:', err);
      setError('Erro ao criar meta. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(
      goals.map(goal => (goal.id === id ? { ...goal, ...updates, updated_at: new Date().toISOString() } : goal))
    );
    setEditingGoal(null);
  };

  const handleDeleteGoal = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    
    // Delete the goal from the database
    supabase
      .from('financial_goals')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Error deleting goal:', error);
          alert('Erro ao excluir meta. Tente novamente.');
        } else {
          // Update local state only after successful database deletion
          setGoals(goals.filter(goal => goal.id !== id));
          
          // Also delete any associated bills
          supabase
            .from('bills')
            .delete()
            .eq('financial_goal_id', id)
            .then(({ error: billError }) => {
              if (billError) {
                console.error('Error deleting associated bills:', billError);
              }
            });
        }
      });
  };

  const handleContribute = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    setLoading(true);
    
    const amount = parseFloat(prompt('Quanto deseja adicionar à sua meta?', '100') || '0');
    if (amount <= 0) return;
    
    try {
      // Calculate new amounts
      const newAmount = goal.current_amount + amount;
      const newStatus = newAmount >= goal.target_amount ? 'completed' : 'active';
      
      // Update goal in database
      const { error: updateError } = await supabase
        .from('financial_goals')
        .update({ 
          current_amount: newAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Add contribution record
      const { error: contributionError } = await supabase
        .from('goal_contributions')
        .insert({
          goal_id: id,
          user_id: user?.id,
          amount: amount,
          contribution_date: new Date().toISOString(),
          notes: 'Contribuição manual'
        });
      
      if (contributionError) throw contributionError;
      
      // Update UI
      handleUpdateGoal(id, { 
        current_amount: newAmount,
        status: newStatus
      });
      
      alert(`Contribuição de R$ ${amount.toLocaleString('pt-BR')} adicionada com sucesso!`);
    } catch (err) {
      console.error('Error adding contribution:', err);
      alert('Erro ao adicionar contribuição. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = (goalId: string, recommendation: AIRecommendation) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    setRecommendations(
      recommendations.map(rec => 
        rec.id === recommendation.id ? { ...rec, appliedToGoal: goalId } : rec
      )
    );
    
    // Show success message
    alert(`Recomendação aplicada: economize R$ ${recommendation.potentialSavings}/mês para atingir sua meta mais rápido!`);
    
    setShowAIModal(false);
  };

  const getTimeRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Meta vencida';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} dias restantes`;
    
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffMonths < 12) return `${diffMonths} meses restantes`;
    
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    
    return `${years} ${years === 1 ? 'ano' : 'anos'}${months > 0 ? ` e ${months} ${months === 1 ? 'mês' : 'meses'}` : ''} restantes`;
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(100, Math.max(0, (current / target) * 100));
  };

  const getMonthlySavingsNeeded = (goal: Goal) => {
    const targetDate = new Date(goal.target_date);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return Infinity;
    
    const diffMonths = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30));
    const remainingAmount = goal.target_amount - goal.current_amount;
    
    return remainingAmount / diffMonths;
  };

  const getCategoryInfo = (category: string) => {
    return GoalCategories.find(c => c.value === category) || GoalCategories[0];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Metas Financeiras</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Estabeleça metas claras e acompanhe seu progresso</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 sm:px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md text-sm sm:text-base"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Meta</span>
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Total em Metas</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">
                {formatCurrency(goals.reduce((sum, goal) => sum + goal.target_amount, 0))}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Target className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-green-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Já Economizado</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">
                {formatCurrency(goals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0))}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <PiggyBank className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-indigo-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">Economia Mensal Sugerida</p>
              <p className="text-xl sm:text-3xl font-bold mt-1">
                {formatCurrency(goals
                  .filter(g => g.status === 'active')
                  .reduce((sum, goal) => sum + getMonthlySavingsNeeded(goal), 0))}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Goals List */}
      {loading ? (
        <div className="animate-pulse space-y-4 mt-6">
          {[1, 2].map((_, index) => (
            <div key={index} className="bg-gray-100 h-40 rounded-2xl"></div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma meta financeira definida</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Defina metas financeiras claras para ajudar você a economizar para seus sonhos e objetivos.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md inline-flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Criar Primeira Meta</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {goals.map((goal) => {
            const CategoryIcon = getCategoryInfo(goal.category).icon;
            const categoryInfo = getCategoryInfo(goal.category);
            const colorClass = categoryInfo.color;
            const progressPercentage = getProgressPercentage(goal.current_amount, goal.target_amount);
            const monthlySavingsNeeded = getMonthlySavingsNeeded(goal);
            const isEditing = editingGoal?.id === goal.id;

            return (
              <div key={goal.id} className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${
                goal.status === 'completed' ? 'border-green-500' : 
                goal.status === 'abandoned' ? 'border-gray-400' :
                goal.priority === 'high' ? 'border-red-500' :
                goal.priority === 'medium' ? 'border-yellow-500' :
                'border-blue-500'
              }`}>
                {isEditing ? (
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nome da Meta</label>
                        <input
                          type="text"
                          value={editingGoal.name || ''}
                          onChange={(e) => setEditingGoal({...editingGoal, name: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm sm:text-base"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Categoria</label>
                        <select
                          value={editingGoal.category || ''}
                          onChange={(e) => setEditingGoal({...editingGoal, category: e.target.value as any})}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm sm:text-base"
                        >
                          {GoalCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Valor Alvo (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingGoal.target_amount || ''}
                          onChange={(e) => setEditingGoal({...editingGoal, target_amount: parseFloat(e.target.value)})}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm sm:text-base"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data Alvo</label>
                        <input
                          type="date"
                          value={editingGoal.target_date || ''}
                          onChange={(e) => setEditingGoal({...editingGoal, target_date: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm sm:text-base"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Descrição</label>
                      <textarea
                        value={editingGoal.description || ''}
                        onChange={(e) => setEditingGoal({...editingGoal, description: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm sm:text-base"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                      <select
                        value={editingGoal.priority || ''}
                        onChange={(e) => setEditingGoal({...editingGoal, priority: e.target.value as any})}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm sm:text-base"
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          setEditingGoal(null);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                      >
                        Cancelar
                      </button>
                      
                      <button
                        onClick={() => goal.id && handleUpdateGoal(goal.id, editingGoal)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center bg-gradient-to-r ${colorClass} shadow-md`}>
                            <CategoryIcon className="h-6 sm:h-7 w-6 sm:w-7 text-white" />
                          </div>
                          
                          <div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{goal.name}</h3>
                              <span className={`text-xs px-3 py-1 rounded-full ${
                                goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                                goal.status === 'abandoned' ? 'bg-gray-100 text-gray-700' :
                                goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                                goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {goal.status === 'completed' ? 'Concluída' :
                                 goal.status === 'abandoned' ? 'Abandonada' :
                                 goal.priority === 'high' ? 'Alta Prioridade' :
                                 goal.priority === 'medium' ? 'Média Prioridade' :
                                 'Baixa Prioridade'}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 mt-1 text-sm sm:text-base">{goal.description}</p>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
                              <span className="flex items-center text-gray-700">
                                <Calendar className="h-3 sm:h-4 w-3 sm:w-4 mr-1 flex-shrink-0" />
                                <span>{getTimeRemaining(goal.target_date)}</span>
                              </span>
                              
                              <span className="flex items-center text-gray-700">
                                <DollarSign className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                                <span className="font-medium">Meta: {formatCurrency(goal.target_amount)}</span>
                              </span>

                              <span className="flex items-center text-gray-700">
                                <PiggyBank className="h-3 sm:h-4 w-3 sm:w-4 mr-1 text-green-600" />
                                <span className="font-medium text-green-600">Economizado: {formatCurrency(goal.current_amount)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          <div className="text-right">
                            <div className="flex items-center justify-end">
                              <span className="text-xl sm:text-2xl font-bold text-gray-800">
                                {formatCurrency(goal.current_amount)}
                              </span>
                              <span className="ml-2 text-xs sm:text-sm text-gray-500">
                                de {formatCurrency(goal.target_amount)}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {progressPercentage.toFixed(1)}% concluído
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleContribute(goal.id)}
                              disabled={goal.status === 'completed' || loading}
                              className={`px-3 py-1 text-xs sm:text-sm rounded-lg flex items-center space-x-1 shadow-sm ${
                                goal.status === 'completed' 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                  : 'bg-green-600 text-white hover:bg-green-700 transition-colors'
                              }`}
                            >
                              {loading ? (
                                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <DollarSign className="h-3 w-3" />
                              )}
                              <span>Adicionar</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedGoal(goal);
                                setShowAIModal(true);
                              }}
                              disabled={goal.status === 'completed' || loading}
                              className={`px-3 py-1 text-xs sm:text-sm rounded-lg shadow-sm ${
                                goal.status === 'completed' 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors'
                              }`}
                            >
                              <span className="flex items-center space-x-1">
                                <Brain className="h-3 w-3" />
                                <span>Otimizar</span>
                              </span>
                            </button>
                            
                            <button
                              onClick={() => setEditingGoal({...goal})}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-200">
                      <div 
                        className="h-2 transition-all duration-300 bg-blue-600" 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    
                    {goal.status === 'active' && (
                      <div className="bg-gray-50 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            Economia mensal necessária:
                          </span>
                          <span className="ml-2 text-xs sm:text-sm font-semibold text-blue-700">
                            {formatCurrency(monthlySavingsNeeded)}
                          </span>
                        </div>
                        
                        {monthlySavingsNeeded > (totalMonthlyIncome * 0.2) && (
                          <div className="flex items-center text-amber-600 text-xs sm:text-sm mt-2 sm:mt-0">
                            <AlertTriangle className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                            <span>Meta desafiadora</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Nova Meta Financeira</h2>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 pb-8">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAddGoal();
              }} className="space-y-4 sm:space-y-6">
                {/* Goal Type Selection */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Tipo de Meta
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {GoalCategories.map((category) => {
                      const isSelected = newGoalFormData.category === category.value;
                      return (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => setNewGoalFormData({
                            ...newGoalFormData,
                            category: category.value as any
                          })}
                          className={`flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? `border-blue-500 bg-blue-50 shadow-md` 
                              : `border-gray-200 hover:border-gray-300`
                          }`}
                        >
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 mb-2 rounded-lg flex items-center justify-center bg-gradient-to-r ${category.color}`}>
                            <category.icon className="h-5 sm:h-6 w-5 sm:w-6 text-white" />
                          </div>
                          <span className="font-medium text-gray-800 text-xs sm:text-sm">{category.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={newGoalFormData.name}
                      onChange={(e) => setNewGoalFormData({...newGoalFormData, name: e.target.value})}
                      placeholder="Ex: Viagem para Europa"
                      required
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Valor
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black text-sm sm:text-base">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newGoalFormData.target_amount}
                        onChange={(e) => setNewGoalFormData({...newGoalFormData, target_amount: e.target.value})}
                        placeholder="10000"
                        required
                        className="w-full pl-9 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                      Data Limite
                    </label>
                    <input
                      type="date"
                      value={newGoalFormData.target_date}
                      onChange={(e) => setNewGoalFormData({...newGoalFormData, target_date: e.target.value})}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={newGoalFormData.priority}
                      onChange={(e) => setNewGoalFormData({...newGoalFormData, priority: e.target.value as any})}
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                    >
                      <option value="high">Alta</option>
                      <option value="medium">Média</option>
                      <option value="low">Baixa</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={newGoalFormData.description}
                    onChange={(e) => setNewGoalFormData({...newGoalFormData, description: e.target.value})}
                    placeholder="Descreva sua meta..."
                    rows={3}
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base bg-white text-black"
                  />
                </div>
                
                {newGoalFormData.target_amount && newGoalFormData.target_date && (
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-100">
                    <h3 className="font-medium text-blue-800 mb-1 text-sm sm:text-base">Simulação</h3>
                    <div className="text-xs sm:text-sm text-blue-700 space-y-2">
                      <p>Valor total a economizar: {formatCurrency(parseFloat(newGoalFormData.target_amount))}</p>
                      <p>
                        Economia mensal necessária: {
                          formatCurrency(
                            parseFloat(newGoalFormData.target_amount) / Math.max(1, Math.ceil(
                              (new Date(newGoalFormData.target_date).getTime() - new Date().getTime()) / 
                              (1000 * 60 * 60 * 24 * 30)
                            ))
                          )
                        }
                      </p>
                      <p>
                        Percentual da renda mensal: {
                          totalMonthlyIncome > 0 
                            ? `${(
                                (parseFloat(newGoalFormData.target_amount) / Math.max(1, Math.ceil(
                                  (new Date(newGoalFormData.target_date).getTime() - new Date().getTime()) / 
                                  (1000 * 60 * 60 * 24 * 30)
                                )) / totalMonthlyIncome) * 100
                              ).toFixed(1)}%`
                            : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 bg-indigo-50 p-3 sm:p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600 flex-shrink-0" />
                    <h3 className="font-medium text-indigo-800 text-sm sm:text-base">Conta Recorrente</h3>
                  </div>
                  {newGoalFormData.target_amount && newGoalFormData.target_date ? (
                    <>
                      <p className="text-xs sm:text-sm text-indigo-700 mb-3 mt-1">
                        Será criada uma conta recorrente de R$ {
                          (parseFloat(newGoalFormData.target_amount) / Math.max(1, Math.ceil(
                            (new Date(newGoalFormData.target_date).getTime() - new Date().getTime()) / 
                            (1000 * 60 * 60 * 24 * 30)
                          ))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }/mês para esta meta.
                      </p>
                      <div className="flex items-center text-xs sm:text-sm text-indigo-600 bg-indigo-100 p-3 rounded-lg border border-indigo-200">
                        <FileText className="h-3 sm:h-4 w-3 sm:w-4 mr-2" />
                        <span>Esta conta aparecerá na seção de Contas para você gerenciar</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs sm:text-sm text-indigo-700 mt-1 py-2">
                      Preencha o valor e a data alvo para ver o valor da contribuição mensal.
                    </p>
                  )}
                </div>
                
                <div className="sticky bottom-0 pt-4 mt-2 bg-white pb-1">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-4 sm:px-5 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                      Cancelar
                    </button>
                    
                    <button
                      type="submit"
                      className="flex-1 px-4 sm:px-5 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md text-sm sm:text-base"
                    >
                      Criar Meta
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Recommendations Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                    {selectedGoal 
                      ? `Recomendações para ${selectedGoal.name}`
                      : 'Recomendações da IA'}
                  </h2>
                </div>
                
                <button
                  onClick={() => {
                    setShowAIModal(false);
                    setSelectedGoal(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {selectedGoal && (
                <div className="bg-indigo-50 p-3 sm:p-4 rounded-xl border border-indigo-100 mb-6">
                  <h3 className="font-medium text-indigo-800 mb-2 text-sm sm:text-base">Meta Selecionada: {selectedGoal.name}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-indigo-700">Valor: {formatCurrency(selectedGoal.target_amount)}</p>
                      <p className="text-indigo-700">Progresso: {formatCurrency(selectedGoal.current_amount)}</p>
                    </div>
                    <div>
                      <p className="text-indigo-700">Falta: {formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)}</p>
                      <p className="text-indigo-700">Economia mensal necessária: {formatCurrency(getMonthlySavingsNeeded(selectedGoal))}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Sugestões personalizadas</h3>
                <p className="text-gray-600 text-xs sm:text-sm">
                  A PROSPERA.AI analisou seus gastos e identificou estas oportunidades de economia.
                </p>
              </div>
              
              <div className="space-y-4">
                {aiLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-gray-100 h-24 rounded-xl"></div>
                    ))}
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm sm:text-base">Nenhuma recomendação disponível no momento.</p>
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <div key={rec.id} className={`p-3 sm:p-4 rounded-xl border ${
                      rec.appliedToGoal ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-purple-200 hover:shadow-md transition-all'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <div className="mb-3 sm:mb-0">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <Scissors className="h-4 sm:h-5 w-4 sm:w-5 text-purple-600" />
                            <h4 className="font-medium text-gray-800 text-sm sm:text-base">{rec.title}</h4>
                            
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              rec.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              rec.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {rec.difficulty === 'easy' ? 'Fácil' :
                               rec.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                            </span>
                          </div>
                          
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">{rec.description}</p>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-semibold text-green-600 text-sm sm:text-base">{formatCurrency(rec.potentialSavings)}/mês</p>
                          
                          {!rec.appliedToGoal && selectedGoal && (
                            <button
                              onClick={() => applyRecommendation(selectedGoal.id, rec)}
                              className="mt-2 px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg hover:bg-purple-200 transition-colors"
                            >
                              Aplicar à Meta
                            </button>
                          )}
                          
                          {rec.appliedToGoal && (
                            <p className="text-xs text-green-600 mt-2 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aplicado
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAIModal(false);
                      setSelectedGoal(null);
                    }}
                    className="px-4 sm:px-5 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Fechar
                  </button>
                  
                  <button
                    onClick={() => generateRecommendations()}
                    className="px-4 sm:px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Gerar Novas Sugestões</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}