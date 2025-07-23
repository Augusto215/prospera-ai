import React, { useState } from 'react';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb, 
  TrendingDown, 
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  Zap,
  Users,
  Share2,
  Lock,
  Sparkles,
  Clock,
  CheckCheck,
  ArrowUpCircle,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function AIInsights() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'warning' | 'suggestion' | 'achievement' | 'feature'>('all');
  const [insights, setInsights] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number>(0);
  const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      generateInsights();
    }
  }, [user]);

  const generateInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: apiError } = await supabase.functions.invoke('generate-ai-insights', {
        body: { 
          userId: user?.id
        }
      });

      if (apiError) throw apiError;
      
      if (data) {
        setInsights(data.insights || []);
        setRecommendations(data.recommendations || []);
        setAiScore(data.score || 0);
      }
    } catch (err) {
      console.error('Error generating AI insights:', err);
      setError('Erro ao gerar insights. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função corrigida para aplicar recomendação
  const applyRecommendation = async (recId: string) => {
    try {
      setApplyingRecommendation(recId);
      setError(null);
      
      console.log('Aplicando recomendação:', recId);
      
      // Verifica se a recomendação existe
      const recommendation = recommendations.find(r => r.id === recId);
      if (!recommendation) {
        throw new Error('Recomendação não encontrada');
      }
      
      if (recommendation.is_applied) {
        throw new Error('Esta recomendação já foi aplicada');
      }
      
      // Chama função serverless para aplicar recomendação
      const { data, error: apiError } = await supabase.functions.invoke('apply-recommendation', {
        body: { userId: user?.id, recommendationId: recId }
      });
      
      if (apiError) {
        console.error('API Error:', apiError);
        throw new Error(`Erro na API: ${apiError.message || 'Função não encontrada'}`);
      }
      
      if (data && data.error) {
        throw new Error(data.error);
      }
      
      // Atualiza o estado local da recomendação
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recId ? { ...rec, is_applied: true } : rec
        )
      );
      
      // Mostra feedback de sucesso
      const successMessage = data?.data?.message || data?.message || 'Sugestão aplicada com sucesso!';
      setError(`✅ ${successMessage}`);
      
      // Atualiza insights após aplicar recomendação
      setTimeout(() => {
        generateInsights();
        setError(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error applying recommendation:', err);
      let errorMessage = 'Erro ao aplicar sugestão.';
      
      // Mensagens de erro mais específicas
      if (err.message?.includes('não encontrada')) {
        errorMessage = 'Função não encontrada. Verifique se as Edge Functions estão configuradas.';
      } else if (err.message?.includes('Unauthorized')) {
        errorMessage = 'Erro de autorização. Faça login novamente.';
      } else if (err.message?.includes('já foi aplicada')) {
        errorMessage = 'Esta recomendação já foi aplicada anteriormente.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Remove erro após 5 segundos
      setTimeout(() => setError(null), 5000);
    } finally {
      setApplyingRecommendation(null);
    }
  };

  // Função para aplicar recomendação de insight
  const applyInsightRecommendation = async (insightId: string) => {
    // Extrai o ID da recomendação do insight
    const recId = insightId.replace('rec-', '');
    await applyRecommendation(recId);
  };

  // Função para navegar para ações específicas
  const handleActionClick = (actionPath: string, actionLabel: string) => {
    console.log('Navegando para:', actionPath, actionLabel);
    
    if (actionPath.startsWith('http')) {
      // Links externos
      window.open(actionPath, '_blank');
    } else if (actionPath.startsWith('/')) {
      // Rotas internas usando o mesmo sistema da sidebar
      const tabName = actionPath.substring(1); // Remove a barra inicial
      navigateToTab(tabName);
    } else {
      // Ações customizadas
      handleCustomAction(actionPath, actionLabel);
    }
  };

  // Função para navegar usando o sistema de tabs da sidebar
  const navigateToTab = (tabName: string) => {
    // Dispara evento customizado que a sidebar escuta
    const event = new CustomEvent('prospera-set-tab', { detail: tabName });
    window.dispatchEvent(event);
  };

  // Função para ações customizadas
  const handleCustomAction = (actionPath: string, actionLabel: string) => {
    console.log('Ação customizada:', actionPath, actionLabel);
    
    switch (actionPath) {
      case 'budget':
        navigateToTab('budget');
        break;
      case 'investments':
        navigateToTab('investments');
        break;
      case 'goals':
        navigateToTab('financial-goals');
        break;
      case 'bills':
        navigateToTab('bills');
        break;
      case 'transactions':
        navigateToTab('transactions');
        break;
      case 'settings/family':
        navigateToTab('access');
        break;
      case 'insights':
        // Já está na página de insights, rola direto para as recomendações
        setTimeout(() => {
          const recommendationsSection = document.querySelector('[data-section="recommendations"]');
          if (recommendationsSection) {
            recommendationsSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);
        break;
      default:
        // Para ações não mapeadas, mostra modal informativo
        alert(`🔧 Funcionalidade em Desenvolvimento\n\nAção: ${actionLabel}\nEsta funcionalidade será implementada em breve.\n\nEnquanto isso, você pode:\n• Explorar outras seções\n• Aplicar outras recomendações\n• Verificar suas metas e orçamentos`);
    }
  };

  const filteredInsights = selectedFilter === 'all' 
    ? insights 
    : insights.filter(insight => insight.type === selectedFilter);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'achievement': return CheckCircle;
      case 'suggestion': return Lightbulb;
      case 'feature': return Zap;
      default: return Brain;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        border: 'border-orange-200',
        button: 'bg-orange-500 hover:bg-orange-600'
      };
      case 'achievement': return {
        bg: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-200',
        button: 'bg-green-500 hover:bg-green-600'
      };
      case 'suggestion': return {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        button: 'bg-blue-500 hover:bg-blue-600'
      };
      case 'feature': return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        border: 'border-indigo-200',
        button: 'bg-indigo-500 hover:bg-indigo-600'
      };
      default: return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-200',
        button: 'bg-gray-500 hover:bg-gray-600'
      };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'warning': return 'Alertas';
      case 'achievement': return 'Conquistas';
      case 'suggestion': return 'Sugestões';
      case 'feature': return 'Novidades';
      default: return 'Todos';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return 'N/A';
    }
  };

  // Estatísticas das recomendações
  const totalPotentialSavings = recommendations.reduce((sum, rec) => sum + (rec.potential_savings || 0), 0);
  const appliedRecommendations = recommendations.filter(r => r.is_applied);
  const pendingRecommendations = recommendations.filter(r => !r.is_applied);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">IA Financial Insights</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Análises inteligentes do seu comportamento financeiro</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 sm:p-3 rounded-xl">
          <Brain className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Alertas Ativos</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {insights.filter(i => i.type === 'warning').length}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Sugestões</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {insights.filter(i => i.type === 'suggestion').length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Lightbulb className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Conquistas</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {insights.filter(i => i.type === 'achievement').length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-600 text-sm font-medium">Novos Recursos</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {insights.filter(i => i.type === 'feature').length}
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-xl">
              <Zap className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Card do Score IA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-white/80 text-sm font-medium">Score IA Financial</h3>
            <div className="flex items-center space-x-4 mt-2">
              <p className="text-3xl font-bold">{aiScore}/100</p>
              <div className="flex-1 bg-white/20 rounded-full h-3">
                <div 
                  className="bg-white rounded-full h-3 transition-all duration-500"
                  style={{ width: `${aiScore}%` }}
                ></div>
              </div>
            </div>
            <p className="text-white/80 text-sm mt-2">
              {aiScore >= 80 ? 'Excelente controle financeiro!' : 
               aiScore >= 60 ? 'Bom progresso, continue assim!' : 
               'Há espaço para melhorias'}
            </p>
          </div>
          <div className="bg-white/20 p-3 rounded-lg">
            <ArrowUpCircle className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Seção de Recomendações IA */}
      <div 
        data-section="recommendations"
        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-6 border border-indigo-100"
      >
        <div className="flex items-center space-x-2 sm:space-x-3 mb-6">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Recomendações Personalizadas da IA</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Economia Potencial</p>
                <p className="font-bold text-lg text-purple-700">
                  R$ {totalPotentialSavings.toLocaleString('pt-BR')}/mês
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Aplicadas</p>
                <p className="font-bold text-lg text-green-700">{appliedRecommendations.length}</p>
              </div>
              <CheckCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pendentes</p>
                <p className="font-bold text-lg text-orange-700">{pendingRecommendations.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Lista de Recomendações */}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 mb-3">Suas Recomendações:</h3>
            {recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-800">{rec.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                      {rec.is_applied && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">
                          Aplicada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>💰 R$ {rec.potential_savings}/mês</span>
                      <span>📊 {getDifficultyLabel(rec.difficulty)}</span>
                      <span>📅 {new Date(rec.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  {!rec.is_applied && (
                    <button
                      onClick={() => applyRecommendation(rec.id)}
                      disabled={applyingRecommendation === rec.id}
                      className="ml-4 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {applyingRecommendation === rec.id ? 'Aplicando...' : 'Aplicar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {recommendations.length > 3 && (
              <button
                onClick={() => setSelectedFilter('suggestion')}
                className="w-full py-2 text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors duration-200"
              >
                Ver todas as {recommendations.length} recomendações
              </button>
            )}
          </div>
        )}
        
        {recommendations.length === 0 && !loading && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma recomendação disponível</h3>
            <p className="text-gray-500 mb-4">
              Nossa IA precisa de mais dados financeiros para gerar recomendações personalizadas para você.
            </p>
            <div className="text-sm text-gray-600 mb-6">
              <p className="mb-2">📊 Para receber recomendações, adicione:</p>
              <ul className="text-left inline-block space-y-1">
                <li>• Pelo menos 5 transações</li>
                <li>• Algumas contas fixas</li>
                <li>• Investimentos (opcional)</li>
                <li>• Metas financeiras (opcional)</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigateToTab('transactions')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar Transações
              </button>
              <button
                onClick={() => navigateToTab('bills')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Cadastrar Contas
              </button>
              <button
                onClick={generateInsights}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Atualizar IA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Filtrar Insights:</h3>
          {selectedFilter !== 'all' && (
            <button
              onClick={() => setSelectedFilter('all')}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Limpar filtro
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
          {['all', 'feature', 'warning', 'suggestion', 'achievement'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedFilter(filter as typeof selectedFilter)}
              className={`px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                selectedFilter === filter
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getTypeLabel(filter)}
              {filter !== 'all' && (
                <span className="ml-1 text-xs opacity-75">
                  ({insights.filter(i => i.type === filter).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de insights */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-2xl shadow-lg p-4 sm:p-6">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="bg-gray-200 w-12 h-12 rounded-xl"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error && !error.includes('✅') ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Erro ao carregar insights</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={generateInsights}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2">Nenhum insight encontrado</h3>
          <p className="text-sm sm:text-base text-gray-500">Não encontramos insights para o filtro selecionado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map((insight) => {
            const Icon = getInsightIcon(insight.type);
            const colors = getInsightColor(insight.type);
            
            return (
              <div key={insight.id} className={`bg-white rounded-2xl shadow-lg border ${colors.border} overflow-hidden hover:shadow-xl transition-all duration-300`}>
                <div className="p-4 sm:p-6">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className={`p-2 sm:p-3 rounded-xl ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-800">{insight.title}</h3>
                        <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            insight.impact === 'high' 
                              ? 'bg-red-100 text-red-700' 
                              : insight.impact === 'medium' 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-green-100 text-green-700'
                          }`}>
                            Impacto {insight.impact === 'high' ? 'Alto' : insight.impact === 'medium' ? 'Médio' : 'Baixo'}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4 leading-relaxed text-sm sm:text-base">{insight.description}</p>
                      
                      {insight.potentialSavings && (
                        <div className="bg-green-50 p-3 rounded-lg mb-4">
                          <p className="text-green-700 text-sm font-medium">
                            💰 Economia potencial: R$ {insight.potentialSavings.toFixed(2)}/mês
                          </p>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(insight.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {/* Botão Aplicar para insights com recomendações */}
                          {insight.type === 'suggestion' && insight.id.startsWith('rec-') && (
                            <button 
                              onClick={() => applyInsightRecommendation(insight.id)}
                              disabled={applyingRecommendation === insight.id.replace('rec-', '')}
                              className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                              type="button"
                            >
                              {applyingRecommendation === insight.id.replace('rec-', '') ? (
                                <span>Aplicando...</span>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Aplicar</span>
                                </>
                              )}
                            </button>
                          )}
                          
                          {/* Botão de ação personalizada */}
                          {insight.action_path && (
                            <button 
                              onClick={() => handleActionClick(insight.action_path, insight.action_label || 'Ver Detalhes')}
                              className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-100 text-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>{insight.action_label || 'Ver Detalhes'}</span>
                            </button>
                          )}
                          
                          {/* Botão padrão quando não há ação específica */}
                          {!insight.action_path && insight.type !== 'suggestion' && (
                            <button 
                              type="button"
                              onClick={() => alert(`${insight.title}\n\n${insight.description}`)}
                              className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-100 text-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
                            >
                              Ver Detalhes
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback de sucesso */}
      {error && error.includes('✅') && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Seção de análise avançada */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-8 border border-indigo-100">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-16 sm:w-20 h-16 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">IA Financial Insights</h2>
          <p className="text-sm sm:text-base text-gray-600">Nossa IA analisa continuamente seus hábitos para fornecer insights personalizados</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="text-center col-span-1 md:col-span-1">
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm mb-2 sm:mb-3">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Padrões de Gastos</h3>
            <p className="text-xs sm:text-sm text-gray-600">Identificamos tendências nos seus gastos</p>
          </div>
          
          <div className="text-center col-span-1 md:col-span-1">
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm mb-2 sm:mb-3">
              <Share2 className="h-8 w-8 text-indigo-600 mx-auto" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Compartilhamento</h3>
            <p className="text-xs sm:text-sm text-gray-600">Compartilhe acesso com família</p>
          </div>
          
          <div className="text-center col-span-1 md:col-span-1">
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm mb-2 sm:mb-3">
              <Target className="h-8 w-8 text-blue-600 mx-auto" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Metas Inteligentes</h3>
            <p className="text-xs sm:text-sm text-gray-600">Metas baseadas no seu histórico</p>
          </div>
          
          <div className="text-center col-span-1 md:col-span-1">
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm mb-2 sm:mb-3">
              <Lock className="h-8 w-8 text-purple-600 mx-auto" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Oportunidades</h3>
            <p className="text-xs sm:text-sm text-gray-600">Economia e investimento</p>
          </div>
        </div>
      </div>
    </div>
  );
}