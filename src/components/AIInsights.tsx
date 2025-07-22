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
  Sparkles
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

        <div className="bg-indigo-600 p-4 sm:p-6 rounded-xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Score IA</p>
              <p className="text-2xl font-bold mt-1">{aiScore}/100</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Zap className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Potential Savings from AI Recommendations */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-6 border border-indigo-100">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-4">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Economias Potenciais com IA</h2>
        </div>
        
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="text-gray-700 text-sm sm:text-base">Total identificado pela IA:</p>
            <p className="font-bold text-purple-700 text-sm sm:text-base">
              R$ {recommendations.reduce((sum, rec) => sum + (rec.potential_savings || 0), 0).toLocaleString('pt-BR')}/mês
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="text-gray-700 text-sm sm:text-base">Sugestões disponíveis:</p>
            <p className="font-medium text-gray-800 text-sm sm:text-base">{recommendations.filter(r => !r.is_applied).length}</p>
          </div>
          
          <button
            onClick={() => setSelectedFilter('suggestion')}
            className="mt-3 w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md flex items-center justify-center space-x-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Ver Todas as Sugestões</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 overflow-x-auto">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
          {['all', 'feature', 'warning', 'suggestion', 'achievement'].map((filter) => (
            <button
              key={filter}
              className="mt-3 w-full py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-md flex items-center justify-center space-x-2"
              className={`px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                selectedFilter === filter
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getTypeLabel(filter)}
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
      ) : error ? (
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
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(insight.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 sm:space-x-3">
                          {insight.type === 'suggestion' && (
                            <button 
                              onClick={() => {
                                // Handle suggestion application
                                if (insight.id.startsWith('rec-')) {
                                  const recId = insight.id.replace('rec-', '');
                                  applyRecommendation(recId);
                                }
                              }}
                              className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 hover:bg-blue-700"
                            >
                              Aplicar Sugestão
                            </button>
                          )}
                          {insight.action_path && (
                            <a 
                              href={insight.action_path} 
                              className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-100 text-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
                            >
                              {insight.action_label || 'Ver Detalhes'}
                            </a>
                          )}
                          {!insight.action_path && (
                            <button className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-100 text-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors duration-200">
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